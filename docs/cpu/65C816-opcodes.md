# 65C816 Instruction Set Reference

This document provides comprehensive reference material for implementing 65C816 CPU opcodes in the JSNES emulator.

## Internal Registers

| Register | Name | Description |
|----------|------|-------------|
| A | Accumulator | The accumulator. This is the math register. It stores one of two operands or the result of most arithmetic and logical operations. |
| X, Y | Index | The index registers. These can be used to reference memory, to pass data to memory, or as counters for loops. |
| S | Stack Pointer | The stack pointer, points to the next available (unused) location on the stack. |
| DBR / DB | Data Bank | Data bank register, holds the default bank for memory transfers. |
| D / DP | Direct Page | Direct page register, used for direct page addressing modes. Holds the memory bank address of the data the CPU is accessing. |
| PB / PBR | Program Bank | Program Bank, holds the bank address of all instruction fetches. |
| P | Processor Status | Holds various important flags, results of tests and 65C816 processing states. |
| PC | Program Counter | Holds the memory address of the current CPU instruction |

## Processor Status Word (P Register) Flags

| Flag | Mask | Binary | Name | Description |
|------|------|--------|------|-------------|
| N | #$80 | 10000000 | Negative | Set when result is negative (bit 7 = 1) |
| V | #$40 | 01000000 | Overflow | Set on signed arithmetic overflow |
| M | #$20 | 00100000 | Accumulator Size | Native mode only: 0 = 16-bit, 1 = 8-bit |
| X | #$10 | 00010000 | Index Register Size | Native mode only: 0 = 16-bit, 1 = 8-bit |
| D | #$08 | 00001000 | Decimal | Decimal mode flag |
| I | #$04 | 00000100 | IRQ Disable | Interrupt disable flag |
| Z | #$02 | 00000010 | Zero | Set when result is zero |
| C | #$01 | 00000001 | Carry | Carry/borrow flag |
| E | - | - | Emulation | 6502 emulation mode (special flag) |
| B | #$10 | 00010000 | Break | Break flag (emulation mode only) |

## Addressing Modes

| Mode | Example | Description |
|------|---------|-------------|
| Implied | PHB | No operand specified |
| Immediate[MemoryFlag] | AND #1 or 2 bytes | Immediate data, size depends on M flag |
| Immediate[IndexFlag] | LDX #1 or 2 bytes | Immediate data, size depends on X flag |
| Immediate[8-Bit] | SEP #byte | Always 8-bit immediate |
| Relative | BEQ byte (signed) | 8-bit signed offset from PC |
| Relative long | BRL 2 bytes (signed) | 16-bit signed offset from PC |
| Direct | AND byte | Direct page address |
| Direct indexed (with X) | AND byte, X | Direct page address + X |
| Direct indexed (with Y) | AND byte, Y | Direct page address + Y |
| Direct indirect | AND (byte) | Indirect through direct page |
| Direct indexed indirect | AND (byte, X) | Indexed indirect through direct page |
| Direct indirect indexed | AND (byte), Y | Indirect indexed through direct page |
| Direct indirect long | AND [byte] | Long indirect through direct page |
| Direct indirect indexed long | AND [byte], Y | Long indirect indexed |
| Absolute | AND 2bytes | 16-bit address |
| Absolute indexed (with X) | AND 2bytes, X | 16-bit address + X |
| Absolute indexed (with Y) | AND 2bytes, Y | 16-bit address + Y |
| Absolute long | AND 3bytes | 24-bit address (with bank) |
| Absolute indexed long | AND 3bytes, X | 24-bit address + X |
| Stack relative | AND byte, S | Stack pointer + offset |
| Stack relative indirect indexed | AND (byte, S), Y | Stack relative indirect indexed |
| Absolute indirect | JMP (2bytes) | Indirect jump |
| Absolute indirect long | JML [2bytes] | Long indirect jump |
| Absolute indexed indirect | JMP/JSR (2bytes,X) | Indexed indirect jump |
| Implied accumulator | INC | Operates on accumulator |
| Block move | MVN/MVP byte, byte | Block memory move |

## Complete Opcode Table

