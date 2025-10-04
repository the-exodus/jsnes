/**
 * CPU Status Register Flags (P Register)
 */
export const CPUFlags = {
  CARRY: 0x01,        // C - Carry
  ZERO: 0x02,         // Z - Zero
  IRQ_DISABLE: 0x04,  // I - IRQ Disable
  DECIMAL: 0x08,      // D - Decimal Mode
  INDEX_8BIT: 0x10,   // X - Index Register Size (0=16-bit, 1=8-bit)
  MEMORY_8BIT: 0x20,  // M - Memory/Accumulator Size (0=16-bit, 1=8-bit)
  OVERFLOW: 0x40,     // V - Overflow
  NEGATIVE: 0x80      // N - Negative
};

/**
 * 65C816 CPU Emulation
 * Emulates the Ricoh 5A22 processor used in the SNES
 */
export class CPU {
  constructor(memory) {
    this.memory = memory;
    this.reset();
  }

  reset() {
    // Registers
    this.A = 0;      // Accumulator (16-bit)
    this.X = 0;      // X Index Register (16-bit)
    this.Y = 0;      // Y Index Register (16-bit)
    this.S = 0x01FF; // Stack Pointer (16-bit)
    this.D = 0;      // Direct Page Register (16-bit)
    this.PC = 0;     // Program Counter (16-bit)
    this.PBR = 0;    // Program Bank Register (8-bit)
    this.DBR = 0;    // Data Bank Register (8-bit)
    this.P = 0x34;   // Status Register (8-bit) - Start in 8-bit mode
    
    // Emulation mode flag (true = 6502 emulation mode)
    this.emulationMode = true;
    
    // Cycle counting
    this.cycles = 0;
    
    // Interrupt flags
    this.nmiPending = false;
    this.irqPending = false;
    
    // Load reset vector
    this.PC = this.memory.read16(0xFFFC);
  }

  /**
   * Execute one instruction
   * @returns {number} Number of cycles taken
   */
  step() {
    const startCycles = this.cycles;
    
    // Check for interrupts
    if (this.nmiPending) {
      this.handleNMI();
      this.nmiPending = false;
      return this.cycles - startCycles;
    } else if (this.irqPending && !this.getFlag(CPUFlags.IRQ_DISABLE)) {
      this.handleIRQ();
      return this.cycles - startCycles;
    }
    
    // Fetch and execute instruction
    const opcode = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    
    this.executeOpcode(opcode);
    
    return this.cycles - startCycles;
  }

  /**
   * Execute a single opcode
   */
  executeOpcode(opcode) {
    const handler = this.opcodeTable[opcode];
    if (handler) {
      handler.call(this);
    } else {
      console.warn(`Unimplemented opcode: 0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`);
      this.cycles += 2; // Assume minimum cycles
    }
  }

  // Flag operations
  getFlag(flag) {
    return (this.P & flag) !== 0;
  }

  setFlag(flag, value) {
    if (value) {
      this.P |= flag;
    } else {
      this.P &= ~flag;
    }
  }

  updateZeroFlag(value) {
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    this.setFlag(CPUFlags.ZERO, (value & mask) === 0);
  }

  updateNegativeFlag(value) {
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x80 : 0x8000;
    this.setFlag(CPUFlags.NEGATIVE, (value & mask) !== 0);
  }

  updateNZFlags(value) {
    this.updateZeroFlag(value);
    this.updateNegativeFlag(value);
  }

  // Memory access
  read8(address) {
    this.cycles += 1;
    return this.memory.read(address);
  }

  read16(address) {
    const low = this.read8(address);
    const high = this.read8(address + 1);
    return (high << 8) | low;
  }

  write8(address, value) {
    this.cycles += 1;
    this.memory.write(address, value & 0xFF);
  }

  write16(address, value) {
    this.write8(address, value & 0xFF);
    this.write8(address + 1, (value >> 8) & 0xFF);
  }

