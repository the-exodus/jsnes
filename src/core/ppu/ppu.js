/**
 * PPU (Picture Processing Unit) for SNES
 * Handles rendering backgrounds, sprites, and screen effects
 */
export class PPU {
  constructor(memory) {
    this.memory = memory;
    
    // Display dimensions
    this.width = 256;
    this.height = 224;
    
    // Frame buffer (RGBA format)
    this.framebuffer = new Uint32Array(this.width * this.height);
    
    // Scanline and cycle counters
    this.scanline = 0;
    this.cycle = 0;
    this.frame = 0;
    
    // PPU Registers
    this.registers = {
      // Screen display
      inidisp: 0x80,    // Screen display (bit 7 = force blank)
      obsel: 0,         // Object size and base address
      bgmode: 0x00,     // BG mode and character size
      mosaic: 0x00,     // Mosaic size and enable
      
      // Background scroll
      bg1hofs: 0,       // BG1 horizontal scroll
      bg1vofs: 0,       // BG1 vertical scroll
      bg2hofs: 0,
      bg2vofs: 0,
      bg3hofs: 0,
      bg3vofs: 0,
      bg4hofs: 0,
      bg4vofs: 0,
      
      // Background tilemap addresses
      bg1sc: 0,         // BG1 tilemap address and size
      bg2sc: 0,
      bg3sc: 0,
      bg4sc: 0,
      
      // Background character addresses
      bg12nba: 0,       // BG1 and BG2 character data addresses
      bg34nba: 0,       // BG3 and BG4 character data addresses
      
      // Window settings
      w12sel: 0,        // Window mask settings for BG1 and BG2
      w34sel: 0,        // Window mask settings for BG3 and BG4
      wobjsel: 0,       // Window mask settings for objects and color window
      wh0: 0,           // Window 1 left position
      wh1: 0,           // Window 1 right position
      wh2: 0,           // Window 2 left position
      wh3: 0,           // Window 2 right position
      wbglog: 0,        // Window mask logic for BGs
      wobjlog: 0,       // Window mask logic for OBJs
      
      // Main/sub screen settings
      tm: 0,            // Main screen designation
      ts: 0,            // Sub screen designation
      tmw: 0,           // Window mask for main screen
      tsw: 0,           // Window mask for sub screen
      
      // Color math
      cgwsel: 0,        // Color addition select
      cgadsub: 0,       // Color math designation
      coldata: 0,       // Fixed color data
      setini: 0,        // Display control 2
      
      // VRAM access
      vmain: 0,         // Video port control
      vmadd: 0,         // VRAM address
      
      // OAM access
      oamaddr: 0,       // OAM address
      oamadd: 0,        // OAM address (high byte)
      
      // Color RAM access
      cgadd: 0,         // CGRAM address
      
      // Multiplication/division
      m7sel: 0,         // Mode 7 settings
      m7a: 0,           // Mode 7 matrix A
      m7b: 0,           // Mode 7 matrix B
      m7c: 0,           // Mode 7 matrix C
      m7d: 0,           // Mode 7 matrix D
      m7x: 0,           // Mode 7 center X
      m7y: 0,           // Mode 7 center Y
    };
    
    // VRAM access state
    this.vramReadBuffer = 0;
    this.vramAddress = 0;
    this.vramIncrement = 1;
    
    // OAM state
    this.oamAddress = 0;
    this.oamBuffer = 0;
    
    // CGRAM state
    this.cgramAddress = 0;
    this.cgramBuffer = 0;
    
    // Latch state
    this.hCounterLatch = 0;
    this.vCounterLatch = 0;
    this.latchedHCounter = 0;
    this.latchedVCounter = 0;
    
    // Status flags
    this.inVBlank = false;
    this.inHBlank = false;
    this.oddFrame = false;
    
    this.reset();
  }

