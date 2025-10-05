import { describe, it, expect, beforeEach } from 'vitest';
import { Memory } from './memory.js';

describe('Memory', () => {
  let memory;

  beforeEach(() => {
    memory = new Memory();
  });

  describe('Initialization', () => {
    it('should initialize with correct memory sizes', () => {
      expect(memory.wram.length).toBe(0x20000); // 128KB
      expect(memory.sram.length).toBe(0x20000); // 128KB
      expect(memory.vram.length).toBe(0x10000); // 64KB
      expect(memory.cgram.length).toBe(0x200);  // 512 bytes
      expect(memory.oam.length).toBe(0x220);    // 544 bytes
      expect(memory.apuRam.length).toBe(0x10000); // 64KB
    });

    it('should start with LoROM mapper by default', () => {
      expect(memory.mapperType).toBe('lorom');
    });

    it('should initialize memory to zero (except IPL HLE vectors)', () => {
      // WRAM $0000-$0001 contains NMI handler vector ($801D) for IPL HLE
      expect(memory.wram[0]).toBe(0x1D);
      expect(memory.wram[1]).toBe(0x80);
      // Rest of WRAM should be zero
      expect(memory.wram[2]).toBe(0);
      expect(memory.wram[100]).toBe(0);
      expect(memory.vram[0]).toBe(0);
    });
  });

  describe('WRAM Access', () => {
    it('should read and write to WRAM', () => {
      memory.write(0x7E0000, 0x42);
      expect(memory.read(0x7E0000)).toBe(0x42);
    });

    it('should handle WRAM mirroring', () => {
      memory.write(0x000100, 0x99);
      expect(memory.read(0x000100)).toBe(0x99);
    });

    it('should handle 16-bit reads and writes', () => {
      memory.write16(0x7E0000, 0x1234);
      expect(memory.read16(0x7E0000)).toBe(0x1234);
      expect(memory.read(0x7E0000)).toBe(0x34);
      expect(memory.read(0x7E0001)).toBe(0x12);
    });
  });

  describe('ROM Loading', () => {
    it('should load ROM data', () => {
      const romData = new Uint8Array(0x10000);
      romData[0] = 0x42;
      romData[0xFFFC] = 0x00;
      romData[0xFFFD] = 0x80;
      
      memory.loadROM(romData);
      
      expect(memory.rom).toBeDefined();
      expect(memory.rom.length).toBe(0x10000);
    });

    it('should detect LoROM mapper', () => {
      const romData = new Uint8Array(0x10000);
      
      // Setup LoROM header at 0x7FC0
      const headerOffset = 0x7FC0;
      romData[headerOffset + 0x10] = 0x41; // Maker code 'A'
      romData[headerOffset + 0x15] = 0x20; // ROM type
      romData[headerOffset + 0x17] = 0x09; // ROM size (512KB)
      
      // Valid checksum
      romData[headerOffset + 0x1C] = 0xFF;
      romData[headerOffset + 0x1D] = 0xFF;
      romData[headerOffset + 0x1E] = 0x00;
      romData[headerOffset + 0x1F] = 0x00;
      
      memory.loadROM(romData);
      
      expect(memory.mapperType).toBe('lorom');
    });

    it('should detect HiROM mapper', () => {
      const romData = new Uint8Array(0x10000);
      
      // Setup HiROM header at 0xFFC0
      const headerOffset = 0xFFC0;
      romData[headerOffset + 0x10] = 0x42; // Maker code 'B'
      romData[headerOffset + 0x15] = 0x21; // ROM type
      romData[headerOffset + 0x17] = 0x09; // ROM size
      
      // Valid checksum
      romData[headerOffset + 0x1C] = 0xFF;
      romData[headerOffset + 0x1D] = 0xFF;
      romData[headerOffset + 0x1E] = 0x00;
      romData[headerOffset + 0x1F] = 0x00;
      
      memory.loadROM(romData);
      
      expect(memory.mapperType).toBe('hirom');
    });
  });

  describe('LoROM Mapping', () => {
    beforeEach(() => {
      const romData = new Uint8Array(0x80000); // 512KB
      for (let i = 0; i < romData.length; i++) {
        romData[i] = i & 0xFF;
      }
      memory.loadROM(romData);
      memory.mapperType = 'lorom';
      memory.setupMapper();
    });

    it('should map WRAM in low banks', () => {
      const mapped = memory.mapLoROM(0x001000);
      expect(mapped.type).toBe('wram');
      expect(mapped.addr).toBe(0x1000);
    });

    it('should map I/O registers', () => {
      const mapped = memory.mapLoROM(0x002100);
      expect(mapped.type).toBe('io');
      expect(mapped.addr).toBe(0x2100);
    });

    it('should map ROM in upper half of banks', () => {
      const mapped = memory.mapLoROM(0x008000);
      expect(mapped.type).toBe('rom');
      expect(mapped.addr).toBe(0x0000);
    });

    it('should map ROM across multiple banks', () => {
      const mapped = memory.mapLoROM(0x018000);
      expect(mapped.type).toBe('rom');
      expect(mapped.addr).toBe(0x8000); // Second bank
    });

    it('should handle bank mirroring', () => {
      const mapped1 = memory.mapLoROM(0x008000);
      const mapped2 = memory.mapLoROM(0x808000);
      expect(mapped1.type).toBe(mapped2.type);
      expect(mapped1.addr).toBe(mapped2.addr);
    });
  });

  describe('HiROM Mapping', () => {
    beforeEach(() => {
      const romData = new Uint8Array(0x100000); // 1MB
      for (let i = 0; i < romData.length; i++) {
        romData[i] = i & 0xFF;
      }
      memory.loadROM(romData);
      memory.mapperType = 'hirom';
      memory.setupMapper();
    });

    it('should map WRAM in low banks', () => {
      const mapped = memory.mapHiROM(0x001000);
      expect(mapped.type).toBe('wram');
    });

    it('should map ROM in high banks', () => {
      const mapped = memory.mapHiROM(0x400000);
      expect(mapped.type).toBe('rom');
    });

    it('should map ROM in upper half of low banks', () => {
      const mapped = memory.mapHiROM(0x008000);
      expect(mapped.type).toBe('rom');
    });
  });

  describe('I/O Handlers', () => {
    it('should register and call read handler', () => {
      let readCalled = false;
      memory.registerIOHandler(0x2100, () => {
        readCalled = true;
        return 0x42;
      }, null);
      
      const value = memory.readIO(0x2100);
      
      expect(readCalled).toBe(true);
      expect(value).toBe(0x42);
    });

    it('should register and call write handler', () => {
      let writeCalled = false;
      let writtenValue = 0;
      
      memory.registerIOHandler(0x2100, null, (value) => {
        writeCalled = true;
        writtenValue = value;
      });
      
      memory.writeIO(0x2100, 0x99);
      
      expect(writeCalled).toBe(true);
      expect(writtenValue).toBe(0x99);
    });

    it('should return default value for unmapped I/O', () => {
      const value = memory.readIO(0x3000);
      expect(value).toBe(0xFF); // Open bus
    });
  });

  describe('Save Data', () => {
    it('should save and load SRAM', () => {
      memory.sram[0] = 0x42;
      memory.sram[100] = 0x99;
      
      const saveData = memory.getSaveData();
      
      expect(saveData[0]).toBe(0x42);
      expect(saveData[100]).toBe(0x99);
    });

    it('should load save data', () => {
      const saveData = new Uint8Array(0x1000);
      saveData[0] = 0x11;
      saveData[50] = 0x22;
      
      memory.loadSaveData(saveData);
      
      expect(memory.sram[0]).toBe(0x11);
      expect(memory.sram[50]).toBe(0x22);
    });

    it('should not overflow when loading save data', () => {
      const tooLargeSaveData = new Uint8Array(memory.sram.length + 1000);
      
      expect(() => {
        memory.loadSaveData(tooLargeSaveData);
      }).not.toThrow();
    });
  });

  describe('DMA Transfer', () => {
    beforeEach(() => {
      const romData = new Uint8Array(0x10000);
      for (let i = 0; i < romData.length; i++) {
        romData[i] = i & 0xFF;
      }
      memory.loadROM(romData);
    });

    it('should transfer data between memory regions', () => {
      memory.write(0x7E0100, 0x11);
      memory.write(0x7E0101, 0x22);
      memory.write(0x7E0102, 0x33);
      
      memory.dmaTransfer(0, 0x7E0100, 0x7E0200, 3);
      
      expect(memory.read(0x7E0200)).toBe(0x11);
      expect(memory.read(0x7E0201)).toBe(0x22);
      expect(memory.read(0x7E0202)).toBe(0x33);
    });
  });

  describe('Edge Cases', () => {
    it('should handle reading from uninitialized ROM', () => {
      const value = memory.read(0x808000);
      expect(value).toBe(0xFF); // Open bus
    });

    it('should handle writing to ROM (no-op)', () => {
      const romData = new Uint8Array(0x10000);
      romData[0] = 0x42;
      memory.loadROM(romData);
      
      memory.write(0x808000, 0x99);
      
      expect(memory.read(0x808000)).toBe(0x42); // Unchanged
    });

    it('should mask written values to 8 bits', () => {
      memory.write(0x7E0000, 0x1FF);
      expect(memory.read(0x7E0000)).toBe(0xFF);
    });
  });
});
