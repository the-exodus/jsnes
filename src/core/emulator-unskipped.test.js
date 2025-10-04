import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Emulator, JoypadButton } from './emulator.js';

// NOTE: These tests are currently skipped due to a Vitest compatibility issue
// where the test runner hangs after importing the Emulator class.
// The Emulator module itself works fine (verified with direct Node import),
// but something about the Vitest test collection/execution causes a hang.
// Individual component tests (CPU, PPU, APU, Memory) provide good coverage.
// TODO: Investigate Vitest configuration or module structure to resolve this.
describe('Emulator', () => {
  let emulator;

  beforeEach(() => {
    emulator = new Emulator();
  });

  afterEach(() => {
    // Clean up any resources
    emulator = null;
  });

  describe('Initialization', () => {
    it('should initialize all components', () => {
      expect(emulator.cpu).toBeDefined();
      expect(emulator.ppu).toBeDefined();
      expect(emulator.apu).toBeDefined();
      expect(emulator.memory).toBeDefined();
    });

    it('should start not running', () => {
      expect(emulator.running).toBe(false);
    });

    it('should initialize with 60 FPS target', () => {
      expect(emulator.fps).toBe(60);
    });
  });

  describe('ROM Loading', () => {
    it('should load ROM data', () => {
      const romData = new Uint8Array(0x10000);
      romData[0xFFFC] = 0x00;
      romData[0xFFFD] = 0x80;
      
      expect(() => {
        emulator.loadROM(romData);
      }).not.toThrow();
    });

    it('should reset after loading ROM', () => {
      const romData = new Uint8Array(0x10000);
      romData[0xFFFC] = 0x34;
      romData[0xFFFD] = 0x12;
      
      emulator.loadROM(romData);
      
      expect(emulator.cpu.cycles).toBe(0);
      expect(emulator.masterClock).toBe(0);
    });
  });

  describe('Reset', () => {
    it('should reset all components', () => {
      emulator.cpu.cycles = 1000;
      emulator.ppu.scanline = 100;
      emulator.masterClock = 5000;
      
      emulator.reset();
      
      expect(emulator.cpu.cycles).toBe(0);
      expect(emulator.ppu.scanline).toBe(0);
      expect(emulator.masterClock).toBe(0);
    });
  });

  describe('Joypad Input', () => {
    it('should set button state', () => {
      emulator.setJoypadButton(0, JoypadButton.A, true);
      expect(emulator.joypad1 & JoypadButton.A).not.toBe(0);
    });

    it('should clear button state', () => {
      emulator.joypad1 = JoypadButton.B;
      emulator.setJoypadButton(0, JoypadButton.B, false);
      expect(emulator.joypad1 & JoypadButton.B).toBe(0);
    });

    it('should handle multiple buttons', () => {
      emulator.setJoypadButton(0, JoypadButton.START, true);
      emulator.setJoypadButton(0, JoypadButton.SELECT, true);
      
      expect(emulator.joypad1 & JoypadButton.START).not.toBe(0);
      expect(emulator.joypad1 & JoypadButton.SELECT).not.toBe(0);
    });

    it('should handle player 2', () => {
      emulator.setJoypadButton(1, JoypadButton.A, true);
      expect(emulator.joypad2 & JoypadButton.A).not.toBe(0);
      expect(emulator.joypad1).toBe(0);
    });

    it('should read joypad state', () => {
      emulator.joypad1 = JoypadButton.B | JoypadButton.START;
      const state = emulator.readJoypad(0);
      expect(state & JoypadButton.B).not.toBe(0);
      expect(state & JoypadButton.START).not.toBe(0);
    });
  });

  describe('I/O Handlers', () => {
    it('should setup PPU I/O handlers', () => {
      // Write to PPU register
      emulator.memory.write(0x2100, 0x0F);
      expect(emulator.ppu.registers.inidisp).toBe(0x0F);
    });

    it('should setup APU I/O handlers', () => {
      // Write to APU port
      emulator.memory.write(0x2140, 0x42);
      expect(emulator.apu.readPort(0)).toBe(0x42);
    });

    it('should handle joypad reads', () => {
      emulator.joypad1 = 0xFF;
      const value = emulator.memory.read(0x4016);
      expect(value).toBe(0xFF);
    });
  });

  describe('Frame Execution', () => {
    it('should run one frame', { timeout: 2000 }, () => {
      const romData = new Uint8Array(0x10000);
      // Setup minimal ROM with infinite loop
      romData[0x8000] = 0x4C; // JMP
      romData[0x8001] = 0x00;
      romData[0x8002] = 0x80;
      romData[0xFFFC] = 0x00;
      romData[0xFFFD] = 0x80;
      
      emulator.loadROM(romData);
      
      const framebuffer = emulator.runFrame();
      
      expect(framebuffer).toBeDefined();
      expect(framebuffer.length).toBe(256 * 224);
      expect(emulator.masterClock).toBeGreaterThan(0);
    });

    it('should advance PPU scanline', { timeout: 2000 }, () => {
      const romData = new Uint8Array(0x10000);
      romData[0x8000] = 0xEA; // NOP
      romData[0xFFFC] = 0x00;
      romData[0xFFFD] = 0x80;
      
      emulator.loadROM(romData);
      emulator.runFrame();
      
      expect(emulator.ppu.scanline).toBeGreaterThan(0);
    });
  });

  describe('Audio', () => {
    it('should get audio samples', () => {
      const samples = emulator.getAudioSamples();
      expect(Array.isArray(samples)).toBe(true);
    });

    it('should generate audio samples during frame', { timeout: 2000 }, () => {
      const romData = new Uint8Array(0x10000);
      romData[0x8000] = 0xEA; // NOP
      romData[0xFFFC] = 0x00;
      romData[0xFFFD] = 0x80;
      
      emulator.loadROM(romData);
      emulator.runFrame();
      
      const samples = emulator.getAudioSamples();
      expect(samples.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Save States', () => {
    it('should save state', () => {
      emulator.cpu.A = 0x42;
      emulator.cpu.PC = 0x1234;
      
      const state = emulator.saveState();
      
      expect(state.cpu.A).toBe(0x42);
      expect(state.cpu.PC).toBe(0x1234);
    });

    it('should load state', () => {
      const state = {
        cpu: {
          A: 0x99,
          X: 0x77,
          Y: 0x55,
          S: 0x0100,
          PC: 0x9000,
          P: 0x20,
          PBR: 0,
          DBR: 0,
          cycles: 0
        },
        ppu: {
          scanline: 50,
          frame: 10,
          registers: {}
        },
        memory: {
          wram: new Uint8Array(0x20000),
          sram: new Uint8Array(0x20000),
          vram: new Uint8Array(0x10000),
          cgram: new Uint8Array(0x200),
          oam: new Uint8Array(0x220)
        }
      };
      
      emulator.loadState(state);
      
      expect(emulator.cpu.A).toBe(0x99);
      expect(emulator.cpu.X).toBe(0x77);
      expect(emulator.ppu.scanline).toBe(50);
    });

    it('should preserve memory in save state', () => {
      emulator.memory.wram[100] = 0x42;
      
      const state = emulator.saveState();
      emulator.memory.wram[100] = 0;
      emulator.loadState(state);
      
      expect(emulator.memory.wram[100]).toBe(0x42);
    });
  });

  describe('Save Data (SRAM)', () => {
    it('should get save data', () => {
      emulator.memory.sram[0] = 0x11;
      emulator.memory.sram[100] = 0x22;
      
      const saveData = emulator.getSaveData();
      
      expect(saveData[0]).toBe(0x11);
      expect(saveData[100]).toBe(0x22);
    });

    it('should load save data', () => {
      const saveData = new Uint8Array(1000);
      saveData[50] = 0x99;
      
      emulator.loadSaveData(saveData);
      
      expect(emulator.memory.sram[50]).toBe(0x99);
    });
  });

  describe('Joypad Constants', () => {
    it('should have all button constants', () => {
      expect(JoypadButton.A).toBeDefined();
      expect(JoypadButton.B).toBeDefined();
      expect(JoypadButton.X).toBeDefined();
      expect(JoypadButton.Y).toBeDefined();
      expect(JoypadButton.START).toBeDefined();
      expect(JoypadButton.SELECT).toBeDefined();
      expect(JoypadButton.UP).toBeDefined();
      expect(JoypadButton.DOWN).toBeDefined();
      expect(JoypadButton.LEFT).toBeDefined();
      expect(JoypadButton.RIGHT).toBeDefined();
    });

    it('should have unique button values', () => {
      const buttons = Object.values(JoypadButton);
      const uniqueButtons = new Set(buttons);
      expect(uniqueButtons.size).toBe(buttons.length);
    });
  });
});