  reset() {
    // IPL HLE: PPU initialization
    // The IPL ensures PPU is in a safe state before ROM code runs
    
    this.scanline = 0;
    this.cycle = 0;
    this.frame = 0;
    this.inVBlank = false;
    this.inHBlank = false;
    this.oddFrame = false;
    
    // Clear framebuffer to black
    this.framebuffer.fill(0xFF000000);
    
    // Reset registers to power-on state
    Object.keys(this.registers).forEach(key => {
      if (key === 'inidisp') {
        // IPL sets force blank on (bit 7) to disable display during initialization
        this.registers[key] = 0x80; // Force blank on, brightness 0
      } else {
        this.registers[key] = 0;
      }
    });
    
    // IPL clears VRAM, CGRAM, and OAM for consistent state
    // Clear VRAM to 0
    this.memory.vram.fill(0);
    
    // Clear CGRAM to black (color 0)
    this.memory.cgram.fill(0);
    
    // Clear OAM (no sprites initially)
    this.memory.oam.fill(0);
  }

  /**
   * Execute PPU for one scanline
   */
  scanlineStep() {
    // Visible scanlines (0-224)
    if (this.scanline < 224) {
      this.inVBlank = false;
      
      // Render if not in force blank
      if ((this.registers.inidisp & 0x80) === 0) {
        this.renderScanline();
      }
    }
    // VBlank (224-261)
    else if (this.scanline >= 224) {
      if (!this.inVBlank) {
        this.inVBlank = true;
        this.oddFrame = !this.oddFrame;
      }
    }
    
    // Move to next scanline
    this.scanline++;
    if (this.scanline > 261) {
      this.scanline = 0;
      this.frame++;
      this.inVBlank = false;
    }
  }

  /**
   * Render one scanline
   */
  renderScanline() {
    const y = this.scanline;
    const mode = this.registers.bgmode & 0x07;
    
    // Clear scanline to backdrop color
    const backdropColor = this.getColor(0);
    for (let x = 0; x < this.width; x++) {
      this.framebuffer[y * this.width + x] = backdropColor;
    }
    
    // Render based on mode
    switch (mode) {
    case 0:
      this.renderMode0(y);
      break;
    case 1:
      this.renderMode1(y);
      break;
    case 2:
      this.renderMode2(y);
      break;
    case 3:
      this.renderMode3(y);
      break;
    case 4:
      this.renderMode4(y);
      break;
    case 5:
      this.renderMode5(y);
      break;
    case 6:
      this.renderMode6(y);
      break;
    case 7:
      this.renderMode7(y);
      break;
    }
    
    // Render sprites
    this.renderSprites(y);
  }

  /**
   * Render Mode 0 (4 layers, 4 colors each)
   */
  renderMode0(y) {
    // Render all 4 background layers with 2bpp (4 colors)
    for (let layer = 3; layer >= 0; layer--) {
      this.renderBackground(y, layer, 2);
    }
  }

  /**
   * Render Mode 1 (BG1: 4bpp, BG2: 4bpp, BG3: 2bpp)
   */
  renderMode1(y) {
    this.renderBackground(y, 2, 2); // BG3 - 2bpp
    this.renderBackground(y, 1, 4); // BG2 - 4bpp
    this.renderBackground(y, 0, 4); // BG1 - 4bpp
  }

  /**
   * Render Mode 2 (BG1: 4bpp, BG2: 4bpp with offset-per-tile)
   */
  renderMode2(y) {
    this.renderBackground(y, 1, 4);
    this.renderBackground(y, 0, 4);
  }

  /**
   * Render Mode 3 (BG1: 8bpp, BG2: 4bpp)
   */
  renderMode3(y) {
    this.renderBackground(y, 1, 4);
    this.renderBackground(y, 0, 8);
  }

  /**
   * Render Mode 4 (BG1: 8bpp with offset-per-tile, BG2: 2bpp)
   */
  renderMode4(y) {
    this.renderBackground(y, 1, 2);
    this.renderBackground(y, 0, 8);
  }

  /**
   * Render Mode 5 (BG1: 4bpp high-res, BG2: 2bpp high-res)
   */
  renderMode5(y) {
    this.renderBackground(y, 1, 2);
    this.renderBackground(y, 0, 4);
  }

  /**
   * Render Mode 6 (BG1: 4bpp high-res with offset-per-tile)
   */
  renderMode6(y) {
    this.renderBackground(y, 0, 4);
  }

