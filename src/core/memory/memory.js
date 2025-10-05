/**
 * Memory Bus for SNES
 * Handles memory mapping, banking, and access timing
 */
export class Memory {
  constructor() {
    // Main memory regions
    this.wram = new Uint8Array(0x20000);  // 128KB Work RAM
    this.sram = new Uint8Array(0x20000);  // 128KB Save RAM (cartridge)
    this.rom = null;                       // Cartridge ROM (set on load)
    
    // Video memory (managed by PPU)
    this.vram = new Uint8Array(0x10000);  // 64KB VRAM
    this.cgram = new Uint8Array(0x200);   // 512 bytes Color RAM (palette)
    this.oam = new Uint8Array(0x220);     // 544 bytes Object Attribute Memory
    
    // Audio memory (managed by APU)
    this.apuRam = new Uint8Array(0x10000); // 64KB APU RAM
    
    // Memory mapper
    this.mapper = null;
    this.mapperType = 'lorom'; // 'lorom' or 'hirom'
    
    // I/O register handlers
    this.ioHandlers = new Map();
    
    // IPL ROM flag - set to true when we're providing HLE
    this.iplHLE = true;
    
    this.reset();
    
    // Initialize mapper even without ROM loaded
    this.setupMapper();
    
    // Setup IPL HLE (High Level Emulation)
    this.setupIPLHLE();
  }

  reset() {
    this.wram.fill(0);
    this.vram.fill(0);
    this.cgram.fill(0);
    this.oam.fill(0);
    this.apuRam.fill(0);
  }

  /**
   * Load ROM data
   */
  loadROM(romData) {
    this.rom = new Uint8Array(romData);
    this.detectMapper();
    this.setupMapper();
  }

  /**
   * Detect mapper type from ROM header
   */
  detectMapper() {
    if (!this.rom || this.rom.length < 0x8000) {
      this.mapperType = 'lorom';
      return;
    }

    // Check for SMC header (512 bytes) and skip it
    const headerOffset = (this.rom.length % 1024) === 512 ? 512 : 0;
    
    // Try LoROM header location (0x7FC0)
    const loromHeaderAddr = 0x7FC0 + headerOffset;
    // Try HiROM header location (0xFFC0)
    const hiromHeaderAddr = 0xFFC0 + headerOffset;
    
    // Check which header is more valid
    const loromScore = this.validateHeader(loromHeaderAddr);
    const hiromScore = this.validateHeader(hiromHeaderAddr);
    
    this.mapperType = hiromScore > loromScore ? 'hirom' : 'lorom';
    console.log(`Detected mapper: ${this.mapperType.toUpperCase()}`);
  }

  /**
   * Validate ROM header and return confidence score
   */
  validateHeader(offset) {
    if (offset + 0x30 > this.rom.length) return 0;
    
    let score = 0;
    
    // Check maker code (should be printable ASCII)
    const makerCode = this.rom[offset + 0x10];
    if (makerCode >= 0x20 && makerCode <= 0x7E) score += 1;
    
    // Check game code (should be printable ASCII)
    for (let i = 0; i < 4; i++) {
      const c = this.rom[offset + 0x12 + i];
      if (c >= 0x20 && c <= 0x7E) score += 1;
    }
    
    // Check ROM size (should be reasonable: 0x08-0x0D)
    const romSize = this.rom[offset + 0x17];
    if (romSize >= 0x08 && romSize <= 0x0D) score += 2;
    
    // Check checksum complement
    const checksum = (this.rom[offset + 0x1F] << 8) | this.rom[offset + 0x1E];
    const complement = (this.rom[offset + 0x1D] << 8) | this.rom[offset + 0x1C];
    if ((checksum ^ complement) === 0xFFFF) score += 4;
    
    return score;
  }

  /**
   * Setup memory mapper based on detected type
   */
  setupMapper() {
    if (this.mapperType === 'lorom') {
      this.mapper = this.mapLoROM.bind(this);
    } else {
      this.mapper = this.mapHiROM.bind(this);
    }
  }