### ADC - Add with Carry
Adds operand to the Accumulator; adds an additional 1 if carry is set.
**Flags affected:** NV----ZC

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x61 | ADC (dp,X) | DP Indexed Indirect,X | 2 | 6[1][2] |
| 0x63 | ADC sr,S | Stack Relative | 2 | 4[1] |
| 0x65 | ADC dp | Direct Page | 2 | 3[1][2] |
| 0x67 | ADC [dp] | DP Indirect Long | 2 | 6[1][2] |
| 0x69 | ADC #const | Immediate | 2[12] | 2[1] |
| 0x6D | ADC addr | Absolute | 3 | 4[1] |
| 0x6F | ADC long | Absolute Long | 4 | 5[1] |
| 0x71 | ADC (dp),Y | DP Indirect Indexed, Y | 2 | 5[1][2][3] |
| 0x72 | ADC (dp) | DP Indirect | 2 | 5[1][2] |
| 0x73 | ADC (sr,S),Y | SR Indirect Indexed,Y | 2 | 7[1] |
| 0x75 | ADC dp,X | DP Indexed,X | 2 | 4[1][2] |
| 0x77 | ADC [dp],Y | DP Indirect Long Indexed, Y | 2 | 6[1][2] |
| 0x79 | ADC addr,Y | Absolute Indexed,Y | 3 | 4[1][3] |
| 0x7D | ADC addr,X | Absolute Indexed,X | 3 | 4[1][3] |
| 0x7F | ADC long,X | Absolute Long Indexed,X | 4 | 5[1] |

### AND - Logical AND with Accumulator
Performs bitwise AND operation on accumulator.
**Flags affected:** N-----Z-

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x21 | AND (dp,X) | DP Indexed Indirect,X | 2 | 6[1][2] |
| 0x23 | AND sr,S | Stack Relative | 2 | 4[1] |
| 0x25 | AND dp | Direct Page | 2 | 3[1][2] |
| 0x27 | AND [dp] | DP Indirect Long | 2 | 6[1][2] |
| 0x29 | AND #const | Immediate | 2[12] | 2[1] |
| 0x2D | AND addr | Absolute | 3 | 4[1] |
| 0x2F | AND long | Absolute Long | 4 | 5[1] |
| 0x31 | AND (dp),Y | DP Indirect Indexed, Y | 2 | 5[1][2][3] |
| 0x32 | AND (dp) | DP Indirect | 2 | 5[1][2] |
| 0x33 | AND (sr,S),Y | SR Indirect Indexed,Y | 2 | 7[1] |
| 0x35 | AND dp,X | DP Indexed,X | 2 | 4[1][2] |
| 0x37 | AND [dp],Y | DP Indirect Long Indexed, Y | 2 | 6[1][2] |
| 0x39 | AND addr,Y | Absolute Indexed,Y | 3 | 4[1][3] |
| 0x3D | AND addr,X | Absolute Indexed,X | 3 | 4[1][3] |
| 0x3F | AND long,X | Absolute Long Indexed,X | 4 | 5[1] |

### ASL - Arithmetic Shift Left
Shifts Memory or Accumulator left one bit. High bit goes to carry, 0 shifted into low bit.
**Flags affected:** N-----ZC

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x06 | ASL dp | Direct Page | 2 | 5[2][4] |
| 0x0A | ASL A | Accumulator | 1 | 2 |
| 0x0E | ASL addr | Absolute | 3 | 6[4] |
| 0x16 | ASL dp,X | DP Indexed,X | 2 | 6[2][4] |
| 0x1E | ASL addr,X | Absolute Indexed,X | 3 | 7[4] |

### Branch Instructions
All branch instructions: Add 1 cycle if branch taken. Add 1 more if crosses page boundary in emulation mode.

| Opcode | Syntax | Condition | Bytes | Cycles |
|--------|--------|-----------|-------|--------|
| 0x90 | BCC nearlabel | Carry Clear (C=0) | 2 | 2[5][6] |
| 0xB0 | BCS nearlabel | Carry Set (C=1) | 2 | 2[5][6] |
| 0xF0 | BEQ nearlabel | Equal (Z=1) | 2 | 2[5][6] |
| 0x30 | BMI nearlabel | Minus (N=1) | 2 | 2[5][6] |
| 0xD0 | BNE nearlabel | Not Equal (Z=0) | 2 | 2[5][6] |
| 0x10 | BPL nearlabel | Plus (N=0) | 2 | 2[5][6] |
| 0x80 | BRA nearlabel | Always | 2 | 3[6] |
| 0x82 | BRL label | Always (long) | 3 | 4 |
| 0x50 | BVC nearlabel | Overflow Clear (V=0) | 2 | 2[5][6] |
| 0x70 | BVS nearlabel | Overflow Set (V=1) | 2 | 2[5][6] |