  /**
   * Render Mode 7 (Single affine transformed layer)
   */
  renderMode7(y) {
    // Mode 7 is special - uses matrix transformation
    // Simplified implementation
    this.renderBackground(y, 0, 8);
  }

  /**
   * Render a background layer
   */
  renderBackground(y, layer, bpp) {
    // Check if layer is enabled
    if ((this.registers.tm & (1 << layer)) === 0) {
      return;
    }
    
    // Get scroll values
    let scrollX = 0, scrollY = 0;
    switch (layer) {
    case 0:
      scrollX = this.registers.bg1hofs;
      scrollY = this.registers.bg1vofs;
      break;
    case 1:
      scrollX = this.registers.bg2hofs;
      scrollY = this.registers.bg2vofs;
      break;
    case 2:
      scrollX = this.registers.bg3hofs;
      scrollY = this.registers.bg3vofs;
      break;
    case 3:
      scrollX = this.registers.bg4hofs;
      scrollY = this.registers.bg4vofs;
      break;
    }
    
    const tileY = (y + scrollY) >> 3;
    
    // Render tiles across the scanline
    for (let x = 0; x < this.width; x++) {
      const tileX = (x + scrollX) >> 3;
      const pixelX = (x + scrollX) & 7;
      const pixelY = (y + scrollY) & 7;
      
      // Get tile from tilemap (simplified - actual implementation needs proper addressing)
      const tileIndex = (tileY * 32 + tileX) & 0x3FF;
      const colorIndex = this.getTilePixel(layer, tileIndex, pixelX, pixelY, bpp);
      
      if (colorIndex > 0) {
        const color = this.getColor(colorIndex);
        this.framebuffer[y * this.width + x] = color;
      }
    }
  }

  /**
   * Get pixel from a tile
   */
  getTilePixel(layer, tileIndex, pixelX, pixelY, bpp) {
    // Get tilemap and character base addresses
    let tilemapAddr = 0;
    let charBase = 0;
    
    switch (layer) {
    case 0:
      tilemapAddr = (this.registers.bg1sc & 0xFC) << 8;
      charBase = (this.registers.bg12nba & 0x0F) << 12;
      break;
    case 1:
      tilemapAddr = (this.registers.bg2sc & 0xFC) << 8;
      charBase = (this.registers.bg12nba & 0xF0) << 8;
      break;
    case 2:
      tilemapAddr = (this.registers.bg3sc & 0xFC) << 8;
      charBase = (this.registers.bg34nba & 0x0F) << 12;
      break;
    case 3:
      tilemapAddr = (this.registers.bg4sc & 0xFC) << 8;
      charBase = (this.registers.bg34nba & 0xF0) << 8;
      break;
    }
    
    // Read tile data from tilemap
    const tilemapOffset = tilemapAddr + (tileIndex * 2);
    if (tilemapOffset + 1 >= this.memory.vram.length) {
      return 0;
    }
    
    const tileLow = this.memory.vram[tilemapOffset];
    const tileHigh = this.memory.vram[tilemapOffset + 1];
    const tileData = (tileHigh << 8) | tileLow;
    
    // Extract tile properties
    const charNum = tileData & 0x03FF;
    const palette = (tileData >> 10) & 0x07;
    const priority = (tileData >> 13) & 0x01;
    const flipX = (tileData >> 14) & 0x01;
    const flipY = (tileData >> 15) & 0x01;
    
    // Apply flipping
    const actualX = flipX ? (7 - pixelX) : pixelX;
    const actualY = flipY ? (7 - pixelY) : pixelY;
    
    // Calculate character address
    const bytesPerTile = (bpp / 2) * 8; // 8 bytes per bitplane pair
    const charAddr = charBase + (charNum * bytesPerTile);
    
    // Read pixel data based on bpp
    let colorIndex = 0;
    
    if (bpp === 2) {
      // 2bpp: 2 bitplanes
      const plane0 = charAddr + actualY;
      const plane1 = charAddr + actualY + 8;
      
      if (plane1 < this.memory.vram.length) {
        const bit = 7 - actualX;
        const bit0 = (this.memory.vram[plane0] >> bit) & 1;
        const bit1 = (this.memory.vram[plane1] >> bit) & 1;
        colorIndex = bit0 | (bit1 << 1);
      }
    } else if (bpp === 4) {
      // 4bpp: 4 bitplanes
      const plane0 = charAddr + actualY;
      const plane1 = charAddr + actualY + 8;
      const plane2 = charAddr + actualY + 16;
      const plane3 = charAddr + actualY + 24;
      
      if (plane3 < this.memory.vram.length) {
        const bit = 7 - actualX;
        const bit0 = (this.memory.vram[plane0] >> bit) & 1;
        const bit1 = (this.memory.vram[plane1] >> bit) & 1;
        const bit2 = (this.memory.vram[plane2] >> bit) & 1;
        const bit3 = (this.memory.vram[plane3] >> bit) & 1;
        colorIndex = bit0 | (bit1 << 1) | (bit2 << 2) | (bit3 << 3);
      }
    } else if (bpp === 8) {
      // 8bpp: 8 bitplanes
      const bit = 7 - actualX;
      for (let plane = 0; plane < 8; plane++) {
        const planeAddr = charAddr + actualY + (plane * 8);
        if (planeAddr < this.memory.vram.length) {
          const bitValue = (this.memory.vram[planeAddr] >> bit) & 1;
          colorIndex |= (bitValue << plane);
        }
      }
    }
    
    // Add palette offset for color index
    if (colorIndex > 0) {
      colorIndex += (palette * (1 << bpp));
    }
    
    return colorIndex;
  }

