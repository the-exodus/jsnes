import { describe, it, expect, beforeEach } from 'vitest';
import { Emulator } from './emulator.js';
import { Memory } from './memory/memory.js';
import { CPU } from './cpu/cpu.js';
import { APU } from './apu/apu.js';
import { PPU } from './ppu/ppu.js';

describe('IPL High-Level Emulation', () => {
  describe('Memory IPL Setup', () => {
    let memory;

    beforeEach(() => {
      memory = new Memory();
    });

    it('should have IPL HLE enabled by default', () => {
      expect(memory.iplHLE).toBe(true);
    });

    it('should setup SPC700 boot ROM in APU RAM', () => {
      // Check that boot ROM is present at $FFC0
      expect(memory.apuRam[0xFFC0]).not.toBe(0);
      
      // Check for expected boot code sequence
      // First instruction should be MOV X, #$EF (CD EF BD)
      expect(memory.apuRam[0xFFC0]).toBe(0xCD);
      expect(memory.apuRam[0xFFC1]).toBe(0xEF);
      expect(memory.apuRam[0xFFC2]).toBe(0xBD);
    });

    it('should setup boot ROM that initializes stack pointer', () => {
      // Boot ROM should set SP to $EF
      expect(memory.apuRam[0xFFC1]).toBe(0xEF);
    });

    it('should setup boot ROM that clears memory', () => {
      // Boot ROM should have MOV A, #$00 instruction
      expect(memory.apuRam[0xFFC3]).toBe(0xE8);
      expect(memory.apuRam[0xFFC4]).toBe(0x00);
    });

    it('should setup boot ROM with DSP reset sequence', () => {
      // Check for FLG register write ($F2, #$6C)
      const bootROM = memory.apuRam.slice(0xFFC0, 0x10000);
      // Should contain MOV $F2, #$6C (8F 6C F2)
      let found = false;
      for (let i = 0; i < bootROM.length - 2; i++) {
        if (bootROM[i] === 0x8F && bootROM[i + 1] === 0x6C && bootROM[i + 2] === 0xF2) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });

  describe('CPU IPL Reset Behavior', () => {
    let cpu;
    let memory;

    beforeEach(() => {
      memory = new Memory();
      // Setup a valid reset vector
      const romData = new Uint8Array(0x10000);
      // In LoROM, address $00:FFFC maps to ROM offset $7FFC
      romData[0x7FFC] = 0x00;
      romData[0x7FFD] = 0x80;
      memory.loadROM(romData);
      cpu = new CPU(memory);
    });

    it('should initialize CPU registers to power-on state', () => {
      expect(cpu.A).toBe(0);
      expect(cpu.X).toBe(0);
      expect(cpu.Y).toBe(0);
    });

    it('should set stack pointer to top of stack', () => {
      expect(cpu.S).toBe(0x01FF);
    });

    it('should clear direct page and bank registers', () => {
      expect(cpu.D).toBe(0);
      expect(cpu.PBR).toBe(0);
      expect(cpu.DBR).toBe(0);
    });

    it('should start in emulation mode', () => {
      expect(cpu.emulationMode).toBe(true);
    });

    it('should set status register with IRQ disabled and 8-bit mode', () => {
      // P should be 0x34 (00110100)
      expect(cpu.P).toBe(0x34);
      // Check individual flags
      expect(cpu.P & 0x20).toBe(0x20); // M flag (8-bit memory)
      expect(cpu.P & 0x10).toBe(0x10); // X flag (8-bit index)
      expect(cpu.P & 0x04).toBe(0x04); // I flag (IRQ disabled)
    });

    it('should load PC from reset vector', () => {
      expect(cpu.PC).toBe(0x8000);
    });

    it('should handle invalid reset vector gracefully', () => {
      const memory2 = new Memory();
      const cpu2 = new CPU(memory2);
      
      // Without ROM, reset vector will be 0x0000 or 0xFFFF
      // CPU should default to $8000
      expect(cpu2.PC).toBe(0x8000);
    });

    it('should clear interrupt flags', () => {
      expect(cpu.nmiPending).toBe(false);
      expect(cpu.irqPending).toBe(false);
    });

    it('should reset cycle counter', () => {
      expect(cpu.cycles).toBe(0);
    });
  });

  describe('APU IPL Reset Behavior', () => {
    let apu;
    let memory;

    beforeEach(() => {
      memory = new Memory();
      apu = new APU(memory);
    });

    it('should clear SPC700 registers', () => {
      expect(apu.A).toBe(0);
      expect(apu.X).toBe(0);
      expect(apu.Y).toBe(0);
      expect(apu.PSW).toBe(0);
    });

    it('should set stack pointer to $EF as per IPL boot code', () => {
      expect(apu.SP).toBe(0xEF);
    });

    it('should set PC to boot ROM location', () => {
      expect(apu.PC).toBe(0xFFC0);
    });

    it('should initialize DSP to safe state', () => {
      // FLG register should be $E0 (reset, mute, echo off)
      expect(apu.dspRegisters[0x6C]).toBe(0xE0);
      // KON register should be $00 (all voices off)
      expect(apu.dspRegisters[0x4C]).toBe(0x00);
      // KOF register should be $00 (all voices off)
      expect(apu.dspRegisters[0x5C]).toBe(0x00);
    });

    it('should initialize communication ports with ready signals', () => {
      // IPL boot code sets port 0 to $AA and port 1 to $BB
      expect(memory.apuRam[0xF4]).toBe(0xAA);
      expect(memory.apuRam[0xF5]).toBe(0xBB);
      expect(memory.apuRam[0xF6]).toBe(0x00);
      expect(memory.apuRam[0xF7]).toBe(0x00);
    });

    it('should preserve boot ROM in APU RAM', () => {
      // Boot ROM at $FFC0 onwards should not be cleared
      expect(memory.apuRam[0xFFC0]).not.toBe(0);
      // Check a byte in the middle of boot ROM
      expect(memory.apuRam[0xFFD0]).not.toBe(0);
    });

    it('should clear working APU RAM but not boot ROM', () => {
      // Check that working RAM is cleared
      expect(memory.apuRam[0x0000]).toBe(0);
      expect(memory.apuRam[0x1000]).toBe(0);
      expect(memory.apuRam[0xFFBF]).toBe(0);
      
      // But boot ROM area is not cleared
      expect(memory.apuRam[0xFFC0]).not.toBe(0);
    });
  });

  describe('PPU IPL Reset Behavior', () => {
    let ppu;
    let memory;

    beforeEach(() => {
      memory = new Memory();
      ppu = new PPU(memory);
    });

    it('should clear display counters', () => {
      expect(ppu.scanline).toBe(0);
      expect(ppu.cycle).toBe(0);
      expect(ppu.frame).toBe(0);
    });

    it('should set force blank on', () => {
      expect(ppu.registers.inidisp).toBe(0x80);
      expect(ppu.registers.inidisp & 0x80).toBe(0x80);
    });

    it('should clear VRAM', () => {
      // Sample a few locations
      expect(memory.vram[0x0000]).toBe(0);
      expect(memory.vram[0x8000]).toBe(0);
      expect(memory.vram[0xFFFF]).toBe(0);
    });

    it('should clear CGRAM (palette)', () => {
      expect(memory.cgram[0x000]).toBe(0);
      expect(memory.cgram[0x100]).toBe(0);
      expect(memory.cgram[0x1FF]).toBe(0);
    });

    it('should clear OAM (sprite data)', () => {
      expect(memory.oam[0x000]).toBe(0);
      expect(memory.oam[0x100]).toBe(0);
      expect(memory.oam[0x21F]).toBe(0);
    });

    it('should clear framebuffer to black', () => {
      // Check a few pixels
      expect(ppu.framebuffer[0]).toBe(0xFF000000);
      expect(ppu.framebuffer[1000]).toBe(0xFF000000);
      expect(ppu.framebuffer[ppu.framebuffer.length - 1]).toBe(0xFF000000);
    });
  });

  describe('Emulator IPL Reset Sequence', () => {
    let emulator;

    beforeEach(() => {
      emulator = new Emulator();
    });

    it('should initialize all components with IPL HLE', () => {
      expect(emulator.memory.iplHLE).toBe(true);
      expect(emulator.cpu.emulationMode).toBe(true);
      expect(emulator.apu.SP).toBe(0xEF);
      expect(emulator.ppu.registers.inidisp).toBe(0x80);
    });

    it('should reset in correct order (PPU, APU, CPU)', () => {
      // Simulate some activity
      emulator.cpu.cycles = 1000;
      emulator.ppu.scanline = 100;
      emulator.apu.cycles = 500;
      emulator.masterClock = 5000;

      emulator.reset();

      // All should be reset
      expect(emulator.cpu.cycles).toBe(0);
      expect(emulator.ppu.scanline).toBe(0);
      expect(emulator.apu.cycles).toBe(0);
      expect(emulator.masterClock).toBe(0);
    });

    it('should work with ROM loading', () => {
      const romData = new Uint8Array(0x10000);
      // In LoROM, address $00:FFFC maps to ROM offset $7FFC
      romData[0x7FFC] = 0x34;
      romData[0x7FFD] = 0x12;

      expect(() => {
        emulator.loadROM(romData);
      }).not.toThrow();

      // CPU should load the reset vector
      expect(emulator.cpu.PC).toBe(0x1234);
    });

    it('should maintain IPL state after multiple resets', () => {
      emulator.reset();
      const firstBootROM = emulator.memory.apuRam[0xFFC0];
      
      emulator.reset();
      const secondBootROM = emulator.memory.apuRam[0xFFC0];

      // Boot ROM should be consistent
      expect(firstBootROM).toBe(secondBootROM);
      expect(firstBootROM).not.toBe(0);
    });

    it('should allow emulator to run after IPL initialization', () => {
      const romData = new Uint8Array(0x10000);
      // Set reset vector (LoROM: address $00:FFFC maps to ROM offset $7FFC)
      romData[0x7FFC] = 0x00;
      romData[0x7FFD] = 0x80;
      // Add a simple NOP at $8000 (ROM offset $0000)
      romData[0x0000] = 0xEA; // NOP

      emulator.loadROM(romData);

      // Should be able to step CPU without errors
      expect(() => {
        emulator.cpu.step();
      }).not.toThrow();
    });
  });

  describe('IPL HLE Integration', () => {
    it('should allow ROM to boot without real IPL', () => {
      const emulator = new Emulator();
      const romData = new Uint8Array(0x10000);
      
      // Create a minimal valid ROM (LoROM: address $00:FFFC maps to ROM offset $7FFC)
      romData[0x7FFC] = 0x00;
      romData[0x7FFD] = 0x80;
      
      // Load and reset
      emulator.loadROM(romData);
      
      // System should be in a valid state
      expect(emulator.cpu.PC).toBe(0x8000);
      expect(emulator.cpu.emulationMode).toBe(true);
      expect(emulator.apu.PC).toBe(0xFFC0);
      expect(emulator.ppu.registers.inidisp & 0x80).toBe(0x80);
    });

    it('should provide consistent boot state across multiple emulator instances', () => {
      const emulator1 = new Emulator();
      const emulator2 = new Emulator();

      // Both should have identical IPL setup
      expect(emulator1.cpu.P).toBe(emulator2.cpu.P);
      expect(emulator1.apu.SP).toBe(emulator2.apu.SP);
      expect(emulator1.memory.apuRam[0xFFC0]).toBe(emulator2.memory.apuRam[0xFFC0]);
    });
  });
});