### BIT - Bit Test
Tests bits without modifying accumulator.
**Flags affected:** NV----Z- (immediate mode: ------Z-)

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x24 | BIT dp | Direct Page | 2 | 3[1][2] |
| 0x2C | BIT addr | Absolute | 3 | 4[1] |
| 0x34 | BIT dp,X | DP Indexed,X | 2 | 4[1][2] |
| 0x3C | BIT addr,X | Absolute Indexed,X | 3 | 4[1][3] |
| 0x89 | BIT #const | Immediate | 2[12] | 2[1] |

### BRK - Software Break
Causes software interrupt. PC loaded from interrupt vector at $00FFE6 (native) or $00FFFE (emulation).
**Flags affected:** ----DI--

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x00 | BRK | Stack/Interrupt | 2[13] | 7[7] |

**Note:** Opcode is 1 byte, but PC is incremented by 2 to skip signature byte.

### COP - Co-Processor Interrupt
Causes software interrupt. PC loaded from interrupt vector at $00FFE4 (native) or $00FFF4 (emulation).
**Flags affected:** ----DI--

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x02 | COP #const | Stack/Interrupt | 2[13] | 7[7] |

### Clear Flag Instructions

| Opcode | Syntax | Description | Flags |
|--------|--------|-------------|-------|
| 0x18 | CLC | Clear Carry | -------C |
| 0xD8 | CLD | Clear Decimal | ----D--- |
| 0x58 | CLI | Clear IRQ Disable | -----I-- |
| 0xB8 | CLV | Clear Overflow | -V------ |

### CMP, CPX, CPY - Compare Operations
Compares register with memory by subtraction (register - memory). Sets flags but doesn't store result.
**Flags affected:** N-----ZC

| Opcode | Syntax | Register | Addressing Mode | Bytes | Cycles |
|--------|--------|----------|-----------------|-------|--------|
| 0xC1 | CMP (dp,X) | A | DP Indexed Indirect,X | 2 | 6[1][2] |
| 0xC3 | CMP sr,S | A | Stack Relative | 2 | 4[1] |
| 0xC5 | CMP dp | A | Direct Page | 2 | 3[1][2] |
| 0xC7 | CMP [dp] | A | DP Indirect Long | 2 | 6[1][2] |
| 0xC9 | CMP #const | A | Immediate | 2[12] | 2[1] |
| 0xCD | CMP addr | A | Absolute | 3 | 4[1] |
| 0xCF | CMP long | A | Absolute Long | 4 | 5[1] |
| 0xD1 | CMP (dp),Y | A | DP Indirect Indexed, Y | 2 | 5[1][2][3] |
| 0xD2 | CMP (dp) | A | DP Indirect | 2 | 5[1][2] |
| 0xD3 | CMP (sr,S),Y | A | SR Indirect Indexed,Y | 2 | 7[1] |
| 0xD5 | CMP dp,X | A | DP Indexed,X | 2 | 4[1][2] |
| 0xD7 | CMP [dp],Y | A | DP Indirect Long Indexed, Y | 2 | 6[1][2] |
| 0xD9 | CMP addr,Y | A | Absolute Indexed,Y | 3 | 4[1][3] |
| 0xDD | CMP addr,X | A | Absolute Indexed,X | 3 | 4[1][3] |
| 0xDF | CMP long,X | A | Absolute Long Indexed,X | 4 | 5[1] |
| 0xE0 | CPX #const | X | Immediate | 2[14] | 2[8] |
| 0xE4 | CPX dp | X | Direct Page | 2 | 3[2][8] |
| 0xEC | CPX addr | X | Absolute | 3 | 4[8] |
| 0xC0 | CPY #const | Y | Immediate | 2[14] | 2[8] |
| 0xC4 | CPY dp | Y | Direct Page | 2 | 3[2][8] |
| 0xCC | CPY addr | Y | Absolute | 3 | 4[8] |

### DEC - Decrement
Subtracts 1 from memory or accumulator.
**Flags affected:** N-----Z-

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x3A | DEC A | Accumulator | 1 | 2 |
| 0xC6 | DEC dp | Direct Page | 2 | 5[2][4] |
| 0xCE | DEC addr | Absolute | 3 | 6[4] |
| 0xD6 | DEC dp,X | DP Indexed,X | 2 | 6[2][4] |
| 0xDE | DEC addr,X | Absolute Indexed,X | 3 | 7[4] |
| 0xCA | DEX | X Register | 1 | 2 |
| 0x88 | DEY | Y Register | 1 | 2 |