  /**
   * Render sprites (objects)
   */
  // eslint-disable-next-line no-unused-vars
  renderSprites(y) {
    // Check if sprites are enabled
    if ((this.registers.tm & 0x10) === 0) {
      return;
    }
    
    // Simplified sprite rendering
    // Actual implementation needs proper OAM parsing and priority handling
  }

  /**
   * Get color from CGRAM
   */
  getColor(index) {
    const addr = index * 2;
    const low = this.memory.cgram[addr];
    const high = this.memory.cgram[addr + 1];
    const color15 = (high << 8) | low;
    
    // Convert from 15-bit BGR to 32-bit RGBA
    const r = ((color15 >> 0) & 0x1F) << 3;
    const g = ((color15 >> 5) & 0x1F) << 3;
    const b = ((color15 >> 10) & 0x1F) << 3;
    
    return 0xFF000000 | (b << 16) | (g << 8) | r;
  }

  /**
   * Write to PPU register
   */
  writeRegister(address, value) {
    switch (address) {
    case 0x2100: // INIDISP
      this.registers.inidisp = value;
      break;
    case 0x2101: // OBSEL - Object size and address
      this.registers.obsel = value;
      break;
    case 0x2102: // OAMADDL - OAM address low
      this.oamAddress = (this.oamAddress & 0x0200) | value;
      break;
    case 0x2103: // OAMADDH - OAM address high and priority
      this.oamAddress = (this.oamAddress & 0x00FF) | ((value & 1) << 8);
      break;
    case 0x2104: // OAMDATA - OAM data write
      this.memory.oam[this.oamAddress] = value;
      this.oamAddress = (this.oamAddress + 1) & 0x21F;
      break;
    case 0x2105: // BGMODE
      this.registers.bgmode = value;
      break;
    case 0x2106: // MOSAIC
      this.registers.mosaic = value;
      break;
      
    // Background tilemap addresses
    case 0x2107: // BG1SC
      this.registers.bg1sc = value;
      break;
    case 0x2108: // BG2SC
      this.registers.bg2sc = value;
      break;
    case 0x2109: // BG3SC
      this.registers.bg3sc = value;
      break;
    case 0x210A: // BG4SC
      this.registers.bg4sc = value;
      break;
      
    // Background character addresses
    case 0x210B: // BG12NBA
      this.registers.bg12nba = value;
      break;
    case 0x210C: // BG34NBA
      this.registers.bg34nba = value;
      break;
      
    // Background scroll registers
    case 0x210D: // BG1HOFS
      this.registers.bg1hofs = (this.registers.bg1hofs & 0xFF00) | value;
      break;
    case 0x210E: // BG1VOFS
      this.registers.bg1vofs = (this.registers.bg1vofs & 0xFF00) | value;
      break;
    case 0x210F: // BG2HOFS
      this.registers.bg2hofs = (this.registers.bg2hofs & 0xFF00) | value;
      break;
    case 0x2110: // BG2VOFS
      this.registers.bg2vofs = (this.registers.bg2vofs & 0xFF00) | value;
      break;
    case 0x2111: // BG3HOFS
      this.registers.bg3hofs = (this.registers.bg3hofs & 0xFF00) | value;
      break;
    case 0x2112: // BG3VOFS
      this.registers.bg3vofs = (this.registers.bg3vofs & 0xFF00) | value;
      break;
    case 0x2113: // BG4HOFS
      this.registers.bg4hofs = (this.registers.bg4hofs & 0xFF00) | value;
      break;
    case 0x2114: // BG4VOFS
      this.registers.bg4vofs = (this.registers.bg4vofs & 0xFF00) | value;
      break;
      
    // VRAM access
    case 0x2115: // VMAIN
      this.registers.vmain = value;
      this.vramIncrement = [1, 32, 128, 128][value & 3];
      break;
    case 0x2116: // VMADD low
      this.vramAddress = (this.vramAddress & 0xFF00) | value;
      this.vramReadBuffer = this.memory.vram[this.vramAddress * 2] | 
                            (this.memory.vram[this.vramAddress * 2 + 1] << 8);
      break;
    case 0x2117: // VMADD high
      this.vramAddress = (this.vramAddress & 0x00FF) | (value << 8);
      this.vramReadBuffer = this.memory.vram[this.vramAddress * 2] | 
                            (this.memory.vram[this.vramAddress * 2 + 1] << 8);
      break;
    case 0x2118: // VMDATA low
      this.memory.vram[this.vramAddress * 2] = value;
      if ((this.registers.vmain & 0x80) === 0) {
        this.vramAddress = (this.vramAddress + this.vramIncrement) & 0xFFFF;
      }
      break;
    case 0x2119: // VMDATA high
      this.memory.vram[this.vramAddress * 2 + 1] = value;
      if ((this.registers.vmain & 0x80) !== 0) {
        this.vramAddress = (this.vramAddress + this.vramIncrement) & 0xFFFF;
      }
      break;
      
    // Mode 7 registers
    case 0x211A: // M7SEL
      this.registers.m7sel = value;
      break;
    case 0x211B: // M7A
      this.registers.m7a = value;
      break;
    case 0x211C: // M7B
      this.registers.m7b = value;
      break;
    case 0x211D: // M7C
      this.registers.m7c = value;
      break;
    case 0x211E: // M7D
      this.registers.m7d = value;
      break;
    case 0x211F: // M7X
      this.registers.m7x = value;
      break;
    case 0x2120: // M7Y
      this.registers.m7y = value;
      break;
      
    // CGRAM access
    case 0x2121: // CGADD
      this.cgramAddress = value;
      break;
    case 0x2122: // CGDATA
      if ((this.cgramAddress & 1) === 0) {
        this.cgramBuffer = value;
      } else {
        this.memory.cgram[this.cgramAddress - 1] = this.cgramBuffer;
        this.memory.cgram[this.cgramAddress] = value;
      }
      this.cgramAddress = (this.cgramAddress + 1) & 0x1FF;
      break;
      
    // Window registers
    case 0x2123: // W12SEL
      this.registers.w12sel = value;
      break;
    case 0x2124: // W34SEL
      this.registers.w34sel = value;
      break;
    case 0x2125: // WOBJSEL
      this.registers.wobjsel = value;
      break;
    case 0x2126: // WH0
      this.registers.wh0 = value;
      break;
    case 0x2127: // WH1
      this.registers.wh1 = value;
      break;
    case 0x2128: // WH2
      this.registers.wh2 = value;
      break;
    case 0x2129: // WH3
      this.registers.wh3 = value;
      break;
    case 0x212A: // WBGLOG
      this.registers.wbglog = value;
      break;
    case 0x212B: // WOBJLOG
      this.registers.wobjlog = value;
      break;
      
    // Main/sub screen designation
    case 0x212C: // TM
      this.registers.tm = value;
      break;
    case 0x212D: // TS
      this.registers.ts = value;
      break;
    case 0x212E: // TMW
      this.registers.tmw = value;
      break;
    case 0x212F: // TSW
      this.registers.tsw = value;
      break;
      
    // Color math
    case 0x2130: // CGWSEL
      this.registers.cgwsel = value;
      break;
    case 0x2131: // CGADSUB
      this.registers.cgadsub = value;
      break;
    case 0x2132: // COLDATA
      this.registers.coldata = value;
      break;
    case 0x2133: // SETINI
      this.registers.setini = value;
      break;
    }
  }