  /**
   * LoROM memory mapping
   * Banks $00-$7F: First 32KB is system, second 32KB is ROM
   * Banks $80-$FF: Mirror of $00-$7F with fast access
   */
  mapLoROM(address) {
    const bank = (address >> 16) & 0xFF;
    const offset = address & 0xFFFF;
    
    // Normalize bank (remove fast/slow mirror)
    const normalizedBank = bank & 0x7F;
    
    // Banks $7E-$7F: Full WRAM (128KB total)
    if (normalizedBank >= 0x7E) {
      const wramAddr = ((normalizedBank - 0x7E) * 0x10000) + offset;
      return { type: 'wram', addr: wramAddr };
    }
    
    // System area ($0000-$7FFF in banks $00-$3F and $80-$BF)
    if (offset < 0x8000 && normalizedBank < 0x40) {
      // WRAM ($0000-$1FFF)
      if (offset < 0x2000) {
        return { type: 'wram', addr: offset };
      }
      // I/O Registers ($2000-$5FFF)
      if (offset >= 0x2000 && offset < 0x6000) {
        return { type: 'io', addr: offset };
      }
      // Expansion ($6000-$7FFF) - typically unused or SRAM
      return { type: 'sram', addr: offset - 0x6000 };
    }
    
    // ROM area ($8000-$FFFF)
    if (offset >= 0x8000) {
      const romBank = normalizedBank;
      const romOffset = (romBank * 0x8000) + (offset - 0x8000);
      return { type: 'rom', addr: romOffset };
    }
    
    // SRAM in banks $70-$7F
    if (normalizedBank >= 0x70 && normalizedBank < 0x7E && offset < 0x8000) {
      return { type: 'sram', addr: ((normalizedBank - 0x70) * 0x8000) + offset };
    }
    
    return { type: 'open', addr: 0 };
  }

  /**
   * HiROM memory mapping
   * Banks $00-$3F: First 32KB is system, second 32KB is ROM
   * Banks $40-$7F: Full 64KB is ROM
   * Banks $80-$FF: Mirror with fast access
   */
  mapHiROM(address) {
    const bank = (address >> 16) & 0xFF;
    const offset = address & 0xFFFF;
    
    const normalizedBank = bank & 0x7F;
    
    // Banks $7E-$7F: Full WRAM (128KB total)
    if (normalizedBank >= 0x7E) {
      const wramAddr = ((normalizedBank - 0x7E) * 0x10000) + offset;
      return { type: 'wram', addr: wramAddr };
    }
    
    // System area in banks $00-$3F
    if (normalizedBank < 0x40 && offset < 0x8000) {
      if (offset < 0x2000) {
        return { type: 'wram', addr: offset };
      }
      if (offset >= 0x2000 && offset < 0x6000) {
        return { type: 'io', addr: offset };
      }
      return { type: 'sram', addr: offset - 0x6000 };
    }
    
    // ROM area
    if (normalizedBank >= 0x40 || offset >= 0x8000) {
      let romOffset;
      if (normalizedBank < 0x40) {
        // Banks $00-$3F: use upper 32KB
        romOffset = (normalizedBank * 0x10000) + offset;
      } else {
        // Banks $40-$7F: use full 64KB
        romOffset = ((normalizedBank - 0x40) * 0x10000) + offset;
      }
      return { type: 'rom', addr: romOffset };
    }
    
    return { type: 'open', addr: 0 };
  }

  /**
   * Read byte from memory
   */
  read(address) {
    const mapped = this.mapper(address);
    
    switch (mapped.type) {
    case 'wram':
      return this.wram[mapped.addr % this.wram.length];
    case 'rom':
      if (this.rom && mapped.addr < this.rom.length) {
        return this.rom[mapped.addr];
      }
      return 0xFF;
    case 'sram':
      return this.sram[mapped.addr % this.sram.length];
    case 'io':
      return this.readIO(mapped.addr);
    case 'open':
    default:
      return 0xFF; // Open bus
    }
  }

  /**
   * Read 16-bit value (little-endian)
   */
  read16(address) {
    const low = this.read(address);
    const high = this.read(address + 1);
    return (high << 8) | low;
  }

  /**
   * Write byte to memory
   */
  write(address, value) {
    const mapped = this.mapper(address);
    
    switch (mapped.type) {
    case 'wram':
      this.wram[mapped.addr % this.wram.length] = value & 0xFF;
      break;
    case 'sram':
      this.sram[mapped.addr % this.sram.length] = value & 0xFF;
      break;
    case 'io':
      this.writeIO(mapped.addr, value);
      break;
    case 'rom':
    case 'open':
    default:
      // ROM and open bus are read-only
      break;
    }
  }