### EOR - Exclusive OR
Performs bitwise exclusive OR on accumulator.
**Flags affected:** N-----Z-

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x41 | EOR (dp,X) | DP Indexed Indirect,X | 2 | 6[1][2] |
| 0x43 | EOR sr,S | Stack Relative | 2 | 4[1] |
| 0x45 | EOR dp | Direct Page | 2 | 3[1][2] |
| 0x47 | EOR [dp] | DP Indirect Long | 2 | 6[1][2] |
| 0x49 | EOR #const | Immediate | 2[12] | 2[1] |
| 0x4D | EOR addr | Absolute | 3 | 4[1] |
| 0x4F | EOR long | Absolute Long | 4 | 5[1] |
| 0x51 | EOR (dp),Y | DP Indirect Indexed, Y | 2 | 5[1][2][3] |
| 0x52 | EOR (dp) | DP Indirect | 2 | 5[1][2] |
| 0x53 | EOR (sr,S),Y | SR Indirect Indexed,Y | 2 | 7[1] |
| 0x55 | EOR dp,X | DP Indexed,X | 2 | 4[1][2] |
| 0x57 | EOR [dp],Y | DP Indirect Long Indexed, Y | 2 | 6[1][2] |
| 0x59 | EOR addr,Y | Absolute Indexed,Y | 3 | 4[1][3] |
| 0x5D | EOR addr,X | Absolute Indexed,X | 3 | 4[1][3] |
| 0x5F | EOR long,X | Absolute Long Indexed,X | 4 | 5[1] |

### INC - Increment
Adds 1 to memory or accumulator.
**Flags affected:** N-----Z-

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x1A | INC A | Accumulator | 1 | 2 |
| 0xE6 | INC dp | Direct Page | 2 | 5[2][4] |
| 0xEE | INC addr | Absolute | 3 | 6[4] |
| 0xF6 | INC dp,X | DP Indexed,X | 2 | 6[2][4] |
| 0xFE | INC addr,X | Absolute Indexed,X | 3 | 7[4] |
| 0xE8 | INX | X Register | 1 | 2 |
| 0xC8 | INY | Y Register | 1 | 2 |

### JMP/JML - Jump
Transfers control to specified address.

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x4C | JMP addr | Absolute | 3 | 3 |
| 0x5C | JML long | Absolute Long | 4 | 4 |
| 0x6C | JMP (addr) | Absolute Indirect | 3 | 5 |
| 0x7C | JMP (addr,X) | Absolute Indexed Indirect | 3 | 6 |
| 0xDC | JML [addr] | Absolute Indirect Long | 3 | 6 |

### JSR/JSL - Jump to Subroutine
Calls subroutine (saves return address on stack).

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x20 | JSR addr | Absolute | 3 | 6 |
| 0x22 | JSL long | Absolute Long | 4 | 8 |
| 0xFC | JSR (addr,X) | Absolute Indexed Indirect | 3 | 8 |

### Load Instructions
Loads value into register.
**Flags affected:** N-----Z-

| Opcode | Syntax | Register | Addressing Mode | Bytes | Cycles |
|--------|--------|----------|-----------------|-------|--------|
| 0xA1 | LDA (dp,X) | A | DP Indexed Indirect,X | 2 | 6[1][2] |
| 0xA3 | LDA sr,S | A | Stack Relative | 2 | 4[1] |
| 0xA5 | LDA dp | A | Direct Page | 2 | 3[1][2] |
| 0xA7 | LDA [dp] | A | DP Indirect Long | 2 | 6[1][2] |
| 0xA9 | LDA #const | A | Immediate | 2[12] | 2[1] |
| 0xAD | LDA addr | A | Absolute | 3 | 4[1] |
| 0xAF | LDA long | A | Absolute Long | 4 | 5[1] |
| 0xB1 | LDA (dp),Y | A | DP Indirect Indexed, Y | 2 | 5[1][2][3] |
| 0xB2 | LDA (dp) | A | DP Indirect | 2 | 5[1][2] |
| 0xB3 | LDA (sr,S),Y | A | SR Indirect Indexed,Y | 2 | 7[1] |
| 0xB5 | LDA dp,X | A | DP Indexed,X | 2 | 4[1][2] |
| 0xB7 | LDA [dp],Y | A | DP Indirect Long Indexed, Y | 2 | 6[1][2] |
| 0xB9 | LDA addr,Y | A | Absolute Indexed,Y | 3 | 4[1][3] |
| 0xBD | LDA addr,X | A | Absolute Indexed,X | 3 | 4[1][3] |
| 0xBF | LDA long,X | A | Absolute Long Indexed,X | 4 | 5[1] |
| 0xA2 | LDX #const | X | Immediate | 2[14] | 2[8] |
| 0xA6 | LDX dp | X | Direct Page | 2 | 3[2][8] |
| 0xAE | LDX addr | X | Absolute | 3 | 4[8] |
| 0xB6 | LDX dp,Y | X | DP Indexed,Y | 2 | 4[2][8] |
| 0xBE | LDX addr,Y | X | Absolute Indexed,Y | 3 | 4[3][8] |
| 0xA0 | LDY #const | Y | Immediate | 2[14] | 2[8] |
| 0xA4 | LDY dp | Y | Direct Page | 2 | 3[2][8] |
| 0xAC | LDY addr | Y | Absolute | 3 | 4[8] |
| 0xB4 | LDY dp,X | Y | DP Indexed,X | 2 | 4[2][8] |
| 0xBC | LDY addr,X | Y | Absolute Indexed,X | 3 | 4[3][8] |

