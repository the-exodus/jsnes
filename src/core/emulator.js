import { CPU } from './cpu/cpu.js';
import { PPU } from './ppu/ppu.js';
import { APU } from './apu/apu.js';
import { Memory } from './memory/memory.js';

/**
 * Main SNES Emulator
 * Coordinates CPU, PPU, APU, and memory
 */
export class Emulator {
  constructor() {
    this.memory = new Memory();
    this.cpu = new CPU(this.memory);
    this.ppu = new PPU(this.memory);
    this.apu = new APU(this.memory);
    
    // Timing
    this.masterClock = 0;
    this.running = false;
    
    // Frame timing
    this.fps = 60;
    this.cyclesPerFrame = 357366; // NTSC timing
    
    // Setup memory-mapped I/O
    this.setupIOHandlers();
  }

  /**
   * Setup I/O register handlers
   */
  setupIOHandlers() {
    // PPU registers (0x2100-0x213F)
    for (let addr = 0x2100; addr <= 0x213F; addr++) {
      this.memory.registerIOHandler(
        addr,
        () => this.ppu.readRegister(addr),
        (value) => this.ppu.writeRegister(addr, value)
      );
    }
    
    // APU communication ports (0x2140-0x2143)
    for (let port = 0; port < 4; port++) {
      const addr = 0x2140 + port;
      this.memory.registerIOHandler(
        addr,
        () => this.apu.readPort(port),
        (value) => this.apu.writePort(port, value)
      );
    }
    
    // WRAM access port (0x2180-0x2183)
    let wramAddr = 0;
    this.memory.registerIOHandler(0x2180, 
      () => this.memory.wram[wramAddr++ % this.memory.wram.length],
      (value) => this.memory.wram[wramAddr++ % this.memory.wram.length] = value
    );
    
    // CPU I/O registers
    // NMI flag - set when VBlank NMI occurs, cleared on read
    this.nmiFlag = false;
    
    this.memory.registerIOHandler(0x4210,
      () => {
        // RDNMI - NMI flag (read and clear)
        // Bit 7: NMI flag (set when NMI occurs)
        // Bits 0-3: CPU version
        const value = (this.nmiFlag ? 0x80 : 0x00) | 0x02; // Version 2
        this.nmiFlag = false; // Reading clears the flag
        return value;
      },
      null
    );
    
    this.memory.registerIOHandler(0x4211,
      () => {
        // TIMEUP - IRQ flag (read and clear)
        return 0x00; // No pending IRQ
      },
      null
    );
    
    this.memory.registerIOHandler(0x4212,
      () => {
        // HVBJOY - H/V blank and joypad status
        // Bit 7: VBlank flag (1=in VBlank)
        // Bit 6: HBlank flag (1=in HBlank)
        // Bit 0: Joypad auto-read busy
        let status = 0;
        if (this.ppu.inVBlank) status |= 0x80;
        if (this.ppu.inHBlank) status |= 0x40;
        // Auto-joypad is never busy in our implementation (instant read)
        return status;
      },
      null
    );
    
    // $4200 - NMITIMEN - Interrupt enable flags
    this.nmiEnabled = false;
    this.autoJoypadEnabled = false;
    this.memory.registerIOHandler(0x4200,
      null,
      (value) => {
        // Bit 7: Enable VBlank NMI
        // Bit 5: Enable V-Counter IRQ
        // Bit 4: Enable H-Counter IRQ
        // Bit 0: Enable auto-joypad reading
        this.nmiEnabled = (value & 0x80) !== 0;
        this.autoJoypadEnabled = (value & 0x01) !== 0;
      }
    );
    
    // $4201 - WRIO - Programmable I/O port (out-port)
    this.memory.registerIOHandler(0x4201, null, (value) => {
      // This controls I/O port and joypad latch
      // We don't need to do anything special here
    });
    
    // $4202-$4206 - Multiplication and Division registers
    this.multA = 0xFF;
    this.multB = 0xFF;
    this.divA = 0xFFFF;
    this.divB = 0xFF;
    
    this.memory.registerIOHandler(0x4202, null, (value) => {
      this.multA = value;
    });
    
    this.memory.registerIOHandler(0x4203, null, (value) => {
      this.multB = value;
    });
    
    this.memory.registerIOHandler(0x4204, null, (value) => {
      this.divA = (this.divA & 0xFF00) | value;
    });
    
    this.memory.registerIOHandler(0x4205, null, (value) => {
      this.divA = (this.divA & 0x00FF) | (value << 8);
    });
    
    this.memory.registerIOHandler(0x4206, null, (value) => {
      this.divB = value;
    });
    
    // $4214-$4217 - Multiplication and Division results (read-only)
    this.memory.registerIOHandler(0x4214, () => {
      // Division quotient low byte OR Multiplication result low byte
      if (this.divB !== 0) {
        return Math.floor(this.divA / this.divB) & 0xFF;
      }
      return (this.multA * this.multB) & 0xFF;
    }, null);
    
    this.memory.registerIOHandler(0x4215, () => {
      // Division quotient high byte OR Multiplication result high byte
      if (this.divB !== 0) {
        return (Math.floor(this.divA / this.divB) >> 8) & 0xFF;
      }
      return ((this.multA * this.multB) >> 8) & 0xFF;
    }, null);
    
    this.memory.registerIOHandler(0x4216, () => {
      // Division remainder low byte
      if (this.divB !== 0) {
        return (this.divA % this.divB) & 0xFF;
      }
      return this.multA;
    }, null);
    
    this.memory.registerIOHandler(0x4217, () => {
      // Division remainder high byte
      if (this.divB !== 0) {
        return ((this.divA % this.divB) >> 8) & 0xFF;
      }
      return this.multB;
    }, null);
    
    // $4207-$420D - IRQ/NMI timing and DMA control
    this.memory.registerIOHandler(0x4207, null, (value) => { /* HTIME low */ });
    this.memory.registerIOHandler(0x4208, null, (value) => { /* HTIME high */ });
    this.memory.registerIOHandler(0x4209, null, (value) => { /* VTIME low */ });
    this.memory.registerIOHandler(0x420A, null, (value) => { /* VTIME high */ });
    this.memory.registerIOHandler(0x420B, null, (value) => { /* MDMAEN - DMA enable */ });
    this.memory.registerIOHandler(0x420C, null, (value) => { /* HDMAEN - HDMA enable */ });
    this.memory.registerIOHandler(0x420D, null, (value) => { /* MEMSEL - ROM speed */ });
    
    // Joypad registers (0x4016-0x4017)
    this.memory.registerIOHandler(0x4016,
      () => this.readJoypad(0),
      () => {} // Write triggers auto-joypad read
    );
    this.memory.registerIOHandler(0x4017,
      () => this.readJoypad(1),
      null
    );
    
    // Auto-joypad read registers (0x4218-0x421F)
    // These return the controller state captured during VBlank
    this.memory.registerIOHandler(0x4218, () => this.joypad1 & 0xFF, null);
    this.memory.registerIOHandler(0x4219, () => (this.joypad1 >> 8) & 0xFF, null);
    this.memory.registerIOHandler(0x421A, () => this.joypad2 & 0xFF, null);
    this.memory.registerIOHandler(0x421B, () => (this.joypad2 >> 8) & 0xFF, null);
    this.memory.registerIOHandler(0x421C, () => 0, null); // Joy3 low
    this.memory.registerIOHandler(0x421D, () => 0, null); // Joy3 high
    this.memory.registerIOHandler(0x421E, () => 0, null); // Joy4 low
    this.memory.registerIOHandler(0x421F, () => 0, null); // Joy4 high
    
    // Joypad state
    this.joypad1 = 0;
    this.joypad2 = 0;
  }

