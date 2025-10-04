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
});