### LSR - Logical Shift Right
Shifts Memory or Accumulator right one bit. Low bit goes to carry, 0 shifted into high bit.
**Flags affected:** N-----ZC

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x46 | LSR dp | Direct Page | 2 | 5[2][4] |
| 0x4A | LSR A | Accumulator | 1 | 2 |
| 0x4E | LSR addr | Absolute | 3 | 6[4] |
| 0x56 | LSR dp,X | DP Indexed,X | 2 | 6[2][4] |
| 0x5E | LSR addr,X | Absolute Indexed,X | 3 | 7[4] |

### MVN/MVP - Block Move
Moves block of memory. A holds count-1, X=source, Y=dest, operands are banks.

| Opcode | Syntax | Direction | Bytes | Cycles |
|--------|--------|-----------|-------|--------|
| 0x54 | MVN srcbk,destbk | Negative (ascending) | 3 | 7/byte |
| 0x44 | MVP srcbk,destbk | Positive (descending) | 3 | 7/byte |

### NOP - No Operation
Does nothing for 2 cycles.

| Opcode | Syntax | Bytes | Cycles |
|--------|--------|-------|--------|
| 0xEA | NOP | 1 | 2 |

### ORA - Logical OR
Performs bitwise OR on accumulator.
**Flags affected:** N-----Z-

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x01 | ORA (dp,X) | DP Indexed Indirect,X | 2 | 6[1][2] |
| 0x03 | ORA sr,S | Stack Relative | 2 | 4[1] |
| 0x05 | ORA dp | Direct Page | 2 | 3[1][2] |
| 0x07 | ORA [dp] | DP Indirect Long | 2 | 6[1][2] |
| 0x09 | ORA #const | Immediate | 2[12] | 2[1] |
| 0x0D | ORA addr | Absolute | 3 | 4[1] |
| 0x0F | ORA long | Absolute Long | 4 | 5[1] |
| 0x11 | ORA (dp),Y | DP Indirect Indexed, Y | 2 | 5[1][2][3] |
| 0x12 | ORA (dp) | DP Indirect | 2 | 5[1][2] |
| 0x13 | ORA (sr,S),Y | SR Indirect Indexed,Y | 2 | 7[1] |
| 0x15 | ORA dp,X | DP Indexed,X | 2 | 4[1][2] |
| 0x17 | ORA [dp],Y | DP Indirect Long Indexed, Y | 2 | 6[1][2] |
| 0x19 | ORA addr,Y | Absolute Indexed,Y | 3 | 4[1][3] |
| 0x1D | ORA addr,X | Absolute Indexed,X | 3 | 4[1][3] |
| 0x1F | ORA long,X | Absolute Long Indexed,X | 4 | 5[1] |