  /**
   * Load ROM
   */
  loadROM(romData) {
    this.memory.loadROM(romData);
    this.reset();
  }

  /**
   * Reset emulator
   */
  reset() {
    // IPL HLE: Perform reset sequence as the SNES IPL would
    // Order matters: memory/PPU first, then APU, then CPU last
    
    // 1. PPU reset - clear display memory and set safe state
    this.ppu.reset();
    
    // 2. APU reset - initialize SPC700 with boot program
    this.apu.reset();
    
    // 3. CPU reset - initialize registers and jump to reset vector
    // CPU reset must be last as it reads from memory/vectors
    this.cpu.reset();
    
    // Reset master clock
    this.masterClock = 0;
  }

  /**
   * Run one frame
   */
  runFrame() {
    const targetCycles = this.cyclesPerFrame;
    const cyclesPerScanline = 1364; // NTSC timing: ~1364 master cycles per scanline
    let cycles = 0;
    let iterations = 0;
    const maxIterations = targetCycles * 2; // Safety limit to prevent infinite loops
    let nextScanlineCycles = cyclesPerScanline; // Cycles until next scanline
    
    // Track VBlank state to trigger NMI once
    let wasInVBlank = this.ppu.inVBlank;
    
    while (cycles < targetCycles && iterations < maxIterations) {
      iterations++;
      
      // Execute CPU
      const cpuCycles = this.cpu.step();
      cycles += cpuCycles;
      
      // If no cycles were executed, break to prevent infinite loop
      if (cpuCycles === 0) {
        console.warn('CPU returned 0 cycles, breaking frame execution');
        break;
      }
      
      // Execute APU (runs at different speed)
      this.apu.step(cpuCycles);
      
      // Execute PPU - check if we should advance scanline
      while (cycles >= nextScanlineCycles && nextScanlineCycles <= targetCycles) {
        this.ppu.scanlineStep();
        nextScanlineCycles += cyclesPerScanline;
        
        // Trigger NMI when entering VBlank (only if enabled)
        if (!wasInVBlank && this.ppu.inVBlank) {
          if (this.nmiEnabled) {
            this.cpu.nmiPending = true;
          }
          this.nmiFlag = true; // Set NMI flag for $4210 regardless
          wasInVBlank = true;
        }
        if (wasInVBlank && !this.ppu.inVBlank) {
          wasInVBlank = false;
        }
      }
    }
    
    this.masterClock += cycles;
    
    return this.ppu.getFrameBuffer();
  }