  // Stack operations
  push8(value) {
    this.write8(this.S, value & 0xFF);
    this.S = (this.S - 1) & 0xFFFF;
  }

  push16(value) {
    this.push8((value >> 8) & 0xFF);
    this.push8(value & 0xFF);
  }

  pop8() {
    this.S = (this.S + 1) & 0xFFFF;
    return this.read8(this.S);
  }

  pop16() {
    const low = this.pop8();
    const high = this.pop8();
    return (high << 8) | low;
  }

  // Interrupt handlers
  handleNMI() {
    this.push8(this.PBR);
    this.push16(this.PC);
    this.push8(this.P);
    this.setFlag(CPUFlags.IRQ_DISABLE, true);
    
    const vector = this.emulationMode ? 0xFFFA : 0xFFEA;
    const newPC = this.memory.read16(vector);
    this.PC = newPC;
    this.PBR = 0;
    
    this.cycles += 7;
  }

  handleIRQ() {
    this.push8(this.PBR);
    this.push16(this.PC);
    this.push8(this.P);
    this.setFlag(CPUFlags.IRQ_DISABLE, true);
    
    const vector = this.emulationMode ? 0xFFFE : 0xFFEE;
    const newPC = this.memory.read16(vector);
    this.PC = newPC;
    this.PBR = 0;
    
    this.cycles += 7;
  }

  // Addressing modes
  immediate() {
    const addr = this.PC;
    const size = this.getFlag(CPUFlags.MEMORY_8BIT) ? 1 : 2;
    this.PC = (this.PC + size) & 0xFFFF;
    return addr;
  }

  absolute() {
    const addr = this.read16(this.PC);
    this.PC = (this.PC + 2) & 0xFFFF;
    return addr;
  }

  absoluteX() {
    const base = this.read16(this.PC);
    this.PC = (this.PC + 2) & 0xFFFF;
    return (base + this.X) & 0xFFFF;
  }

  absoluteY() {
    const base = this.read16(this.PC);
    this.PC = (this.PC + 2) & 0xFFFF;
    return (base + this.Y) & 0xFFFF;
  }

  zeroPage() {
    const addr = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    return addr;
  }

  zeroPageX() {
    const base = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    return (base + this.X) & 0xFF;
  }

  zeroPageY() {
    const base = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    return (base + this.Y) & 0xFF;
  }

  indirect() {
    const ptr = this.read16(this.PC);
    this.PC = (this.PC + 2) & 0xFFFF;
    return this.read16(ptr);
  }

  indexedIndirect() {
    const base = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    const ptr = (base + this.X) & 0xFF;
    return this.read16(ptr);
  }

  indirectIndexed() {
    const ptr = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    const base = this.read16(ptr);
    return (base + this.Y) & 0xFFFF;
  }