### Push/Pull Instructions
Stack operations.

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x48 | PHA | Push Accumulator | - | 1 | 3[1] |
| 0x8B | PHB | Push Data Bank | - | 1 | 3 |
| 0x0B | PHD | Push Direct Page | - | 1 | 4 |
| 0x4B | PHK | Push Program Bank | - | 1 | 3 |
| 0x08 | PHP | Push Processor Status | - | 1 | 3 |
| 0xDA | PHX | Push X | - | 1 | 3[8] |
| 0x5A | PHY | Push Y | - | 1 | 3[8] |
| 0x68 | PLA | Pull Accumulator | N-----Z- | 1 | 4[1] |
| 0xAB | PLB | Pull Data Bank | N-----Z- | 1 | 4 |
| 0x2B | PLD | Pull Direct Page | N-----Z- | 1 | 5 |
| 0x28 | PLP | Pull Processor Status | NVMXDIZC | 1 | 4 |
| 0xFA | PLX | Pull X | N-----Z- | 1 | 4[8] |
| 0x7A | PLY | Pull Y | N-----Z- | 1 | 4[8] |
| 0xF4 | PEA addr | Push Effective Absolute | - | 3 | 5 |
| 0xD4 | PEI (dp) | Push Effective Indirect | - | 2 | 6[2] |
| 0x62 | PER label | Push Effective PC Relative | - | 3 | 6 |

### REP - Reset Processor Status Bits
Clears specified status bits (1s in operand clear corresponding flags).
**Flags affected:** NVMXDIZC

| Opcode | Syntax | Bytes | Cycles |
|--------|--------|-------|--------|
| 0xC2 | REP #const | 2 | 3 |

Example: `REP #$30` clears M and X flags (makes A, X, Y 16-bit)

### ROL - Rotate Left
Rotates left through carry: C <- bit7 <- ... <- bit0 <- C
**Flags affected:** N-----ZC

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x26 | ROL dp | Direct Page | 2 | 5[2][4] |
| 0x2A | ROL A | Accumulator | 1 | 2 |
| 0x2E | ROL addr | Absolute | 3 | 6[4] |
| 0x36 | ROL dp,X | DP Indexed,X | 2 | 6[2][4] |
| 0x3E | ROL addr,X | Absolute Indexed,X | 3 | 7[4] |

### ROR - Rotate Right
Rotates right through carry: C -> bit7 -> ... -> bit0 -> C
**Flags affected:** N-----ZC

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0x66 | ROR dp | Direct Page | 2 | 5[2][4] |
| 0x6A | ROR A | Accumulator | 1 | 2 |
| 0x6E | ROR addr | Absolute | 3 | 6[4] |
| 0x76 | ROR dp,X | DP Indexed,X | 2 | 6[2][4] |
| 0x7E | ROR addr,X | Absolute Indexed,X | 3 | 7[4] |

### RTI - Return from Interrupt
Returns from interrupt handler (pulls flags and PC from stack).
**Flags affected:** NVMXDIZC

| Opcode | Syntax | Bytes | Cycles |
|--------|--------|-------|--------|
| 0x40 | RTI | 1 | 6[7] |

### RTS/RTL - Return from Subroutine
Returns from subroutine.

| Opcode | Syntax | Bytes | Cycles |
|--------|--------|-------|--------|
| 0x60 | RTS | 1 | 6 |
| 0x6B | RTL | 1 | 6 |

### SBC - Subtract with Borrow
Subtracts operand from accumulator; subtracts additional 1 if carry clear.
**Flags affected:** NV----ZC

| Opcode | Syntax | Addressing Mode | Bytes | Cycles |
|--------|--------|-----------------|-------|--------|
| 0xE1 | SBC (dp,X) | DP Indexed Indirect,X | 2 | 6[1][2] |
| 0xE3 | SBC sr,S | Stack Relative | 2 | 4[1] |
| 0xE5 | SBC dp | Direct Page | 2 | 3[1][2] |
| 0xE7 | SBC [dp] | DP Indirect Long | 2 | 6[1][2] |
| 0xE9 | SBC #const | Immediate | 2[12] | 2[1] |
| 0xED | SBC addr | Absolute | 3 | 4[1] |
| 0xEF | SBC long | Absolute Long | 4 | 5[1] |
| 0xF1 | SBC (dp),Y | DP Indirect Indexed, Y | 2 | 5[1][2][3] |
| 0xF2 | SBC (dp) | DP Indirect | 2 | 5[1][2] |
| 0xF3 | SBC (sr,S),Y | SR Indirect Indexed,Y | 2 | 7[1] |
| 0xF5 | SBC dp,X | DP Indexed,X | 2 | 4[1][2] |
| 0xF7 | SBC [dp],Y | DP Indirect Long Indexed, Y | 2 | 6[1][2] |
| 0xF9 | SBC addr,Y | Absolute Indexed,Y | 3 | 4[1][3] |
| 0xFD | SBC addr,X | Absolute Indexed,X | 3 | 4[1][3] |
| 0xFF | SBC long,X | Absolute Long Indexed,X | 4 | 5[1] |

### Set Flag Instructions

