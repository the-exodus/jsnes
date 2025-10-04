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

  describe('New Opcodes', () => {
    describe('BRK - 0x00', () => {
      it('should break and jump to interrupt vector', () => {
        cpu.PC = 0x8000;
        memory.write16(0xFFFE, 0x9000); // BRK vector in emulation mode
        memory.write(0x8000, 0x00); // BRK
        memory.write(0x8001, 0x00); // Signature byte
        
        cpu.step();
        
        expect(cpu.PC).toBe(0x9000);
        expect(cpu.getFlag(CPUFlags.IRQ_DISABLE)).toBe(true);
      });
    });

    describe('ORA (dp,X) - 0x01', () => {
      it('should OR accumulator with memory at indirect address', () => {
        cpu.A = 0x0F;
        cpu.X = 0x02;
        cpu.D = 0x0000;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x01); // ORA (dp,X)
        memory.write(0x8001, 0x10); // dp = 0x10
        memory.write16(0x0012, 0x2000); // Pointer at dp+X
        memory.write(0x2000, 0xF0); // Value to OR
        
        cpu.step();
        
        expect(cpu.A).toBe(0xFF);
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(false);
        expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(true);
      });
    });

    describe('COP - 0x02', () => {
      it('should trigger co-processor interrupt', () => {
        cpu.PC = 0x8000;
        memory.write16(0xFFF4, 0x9000); // COP vector in emulation mode
        memory.write(0x8000, 0x02); // COP
        memory.write(0x8001, 0x00); // Signature byte
        
        cpu.step();
        
        expect(cpu.PC).toBe(0x9000);
        expect(cpu.getFlag(CPUFlags.IRQ_DISABLE)).toBe(true);
      });
    });

    describe('ASL absolute - 0x0E', () => {
      it('should shift memory left', () => {
        cpu.PC = 0x8000;
        memory.write(0x8000, 0x0E); // ASL absolute
        memory.write16(0x8001, 0x2000);
        memory.write(0x2000, 0x42);
        
        cpu.step();
        
        expect(memory.read(0x2000)).toBe(0x84);
        expect(cpu.getFlag(CPUFlags.CARRY)).toBe(false);
        expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(true);
      });

      it('should set carry flag when bit 7 is set', () => {
        cpu.PC = 0x8000;
        memory.write(0x8000, 0x0E);
        memory.write16(0x8001, 0x2000);
        memory.write(0x2000, 0x81);
        
        cpu.step();
        
        expect(memory.read(0x2000)).toBe(0x02);
        expect(cpu.getFlag(CPUFlags.CARRY)).toBe(true);
      });
    });

    describe('JSL - 0x22', () => {
      it('should jump to long address and save return address', () => {
        cpu.PC = 0x8000;
        cpu.PBR = 0x01;
        cpu.S = 0x01FF;
        
        memory.write(0x8000, 0x22); // JSL
        memory.write16(0x8001, 0x5000); // Target address
        memory.write(0x8003, 0x02); // Target bank
        
        cpu.step();
        
        expect(cpu.PC).toBe(0x5000);
        expect(cpu.PBR).toBe(0x02);
        // Check return address on stack
        expect(cpu.pop16()).toBe(0x8004);
        expect(cpu.pop8()).toBe(0x01);
      });
    });

    describe('BIT zeropage - 0x24', () => {
      it('should test bits without modifying accumulator', () => {
        cpu.A = 0x0F;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x24); // BIT zp
        memory.write(0x8001, 0x10);
        memory.write(0x0010, 0xC0); // Bits 7 and 6 set
        
        cpu.step();
        
        expect(cpu.A).toBe(0x0F); // Unchanged
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(true); // 0x0F & 0xC0 = 0
        expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(true); // Bit 7 of memory
        expect(cpu.getFlag(CPUFlags.OVERFLOW)).toBe(true); // Bit 6 of memory
      });
    });

    describe('BMI - 0x30', () => {
      it('should branch when negative flag is set', () => {
        cpu.PC = 0x8000;
        cpu.setFlag(CPUFlags.NEGATIVE, true);
        
        memory.write(0x8000, 0x30); // BMI
        memory.write(0x8001, 0x10); // +16 offset
        
        cpu.step();
        
        expect(cpu.PC).toBe(0x8012);
      });

      it('should not branch when negative flag is clear', () => {
        cpu.PC = 0x8000;
        cpu.setFlag(CPUFlags.NEGATIVE, false);
        
        memory.write(0x8000, 0x30); // BMI
        memory.write(0x8001, 0x10);
        
        cpu.step();
        
        expect(cpu.PC).toBe(0x8002);
      });

      it('should handle negative offsets', () => {
        cpu.PC = 0x8000;
        cpu.setFlag(CPUFlags.NEGATIVE, true);
        
        memory.write(0x8000, 0x30); // BMI
        memory.write(0x8001, 0xF0); // -16 offset
        
        cpu.step();
        
        expect(cpu.PC).toBe(0x7FF2);
      });
    });

    describe('BRA - 0x80', () => {
      it('should always branch forward', () => {
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x80); // BRA
        memory.write(0x8001, 0x20); // +32 offset
        
        cpu.step();
        
        expect(cpu.PC).toBe(0x8022);
      });

      it('should always branch backward', () => {
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x80); // BRA
        memory.write(0x8001, 0xFE); // -2 offset
        
        cpu.step();
        
        expect(cpu.PC).toBe(0x8000);
      });
    });

    describe('TXS - 0x9A', () => {
      it('should transfer X to stack pointer in emulation mode', () => {
        cpu.emulationMode = true;
        cpu.X = 0x45;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x9A); // TXS
        
        cpu.step();
        
        expect(cpu.S).toBe(0x0145);
      });

      it('should transfer X to stack pointer in native mode', () => {
        cpu.emulationMode = false;
        cpu.X = 0x1234;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x9A); // TXS
        
        cpu.step();
        
        expect(cpu.S).toBe(0x1234);
      });
    });

    describe('PLB - 0xAB', () => {
      it('should pull data bank register from stack', () => {
        cpu.PC = 0x8000;
        cpu.push8(0x42);
        
        memory.write(0x8000, 0xAB); // PLB
        
        cpu.step();
        
        expect(cpu.DBR).toBe(0x42);
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(false);
        expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(false);
      });

      it('should set zero flag when pulling zero', () => {
        cpu.PC = 0x8000;
        cpu.push8(0x00);
        
        memory.write(0x8000, 0xAB);
        
        cpu.step();
        
        expect(cpu.DBR).toBe(0x00);
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(true);
      });
    });

    describe('REP - 0xC2', () => {
      it('should reset processor status bits', () => {
        cpu.PC = 0x8000;
        cpu.P = 0xFF; // All flags set
        
        memory.write(0x8000, 0xC2); // REP
        memory.write(0x8001, 0x30); // Clear MEMORY_8BIT and INDEX_8BIT
        
        cpu.step();
        
        expect(cpu.getFlag(CPUFlags.MEMORY_8BIT)).toBe(false);
        expect(cpu.getFlag(CPUFlags.INDEX_8BIT)).toBe(false);
        expect(cpu.getFlag(CPUFlags.CARRY)).toBe(true); // Others unchanged
      });
    });

    describe('CMP absolute,X - 0xDD', () => {
      it('should compare accumulator with memory', () => {
        cpu.A = 0x50;
        cpu.X = 0x02;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0xDD); // CMP abs,X
        memory.write16(0x8001, 0x2000);
        memory.write(0x2002, 0x30);
        
        cpu.step();
        
        expect(cpu.A).toBe(0x50); // Unchanged
        expect(cpu.getFlag(CPUFlags.CARRY)).toBe(true); // A >= M
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(false);
      });

      it('should set zero flag when equal', () => {
        cpu.A = 0x42;
        cpu.X = 0x00;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0xDD);
        memory.write16(0x8001, 0x2000);
        memory.write(0x2000, 0x42);
        
        cpu.step();
        
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(true);
        expect(cpu.getFlag(CPUFlags.CARRY)).toBe(true);
      });
    });

    describe('SEP - 0xE2', () => {
      it('should set processor status bits', () => {
        cpu.PC = 0x8000;
        cpu.P = 0x00; // All flags clear
        
        memory.write(0x8000, 0xE2); // SEP
        memory.write(0x8001, 0x30); // Set MEMORY_8BIT and INDEX_8BIT
        
        cpu.step();
        
        expect(cpu.getFlag(CPUFlags.MEMORY_8BIT)).toBe(true);
        expect(cpu.getFlag(CPUFlags.INDEX_8BIT)).toBe(true);
      });
    });

    describe('TCD - 0x5B', () => {
      it('should transfer accumulator to direct page register', () => {
        cpu.A = 0x1234;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x5B); // TCD
        
        cpu.step();
        
        expect(cpu.D).toBe(0x1234);
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(false);
      });

      it('should set zero flag when accumulator is zero', () => {
        cpu.A = 0x0000;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x5B);
        
        cpu.step();
        
        expect(cpu.D).toBe(0x0000);
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(true);
      });

      it('should set negative flag when bit 15 is set', () => {
        cpu.A = 0x8000;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x5B);
        
        cpu.step();
        
        expect(cpu.D).toBe(0x8000);
        expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(true);
      });
    });

    describe('XCE - 0xFB', () => {
      it('should exchange carry and emulation mode flags', () => {
        cpu.emulationMode = true;
        cpu.setFlag(CPUFlags.CARRY, false);
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0xFB); // XCE
        
        cpu.step();
        
        expect(cpu.emulationMode).toBe(false);
        expect(cpu.getFlag(CPUFlags.CARRY)).toBe(true);
      });

      it('should set 8-bit mode when entering emulation mode', () => {
        cpu.emulationMode = false;
        cpu.setFlag(CPUFlags.CARRY, true);
        cpu.setFlag(CPUFlags.MEMORY_8BIT, false);
        cpu.setFlag(CPUFlags.INDEX_8BIT, false);
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0xFB);
        
        cpu.step();
        
        expect(cpu.emulationMode).toBe(true);
        expect(cpu.getFlag(CPUFlags.CARRY)).toBe(false);
        expect(cpu.getFlag(CPUFlags.MEMORY_8BIT)).toBe(true);
        expect(cpu.getFlag(CPUFlags.INDEX_8BIT)).toBe(true);
      });

      it('should truncate stack pointer to page 1 in emulation mode', () => {
        cpu.emulationMode = false;
        cpu.setFlag(CPUFlags.CARRY, true);
        cpu.S = 0x1234;
        cpu.X = 0x5678;
        cpu.Y = 0x9ABC;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0xFB);
        
        cpu.step();
        
        expect(cpu.S).toBe(0x0134);
        expect(cpu.X).toBe(0x78);
        expect(cpu.Y).toBe(0xBC);
      });
    });

    describe('ORA sr,S - 0x03', () => {
      it('should OR accumulator with stack relative memory', () => {
        cpu.A = 0x0F;
        cpu.S = 0x01F0;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x03); // ORA sr,S
        memory.write(0x8001, 0x10); // Offset +16
        memory.write(0x0200, 0xF0); // Value at S+offset
        
        cpu.step();
        
        expect(cpu.A).toBe(0xFF);
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(false);
        expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(true);
      });

      it('should set zero flag when result is zero', () => {
        cpu.A = 0x00;
        cpu.S = 0x0100;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x03);
        memory.write(0x8001, 0x05);
        memory.write(0x0105, 0x00);
        
        cpu.step();
        
        expect(cpu.A).toBe(0x00);
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(true);
      });

      it('should work with different stack offsets', () => {
        cpu.A = 0x01;
        cpu.S = 0x01FF;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x03);
        memory.write(0x8001, 0x01); // Offset +1
        memory.write(0x0200, 0x02);
        
        cpu.step();
        
        expect(cpu.A).toBe(0x03);
      });

      it('should handle stack pointer wrap around', () => {
        cpu.A = 0x10;
        cpu.S = 0x01FE;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x03);
        memory.write(0x8001, 0xFF); // Large offset
        memory.write(0x02FD, 0x20);
        
        cpu.step();
        
        expect(cpu.A).toBe(0x30);
      });
    });

    describe('BIT dp,X - 0x34', () => {
      it('should test bits without modifying accumulator', () => {
        cpu.A = 0x0F;
        cpu.X = 0x05;
        cpu.D = 0x0000;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x34); // BIT dp,X
        memory.write(0x8001, 0x10); // dp = 0x10
        memory.write(0x0015, 0xC0); // Value at dp+X, bits 7 and 6 set
        
        cpu.step();
        
        expect(cpu.A).toBe(0x0F); // Unchanged
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(true); // 0x0F & 0xC0 = 0
        expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(true); // Bit 7 of memory
        expect(cpu.getFlag(CPUFlags.OVERFLOW)).toBe(true); // Bit 6 of memory
      });

      it('should clear zero flag when bits match', () => {
        cpu.A = 0xFF;
        cpu.X = 0x00;
        cpu.D = 0x0000;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x34);
        memory.write(0x8001, 0x20);
        memory.write(0x0020, 0x42);
        
        cpu.step();
        
        expect(cpu.A).toBe(0xFF);
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(false); // 0xFF & 0x42 != 0
        expect(cpu.getFlag(CPUFlags.OVERFLOW)).toBe(true); // Bit 6 set
        expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(false); // Bit 7 clear
      });

      it('should work with non-zero direct page register', () => {
        cpu.A = 0xFF;
        cpu.X = 0x02;
        cpu.D = 0x0100; // Non-zero direct page
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x34);
        memory.write(0x8001, 0x10);
        memory.write(0x0112, 0x80); // At D+dp+X = 0x0100+0x10+0x02
        
        cpu.step();
        
        expect(cpu.A).toBe(0xFF);
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(false);
        expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(true);
        expect(cpu.getFlag(CPUFlags.OVERFLOW)).toBe(false);
      });

      it('should clear all test flags when memory is zero', () => {
        cpu.A = 0xFF;
        cpu.X = 0x00;
        cpu.D = 0x0000;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x34);
        memory.write(0x8001, 0x30);
        memory.write(0x0030, 0x00);
        
        cpu.step();
        
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(true);
        expect(cpu.getFlag(CPUFlags.OVERFLOW)).toBe(false);
        expect(cpu.getFlag(CPUFlags.NEGATIVE)).toBe(false);
      });

      it('should handle X register wrap in 8-bit mode', () => {
        cpu.A = 0x01;
        cpu.X = 0xFF; // Will be masked to 0xFF
        cpu.D = 0x0000;
        cpu.PC = 0x8000;
        
        memory.write(0x8000, 0x34);
        memory.write(0x8001, 0x01);
        memory.write(0x0100, 0x01); // At dp+X = 0x01+0xFF (wraps in direct page)
        
        cpu.step();
        
        expect(cpu.A).toBe(0x01);
        expect(cpu.getFlag(CPUFlags.ZERO)).toBe(false);
      });
    });
  });
});