  // Opcode implementations
  // Load/Store operations
  LDA(addr) {
    if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
      this.A = (this.A & 0xFF00) | this.read8(addr);
    } else {
      this.A = this.read16(addr);
    }
    this.updateNZFlags(this.A);
  }

  LDX(addr) {
    if (this.getFlag(CPUFlags.INDEX_8BIT)) {
      this.X = this.read8(addr);
    } else {
      this.X = this.read16(addr);
    }
    this.updateNZFlags(this.X);
  }

  LDY(addr) {
    if (this.getFlag(CPUFlags.INDEX_8BIT)) {
      this.Y = this.read8(addr);
    } else {
      this.Y = this.read16(addr);
    }
    this.updateNZFlags(this.Y);
  }

  STA(addr) {
    if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
      this.write8(addr, this.A & 0xFF);
    } else {
      this.write16(addr, this.A);
    }
  }

  STX(addr) {
    if (this.getFlag(CPUFlags.INDEX_8BIT)) {
      this.write8(addr, this.X & 0xFF);
    } else {
      this.write16(addr, this.X);
    }
  }

  STY(addr) {
    if (this.getFlag(CPUFlags.INDEX_8BIT)) {
      this.write8(addr, this.Y & 0xFF);
    } else {
      this.write16(addr, this.Y);
    }
  }

  // Arithmetic operations
  ADC(addr) {
    const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    const carry = this.getFlag(CPUFlags.CARRY) ? 1 : 0;
    const result = this.A + value + carry;
    
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    const signBit = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x80 : 0x8000;
    
    this.setFlag(CPUFlags.CARRY, result > mask);
    this.setFlag(CPUFlags.OVERFLOW, 
      ((this.A ^ result) & (value ^ result) & signBit) !== 0);
    
    this.A = result & mask;
    this.updateNZFlags(this.A);
  }

  SBC(addr) {
    const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    const carry = this.getFlag(CPUFlags.CARRY) ? 0 : 1;
    const result = this.A - value - carry;
    
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    const signBit = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x80 : 0x8000;
    
    this.setFlag(CPUFlags.CARRY, result >= 0);
    this.setFlag(CPUFlags.OVERFLOW, 
      ((this.A ^ value) & (this.A ^ result) & signBit) !== 0);
    
    this.A = result & mask;
    this.updateNZFlags(this.A);
  }

  // Logical operations
  AND(addr) {
    const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    this.A &= value;
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    this.A &= mask;
    this.updateNZFlags(this.A);
  }

  ORA(addr) {
    const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    this.A |= value;
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    this.A &= mask;
    this.updateNZFlags(this.A);
  }

  EOR(addr) {
    const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    this.A ^= value;
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    this.A &= mask;
    this.updateNZFlags(this.A);
  }

  // Increment/Decrement
  INC(addr) {
    let value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    value = (value + 1) & (this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF);
    if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
      this.write8(addr, value);
    } else {
      this.write16(addr, value);
    }
    this.updateNZFlags(value);
  }

  DEC(addr) {
    let value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    value = (value - 1) & (this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF);
    if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
      this.write8(addr, value);
    } else {
      this.write16(addr, value);
    }
    this.updateNZFlags(value);
  }

  // Initialize opcode table (partial implementation - will be expanded)
  get opcodeTable() {
    if (!this._opcodeTable) {
      this._opcodeTable = this.buildOpcodeTable();
    }
    return this._opcodeTable;
  }

  buildOpcodeTable() {
    const table = new Array(256);
    
    // LDA opcodes
    table[0xA9] = function() { this.LDA(this.immediate()); this.cycles += 2; }; // LDA #immediate
    table[0xAD] = function() { this.LDA(this.absolute()); this.cycles += 4; };   // LDA absolute
    table[0xBD] = function() { this.LDA(this.absoluteX()); this.cycles += 4; };  // LDA absolute,X
    table[0xB9] = function() { this.LDA(this.absoluteY()); this.cycles += 4; };  // LDA absolute,Y
    table[0xA5] = function() { this.LDA(this.zeroPage()); this.cycles += 3; };   // LDA zeropage
    table[0xB5] = function() { this.LDA(this.zeroPageX()); this.cycles += 4; };  // LDA zeropage,X
    
    // STA opcodes
    table[0x8D] = function() { this.STA(this.absolute()); this.cycles += 4; };   // STA absolute
    table[0x9D] = function() { this.STA(this.absoluteX()); this.cycles += 5; };  // STA absolute,X
    table[0x99] = function() { this.STA(this.absoluteY()); this.cycles += 5; };  // STA absolute,Y
    table[0x85] = function() { this.STA(this.zeroPage()); this.cycles += 3; };   // STA zeropage
    table[0x95] = function() { this.STA(this.zeroPageX()); this.cycles += 4; };  // STA zeropage,X
    
    // LDX opcodes
    table[0xA2] = function() { this.LDX(this.immediate()); this.cycles += 2; };  // LDX #immediate
    table[0xAE] = function() { this.LDX(this.absolute()); this.cycles += 4; };   // LDX absolute
    table[0xBE] = function() { this.LDX(this.absoluteY()); this.cycles += 4; };  // LDX absolute,Y
    table[0xA6] = function() { this.LDX(this.zeroPage()); this.cycles += 3; };   // LDX zeropage
    table[0xB6] = function() { this.LDX(this.zeroPageY()); this.cycles += 4; };  // LDX zeropage,Y
    
    // LDY opcodes
    table[0xA0] = function() { this.LDY(this.immediate()); this.cycles += 2; };  // LDY #immediate
    table[0xAC] = function() { this.LDY(this.absolute()); this.cycles += 4; };   // LDY absolute
    table[0xBC] = function() { this.LDY(this.absoluteX()); this.cycles += 4; };  // LDY absolute,X
    table[0xA4] = function() { this.LDY(this.zeroPage()); this.cycles += 3; };   // LDY zeropage
    table[0xB4] = function() { this.LDY(this.zeroPageX()); this.cycles += 4; };  // LDY zeropage,X
    
    // Transfer opcodes
    table[0xAA] = function() { // TAX
      this.X = this.A & (this.getFlag(CPUFlags.INDEX_8BIT) ? 0xFF : 0xFFFF);
      this.updateNZFlags(this.X);
      this.cycles += 2;
    };
    table[0xA8] = function() { // TAY
      this.Y = this.A & (this.getFlag(CPUFlags.INDEX_8BIT) ? 0xFF : 0xFFFF);
      this.updateNZFlags(this.Y);
      this.cycles += 2;
    };
    table[0x8A] = function() { // TXA
      this.A = this.X & (this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF);
      this.updateNZFlags(this.A);
      this.cycles += 2;
    };
    table[0x98] = function() { // TYA
      this.A = this.Y & (this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF);
      this.updateNZFlags(this.A);
      this.cycles += 2;
    };
    
    // Stack opcodes
    table[0x48] = function() { // PHA
      if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
        this.push8(this.A);
      } else {
        this.push16(this.A);
      }
      this.cycles += 3;
    };
    table[0x68] = function() { // PLA
      if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
        this.A = (this.A & 0xFF00) | this.pop8();
      } else {
        this.A = this.pop16();
      }
      this.updateNZFlags(this.A);
      this.cycles += 4;
    };
    
    // Flag opcodes
    table[0x18] = function() { this.setFlag(CPUFlags.CARRY, false); this.cycles += 2; };        // CLC
    table[0x38] = function() { this.setFlag(CPUFlags.CARRY, true); this.cycles += 2; };         // SEC
    table[0x58] = function() { this.setFlag(CPUFlags.IRQ_DISABLE, false); this.cycles += 2; };  // CLI
    table[0x78] = function() { this.setFlag(CPUFlags.IRQ_DISABLE, true); this.cycles += 2; };   // SEI
    table[0xD8] = function() { this.setFlag(CPUFlags.DECIMAL, false); this.cycles += 2; };      // CLD
    table[0xF8] = function() { this.setFlag(CPUFlags.DECIMAL, true); this.cycles += 2; };       // SED
    table[0xB8] = function() { this.setFlag(CPUFlags.OVERFLOW, false); this.cycles += 2; };     // CLV
    
    // NOP
    table[0xEA] = function() { this.cycles += 2; }; // NOP
    
    // JMP
    table[0x4C] = function() { // JMP absolute
      this.PC = this.read16(this.PC);
      this.cycles += 3;
    };
    table[0x6C] = function() { // JMP indirect
      this.PC = this.indirect();
      this.cycles += 5;
    };
    
    // JSR/RTS
    table[0x20] = function() { // JSR
      const target = this.read16(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      this.push16(this.PC);
      this.PC = target;
      this.cycles += 6;
    };
    table[0x60] = function() { // RTS
      this.PC = (this.pop16() + 1) & 0xFFFF;
      this.cycles += 6;
    };
    
    // RTI
    table[0x40] = function() { // RTI
      this.P = this.pop8();
      this.PC = this.pop16();
      if (!this.emulationMode) {
        this.PBR = this.pop8();
      }
      this.cycles += 6;
    };
    
    // BRK - Software Break
    table[0x00] = function() {
      this.PC = (this.PC + 1) & 0xFFFF; // Skip signature byte
      this.push8(this.PBR);
      this.push16(this.PC);
      this.push8(this.P);
      this.setFlag(CPUFlags.IRQ_DISABLE, true);
      this.setFlag(CPUFlags.DECIMAL, false);
      const vector = this.emulationMode ? 0xFFFE : 0xFFE6;
      this.PC = this.memory.read16(vector);
      this.PBR = 0;
      this.cycles += 7;
    };
    
    // ORA (dp,X) - OR with Accumulator Direct Page Indexed Indirect
    table[0x01] = function() {
      const addr = this.directPageIndexedIndirectX();
      const value = this.memory.read(addr);
      this.A |= value;
      this.setFlag(CPUFlags.ZERO, this.A === 0);
      this.setFlag(CPUFlags.NEGATIVE, (this.A & 0x80) !== 0);
      this.cycles += 6;
    };
    
    // COP - Co-Processor
    table[0x02] = function() {
      this.PC = (this.PC + 1) & 0xFFFF; // Skip signature byte
      this.push8(this.PBR);
      this.push16(this.PC);
      this.push8(this.P);
      this.setFlag(CPUFlags.IRQ_DISABLE, true);
      this.setFlag(CPUFlags.DECIMAL, false);
      const vector = this.emulationMode ? 0xFFF4 : 0xFFE4;
      this.PC = this.memory.read16(vector);
      this.PBR = 0;
      this.cycles += 7;
    };
    
    // ASL absolute - Arithmetic Shift Left
    table[0x0E] = function() {
      const addr = this.absolute();
      let value = this.memory.read(addr);
      this.setFlag(CPUFlags.CARRY, (value & 0x80) !== 0);
      value = (value << 1) & 0xFF;
      this.memory.write(addr, value);
      this.setFlag(CPUFlags.ZERO, value === 0);
      this.setFlag(CPUFlags.NEGATIVE, (value & 0x80) !== 0);
      this.cycles += 6;
    };
    
    // JSL - Jump to Subroutine Long
    table[0x22] = function() {
      const targetLow = this.read16(this.PC);
      this.PC = (this.PC + 2) & 0xFFFF;
      const targetBank = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      
      this.push8(this.PBR);
      this.push16(this.PC);
      
      this.PBR = targetBank;
      this.PC = targetLow;
      this.cycles += 8;
    };
    
    // BIT zeropage - Test Bits
    table[0x24] = function() {
      const addr = this.zeroPage();
      const value = this.memory.read(addr);
      const result = this.A & value;
      this.setFlag(CPUFlags.ZERO, result === 0);
      this.setFlag(CPUFlags.OVERFLOW, (value & 0x40) !== 0);
      this.setFlag(CPUFlags.NEGATIVE, (value & 0x80) !== 0);
      this.cycles += 3;
    };
    
    // BMI - Branch if Minus/Negative
    table[0x30] = function() {
      const offset = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      if (this.getFlag(CPUFlags.NEGATIVE)) {
        const signedOffset = offset < 0x80 ? offset : offset - 0x100;
        this.PC = (this.PC + signedOffset) & 0xFFFF;
        this.cycles += 3;
      } else {
        this.cycles += 2;
      }
    };
    
    // BRA - Branch Always
    table[0x80] = function() {
      const offset = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      const signedOffset = offset < 0x80 ? offset : offset - 0x100;
      this.PC = (this.PC + signedOffset) & 0xFFFF;
      this.cycles += 3;
    };
    
    // TXS - Transfer X to Stack Pointer
    table[0x9A] = function() {
      if (this.emulationMode) {
        this.S = 0x0100 | (this.X & 0xFF);
      } else {
        this.S = this.X;
      }
      this.cycles += 2;
    };
    
    // PLB - Pull Data Bank Register
    table[0xAB] = function() {
      this.DBR = this.pop8();
      this.setFlag(CPUFlags.ZERO, this.DBR === 0);
      this.setFlag(CPUFlags.NEGATIVE, (this.DBR & 0x80) !== 0);
      this.cycles += 4;
    };
    
    // REP - Reset Processor Status Bits
    table[0xC2] = function() {
      const mask = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      this.P &= ~mask;
      this.cycles += 3;
    };
    
    // CMP absolute,X - Compare Accumulator with Memory
    table[0xDD] = function() {
      const addr = this.absoluteX();
      const value = this.memory.read(addr);
      const result = this.A - value;
      this.setFlag(CPUFlags.CARRY, this.A >= value);
      this.setFlag(CPUFlags.ZERO, (result & 0xFF) === 0);
      this.setFlag(CPUFlags.NEGATIVE, (result & 0x80) !== 0);
      this.cycles += 4;
    };
    
    // SEP - Set Processor Status Bits
    table[0xE2] = function() {
      const mask = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      this.P |= mask;
      this.cycles += 3;
    };
    
    // TCD - Transfer Accumulator to Direct Page
    table[0x5B] = function() {
      this.D = this.A;
      this.setFlag(CPUFlags.ZERO, this.D === 0);
      this.setFlag(CPUFlags.NEGATIVE, (this.D & 0x8000) !== 0);
      this.cycles += 2;
    };
    
    // XCE - Exchange Carry and Emulation
    table[0xFB] = function() {
      const carry = this.getFlag(CPUFlags.CARRY);
      this.setFlag(CPUFlags.CARRY, this.emulationMode);
      this.emulationMode = carry;
      
      if (this.emulationMode) {
        // Entering emulation mode
        this.setFlag(CPUFlags.MEMORY_8BIT, true);
        this.setFlag(CPUFlags.INDEX_8BIT, true);
        this.S = 0x0100 | (this.S & 0xFF);
        this.X &= 0xFF;
        this.Y &= 0xFF;
      }
      this.cycles += 2;
    };
    
    // ORA sr,S - OR with Accumulator (Stack Relative)
    table[0x03] = function() {
      const addr = this.stackRelative();
      const value = this.memory.read(addr);
      this.A |= value;
      this.setFlag(CPUFlags.ZERO, this.A === 0);
      this.setFlag(CPUFlags.NEGATIVE, (this.A & 0x80) !== 0);
      this.cycles += 4;
    };
    
    // BIT dp,X - Test Bits (Direct Page Indexed with X)
    table[0x34] = function() {
      const addr = this.directPageX();
      const value = this.memory.read(addr);
      const result = this.A & value;
      this.setFlag(CPUFlags.ZERO, result === 0);
      this.setFlag(CPUFlags.OVERFLOW, (value & 0x40) !== 0);
      this.setFlag(CPUFlags.NEGATIVE, (value & 0x80) !== 0);
      this.cycles += 4;
    };
    
    return table;
  }
  
  /**
   * Direct Page Indexed Indirect with X: (dp,X)
   * Adds X to direct page address, then reads the 16-bit pointer
   */
  directPageIndexedIndirectX() {
    const dp = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    const addr = (this.D + dp + (this.X & 0xFF)) & 0xFFFF;
    return this.memory.read16(addr);
  }
  
  /**
   * Stack Relative: sr,S
   * Address is stack pointer plus 8-bit offset
   */
  stackRelative() {
    const offset = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    return (this.S + offset) & 0xFFFF;
  }
  
  /**
   * Direct Page Indexed with X: dp,X
   * Address is direct page register plus dp offset plus X register
   */
  directPageX() {
    const dp = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    return (this.D + dp + (this.X & 0xFF)) & 0xFFFF;
  }
}