  /**
   * Set joypad button state
   */
  setJoypadButton(player, button, pressed) {
    const joypad = player === 0 ? 'joypad1' : 'joypad2';
    
    if (pressed) {
      this[joypad] |= button;
    } else {
      this[joypad] &= ~button;
    }
  }

  /**
   * Read joypad state
   */
  readJoypad(player) {
    return player === 0 ? this.joypad1 & 0xFF : this.joypad2 & 0xFF;
  }

  /**
   * Get audio samples
   */
  getAudioSamples() {
    return this.apu.getAudioBuffer();
  }

  /**
   * Save state
   */
  saveState() {
    return {
      cpu: {
        A: this.cpu.A,
        X: this.cpu.X,
        Y: this.cpu.Y,
        S: this.cpu.S,
        PC: this.cpu.PC,
        P: this.cpu.P,
        PBR: this.cpu.PBR,
        DBR: this.cpu.DBR,
        cycles: this.cpu.cycles
      },
      ppu: {
        scanline: this.ppu.scanline,
        frame: this.ppu.frame,
        registers: { ...this.ppu.registers }
      },
      memory: {
        wram: new Uint8Array(this.memory.wram),
        sram: new Uint8Array(this.memory.sram),
        vram: new Uint8Array(this.memory.vram),
        cgram: new Uint8Array(this.memory.cgram),
        oam: new Uint8Array(this.memory.oam)
      }
    };
  }

  /**
   * Load state
   */
  loadState(state) {
    // Restore CPU
    Object.assign(this.cpu, state.cpu);
    
    // Restore PPU
    this.ppu.scanline = state.ppu.scanline;
    this.ppu.frame = state.ppu.frame;
    Object.assign(this.ppu.registers, state.ppu.registers);
    
    // Restore memory
    this.memory.wram.set(state.memory.wram);
    this.memory.sram.set(state.memory.sram);
    this.memory.vram.set(state.memory.vram);
    this.memory.cgram.set(state.memory.cgram);
    this.memory.oam.set(state.memory.oam);
  }

  /**
   * Get save data
   */
  getSaveData() {
    return this.memory.getSaveData();
  }

  /**
   * Load save data
   */
  loadSaveData(data) {
    this.memory.loadSaveData(data);
  }
}

// Joypad button constants
export const JoypadButton = {
  B: 0x80,
  Y: 0x40,
  SELECT: 0x20,
  START: 0x10,
  UP: 0x08,
  DOWN: 0x04,
  LEFT: 0x02,
  RIGHT: 0x01,
  A: 0x8000,     // High byte
  X: 0x4000,     // High byte
  L: 0x2000,     // High byte
  R: 0x1000      // High byte
};
