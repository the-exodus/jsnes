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
    // IPL HLE: Initialize CPU registers as the SNES IPL ROM would
    // The real IPL sets up the system in a known state before jumping to ROM
    
    // Registers - IPL initializes these
    this.A = 0;      // Accumulator (16-bit) - cleared by IPL
    this.X = 0;      // X Index Register (16-bit) - cleared by IPL
    this.Y = 0;      // Y Index Register (16-bit) - cleared by IPL
    this.S = 0x01FF; // Stack Pointer (16-bit) - IPL sets to top of stack
    this.D = 0;      // Direct Page Register (16-bit) - IPL clears this
    this.PC = 0;     // Program Counter (16-bit) - will be set from reset vector
    this.PBR = 0;    // Program Bank Register (8-bit) - IPL clears bank
    this.DBR = 0;    // Data Bank Register (8-bit) - IPL clears bank
    
    // Status Register - IPL sets CPU to emulation mode with specific flags
    // I flag (IRQ disable) is SET, D flag (decimal) is CLEARED
    // M and X flags are SET (8-bit mode)
    // Status Register: 00110100
    // Bit 5 (M - Memory 8-bit): 1
    // Bit 4 (X - Index 8-bit): 1
    // Bit 2 (I - IRQ disable): 1
    this.P = 0x34;
    
    // Emulation mode flag (true = 6502 emulation mode)
    // IPL starts in emulation mode (E=1)
    this.emulationMode = true;
    
    // Cycle counting
    this.cycles = 0;
    
    // Interrupt flags
    this.nmiPending = false;
    this.irqPending = false;
    
    // Load reset vector from ROM
    // IPL reads the reset vector at $FFFC-$FFFD and jumps there
    const resetVector = this.memory.read16(0xFFFC);
    
    // IPL validation: If reset vector is 0x0000 or 0xFFFF, it's invalid
    // Real IPL would handle this, we'll use a safe default
    if (resetVector === 0x0000 || resetVector === 0xFFFF) {
      // Default to $8000 which is a common ROM start in LoROM
      this.PC = 0x8000;
      console.warn('Invalid reset vector detected, defaulting to $8000');
    } else {
      this.PC = resetVector;
    }
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

  // Direct Page addressing - uses D register
  directPage() {
    const offset = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    return (this.D + offset) & 0xFFFF;
  }

  // Direct Page Indirect: (dp)
  directPageIndirect() {
    const dp = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    const addr = (this.D + dp) & 0xFFFF;
    return this.read16(addr);
  }

  // Direct Page Indirect Indexed with Y: (dp),Y
  directPageIndirectIndexedY() {
    const dp = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    const addr = (this.D + dp) & 0xFFFF;
    const base = this.read16(addr);
    return (base + this.Y) & 0xFFFF;
  }

  // Direct Page Indirect Long: [dp]
  directPageIndirectLong() {
    const dp = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    const addr = (this.D + dp) & 0xFFFF;
    const low = this.read8(addr);
    const mid = this.read8(addr + 1);
    const high = this.read8(addr + 2);
    return (high << 16) | (mid << 8) | low;
  }

  // Direct Page Indirect Long Indexed with Y: [dp],Y
  directPageIndirectLongIndexedY() {
    const dp = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    const addr = (this.D + dp) & 0xFFFF;
    const low = this.read8(addr);
    const mid = this.read8(addr + 1);
    const high = this.read8(addr + 2);
    const base = (high << 16) | (mid << 8) | low;
    return (base + this.Y) & 0xFFFFFF;
  }

  // Absolute Long: long
  absoluteLong() {
    const low = this.read8(this.PC);
    const mid = this.read8(this.PC + 1);
    const high = this.read8(this.PC + 2);
    this.PC = (this.PC + 3) & 0xFFFF;
    return (high << 16) | (mid << 8) | low;
  }

  // Absolute Long Indexed with X: long,X
  absoluteLongIndexedX() {
    const low = this.read8(this.PC);
    const mid = this.read8(this.PC + 1);
    const high = this.read8(this.PC + 2);
    this.PC = (this.PC + 3) & 0xFFFF;
    const base = (high << 16) | (mid << 8) | low;
    return (base + this.X) & 0xFFFFFF;
  }

  // Stack Relative Indirect Indexed with Y: (sr,S),Y
  stackRelativeIndirectIndexedY() {
    const offset = this.read8(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    const addr = (this.S + offset) & 0xFFFF;
    const base = this.read16(addr);
    return (base + this.Y) & 0xFFFF;
  }

  // Absolute Indexed Indirect: (addr,X)
  absoluteIndexedIndirect() {
    const base = this.read16(this.PC);
    this.PC = (this.PC + 2) & 0xFFFF;
    const ptr = (base + this.X) & 0xFFFF;
    return this.read16(ptr);
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

  // Compare operations
  CMP(addr) {
    const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    const result = (this.A - value) & 0xFFFFFF;
    this.setFlag(CPUFlags.CARRY, this.A >= value);
    this.setFlag(CPUFlags.ZERO, (result & mask) === 0);
    this.setFlag(CPUFlags.NEGATIVE, (result & (this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x80 : 0x8000)) !== 0);
  }

  CPX(addr) {
    const value = this.getFlag(CPUFlags.INDEX_8BIT) ? this.read8(addr) : this.read16(addr);
    const mask = this.getFlag(CPUFlags.INDEX_8BIT) ? 0xFF : 0xFFFF;
    const result = (this.X - value) & 0xFFFFFF;
    this.setFlag(CPUFlags.CARRY, this.X >= value);
    this.setFlag(CPUFlags.ZERO, (result & mask) === 0);
    this.setFlag(CPUFlags.NEGATIVE, (result & (this.getFlag(CPUFlags.INDEX_8BIT) ? 0x80 : 0x8000)) !== 0);
  }

  CPY(addr) {
    const value = this.getFlag(CPUFlags.INDEX_8BIT) ? this.read8(addr) : this.read16(addr);
    const mask = this.getFlag(CPUFlags.INDEX_8BIT) ? 0xFF : 0xFFFF;
    const result = (this.Y - value) & 0xFFFFFF;
    this.setFlag(CPUFlags.CARRY, this.Y >= value);
    this.setFlag(CPUFlags.ZERO, (result & mask) === 0);
    this.setFlag(CPUFlags.NEGATIVE, (result & (this.getFlag(CPUFlags.INDEX_8BIT) ? 0x80 : 0x8000)) !== 0);
  }

  // Shift/Rotate operations
  ASL(addr) {
    let value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    const highBit = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x80 : 0x8000;
    this.setFlag(CPUFlags.CARRY, (value & highBit) !== 0);
    value = (value << 1) & mask;
    if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
      this.write8(addr, value);
    } else {
      this.write16(addr, value);
    }
    this.updateNZFlags(value);
  }

  LSR(addr) {
    let value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    this.setFlag(CPUFlags.CARRY, (value & 0x01) !== 0);
    value = (value >> 1) & mask;
    if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
      this.write8(addr, value);
    } else {
      this.write16(addr, value);
    }
    this.updateNZFlags(value);
  }

  ROL(addr) {
    let value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    const highBit = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x80 : 0x8000;
    const oldCarry = this.getFlag(CPUFlags.CARRY) ? 1 : 0;
    this.setFlag(CPUFlags.CARRY, (value & highBit) !== 0);
    value = ((value << 1) | oldCarry) & mask;
    if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
      this.write8(addr, value);
    } else {
      this.write16(addr, value);
    }
    this.updateNZFlags(value);
  }

  ROR(addr) {
    let value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    const highBit = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x80 : 0x8000;
    const oldCarry = this.getFlag(CPUFlags.CARRY) ? highBit : 0;
    this.setFlag(CPUFlags.CARRY, (value & 0x01) !== 0);
    value = ((value >> 1) | oldCarry) & mask;
    if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
      this.write8(addr, value);
    } else {
      this.write16(addr, value);
    }
    this.updateNZFlags(value);
  }

  // BIT test operation
  BIT(addr) {
    const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
    const result = this.A & value;
    const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
    this.setFlag(CPUFlags.ZERO, (result & mask) === 0);
    this.setFlag(CPUFlags.OVERFLOW, (value & (this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x40 : 0x4000)) !== 0);
    this.setFlag(CPUFlags.NEGATIVE, (value & (this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x80 : 0x8000)) !== 0);
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

    // ===== ORA opcodes =====
    table[0x05] = function() { this.ORA(this.directPage()); this.cycles += 3; };           // ORA dp
    table[0x07] = function() { this.ORA(this.directPageIndirectLong()); this.cycles += 6; }; // ORA [dp]
    table[0x09] = function() { this.ORA(this.immediate()); this.cycles += 2; };            // ORA #const
    table[0x0D] = function() { this.ORA(this.absolute()); this.cycles += 4; };             // ORA addr
    table[0x0F] = function() { this.ORA(this.absoluteLong()); this.cycles += 5; };         // ORA long
    table[0x11] = function() { this.ORA(this.directPageIndirectIndexedY()); this.cycles += 5; }; // ORA (dp),Y
    table[0x12] = function() { this.ORA(this.directPageIndirect()); this.cycles += 5; };   // ORA (dp)
    table[0x13] = function() { this.ORA(this.stackRelativeIndirectIndexedY()); this.cycles += 7; }; // ORA (sr,S),Y
    table[0x15] = function() { this.ORA(this.directPageX()); this.cycles += 4; };          // ORA dp,X
    table[0x17] = function() { this.ORA(this.directPageIndirectLongIndexedY()); this.cycles += 6; }; // ORA [dp],Y
    table[0x19] = function() { this.ORA(this.absoluteY()); this.cycles += 4; };            // ORA addr,Y
    table[0x1D] = function() { this.ORA(this.absoluteX()); this.cycles += 4; };            // ORA addr,X
    table[0x1F] = function() { this.ORA(this.absoluteLongIndexedX()); this.cycles += 5; }; // ORA long,X

    // ===== AND opcodes =====
    table[0x21] = function() { this.AND(this.directPageIndexedIndirectX()); this.cycles += 6; }; // AND (dp,X)
    table[0x23] = function() { this.AND(this.stackRelative()); this.cycles += 4; };        // AND sr,S
    table[0x25] = function() { this.AND(this.directPage()); this.cycles += 3; };           // AND dp
    table[0x27] = function() { this.AND(this.directPageIndirectLong()); this.cycles += 6; }; // AND [dp]
    table[0x29] = function() { this.AND(this.immediate()); this.cycles += 2; };            // AND #const
    table[0x2D] = function() { this.AND(this.absolute()); this.cycles += 4; };             // AND addr
    table[0x2F] = function() { this.AND(this.absoluteLong()); this.cycles += 5; };         // AND long
    table[0x31] = function() { this.AND(this.directPageIndirectIndexedY()); this.cycles += 5; }; // AND (dp),Y
    table[0x32] = function() { this.AND(this.directPageIndirect()); this.cycles += 5; };   // AND (dp)
    table[0x33] = function() { this.AND(this.stackRelativeIndirectIndexedY()); this.cycles += 7; }; // AND (sr,S),Y
    table[0x35] = function() { this.AND(this.directPageX()); this.cycles += 4; };          // AND dp,X
    table[0x37] = function() { this.AND(this.directPageIndirectLongIndexedY()); this.cycles += 6; }; // AND [dp],Y
    table[0x39] = function() { this.AND(this.absoluteY()); this.cycles += 4; };            // AND addr,Y
    table[0x3D] = function() { this.AND(this.absoluteX()); this.cycles += 4; };            // AND addr,X
    table[0x3F] = function() { this.AND(this.absoluteLongIndexedX()); this.cycles += 5; }; // AND long,X

    // ===== EOR opcodes =====
    table[0x41] = function() { this.EOR(this.directPageIndexedIndirectX()); this.cycles += 6; }; // EOR (dp,X)
    table[0x43] = function() { this.EOR(this.stackRelative()); this.cycles += 4; };        // EOR sr,S
    table[0x45] = function() { this.EOR(this.directPage()); this.cycles += 3; };           // EOR dp
    table[0x47] = function() { this.EOR(this.directPageIndirectLong()); this.cycles += 6; }; // EOR [dp]
    table[0x49] = function() { this.EOR(this.immediate()); this.cycles += 2; };            // EOR #const
    table[0x4D] = function() { this.EOR(this.absolute()); this.cycles += 4; };             // EOR addr
    table[0x4F] = function() { this.EOR(this.absoluteLong()); this.cycles += 5; };         // EOR long
    table[0x51] = function() { this.EOR(this.directPageIndirectIndexedY()); this.cycles += 5; }; // EOR (dp),Y
    table[0x52] = function() { this.EOR(this.directPageIndirect()); this.cycles += 5; };   // EOR (dp)
    table[0x53] = function() { this.EOR(this.stackRelativeIndirectIndexedY()); this.cycles += 7; }; // EOR (sr,S),Y
    table[0x55] = function() { this.EOR(this.directPageX()); this.cycles += 4; };          // EOR dp,X
    table[0x57] = function() { this.EOR(this.directPageIndirectLongIndexedY()); this.cycles += 6; }; // EOR [dp],Y
    table[0x59] = function() { this.EOR(this.absoluteY()); this.cycles += 4; };            // EOR addr,Y
    table[0x5D] = function() { this.EOR(this.absoluteX()); this.cycles += 4; };            // EOR addr,X
    table[0x5F] = function() { this.EOR(this.absoluteLongIndexedX()); this.cycles += 5; }; // EOR long,X

    // ===== ADC opcodes =====
    table[0x61] = function() { this.ADC(this.directPageIndexedIndirectX()); this.cycles += 6; }; // ADC (dp,X)
    table[0x63] = function() { this.ADC(this.stackRelative()); this.cycles += 4; };        // ADC sr,S
    table[0x65] = function() { this.ADC(this.directPage()); this.cycles += 3; };           // ADC dp
    table[0x67] = function() { this.ADC(this.directPageIndirectLong()); this.cycles += 6; }; // ADC [dp]
    table[0x69] = function() { this.ADC(this.immediate()); this.cycles += 2; };            // ADC #const
    table[0x6D] = function() { this.ADC(this.absolute()); this.cycles += 4; };             // ADC addr
    table[0x6F] = function() { this.ADC(this.absoluteLong()); this.cycles += 5; };         // ADC long
    table[0x71] = function() { this.ADC(this.directPageIndirectIndexedY()); this.cycles += 5; }; // ADC (dp),Y
    table[0x72] = function() { this.ADC(this.directPageIndirect()); this.cycles += 5; };   // ADC (dp)
    table[0x73] = function() { this.ADC(this.stackRelativeIndirectIndexedY()); this.cycles += 7; }; // ADC (sr,S),Y
    table[0x75] = function() { this.ADC(this.directPageX()); this.cycles += 4; };          // ADC dp,X
    table[0x77] = function() { this.ADC(this.directPageIndirectLongIndexedY()); this.cycles += 6; }; // ADC [dp],Y
    table[0x79] = function() { this.ADC(this.absoluteY()); this.cycles += 4; };            // ADC addr,Y
    table[0x7D] = function() { this.ADC(this.absoluteX()); this.cycles += 4; };            // ADC addr,X
    table[0x7F] = function() { this.ADC(this.absoluteLongIndexedX()); this.cycles += 5; }; // ADC long,X

    // ===== SBC opcodes =====
    table[0xE1] = function() { this.SBC(this.directPageIndexedIndirectX()); this.cycles += 6; }; // SBC (dp,X)
    table[0xE3] = function() { this.SBC(this.stackRelative()); this.cycles += 4; };        // SBC sr,S
    table[0xE5] = function() { this.SBC(this.directPage()); this.cycles += 3; };           // SBC dp
    table[0xE7] = function() { this.SBC(this.directPageIndirectLong()); this.cycles += 6; }; // SBC [dp]
    table[0xE9] = function() { this.SBC(this.immediate()); this.cycles += 2; };            // SBC #const
    table[0xED] = function() { this.SBC(this.absolute()); this.cycles += 4; };             // SBC addr
    table[0xEF] = function() { this.SBC(this.absoluteLong()); this.cycles += 5; };         // SBC long
    table[0xF1] = function() { this.SBC(this.directPageIndirectIndexedY()); this.cycles += 5; }; // SBC (dp),Y
    table[0xF2] = function() { this.SBC(this.directPageIndirect()); this.cycles += 5; };   // SBC (dp)
    table[0xF3] = function() { this.SBC(this.stackRelativeIndirectIndexedY()); this.cycles += 7; }; // SBC (sr,S),Y
    table[0xF5] = function() { this.SBC(this.directPageX()); this.cycles += 4; };          // SBC dp,X
    table[0xF7] = function() { this.SBC(this.directPageIndirectLongIndexedY()); this.cycles += 6; }; // SBC [dp],Y
    table[0xF9] = function() { this.SBC(this.absoluteY()); this.cycles += 4; };            // SBC addr,Y
    table[0xFD] = function() { this.SBC(this.absoluteX()); this.cycles += 4; };            // SBC addr,X
    table[0xFF] = function() { this.SBC(this.absoluteLongIndexedX()); this.cycles += 5; }; // SBC long,X

    // ===== CMP opcodes =====
    table[0xC1] = function() { this.CMP(this.directPageIndexedIndirectX()); this.cycles += 6; }; // CMP (dp,X)
    table[0xC3] = function() { this.CMP(this.stackRelative()); this.cycles += 4; };        // CMP sr,S
    table[0xC5] = function() { this.CMP(this.directPage()); this.cycles += 3; };           // CMP dp
    table[0xC7] = function() { this.CMP(this.directPageIndirectLong()); this.cycles += 6; }; // CMP [dp]
    table[0xC9] = function() { this.CMP(this.immediate()); this.cycles += 2; };            // CMP #const
    table[0xCD] = function() { this.CMP(this.absolute()); this.cycles += 4; };             // CMP addr
    table[0xCF] = function() { this.CMP(this.absoluteLong()); this.cycles += 5; };         // CMP long
    table[0xD1] = function() { this.CMP(this.directPageIndirectIndexedY()); this.cycles += 5; }; // CMP (dp),Y
    table[0xD2] = function() { this.CMP(this.directPageIndirect()); this.cycles += 5; };   // CMP (dp)
    table[0xD3] = function() { this.CMP(this.stackRelativeIndirectIndexedY()); this.cycles += 7; }; // CMP (sr,S),Y
    table[0xD5] = function() { this.CMP(this.directPageX()); this.cycles += 4; };          // CMP dp,X
    table[0xD7] = function() { this.CMP(this.directPageIndirectLongIndexedY()); this.cycles += 6; }; // CMP [dp],Y
    table[0xD9] = function() { this.CMP(this.absoluteY()); this.cycles += 4; };            // CMP addr,Y
    table[0xDF] = function() { this.CMP(this.absoluteLongIndexedX()); this.cycles += 5; }; // CMP long,X

    // ===== CPX opcodes =====
    table[0xE0] = function() { this.CPX(this.immediate()); this.cycles += 2; };            // CPX #const
    table[0xE4] = function() { this.CPX(this.directPage()); this.cycles += 3; };           // CPX dp
    table[0xEC] = function() { this.CPX(this.absolute()); this.cycles += 4; };             // CPX addr

    // ===== CPY opcodes =====
    table[0xC0] = function() { this.CPY(this.immediate()); this.cycles += 2; };            // CPY #const
    table[0xC4] = function() { this.CPY(this.directPage()); this.cycles += 3; };           // CPY dp
    table[0xCC] = function() { this.CPY(this.absolute()); this.cycles += 4; };             // CPY addr

    // ===== ASL opcodes =====
    table[0x06] = function() { this.ASL(this.directPage()); this.cycles += 5; };           // ASL dp
    table[0x0A] = function() { // ASL A
      const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
      const highBit = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x80 : 0x8000;
      this.setFlag(CPUFlags.CARRY, (this.A & highBit) !== 0);
      this.A = (this.A << 1) & mask;
      this.updateNZFlags(this.A);
      this.cycles += 2;
    };
    table[0x16] = function() { this.ASL(this.directPageX()); this.cycles += 6; };          // ASL dp,X
    table[0x1E] = function() { this.ASL(this.absoluteX()); this.cycles += 7; };            // ASL addr,X

    // ===== LSR opcodes =====
    table[0x46] = function() { this.LSR(this.directPage()); this.cycles += 5; };           // LSR dp
    table[0x4A] = function() { // LSR A
      const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
      this.setFlag(CPUFlags.CARRY, (this.A & 0x01) !== 0);
      this.A = (this.A >> 1) & mask;
      this.updateNZFlags(this.A);
      this.cycles += 2;
    };
    table[0x4E] = function() { this.LSR(this.absolute()); this.cycles += 6; };             // LSR addr
    table[0x56] = function() { this.LSR(this.directPageX()); this.cycles += 6; };          // LSR dp,X
    table[0x5E] = function() { this.LSR(this.absoluteX()); this.cycles += 7; };            // LSR addr,X

    // ===== ROL opcodes =====
    table[0x26] = function() { this.ROL(this.directPage()); this.cycles += 5; };           // ROL dp
    table[0x2A] = function() { // ROL A
      const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
      const highBit = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x80 : 0x8000;
      const oldCarry = this.getFlag(CPUFlags.CARRY) ? 1 : 0;
      this.setFlag(CPUFlags.CARRY, (this.A & highBit) !== 0);
      this.A = ((this.A << 1) | oldCarry) & mask;
      this.updateNZFlags(this.A);
      this.cycles += 2;
    };
    table[0x2E] = function() { this.ROL(this.absolute()); this.cycles += 6; };             // ROL addr
    table[0x36] = function() { this.ROL(this.directPageX()); this.cycles += 6; };          // ROL dp,X
    table[0x3E] = function() { this.ROL(this.absoluteX()); this.cycles += 7; };            // ROL addr,X

    // ===== ROR opcodes =====
    table[0x66] = function() { this.ROR(this.directPage()); this.cycles += 5; };           // ROR dp
    table[0x6A] = function() { // ROR A
      const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
      const highBit = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0x80 : 0x8000;
      const oldCarry = this.getFlag(CPUFlags.CARRY) ? highBit : 0;
      this.setFlag(CPUFlags.CARRY, (this.A & 0x01) !== 0);
      this.A = ((this.A >> 1) | oldCarry) & mask;
      this.updateNZFlags(this.A);
      this.cycles += 2;
    };
    table[0x6E] = function() { this.ROR(this.absolute()); this.cycles += 6; };             // ROR addr
    table[0x76] = function() { this.ROR(this.directPageX()); this.cycles += 6; };          // ROR dp,X
    table[0x7E] = function() { this.ROR(this.absoluteX()); this.cycles += 7; };            // ROR addr,X

    // ===== INC/DEC opcodes =====
    table[0x1A] = function() { // INC A
      const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
      this.A = (this.A + 1) & mask;
      this.updateNZFlags(this.A);
      this.cycles += 2;
    };
    table[0x3A] = function() { // DEC A
      const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
      this.A = (this.A - 1) & mask;
      this.updateNZFlags(this.A);
      this.cycles += 2;
    };
    table[0xC6] = function() { this.DEC(this.directPage()); this.cycles += 5; };           // DEC dp
    table[0xCE] = function() { this.DEC(this.absolute()); this.cycles += 6; };             // DEC addr
    table[0xD6] = function() { this.DEC(this.directPageX()); this.cycles += 6; };          // DEC dp,X
    table[0xDE] = function() { this.DEC(this.absoluteX()); this.cycles += 7; };            // DEC addr,X
    table[0xE6] = function() { this.INC(this.directPage()); this.cycles += 5; };           // INC dp
    table[0xEE] = function() { this.INC(this.absolute()); this.cycles += 6; };             // INC addr
    table[0xF6] = function() { this.INC(this.directPageX()); this.cycles += 6; };          // INC dp,X
    table[0xFE] = function() { this.INC(this.absoluteX()); this.cycles += 7; };            // INC addr,X
    table[0xC8] = function() { // INY
      const mask = this.getFlag(CPUFlags.INDEX_8BIT) ? 0xFF : 0xFFFF;
      this.Y = (this.Y + 1) & mask;
      this.updateNZFlags(this.Y);
      this.cycles += 2;
    };
    table[0xCA] = function() { // DEX
      const mask = this.getFlag(CPUFlags.INDEX_8BIT) ? 0xFF : 0xFFFF;
      this.X = (this.X - 1) & mask;
      this.updateNZFlags(this.X);
      this.cycles += 2;
    };
    table[0x88] = function() { // DEY
      const mask = this.getFlag(CPUFlags.INDEX_8BIT) ? 0xFF : 0xFFFF;
      this.Y = (this.Y - 1) & mask;
      this.updateNZFlags(this.Y);
      this.cycles += 2;
    };
    table[0xE8] = function() { // INX
      const mask = this.getFlag(CPUFlags.INDEX_8BIT) ? 0xFF : 0xFFFF;
      this.X = (this.X + 1) & mask;
      this.updateNZFlags(this.X);
      this.cycles += 2;
    };

    // ===== LDA opcodes (additional) =====
    table[0xA1] = function() { this.LDA(this.directPageIndexedIndirectX()); this.cycles += 6; }; // LDA (dp,X)
    table[0xA3] = function() { this.LDA(this.stackRelative()); this.cycles += 4; };        // LDA sr,S
    table[0xA7] = function() { this.LDA(this.directPageIndirectLong()); this.cycles += 6; }; // LDA [dp]
    table[0xAF] = function() { this.LDA(this.absoluteLong()); this.cycles += 5; };         // LDA long
    table[0xB1] = function() { this.LDA(this.directPageIndirectIndexedY()); this.cycles += 5; }; // LDA (dp),Y
    table[0xB2] = function() { this.LDA(this.directPageIndirect()); this.cycles += 5; };   // LDA (dp)
    table[0xB3] = function() { this.LDA(this.stackRelativeIndirectIndexedY()); this.cycles += 7; }; // LDA (sr,S),Y
    table[0xB7] = function() { this.LDA(this.directPageIndirectLongIndexedY()); this.cycles += 6; }; // LDA [dp],Y
    table[0xBF] = function() { this.LDA(this.absoluteLongIndexedX()); this.cycles += 5; }; // LDA long,X

    // ===== STA opcodes (additional) =====
    table[0x81] = function() { this.STA(this.directPageIndexedIndirectX()); this.cycles += 6; }; // STA (dp,X)
    table[0x83] = function() { this.STA(this.stackRelative()); this.cycles += 4; };        // STA sr,S
    table[0x87] = function() { this.STA(this.directPageIndirectLong()); this.cycles += 6; }; // STA [dp]
    table[0x8F] = function() { this.STA(this.absoluteLong()); this.cycles += 5; };         // STA long
    table[0x91] = function() { this.STA(this.directPageIndirectIndexedY()); this.cycles += 6; }; // STA (dp),Y
    table[0x92] = function() { this.STA(this.directPageIndirect()); this.cycles += 5; };   // STA (dp)
    table[0x93] = function() { this.STA(this.stackRelativeIndirectIndexedY()); this.cycles += 7; }; // STA (sr,S),Y
    table[0x97] = function() { this.STA(this.directPageIndirectLongIndexedY()); this.cycles += 6; }; // STA [dp],Y
    table[0x9F] = function() { this.STA(this.absoluteLongIndexedX()); this.cycles += 5; }; // STA long,X

    // ===== STX/STY opcodes =====
    table[0x84] = function() { this.STY(this.directPage()); this.cycles += 3; };           // STY dp
    table[0x86] = function() { this.STX(this.directPage()); this.cycles += 3; };           // STX dp
    table[0x8C] = function() { this.STY(this.absolute()); this.cycles += 4; };             // STY addr
    table[0x8E] = function() { this.STX(this.absolute()); this.cycles += 4; };             // STX addr
    table[0x94] = function() { this.STY(this.directPageX()); this.cycles += 4; };          // STY dp,X
    table[0x96] = function() { this.STX(this.directPageY()); this.cycles += 4; };          // STX dp,Y

    // ===== STZ opcodes =====
    table[0x64] = function() { // STZ dp
      const addr = this.directPage();
      if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
        this.write8(addr, 0);
      } else {
        this.write16(addr, 0);
      }
      this.cycles += 3;
    };
    table[0x74] = function() { // STZ dp,X
      const addr = this.directPageX();
      if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
        this.write8(addr, 0);
      } else {
        this.write16(addr, 0);
      }
      this.cycles += 4;
    };
    table[0x9C] = function() { // STZ addr
      const addr = this.absolute();
      if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
        this.write8(addr, 0);
      } else {
        this.write16(addr, 0);
      }
      this.cycles += 4;
    };
    table[0x9E] = function() { // STZ addr,X
      const addr = this.absoluteX();
      if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
        this.write8(addr, 0);
      } else {
        this.write16(addr, 0);
      }
      this.cycles += 5;
    };

    // ===== Branch opcodes =====
    table[0x10] = function() { // BPL - Branch if Plus (N=0)
      const offset = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      if (!this.getFlag(CPUFlags.NEGATIVE)) {
        const signedOffset = offset < 0x80 ? offset : offset - 0x100;
        this.PC = (this.PC + signedOffset) & 0xFFFF;
        this.cycles += 3;
      } else {
        this.cycles += 2;
      }
    };
    table[0x50] = function() { // BVC - Branch if Overflow Clear (V=0)
      const offset = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      if (!this.getFlag(CPUFlags.OVERFLOW)) {
        const signedOffset = offset < 0x80 ? offset : offset - 0x100;
        this.PC = (this.PC + signedOffset) & 0xFFFF;
        this.cycles += 3;
      } else {
        this.cycles += 2;
      }
    };
    table[0x70] = function() { // BVS - Branch if Overflow Set (V=1)
      const offset = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      if (this.getFlag(CPUFlags.OVERFLOW)) {
        const signedOffset = offset < 0x80 ? offset : offset - 0x100;
        this.PC = (this.PC + signedOffset) & 0xFFFF;
        this.cycles += 3;
      } else {
        this.cycles += 2;
      }
    };
    table[0x90] = function() { // BCC - Branch if Carry Clear (C=0)
      const offset = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      if (!this.getFlag(CPUFlags.CARRY)) {
        const signedOffset = offset < 0x80 ? offset : offset - 0x100;
        this.PC = (this.PC + signedOffset) & 0xFFFF;
        this.cycles += 3;
      } else {
        this.cycles += 2;
      }
    };
    table[0xB0] = function() { // BCS - Branch if Carry Set (C=1)
      const offset = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      if (this.getFlag(CPUFlags.CARRY)) {
        const signedOffset = offset < 0x80 ? offset : offset - 0x100;
        this.PC = (this.PC + signedOffset) & 0xFFFF;
        this.cycles += 3;
      } else {
        this.cycles += 2;
      }
    };
    table[0xD0] = function() { // BNE - Branch if Not Equal (Z=0)
      const offset = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      if (!this.getFlag(CPUFlags.ZERO)) {
        const signedOffset = offset < 0x80 ? offset : offset - 0x100;
        this.PC = (this.PC + signedOffset) & 0xFFFF;
        this.cycles += 3;
      } else {
        this.cycles += 2;
      }
    };
    table[0xF0] = function() { // BEQ - Branch if Equal (Z=1)
      const offset = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      if (this.getFlag(CPUFlags.ZERO)) {
        const signedOffset = offset < 0x80 ? offset : offset - 0x100;
        this.PC = (this.PC + signedOffset) & 0xFFFF;
        this.cycles += 3;
      } else {
        this.cycles += 2;
      }
    };
    table[0x82] = function() { // BRL - Branch Always Long
      const offset = this.read16(this.PC);
      this.PC = (this.PC + 2) & 0xFFFF;
      const signedOffset = offset < 0x8000 ? offset : offset - 0x10000;
      this.PC = (this.PC + signedOffset) & 0xFFFF;
      this.cycles += 4;
    };

    // ===== Stack opcodes (additional) =====
    table[0x08] = function() { // PHP - Push Processor Status
      this.push8(this.P);
      this.cycles += 3;
    };
    table[0x28] = function() { // PLP - Pull Processor Status
      this.P = this.pop8();
      this.cycles += 4;
    };
    table[0x0B] = function() { // PHD - Push Direct Page
      this.push16(this.D);
      this.cycles += 4;
    };
    table[0x2B] = function() { // PLD - Pull Direct Page
      this.D = this.pop16();
      this.setFlag(CPUFlags.ZERO, this.D === 0);
      this.setFlag(CPUFlags.NEGATIVE, (this.D & 0x8000) !== 0);
      this.cycles += 5;
    };
    table[0x4B] = function() { // PHK - Push Program Bank
      this.push8(this.PBR);
      this.cycles += 3;
    };
    table[0x5A] = function() { // PHY - Push Y
      if (this.getFlag(CPUFlags.INDEX_8BIT)) {
        this.push8(this.Y);
      } else {
        this.push16(this.Y);
      }
      this.cycles += 3;
    };
    table[0x7A] = function() { // PLY - Pull Y
      if (this.getFlag(CPUFlags.INDEX_8BIT)) {
        this.Y = this.pop8();
      } else {
        this.Y = this.pop16();
      }
      this.updateNZFlags(this.Y);
      this.cycles += 4;
    };
    table[0x8B] = function() { // PHB - Push Data Bank
      this.push8(this.DBR);
      this.cycles += 3;
    };
    table[0xDA] = function() { // PHX - Push X
      if (this.getFlag(CPUFlags.INDEX_8BIT)) {
        this.push8(this.X);
      } else {
        this.push16(this.X);
      }
      this.cycles += 3;
    };
    table[0xFA] = function() { // PLX - Pull X
      if (this.getFlag(CPUFlags.INDEX_8BIT)) {
        this.X = this.pop8();
      } else {
        this.X = this.pop16();
      }
      this.updateNZFlags(this.X);
      this.cycles += 4;
    };
    table[0x62] = function() { // PER - Push Effective PC Relative
      const offset = this.read16(this.PC);
      this.PC = (this.PC + 2) & 0xFFFF;
      const effectiveAddr = (this.PC + offset) & 0xFFFF;
      this.push16(effectiveAddr);
      this.cycles += 6;
    };
    table[0xD4] = function() { // PEI - Push Effective Indirect
      const dp = this.read8(this.PC);
      this.PC = (this.PC + 1) & 0xFFFF;
      const addr = (this.D + dp) & 0xFFFF;
      const value = this.read16(addr);
      this.push16(value);
      this.cycles += 6;
    };
    table[0xF4] = function() { // PEA - Push Effective Absolute
      const value = this.read16(this.PC);
      this.PC = (this.PC + 2) & 0xFFFF;
      this.push16(value);
      this.cycles += 5;
    };

    // ===== Transfer opcodes (additional) =====
    table[0x1B] = function() { // TCS - Transfer Accumulator to Stack
      if (this.emulationMode) {
        this.S = 0x0100 | (this.A & 0xFF);
      } else {
        this.S = this.A;
      }
      this.cycles += 2;
    };
    table[0x3B] = function() { // TSC - Transfer Stack to Accumulator
      this.A = this.S;
      this.updateNZFlags(this.A);
      this.cycles += 2;
    };
    table[0x7B] = function() { // TDC - Transfer Direct Page to Accumulator
      this.A = this.D;
      this.updateNZFlags(this.A);
      this.cycles += 2;
    };
    table[0x9B] = function() { // TXY - Transfer X to Y
      this.Y = this.X & (this.getFlag(CPUFlags.INDEX_8BIT) ? 0xFF : 0xFFFF);
      this.updateNZFlags(this.Y);
      this.cycles += 2;
    };
    table[0xBA] = function() { // TSX - Transfer Stack to X
      this.X = this.S & (this.getFlag(CPUFlags.INDEX_8BIT) ? 0xFF : 0xFFFF);
      this.updateNZFlags(this.X);
      this.cycles += 2;
    };
    table[0xBB] = function() { // TYX - Transfer Y to X
      this.X = this.Y & (this.getFlag(CPUFlags.INDEX_8BIT) ? 0xFF : 0xFFFF);
      this.updateNZFlags(this.X);
      this.cycles += 2;
    };

    // ===== BIT opcodes (additional) =====
    table[0x2C] = function() { this.BIT(this.absolute()); this.cycles += 4; };             // BIT addr
    table[0x3C] = function() { this.BIT(this.absoluteX()); this.cycles += 4; };            // BIT addr,X
    table[0x89] = function() { // BIT #const - immediate mode (only affects Z flag)
      const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(this.immediate()) : this.read16(this.immediate());
      const result = this.A & value;
      const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
      this.setFlag(CPUFlags.ZERO, (result & mask) === 0);
      this.cycles += 2;
    };

    // ===== TSB/TRB opcodes =====
    table[0x04] = function() { // TSB dp - Test and Set Bits
      const addr = this.directPage();
      const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
      const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
      this.setFlag(CPUFlags.ZERO, ((this.A & value) & mask) === 0);
      const newValue = value | this.A;
      if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
        this.write8(addr, newValue);
      } else {
        this.write16(addr, newValue);
      }
      this.cycles += 5;
    };
    table[0x0C] = function() { // TSB addr - Test and Set Bits
      const addr = this.absolute();
      const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
      const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
      this.setFlag(CPUFlags.ZERO, ((this.A & value) & mask) === 0);
      const newValue = value | this.A;
      if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
        this.write8(addr, newValue);
      } else {
        this.write16(addr, newValue);
      }
      this.cycles += 6;
    };
    table[0x14] = function() { // TRB dp - Test and Reset Bits
      const addr = this.directPage();
      const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
      const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
      this.setFlag(CPUFlags.ZERO, ((this.A & value) & mask) === 0);
      const newValue = value & ~this.A;
      if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
        this.write8(addr, newValue);
      } else {
        this.write16(addr, newValue);
      }
      this.cycles += 5;
    };
    table[0x1C] = function() { // TRB addr - Test and Reset Bits
      const addr = this.absolute();
      const value = this.getFlag(CPUFlags.MEMORY_8BIT) ? this.read8(addr) : this.read16(addr);
      const mask = this.getFlag(CPUFlags.MEMORY_8BIT) ? 0xFF : 0xFFFF;
      this.setFlag(CPUFlags.ZERO, ((this.A & value) & mask) === 0);
      const newValue = value & ~this.A;
      if (this.getFlag(CPUFlags.MEMORY_8BIT)) {
        this.write8(addr, newValue);
      } else {
        this.write16(addr, newValue);
      }
      this.cycles += 6;
    };

    // ===== Jump opcodes (additional) =====
    table[0x5C] = function() { // JML - Jump Long
      const low = this.read16(this.PC);
      const bank = this.read8(this.PC + 2);
      this.PC = low;
      this.PBR = bank;
      this.cycles += 4;
    };
    table[0x7C] = function() { // JMP (addr,X) - Indexed Indirect
      this.PC = this.absoluteIndexedIndirect();
      this.cycles += 6;
    };
    table[0xDC] = function() { // JML [addr] - Indirect Long
      const ptr = this.read16(this.PC);
      this.PC = (this.PC + 2) & 0xFFFF;
      const low = this.read8(ptr);
      const mid = this.read8(ptr + 1);
      const bank = this.read8(ptr + 2);
      this.PC = (mid << 8) | low;
      this.PBR = bank;
      this.cycles += 6;
    };

    // ===== RTL - Return from Subroutine Long =====
    table[0x6B] = function() { // RTL
      this.PC = (this.pop16() + 1) & 0xFFFF;
      this.PBR = this.pop8();
      this.cycles += 6;
    };

    // ===== JSR indexed =====
    table[0xFC] = function() { // JSR (addr,X)
      const target = this.absoluteIndexedIndirect();
      this.push16(this.PC - 1);
      this.PC = target;
      this.cycles += 8;
    };

    // ===== XBA - Exchange Accumulator Bytes =====
    table[0xEB] = function() { // XBA
      const low = this.A & 0xFF;
      const high = (this.A >> 8) & 0xFF;
      this.A = (low << 8) | high;
      this.updateNZFlags(low); // Update flags based on new low byte
      this.cycles += 3;
    };

    // ===== STP - Stop Processor =====
    table[0xDB] = function() { // STP
      // Halts processor - in emulation, we just increment cycles
      this.cycles += 3;
      // In a real implementation, this would stop execution until reset
    };

    // ===== WAI - Wait for Interrupt =====
    table[0xCB] = function() { // WAI
      // Waits for interrupt - in emulation, we just increment cycles
      this.cycles += 3;
      // In a real implementation, this would halt until interrupt received
    };

    // ===== WDM - Reserved =====
    table[0x42] = function() { // WDM
      // Reserved for future expansion - skip operand byte
      this.PC = (this.PC + 1) & 0xFFFF;
      // Takes 0 cycles according to spec
    };

    // ===== MVN/MVP - Block Move =====
    table[0x54] = function() { // MVN srcbk,destbk - Move Negative (ascending)
      const destBank = this.read8(this.PC);
      const srcBank = this.read8(this.PC + 1);
      this.PC = (this.PC + 2) & 0xFFFF;
      
      // Read from source, write to dest
      const srcAddr = (srcBank << 16) | this.X;
      const destAddr = (destBank << 16) | this.Y;
      const value = this.memory.read(srcAddr);
      this.memory.write(destAddr, value);
      
      // Increment pointers
      this.X = (this.X + 1) & 0xFFFF;
      this.Y = (this.Y + 1) & 0xFFFF;
      
      // Decrement counter
      this.A = (this.A - 1) & 0xFFFF;
      
      // If not done, repeat (don't advance PC)
      if (this.A !== 0xFFFF) {
        this.PC = (this.PC - 3) & 0xFFFF;
      }
      
      this.cycles += 7;
    };
    table[0x44] = function() { // MVP srcbk,destbk - Move Positive (descending)
      const destBank = this.read8(this.PC);
      const srcBank = this.read8(this.PC + 1);
      this.PC = (this.PC + 2) & 0xFFFF;
      
      // Read from source, write to dest
      const srcAddr = (srcBank << 16) | this.X;
      const destAddr = (destBank << 16) | this.Y;
      const value = this.memory.read(srcAddr);
      this.memory.write(destAddr, value);
      
      // Decrement pointers
      this.X = (this.X - 1) & 0xFFFF;
      this.Y = (this.Y - 1) & 0xFFFF;
      
      // Decrement counter
      this.A = (this.A - 1) & 0xFFFF;
      
      // If not done, repeat (don't advance PC)
      if (this.A !== 0xFFFF) {
        this.PC = (this.PC - 3) & 0xFFFF;
      }
      
      this.cycles += 7;
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
