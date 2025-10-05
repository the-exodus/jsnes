import { describe, it, expect, beforeEach } from 'vitest';
import { PPU } from './ppu.js';
import { Memory } from '../memory/memory.js';

describe('PPU', () => {
  let ppu;
  let memory;

  beforeEach(() => {
    memory = new Memory();
    ppu = new PPU(memory);
  });

  describe('Initialization', () => {
    it('should initialize with correct dimensions', () => {
      expect(ppu.width).toBe(256);
      expect(ppu.height).toBe(224);
    });

    it('should initialize framebuffer', () => {
      expect(ppu.framebuffer.length).toBe(256 * 224);
    });

    it('should start at scanline 0', () => {
      expect(ppu.scanline).toBe(0);
      expect(ppu.cycle).toBe(0);
    });

    it('should start with force blank enabled', () => {
      expect(ppu.registers.inidisp & 0x80).toBe(0x80);
    });
  });

  describe('Register Access', () => {
    it('should write to INIDISP register', () => {
      ppu.writeRegister(0x2100, 0x0F);
      expect(ppu.registers.inidisp).toBe(0x0F);
    });

    it('should write to BGMODE register', () => {
      ppu.writeRegister(0x2105, 0x03);
      expect(ppu.registers.bgmode).toBe(0x03);
    });

    it('should write to scroll registers', () => {
      ppu.writeRegister(0x210D, 0x10); // BG1HOFS
      expect(ppu.registers.bg1hofs & 0xFF).toBe(0x10);
      
      ppu.writeRegister(0x210E, 0x20); // BG1VOFS
      expect(ppu.registers.bg1vofs & 0xFF).toBe(0x20);
    });

    it('should write to TM register (main screen)', () => {
      ppu.writeRegister(0x212C, 0x1F);
      expect(ppu.registers.tm).toBe(0x1F);
    });
  });

  describe('VRAM Access', () => {
    it('should set VRAM address', () => {
      ppu.writeRegister(0x2116, 0x34); // Low byte
      ppu.writeRegister(0x2117, 0x12); // High byte
      expect(ppu.vramAddress).toBe(0x1234);
    });

    it('should write to VRAM', () => {
      ppu.writeRegister(0x2116, 0x00); // Address low
      ppu.writeRegister(0x2117, 0x00); // Address high
      ppu.writeRegister(0x2118, 0x42); // Data low
      
      expect(memory.vram[0]).toBe(0x42);
    });

    it('should auto-increment VRAM address', () => {
      ppu.writeRegister(0x2115, 0x00); // Increment by 1
      ppu.writeRegister(0x2116, 0x00);
      ppu.writeRegister(0x2117, 0x00);
      
      ppu.writeRegister(0x2118, 0x11);
      expect(ppu.vramAddress).toBe(1);
      
      ppu.writeRegister(0x2118, 0x22);
      expect(ppu.vramAddress).toBe(2);
    });

    it('should set VRAM increment amount', () => {
      ppu.writeRegister(0x2115, 0x01); // Increment by 32
      expect(ppu.vramIncrement).toBe(32);
      
      ppu.writeRegister(0x2115, 0x00); // Increment by 1
      expect(ppu.vramIncrement).toBe(1);
    });
  });

  describe('CGRAM Access', () => {
    it('should set CGRAM address', () => {
      ppu.writeRegister(0x2121, 0x10);
      expect(ppu.cgramAddress).toBe(0x10);
    });

    it('should write to CGRAM', () => {
      ppu.writeRegister(0x2121, 0x00);
      ppu.writeRegister(0x2122, 0xFF); // Low byte
      ppu.writeRegister(0x2122, 0x7F); // High byte
      
      expect(memory.cgram[0]).toBe(0xFF);
      expect(memory.cgram[1]).toBe(0x7F);
    });

    it('should auto-increment CGRAM address', () => {
      ppu.writeRegister(0x2121, 0x00);
      ppu.writeRegister(0x2122, 0x11);
      expect(ppu.cgramAddress).toBe(1);
      
      ppu.writeRegister(0x2122, 0x22);
      expect(ppu.cgramAddress).toBe(2);
    });
  });

  describe('Color Conversion', () => {
    it('should convert 15-bit BGR to 32-bit RGBA', () => {
      // Set up a white color (all bits set)
      memory.cgram[0] = 0xFF;
      memory.cgram[1] = 0x7F;
      
      const color = ppu.getColor(0);
      
      // Check that it's a valid RGBA color
      expect(color >>> 24).toBe(0xFF); // Alpha
    });

    it('should convert black color correctly', () => {
      memory.cgram[0] = 0x00;
      memory.cgram[1] = 0x00;
      
      const color = ppu.getColor(0);
      
      expect(color & 0x00FFFFFF).toBe(0x000000);
    });

    it('should handle different palette indices', () => {
      // Set color at index 5
      memory.cgram[10] = 0x1F; // Red = 31
      memory.cgram[11] = 0x00;
      
      const color = ppu.getColor(5);
      
      expect(color & 0xFF).toBe(0xF8); // Red component
    });
  });

  describe('Scanline Timing', () => {
    it('should advance scanline', () => {
      ppu.scanlineStep();
      expect(ppu.scanline).toBe(1);
    });

    it('should wrap to next frame', () => {
      ppu.scanline = 261;
      ppu.scanlineStep();
      expect(ppu.scanline).toBe(0);
      expect(ppu.frame).toBe(1);
    });

    it('should set VBlank flag', () => {
      ppu.scanline = 224;
      ppu.scanlineStep();
      expect(ppu.inVBlank).toBe(true);
    });

    it('should clear VBlank flag', () => {
      ppu.scanline = 261;
      ppu.inVBlank = true;
      ppu.scanlineStep();
      expect(ppu.inVBlank).toBe(false);
    });
  });

  describe('Background Modes', () => {
    it('should detect Mode 0', () => {
      ppu.writeRegister(0x2105, 0x00);
      expect(ppu.registers.bgmode & 0x07).toBe(0);
    });

    it('should detect Mode 1', () => {
      ppu.writeRegister(0x2105, 0x01);
      expect(ppu.registers.bgmode & 0x07).toBe(1);
    });

    it('should detect Mode 7', () => {
      ppu.writeRegister(0x2105, 0x07);
      expect(ppu.registers.bgmode & 0x07).toBe(7);
    });
  });

  describe('Screen Enable', () => {
    it('should enable rendering when force blank is off', () => {
      ppu.writeRegister(0x2100, 0x0F); // Force blank off, brightness 15
      expect(ppu.registers.inidisp & 0x80).toBe(0);
    });

    it('should disable rendering when force blank is on', () => {
      ppu.writeRegister(0x2100, 0x8F); // Force blank on
      expect(ppu.registers.inidisp & 0x80).toBe(0x80);
    });
  });

  describe('Layer Enable', () => {
    it('should enable background layers', () => {
      ppu.writeRegister(0x212C, 0x0F); // Enable BG1-4
      expect(ppu.registers.tm & 0x01).toBe(0x01); // BG1
      expect(ppu.registers.tm & 0x02).toBe(0x02); // BG2
      expect(ppu.registers.tm & 0x04).toBe(0x04); // BG3
      expect(ppu.registers.tm & 0x08).toBe(0x08); // BG4
    });

    it('should enable sprites', () => {
      ppu.writeRegister(0x212C, 0x10); // Enable sprites
      expect(ppu.registers.tm & 0x10).toBe(0x10);
    });

    it('should disable all layers', () => {
      ppu.writeRegister(0x212C, 0x00);
      expect(ppu.registers.tm).toBe(0x00);
    });
  });

  describe('Counter Latch', () => {
    it('should latch H/V counters', () => {
      ppu.cycle = 100;
      ppu.scanline = 50;
      
      ppu.readRegister(0x2137); // SLHV latch
      
      expect(ppu.latchedHCounter).toBe(100);
      expect(ppu.latchedVCounter).toBe(50);
    });

    it('should read latched counters', () => {
      ppu.latchedHCounter = 0x123;
      ppu.latchedVCounter = 0x145;
      
      const hLow = ppu.readRegister(0x213C);
      const vLow = ppu.readRegister(0x213D);
      
      expect(hLow).toBe(0x23);
      expect(vLow).toBe(0x45);
    });

    it('should read counter high bits in status register', () => {
      ppu.latchedHCounter = 0x100;
      ppu.latchedVCounter = 0x100;
      
      const status = ppu.readRegister(0x213F);
      
      expect(status & 0x40).toBe(0x40); // H counter bit 8
      expect(status & 0x80).toBe(0x80); // V counter bit 8
    });
  });

  describe('Frame Buffer', () => {
    it('should provide framebuffer', () => {
      const fb = ppu.getFrameBuffer();
      expect(fb).toBe(ppu.framebuffer);
      expect(fb.length).toBe(256 * 224);
    });

    it('should clear framebuffer to black on reset', () => {
      ppu.reset();
      const fb = ppu.getFrameBuffer();
      // Check a few pixels are black (with alpha)
      expect(fb[0] >>> 24).toBe(0xFF); // Alpha channel
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      // Disable force blank
      ppu.writeRegister(0x2100, 0x0F);
    });

    it('should not render when force blank is enabled', () => {
      ppu.writeRegister(0x2100, 0x8F); // Enable force blank
      
      const before = ppu.framebuffer[0];
      ppu.renderScanline();
      const after = ppu.framebuffer[0];
      
      // Framebuffer should not change
      expect(after).toBe(before);
    });

    it('should render backdrop color', () => {
      ppu.scanline = 0;
      ppu.renderScanline();
      
      // Should have rendered something
      expect(ppu.framebuffer[0]).toBeDefined();
    });
  });

  describe('Additional Register Tests', () => {
    it('should handle OAM address writes', () => {
      ppu.writeRegister(0x2102, 0x34); // OAMADDL
      ppu.writeRegister(0x2103, 0x01); // OAMADDH
      expect(ppu.oamAddress).toBe(0x134);
    });

    it('should write and read OAM data', () => {
      ppu.writeRegister(0x2102, 0x00); // Set OAM address to 0
      ppu.writeRegister(0x2103, 0x00);
      ppu.writeRegister(0x2104, 0x42); // Write data
      
      expect(memory.oam[0]).toBe(0x42);
    });

    it('should handle background tilemap registers', () => {
      ppu.writeRegister(0x2107, 0x5C); // BG1SC
      ppu.writeRegister(0x2108, 0x60); // BG2SC
      ppu.writeRegister(0x2109, 0x64); // BG3SC
      ppu.writeRegister(0x210A, 0x68); // BG4SC
      
      expect(ppu.registers.bg1sc).toBe(0x5C);
      expect(ppu.registers.bg2sc).toBe(0x60);
      expect(ppu.registers.bg3sc).toBe(0x64);
      expect(ppu.registers.bg4sc).toBe(0x68);
    });

    it('should handle background character registers', () => {
      ppu.writeRegister(0x210B, 0x12); // BG12NBA
      ppu.writeRegister(0x210C, 0x34); // BG34NBA
      
      expect(ppu.registers.bg12nba).toBe(0x12);
      expect(ppu.registers.bg34nba).toBe(0x34);
    });

    it('should handle BG3 and BG4 scroll registers', () => {
      ppu.writeRegister(0x2111, 0x10); // BG3HOFS
      ppu.writeRegister(0x2112, 0x20); // BG3VOFS
      ppu.writeRegister(0x2113, 0x30); // BG4HOFS
      ppu.writeRegister(0x2114, 0x40); // BG4VOFS
      
      expect(ppu.registers.bg3hofs & 0xFF).toBe(0x10);
      expect(ppu.registers.bg3vofs & 0xFF).toBe(0x20);
      expect(ppu.registers.bg4hofs & 0xFF).toBe(0x30);
      expect(ppu.registers.bg4vofs & 0xFF).toBe(0x40);
    });

    it('should handle Mode 7 registers', () => {
      ppu.writeRegister(0x211A, 0x01); // M7SEL
      ppu.writeRegister(0x211B, 0x02); // M7A
      ppu.writeRegister(0x211C, 0x03); // M7B
      ppu.writeRegister(0x211D, 0x04); // M7C
      ppu.writeRegister(0x211E, 0x05); // M7D
      ppu.writeRegister(0x211F, 0x06); // M7X
      ppu.writeRegister(0x2120, 0x07); // M7Y
      
      expect(ppu.registers.m7sel).toBe(0x01);
      expect(ppu.registers.m7a).toBe(0x02);
      expect(ppu.registers.m7b).toBe(0x03);
      expect(ppu.registers.m7c).toBe(0x04);
      expect(ppu.registers.m7d).toBe(0x05);
      expect(ppu.registers.m7x).toBe(0x06);
      expect(ppu.registers.m7y).toBe(0x07);
    });

    it('should handle window registers', () => {
      ppu.writeRegister(0x2123, 0x11); // W12SEL
      ppu.writeRegister(0x2124, 0x22); // W34SEL
      ppu.writeRegister(0x2125, 0x33); // WOBJSEL
      ppu.writeRegister(0x2126, 0x10); // WH0
      ppu.writeRegister(0x2127, 0x20); // WH1
      ppu.writeRegister(0x2128, 0x30); // WH2
      ppu.writeRegister(0x2129, 0x40); // WH3
      
      expect(ppu.registers.w12sel).toBe(0x11);
      expect(ppu.registers.w34sel).toBe(0x22);
      expect(ppu.registers.wobjsel).toBe(0x33);
      expect(ppu.registers.wh0).toBe(0x10);
      expect(ppu.registers.wh1).toBe(0x20);
      expect(ppu.registers.wh2).toBe(0x30);
      expect(ppu.registers.wh3).toBe(0x40);
    });

    it('should handle color math registers', () => {
      ppu.writeRegister(0x2130, 0x30); // CGWSEL
      ppu.writeRegister(0x2131, 0x31); // CGADSUB
      ppu.writeRegister(0x2132, 0x32); // COLDATA
      ppu.writeRegister(0x2133, 0x08); // SETINI
      
      expect(ppu.registers.cgwsel).toBe(0x30);
      expect(ppu.registers.cgadsub).toBe(0x31);
      expect(ppu.registers.coldata).toBe(0x32);
      expect(ppu.registers.setini).toBe(0x08);
    });

    it('should read VRAM data correctly', () => {
      // Set VRAM increment mode (increment after high byte)
      ppu.writeRegister(0x2115, 0x80);
      
      // Set up VRAM address and data
      memory.vram[0x1000 * 2] = 0x34;
      memory.vram[0x1000 * 2 + 1] = 0x12;
      
      // Set address (this also fills read buffer)
      ppu.writeRegister(0x2116, 0x00); // VMADD low
      ppu.writeRegister(0x2117, 0x10); // VMADD high (address = 0x1000)
      
      const low = ppu.readRegister(0x2139); // VMDATALREAD
      expect(low).toBe(0x34);
      
      const high = ppu.readRegister(0x213A); // VMDATAHREAD
      expect(high).toBe(0x12);
    });

    it('should read CGRAM data correctly', () => {
      // Set up CGRAM
      ppu.writeRegister(0x2121, 0x00); // CGADD
      memory.cgram[0] = 0x1F;
      memory.cgram[1] = 0x00;
      
      ppu.cgramAddress = 0;
      const low = ppu.readRegister(0x213B); // CGDATAREAD
      const high = ppu.readRegister(0x213B); // CGDATAREAD
      
      expect(low).toBe(0x1F);
      expect(high).toBe(0x00);
    });

    it('should latch H/V counters', () => {
      ppu.cycle = 123;
      ppu.scanline = 45;
      
      ppu.readRegister(0x2137); // SLHV - latch counters
      
      expect(ppu.latchedHCounter).toBe(123);
      expect(ppu.latchedVCounter).toBe(45);
      
      const hcount = ppu.readRegister(0x213C); // OPHCT
      const vcount = ppu.readRegister(0x213D); // OPVCT
      
      expect(hcount).toBe(123);
      expect(vcount).toBe(45);
    });

    it('should read PPU status registers', () => {
      const stat77 = ppu.readRegister(0x213E); // STAT77
      const stat78 = ppu.readRegister(0x213F); // STAT78
      
      expect(stat77).toBeDefined();
      expect(stat78).toBeDefined();
    });

    it('should calculate multiplication result', () => {
      ppu.registers.m7a = 0x0100; // 256
      ppu.registers.m7b = 0x0200; // 512 << 8
      
      const low = ppu.readRegister(0x2134); // MPYL
      const mid = ppu.readRegister(0x2135); // MPYM
      const high = ppu.readRegister(0x2136); // MPYH
      
      // M7A * (M7B >> 8) = 256 * 2 = 512
      expect(low).toBe(0x00);
      expect(mid).toBe(0x02);
      expect(high).toBe(0x00);
    });
  });
});