| Opcode | Syntax | Description | Flags |
|--------|--------|-------------|-------|
| 0x38 | SEC | Set Carry | -------C |
| 0xF8 | SED | Set Decimal | ----D--- |
| 0x78 | SEI | Set IRQ Disable | -----I-- |

### SEP - Set Processor Status Bits
Sets specified status bits (1s in operand set corresponding flags).
**Flags affected:** NVMXDIZC

| Opcode | Syntax | Bytes | Cycles |
|--------|--------|-------|--------|
| 0xE2 | SEP #const | 2 | 3 |

Example: `SEP #$20` sets M flag (makes A 8-bit)

### Store Instructions
Stores register value to memory.

| Opcode | Syntax | Register | Addressing Mode | Bytes | Cycles |
|--------|--------|----------|-----------------|-------|--------|
| 0x81 | STA (dp,X) | A | DP Indexed Indirect,X | 2 | 6[1][2] |
| 0x83 | STA sr,S | A | Stack Relative | 2 | 4[1] |
| 0x85 | STA dp | A | Direct Page | 2 | 3[1][2] |
| 0x87 | STA [dp] | A | DP Indirect Long | 2 | 6[1][2] |
| 0x8D | STA addr | A | Absolute | 3 | 4[1] |
| 0x8F | STA long | A | Absolute Long | 4 | 5[1] |
| 0x91 | STA (dp),Y | A | DP Indirect Indexed, Y | 2 | 6[1][2] |
| 0x92 | STA (dp) | A | DP Indirect | 2 | 5[1][2] |
| 0x93 | STA (sr,S),Y | A | SR Indirect Indexed,Y | 2 | 7[1] |
| 0x95 | STA dp,X | A | DP Indexed,X | 2 | 4[1][2] |
| 0x97 | STA [dp],Y | A | DP Indirect Long Indexed, Y | 2 | 6[1][2] |
| 0x99 | STA addr,Y | A | Absolute Indexed,Y | 3 | 5[1] |
| 0x9D | STA addr,X | A | Absolute Indexed,X | 3 | 5[1] |
| 0x9F | STA long,X | A | Absolute Long Indexed,X | 4 | 5[1] |
| 0x86 | STX dp | X | Direct Page | 2 | 3[2][8] |
| 0x8E | STX addr | X | Absolute | 3 | 4[8] |
| 0x96 | STX dp,Y | X | DP Indexed,Y | 2 | 4[2][8] |
| 0x84 | STY dp | Y | Direct Page | 2 | 3[2][8] |
| 0x8C | STY addr | Y | Absolute | 3 | 4[8] |
| 0x94 | STY dp,X | Y | DP Indexed,X | 2 | 4[2][8] |
| 0x64 | STZ dp | Zero | Direct Page | 2 | 3[1][2] |
| 0x74 | STZ dp,X | Zero | DP Indexed,X | 2 | 4[1][2] |
| 0x9C | STZ addr | Zero | Absolute | 3 | 4[1] |
| 0x9E | STZ addr,X | Zero | Absolute Indexed,X | 3 | 5[1] |

### STP - Stop Processor
Halts the processor until reset.

| Opcode | Syntax | Bytes | Cycles |
|--------|--------|-------|--------|
| 0xDB | STP | 1 | 3[9] |

### Transfer Instructions
Copies value from one register to another.
**Flags affected:** Varies (see table)

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0xAA | TAX | Transfer A to X | N-----Z- | 1 | 2 |
| 0xA8 | TAY | Transfer A to Y | N-----Z- | 1 | 2 |
| 0x5B | TCD | Transfer A to Direct Page | N-----Z- | 1 | 2 |
| 0x1B | TCS | Transfer A to Stack | - | 1 | 2 |
| 0x7B | TDC | Transfer Direct Page to A | N-----Z- | 1 | 2 |
| 0x3B | TSC | Transfer Stack to A | N-----Z- | 1 | 2 |
| 0xBA | TSX | Transfer Stack to X | N-----Z- | 1 | 2 |
| 0x8A | TXA | Transfer X to A | N-----Z- | 1 | 2 |
| 0x9A | TXS | Transfer X to Stack | - | 1 | 2 |
| 0x9B | TXY | Transfer X to Y | N-----Z- | 1 | 2 |
| 0x98 | TYA | Transfer Y to A | N-----Z- | 1 | 2 |
| 0xBB | TYX | Transfer Y to X | N-----Z- | 1 | 2 |