  /**
   * Read from PPU register
   */
  readRegister(address) {
    switch (address) {
    case 0x2134: // MPYL - Multiplication result low
      return (this.registers.m7a * (this.registers.m7b >> 8)) & 0xFF;
      
    case 0x2135: // MPYM - Multiplication result middle
      return ((this.registers.m7a * (this.registers.m7b >> 8)) >> 8) & 0xFF;
      
    case 0x2136: // MPYH - Multiplication result high
      return ((this.registers.m7a * (this.registers.m7b >> 8)) >> 16) & 0xFF;
      
    case 0x2137: // SLHV - Software latch for H/V counters
      this.latchedHCounter = this.cycle;
      this.latchedVCounter = this.scanline;
      return 0;
      
    case 0x2138: { // OAMDATAREAD - OAM data read
      const value = this.memory.oam[this.oamAddress];
      this.oamAddress = (this.oamAddress + 1) & 0x21F;
      return value;
    }
      
    case 0x2139: { // VMDATALREAD - VRAM data read low
      const value = this.vramReadBuffer & 0xFF;
      if ((this.registers.vmain & 0x80) === 0) {
        this.vramAddress = (this.vramAddress + this.vramIncrement) & 0xFFFF;
        this.vramReadBuffer = this.memory.vram[this.vramAddress * 2] | 
                              (this.memory.vram[this.vramAddress * 2 + 1] << 8);
      }
      return value;
    }
      
    case 0x213A: { // VMDATAHREAD - VRAM data read high
      const value = (this.vramReadBuffer >> 8) & 0xFF;
      if ((this.registers.vmain & 0x80) !== 0) {
        this.vramAddress = (this.vramAddress + this.vramIncrement) & 0xFFFF;
        this.vramReadBuffer = this.memory.vram[this.vramAddress * 2] | 
                              (this.memory.vram[this.vramAddress * 2 + 1] << 8);
      }
      return value;
    }
      
    case 0x213B: { // CGDATAREAD - CGRAM data read
      let value;
      if ((this.cgramAddress & 1) === 0) {
        value = this.memory.cgram[this.cgramAddress];
      } else {
        value = this.memory.cgram[this.cgramAddress] & 0x7F; // High byte only has 7 bits
      }
      this.cgramAddress = (this.cgramAddress + 1) & 0x1FF;
      return value;
    }
      
    case 0x213C: // OPHCT - Horizontal counter (low)
      return this.latchedHCounter & 0xFF;
      
    case 0x213D: // OPVCT - Vertical counter (low)
      return this.latchedVCounter & 0xFF;
      
    case 0x213E: { // STAT77 - PPU1 status
      const stat77 = 0x01; // PPU1 version
      return stat77;
    }
      
    case 0x213F: { // STAT78 - PPU2 status
      const stat78 = 0x03 | // PPU2 version (bits 0-3)
        (this.latchedHCounter & 0x100 ? 0x40 : 0) | // H counter high bit
        (this.latchedVCounter & 0x100 ? 0x80 : 0) | // V counter high bit
        (this.inVBlank ? 0x80 : 0) |                 // VBlank flag (also bit 7)
        (this.oddFrame ? 0x80 : 0);                  // Interlace field (also bit 7)
      return stat78;
    }
      
    default:
      return 0;
    }
  }

  /**
   * Get frame buffer for rendering
   */
  getFrameBuffer() {
    return this.framebuffer;
  }
}