  /**
   * Write 16-bit value (little-endian)
   */
  write16(address, value) {
    this.write(address, value & 0xFF);
    this.write(address + 1, (value >> 8) & 0xFF);
  }

  /**
   * Read from I/O registers
   */
  readIO(address) {
    const handler = this.ioHandlers.get(address);
    if (handler && handler.read) {
      return handler.read();
    }
    
    // Default I/O behavior
    switch (address) {
    case 0x4210: // RDNMI - NMI flag
      return 0x02; // Version 2, no NMI
    case 0x4211: // TIMEUP - IRQ flag
      return 0x00;
    case 0x4212: // HVBJOY - Screen/joypad status
      return 0x00; // Not in VBlank, not in HBlank, joypad ready
    default:
      return 0xFF; // Open bus
    }
  }

  /**
   * Write to I/O registers
   */
  writeIO(address, value) {
    const handler = this.ioHandlers.get(address);
    if (handler && handler.write) {
      handler.write(value);
      return;
    }
    
    // Default I/O behavior - most registers are write-only
  }

  /**
   * Register I/O handler
   */
  registerIOHandler(address, readHandler, writeHandler) {
    this.ioHandlers.set(address, {
      read: readHandler,
      write: writeHandler
    });
  }

  /**
   * DMA transfer (simplified)
   */
  dmaTransfer(channel, source, dest, length) {
    for (let i = 0; i < length; i++) {
      const value = this.read(source + i);
      this.write(dest + i, value);
    }
  }

  /**
   * Get save data (SRAM)
   */
  getSaveData() {
    return new Uint8Array(this.sram);
  }

  /**
   * Load save data (SRAM)
   */
  loadSaveData(data) {
    if (data && data.length <= this.sram.length) {
      this.sram.set(data);
    }
  }

  /**
   * Setup IPL (Initial Program Loader) High-Level Emulation
   * This replaces the need for a real SNES IPL ROM by providing
   * the necessary boot sequence initialization
   */
  setupIPLHLE() {
    // Setup SPC700 (APU) boot ROM in APU RAM at $FFC0-$FFFF
    // This is a minimal boot program that the APU needs to initialize
    const spcBootROM = new Uint8Array([
      // $FFC0: Entry point after reset
      0xCD, 0xEF, 0xBD,       // MOV X, #$EF - Set stack pointer to $EF
      0xE8, 0x00,             // MOV A, #$00 - Clear accumulator
      0xC6,                   // MOV (X), A - Clear page 0
      0x1D,                   // DEC X
      0xD0, 0xFC,             // BNE -4 (loop to clear page 0)
      0x8F, 0x6C, 0xF2,       // MOV $F2, #$6C - Select FLG register
      0x8F, 0xE0, 0xF3,       // MOV $F3, #$E0 - Reset APU, mute, disable echo
      0x8F, 0x4C, 0xF2,       // MOV $F2, #$4C - Select KON register
      0x8F, 0x00, 0xF3,       // MOV $F3, #$00 - Key off all voices
      0x8F, 0x5C, 0xF2,       // MOV $F2, #$5C - Select KOF register
      0x8F, 0x00, 0xF3,       // MOV $F3, #$00 - Ensure all voices off
      // Wait loop for CPU communication
      0x8F, 0xAA, 0xF4,       // MOV $F4, #$AA - Write ready signal to port 0
      0x8F, 0xBB, 0xF5,       // MOV $F5, #$BB - Write ready signal to port 1
      // Infinite loop waiting for CPU data
      0x2F, 0xFE              // BRA -2 (infinite wait loop)
    ]);
    
    // Copy SPC boot ROM to APU RAM
    this.apuRam.set(spcBootROM, 0xFFC0);
    
    // Set up default interrupt vectors in the WRAM/system area
    // These will be used if ROM doesn't provide proper vectors
    // In real SNES, IPL ROM ensures these exist
    
    // Note: Actual vectors come from ROM, but we ensure they're readable
    // The IPL doesn't actually write these, but ensures the system can boot
    // even if ROM vectors are invalid
  }
}