### TRB/TSB - Test and Reset/Set Bits
Tests bits with accumulator and modifies memory.
**Flags affected:** ------Z-

| Opcode | Syntax | Description | Bytes | Cycles |
|--------|--------|-------------|-------|--------|
| 0x14 | TRB dp | Test and reset bits | 2 | 5[2][4] |
| 0x1C | TRB addr | Test and reset bits | 3 | 6[4] |
| 0x04 | TSB dp | Test and set bits | 2 | 5[2][4] |
| 0x0C | TSB addr | Test and set bits | 3 | 6[4] |

### WAI - Wait for Interrupt
Halts processor until hardware interrupt received.

| Opcode | Syntax | Bytes | Cycles |
|--------|--------|-------|--------|
| 0xCB | WAI | 1 | 3[10] |

### WDM - Reserved
Reserved for future expansion.

| Opcode | Syntax | Bytes | Cycles |
|--------|--------|-------|--------|
| 0x42 | WDM | 2 | 0[11] |

### XBA - Exchange Accumulator Bytes
Swaps high and low bytes of 16-bit accumulator.
**Flags affected:** N-----Z-

| Opcode | Syntax | Bytes | Cycles |
|--------|--------|-------|--------|
| 0xEB | XBA | 1 | 3 |

### XCE - Exchange Carry and Emulation
Swaps carry flag with emulation mode flag. Used to switch between native and emulation modes.
**Flags affected:** --MX---CE

| Opcode | Syntax | Bytes | Cycles |
|--------|--------|-------|--------|
| 0xFB | XCE | 1 | 2 |

Example to enter native mode:
```
CLC     ; Clear carry
XCE     ; Swap with emulation flag (E=0, native mode)
```

## Cycle Timing Notes

[1] Add 1 cycle if m=0 (16-bit memory/accumulator)
[2] Add 1 cycle if low byte of Direct Page Register is non-zero
[3] Add 1 cycle if adding index crosses a page boundary or x=0 (16-bit index registers)
[4] Add 2 cycles if m=0 (16-bit memory/accumulator)
[5] Add 1 cycle if branch is taken
[6] Add 1 cycle if branch taken crosses page boundary in emulation mode (e=1)
[7] Add 1 cycle for 65816 native mode (e=0)
[8] Add 1 cycle if x=0 (16-bit index registers)
[9] Uses 3 cycles to shut the processor down; additional cycles required by reset to restart
[10] Uses 3 cycles to shut the processor down; additional cycles required by interrupt to restart
[11] Byte and cycle counts subject to change in future processors
[12] Add 1 byte if m=0 (16-bit memory/accumulator)
[13] Opcode is 1 byte, but PC pushed onto stack is incremented by 2 for optional signature byte
[14] Add 1 byte if x=0 (16-bit index registers)

## Implementation Notes

### Register Size Behavior
- M flag controls Accumulator size: M=1 (8-bit), M=0 (16-bit)
- X flag controls Index register size: X=1 (8-bit), X=0 (16-bit)
- Use REP/SEP to change flag values
- Transfers are the width of the destination register

### Direct Page
- Direct Page register (D) provides base address for direct page addressing
- If D=$0000, direct page is in bank 0, bytes $0000-$00FF
- If D=$0100, direct page is in bank 0, bytes $0100-$01FF
- Non-zero low byte of D adds 1 cycle to direct page operations

### Stack
- Stack Pointer (S) points to next available stack location
- Stack grows downward (push decrements S, pull increments S)
- In emulation mode, S is forced to page 1 ($01xx)
- In native mode, S can be anywhere in bank 0

### Interrupts
- BRK: Software break, vector at $00FFE6 (native) / $00FFFE (emulation)
- COP: Co-processor interrupt, vector at $00FFE4 (native) / $00FFF4 (emulation)
- IRQ: Hardware interrupt, vector at $00FFEE (native) / $00FFFE (emulation)
- NMI: Non-maskable interrupt, vector at $00FFEA (native) / $00FFFA (emulation)

### Block Moves (MVN/MVP)
- A holds number of bytes to move minus 1
- X holds source address (low 16 bits)
- Y holds destination address (low 16 bits)
- Operand bytes specify source and destination banks
- MVN: Ascending addresses (use when dest > source)
- MVP: Descending addresses (use when source > dest)

## References
- [Super Famicom Dev Wiki - 65816 Reference](https://wiki.superfamicom.org/65816-reference)
- [WDC 65C816 Programming Manual](http://westerndesigncenter.com/wdc/documentation.cfm)
