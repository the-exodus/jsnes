import { describe, it, expect, beforeEach } from 'vitest';
import { CPU, CPUFlags } from './cpu.js';

/**
 * Mock memory for testing
 */
class MockMemory {
  constructor() {
    this.data = new Uint8Array(0x10000);
  }

  read(address) {
    return this.data[address & 0xFFFF];
  }

  read16(address) {
    const low = this.read(address);
    const high = this.read(address + 1);
    return (high << 8) | low;
  }

  write(address, value) {
    this.data[address & 0xFFFF] = value & 0xFF;
  }

  write16(address, value) {
    this.write(address, value & 0xFF);
    this.write(address + 1, (value >> 8) & 0xFF);
  }
}

describe('CPU', () => {
  let cpu;
  let memory;

  beforeEach(() => {
    memory = new MockMemory();
    memory.write16(0xFFFC, 0x8000); // Reset vector
    cpu = new CPU(memory);
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(cpu.A).toBe(0);
      expect(cpu.X).toBe(0);
      expect(cpu.Y).toBe(0);
      expect(cpu.S).toBe(0x01FF);
      expect(cpu.PC).toBe(0x8000);
      expect(cpu.emulationMode).toBe(true);
    });

    it('should start in 8-bit mode', () => {
      expect(cpu.getFlag(CPUFlags.MEMORY_8BIT)).toBe(true);
      expect(cpu.getFlag(CPUFlags.INDEX_8BIT)).toBe(true);
    });
  });

  describe('Flag Operations', () => {
    it('should set and clear flags correctly', () => {
      cpu.setFlag(CPUFlags.CARRY, true);
      expect(cpu.getFlag(CPUFlags.CARRY)).toBe(true);
      
      cpu.setFlag(CPUFlags.CARRY, false);
      expect(cpu.getFlag(CPUFlags.CARRY)).toBe(false);
    });

    it('should update zero flag correctly', () => {
      cpu.updateZeroFlag(0);
      expect(cpu.getFlag(CPUFlags.ZERO)).toBe(true);
      
      cpu.updateZeroFlag(42);
      expect(cpu.getFlag(CPUFlags.ZERO)).toBe(false);
    });

    it('should update negative flag correctly in 8-bit mode', () => {
      cpu.P |= CPUFlags.MEMORY_8BIT;
      
      cpu.updateNegativeFlag(0x80);
      expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(true);
      
      cpu.updateNegativeFlag(0x7F);
      expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(false);
    });

    it('should update negative flag correctly in 16-bit mode', () => {
      cpu.P &= ~CPUFlags.MEMORY_8BIT;
      
      cpu.updateNegativeFlag(0x8000);
      expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(true);
      
      cpu.updateNegativeFlag(0x7FFF);
      expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(false);
    });
  });

  describe('Stack Operations', () => {
    it('should push and pop 8-bit values', () => {
      cpu.push8(0x42);
      expect(cpu.S).toBe(0x01FE);
      
      const value = cpu.pop8();
      expect(value).toBe(0x42);
      expect(cpu.S).toBe(0x01FF);
    });

    it('should push and pop 16-bit values', () => {
      cpu.push16(0x1234);
      expect(cpu.S).toBe(0x01FD);
      
      const value = cpu.pop16();
      expect(value).toBe(0x1234);
      expect(cpu.S).toBe(0x01FF);
    });

    it('should wrap stack pointer', () => {
      cpu.S = 0x0000;
      cpu.push8(0xFF);
      expect(cpu.S).toBe(0xFFFF);
    });
  });

  describe('Addressing Modes', () => {
    beforeEach(() => {
      cpu.PC = 0x8000;
    });

    it('should handle immediate addressing', () => {
      memory.write(0x8000, 0x42);
      const addr = cpu.immediate();
      expect(addr).toBe(0x8000);
      expect(cpu.PC).toBe(0x8001);
    });

    it('should handle absolute addressing', () => {
      memory.write16(0x8000, 0x1234);
      const addr = cpu.absolute();
      expect(addr).toBe(0x1234);
      expect(cpu.PC).toBe(0x8002);
    });

    it('should handle absolute,X addressing', () => {
      cpu.X = 0x10;
      memory.write16(0x8000, 0x1000);
      const addr = cpu.absoluteX();
      expect(addr).toBe(0x1010);
      expect(cpu.PC).toBe(0x8002);
    });

    it('should handle absolute,Y addressing', () => {
      cpu.Y = 0x20;
      memory.write16(0x8000, 0x1000);
      const addr = cpu.absoluteY();
      expect(addr).toBe(0x1020);
      expect(cpu.PC).toBe(0x8002);
    });

    it('should handle zero page addressing', () => {
      memory.write(0x8000, 0x42);
      const addr = cpu.zeroPage();
      expect(addr).toBe(0x42);
      expect(cpu.PC).toBe(0x8001);
    });

    it('should handle zero page,X addressing', () => {
      cpu.X = 0x05;
      memory.write(0x8000, 0x40);
      const addr = cpu.zeroPageX();
      expect(addr).toBe(0x45);
      expect(cpu.PC).toBe(0x8001);
    });

    it('should wrap zero page,X addressing', () => {
      cpu.X = 0x10;
      memory.write(0x8000, 0xFF);
      const addr = cpu.zeroPageX();
      expect(addr).toBe(0x0F);
    });
  });

  describe('LDA Instruction', () => {
    it('should load accumulator in 8-bit mode', () => {
      cpu.PC = 0x8000;
      memory.write(0x8000, 0xA9); // LDA #immediate
      memory.write(0x8001, 0x42);
      
      cpu.step();
      
      expect(cpu.A & 0xFF).toBe(0x42);
      expect(cpu.getFlag(CPUFlags.ZERO)).toBe(false);
      expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(false);
    });

    it('should set zero flag when loading zero', () => {
      cpu.PC = 0x8000;
      memory.write(0x8000, 0xA9); // LDA #immediate
      memory.write(0x8001, 0x00);
      
      cpu.step();
      
      expect(cpu.A).toBe(0);
      expect(cpu.getFlag(CPUFlags.ZERO)).toBe(true);
    });

    it('should set negative flag when loading negative value', () => {
      cpu.PC = 0x8000;
      memory.write(0x8000, 0xA9); // LDA #immediate
      memory.write(0x8001, 0x80);
      
      cpu.step();
      
      expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(true);
    });

    it('should load from absolute address', () => {
      cpu.PC = 0x8000;
      memory.write(0x8000, 0xAD); // LDA absolute
      memory.write16(0x8001, 0x1234);
      memory.write(0x1234, 0x99);
      
      cpu.step();
      
      expect(cpu.A & 0xFF).toBe(0x99);
    });
  });

  describe('STA Instruction', () => {
    it('should store accumulator in 8-bit mode', () => {
      cpu.A = 0x42;
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x8D); // STA absolute
      memory.write16(0x8001, 0x1234);
      
      cpu.step();
      
      expect(memory.read(0x1234)).toBe(0x42);
    });

    it('should store to zero page', () => {
      cpu.A = 0x99;
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x85); // STA zeropage
      memory.write(0x8001, 0x50);
      
      cpu.step();
      
      expect(memory.read(0x50)).toBe(0x99);
    });
  });

  describe('Transfer Instructions', () => {
    it('should transfer A to X (TAX)', () => {
      cpu.A = 0x42;
      cpu.PC = 0x8000;
      memory.write(0x8000, 0xAA); // TAX
      
      cpu.step();
      
      expect(cpu.X).toBe(0x42);
      expect(cpu.getFlag(CPUFlags.ZERO)).toBe(false);
      expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(false);
    });

    it('should transfer A to Y (TAY)', () => {
      cpu.A = 0x99;
      cpu.PC = 0x8000;
      memory.write(0x8000, 0xA8); // TAY
      
      cpu.step();
      
      expect(cpu.Y).toBe(0x99);
    });

    it('should transfer X to A (TXA)', () => {
      cpu.X = 0x33;
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x8A); // TXA
      
      cpu.step();
      
      expect(cpu.A).toBe(0x33);
    });

    it('should transfer Y to A (TYA)', () => {
      cpu.Y = 0x77;
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x98); // TYA
      
      cpu.step();
      
      expect(cpu.A).toBe(0x77);
    });
  });

  describe('Flag Instructions', () => {
    it('should clear carry flag (CLC)', () => {
      cpu.setFlag(CPUFlags.CARRY, true);
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x18); // CLC
      
      cpu.step();
      
      expect(cpu.getFlag(CPUFlags.CARRY)).toBe(false);
    });

    it('should set carry flag (SEC)', () => {
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x38); // SEC
      
      cpu.step();
      
      expect(cpu.getFlag(CPUFlags.CARRY)).toBe(true);
    });

    it('should clear interrupt disable (CLI)', () => {
      cpu.setFlag(CPUFlags.IRQ_DISABLE, true);
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x58); // CLI
      
      cpu.step();
      
      expect(cpu.getFlag(CPUFlags.IRQ_DISABLE)).toBe(false);
    });

    it('should set interrupt disable (SEI)', () => {
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x78); // SEI
      
      cpu.step();
      
      expect(cpu.getFlag(CPUFlags.IRQ_DISABLE)).toBe(true);
    });
  });

  describe('Jump Instructions', () => {
    it('should jump to absolute address (JMP)', () => {
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x4C); // JMP absolute
      memory.write16(0x8001, 0x9000);
      
      cpu.step();
      
      expect(cpu.PC).toBe(0x9000);
    });

    it('should jump through indirect address (JMP indirect)', () => {
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x6C); // JMP indirect
      memory.write16(0x8001, 0x1000);
      memory.write16(0x1000, 0x9000);
      
      cpu.step();
      
      expect(cpu.PC).toBe(0x9000);
    });

    it('should jump to subroutine (JSR)', () => {
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x20); // JSR
      memory.write16(0x8001, 0x9000);
      
      cpu.step();
      
      expect(cpu.PC).toBe(0x9000);
      expect(cpu.S).toBe(0x01FD);
      
      const returnAddr = cpu.pop16();
      expect(returnAddr).toBe(0x8002);
    });

    it('should return from subroutine (RTS)', () => {
      cpu.push16(0x8999);
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x60); // RTS
      
      cpu.step();
      
      expect(cpu.PC).toBe(0x899A);
    });
  });

  describe('Stack Instructions', () => {
    it('should push accumulator (PHA)', () => {
      cpu.A = 0x42;
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x48); // PHA
      
      cpu.step();
      
      expect(memory.read(0x01FF)).toBe(0x42);
      expect(cpu.S).toBe(0x01FE);
    });

    it('should pull accumulator (PLA)', () => {
      cpu.push8(0x99);
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x68); // PLA
      
      cpu.step();
      
      expect(cpu.A & 0xFF).toBe(0x99);
      expect(cpu.S).toBe(0x01FF);
    });

    it('should set flags when pulling accumulator', () => {
      cpu.push8(0x00);
      cpu.PC = 0x8000;
      memory.write(0x8000, 0x68); // PLA
      
      cpu.step();
      
      expect(cpu.getFlag(CPUFlags.ZERO)).toBe(true);
    });
  });

  describe('NOP Instruction', () => {
    it('should do nothing', () => {
      cpu.PC = 0x8000;
      cpu.A = 0x42;
      memory.write(0x8000, 0xEA); // NOP
      
      cpu.step();
      
      expect(cpu.A).toBe(0x42);
      expect(cpu.PC).toBe(0x8001);
    });
  });

  describe('Cycle Counting', () => {
    it('should count cycles correctly', () => {
      cpu.PC = 0x8000;
      memory.write(0x8000, 0xA9); // LDA #immediate (2 cycles)
      memory.write(0x8001, 0x42);
      
      const cycles = cpu.step();
      
      expect(cycles).toBeGreaterThan(0);
    });
  });

  describe('Interrupts', () => {
    it('should handle NMI', () => {
      cpu.PC = 0x8000;
      memory.write16(0xFFFA, 0x9000); // NMI vector
      
      cpu.nmiPending = true;
      cpu.step();
      
      expect(cpu.PC).toBe(0x9000);
      expect(cpu.getFlag(CPUFlags.IRQ_DISABLE)).toBe(true);
    });

    it('should handle IRQ when not disabled', () => {
      cpu.PC = 0x8000;
      cpu.setFlag(CPUFlags.IRQ_DISABLE, false);
      memory.write16(0xFFFE, 0x9000); // IRQ vector
      memory.write(0x8000, 0xEA); // NOP
      
      cpu.irqPending = true;
      cpu.step();
      
      expect(cpu.PC).toBe(0x9000);
    });

    it('should not handle IRQ when disabled', () => {
      cpu.PC = 0x8000;
      cpu.setFlag(CPUFlags.IRQ_DISABLE, true);
      memory.write(0x8000, 0xEA); // NOP
      
      cpu.irqPending = true;
      cpu.step();
      
      expect(cpu.PC).toBe(0x8001);
    });
  });
});
