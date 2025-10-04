import { describe, it, expect, beforeEach } from 'vitest';
import { APU } from './apu.js';
import { Memory } from '../memory/memory.js';

describe('APU', () => {
  let apu;
  let memory;

  beforeEach(() => {
    memory = new Memory();
    apu = new APU(memory);
  });

  describe('Initialization', () => {
    it('should initialize with correct register values', () => {
      expect(apu.A).toBe(0);
      expect(apu.X).toBe(0);
      expect(apu.Y).toBe(0);
      expect(apu.SP).toBe(0xFF);
      expect(apu.PC).toBe(0xFFC0);
    });

    it('should initialize DSP registers', () => {
      expect(apu.dspRegisters.length).toBe(128);
      expect(apu.dspRegisters[0]).toBe(0);
    });

    it('should initialize with empty audio buffer', () => {
      expect(apu.buffer).toEqual([]);
    });
  });

  describe('APU RAM Access', () => {
    it('should read from APU RAM', () => {
      memory.apuRam[0x100] = 0x42;
      expect(apu.readAPURAM(0x100)).toBe(0x42);
    });

    it('should write to APU RAM', () => {
      apu.writeAPURAM(0x200, 0x99);
      expect(memory.apuRam[0x200]).toBe(0x99);
    });

    it('should wrap APU RAM addresses', () => {
      apu.writeAPURAM(0x10000, 0x11);
      expect(memory.apuRam[0]).toBe(0x11);
    });

    it('should mask written values to 8 bits', () => {
      apu.writeAPURAM(0x100, 0x1FF);
      expect(memory.apuRam[0x100]).toBe(0xFF);
    });
  });

  describe('DSP Registers', () => {
    it('should write to DSP registers', () => {
      apu.writeDSP(0x0C, 0x7F); // Main volume left
      expect(apu.dspRegisters[0x0C]).toBe(0x7F);
    });

    it('should read from DSP registers', () => {
      apu.dspRegisters[0x1C] = 0x42;
      expect(apu.readDSP(0x1C)).toBe(0x42);
    });

    it('should ignore out-of-range DSP registers', () => {
      apu.writeDSP(128, 0xFF);
      expect(apu.dspRegisters[127]).toBe(0);
    });

    it('should return 0 for out-of-range DSP reads', () => {
      expect(apu.readDSP(200)).toBe(0);
    });
  });

  describe('Communication Ports', () => {
    it('should write to port 0', () => {
      apu.writePort(0, 0x42);
      expect(apu.readAPURAM(0xF4)).toBe(0x42);
    });

    it('should write to port 3', () => {
      apu.writePort(3, 0x99);
      expect(apu.readAPURAM(0xF7)).toBe(0x99);
    });

    it('should read from ports', () => {
      apu.writeAPURAM(0xF5, 0x77);
      expect(apu.readPort(1)).toBe(0x77);
    });

    it('should ignore invalid port numbers', () => {
      apu.writePort(5, 0xFF);
      expect(apu.readPort(5)).toBe(0);
    });
  });

  describe('Audio Generation', () => {
    it('should generate samples', () => {
      apu.generateSamples(1024);
      expect(apu.buffer.length).toBeGreaterThan(0);
    });

    it('should generate stereo samples', () => {
      apu.generateSamples(1024);
      // Buffer should have even number of samples (L/R pairs)
      expect(apu.buffer.length % 2).toBe(0);
    });

    it('should get and clear audio buffer', () => {
      apu.buffer = [1, 2, 3, 4];
      const buffer = apu.getAudioBuffer();
      
      expect(buffer).toEqual([1, 2, 3, 4]);
      expect(apu.buffer).toEqual([]);
    });
  });

  describe('Timing', () => {
    it('should execute cycles', () => {
      const initialCycles = apu.cycles;
      apu.step(100);
      expect(apu.cycles).toBeGreaterThan(initialCycles);
    });

    it('should scale CPU cycles to APU cycles', () => {
      // APU runs slower than CPU
      const cpuCycles = 1000;
      apu.step(cpuCycles);
      
      // APU should have run fewer cycles
      expect(apu.cycles).toBeLessThan(cpuCycles);
    });
  });

  describe('Reset', () => {
    it('should reset all registers', () => {
      apu.A = 0x42;
      apu.X = 0x99;
      apu.buffer = [1, 2, 3];
      
      apu.reset();
      
      expect(apu.A).toBe(0);
      expect(apu.X).toBe(0);
      expect(apu.buffer).toEqual([]);
    });

    it('should reset PC to reset vector', () => {
      apu.PC = 0x1234;
      apu.reset();
      expect(apu.PC).toBe(0xFFC0);
    });

    it('should clear APU RAM', () => {
      memory.apuRam[100] = 0xFF;
      apu.reset();
      expect(memory.apuRam[100]).toBe(0);
    });
  });
});
