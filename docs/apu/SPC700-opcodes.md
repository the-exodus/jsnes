# SPC700 Instruction Set Reference

This document provides comprehensive reference material for implementing SPC700 APU opcodes in the JSNES emulator.

## System Overview

- **CPU:** 8-bit SPC700, runs at 1.024MHz (minimum 2 cycles per instruction)
- **Memory:** 64KB shared memory space
- **Communication:** 4x 8-bit I/O ports for SNES communication
- **Sound:** 8 ADPCM sample channels with DSP effects
- **Timers:** Two 8KHz timers + one 64KHz timer (all 8-bit with 4-bit counters)

## SPC Memory Map

| Address Range | Description |
|---------------|-------------|
| $0000-$00EF | Page 0 (Zero Page) |
| $00F0-$00FF | Hardware Registers |
| $0100-$01FF | Page 1 (Stack Page) |
| $0200-$FFBF | General Memory |
| $FFC0-$FFFF | IPL ROM (read) / RAM (write) |

## CPU Registers

| Register | Name | Description |
|----------|------|-------------|
| A | Accumulator | 8-bit accumulator for arithmetic/logic operations |
| X | Index X | 8-bit index register for addressing and counters |
| Y | Index Y | 8-bit index register for addressing and counters |
| SP | Stack Pointer | Points to stack in Page 1 ($0100-$01FF) |
| PC | Program Counter | 16-bit instruction pointer |
| PSW | Program Status Word | Processor flags |

## Program Status Word (PSW) Flags

| Flag | Name | Description |
|------|------|-------------|
| N | Negative | Set when result is negative (bit 7 = 1) |
| V | Overflow | Set on signed arithmetic overflow |
| P | Direct Page | 0 = Page 0 ($0000-$00FF), 1 = Page 1 ($0100-$01FF) |
| B | Break | Set by BRK instruction (unused otherwise) |
| H | Half Carry | Used for BCD arithmetic with DAA/DAS |
| I | Interrupt Enable | Interrupt flag (unused - no interrupt support) |
| Z | Zero | Set when result is zero |
| C | Carry | Carry/borrow flag for arithmetic operations |

## Addressing Modes

| Mode | Example | Description |
|------|---------|-------------|
| Implied | NOP | No operand |
| Immediate | MOV A, #$42 | Immediate 8-bit value |
| Direct Page | MOV A, $20 | Zero page address |
| Direct Page + X | MOV A, $20+X | Zero page + X offset |
| Direct Page + Y | MOV X, $20+Y | Zero page + Y offset |
| Absolute | MOV A, $1234 | 16-bit address |
| Absolute + X | MOV A, $1234+X | Absolute + X offset |
| Absolute + Y | MOV A, $1234+Y | Absolute + Y offset |
| Indirect X | MOV A, (X) | Address in X register |
| Indirect X+ | MOV A, (X)+ | Address in X, post-increment X |
| Direct Indirect | MOV A, ($20) | Indirect through DP |
| Direct Indexed Indirect | MOV A, ($20+X) | Indexed indirect through DP |
| Direct Indirect Indexed | MOV A, ($20)+Y | Indirect indexed through DP |
| Relative | BEQ $+10 | PC-relative branch offset |
| Bit Address | SET1 $20.5 | Direct page address + bit number |

## Complete Opcode Table

### 8-bit Data Transmission (Read)

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0xE8 | MOV A, #imm | A ← immediate | N-----Z- | 2 | 2 |
| 0xE6 | MOV A, (X) | A ← (X) | N-----Z- | 1 | 3 |
| 0xBF | MOV A, (X)+ | A ← (X), X++ | N-----Z- | 1 | 4 |
| 0xE4 | MOV A, dp | A ← (dp) | N-----Z- | 2 | 3 |
| 0xF4 | MOV A, dp+X | A ← (dp+X) | N-----Z- | 2 | 4 |
| 0xE5 | MOV A, !abs | A ← (abs) | N-----Z- | 3 | 4 |
| 0xF5 | MOV A, !abs+X | A ← (abs+X) | N-----Z- | 3 | 5 |
| 0xF6 | MOV A, !abs+Y | A ← (abs+Y) | N-----Z- | 3 | 5 |
| 0xE7 | MOV A, [dp+X] | A ← (indirect dp+X) | N-----Z- | 2 | 6 |
| 0xF7 | MOV A, [dp]+Y | A ← (indirect dp)+Y | N-----Z- | 2 | 6 |
| 0xCD | MOV X, #imm | X ← immediate | N-----Z- | 2 | 2 |
| 0xF8 | MOV X, dp | X ← (dp) | N-----Z- | 2 | 3 |
| 0xF9 | MOV X, dp+Y | X ← (dp+Y) | N-----Z- | 2 | 4 |
| 0xE9 | MOV X, !abs | X ← (abs) | N-----Z- | 3 | 4 |
| 0x8D | MOV Y, #imm | Y ← immediate | N-----Z- | 2 | 2 |
| 0xEB | MOV Y, dp | Y ← (dp) | N-----Z- | 2 | 3 |
| 0xFB | MOV Y, dp+X | Y ← (dp+X) | N-----Z- | 2 | 4 |
| 0xEC | MOV Y, !abs | Y ← (abs) | N-----Z- | 3 | 4 |

### 8-bit Data Transmission (Write)

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0xC6 | MOV (X), A | A → (X) | -------- | 1 | 4 |
| 0xAF | MOV (X)+, A | A → (X), X++ | -------- | 1 | 4 |
| 0xC4 | MOV dp, A | A → (dp) | -------- | 2 | 4 |
| 0xD4 | MOV dp+X, A | A → (dp+X) | -------- | 2 | 5 |
| 0xC5 | MOV !abs, A | A → (abs) | -------- | 3 | 5 |
| 0xD5 | MOV !abs+X, A | A → (abs+X) | -------- | 3 | 6 |
| 0xD6 | MOV !abs+Y, A | A → (abs+Y) | -------- | 3 | 6 |
| 0xC7 | MOV [dp+X], A | A → (indirect dp+X) | -------- | 2 | 7 |
| 0xD7 | MOV [dp]+Y, A | A → (indirect dp)+Y | -------- | 2 | 7 |
| 0xD8 | MOV dp, X | X → (dp) | -------- | 2 | 4 |
| 0xD9 | MOV dp+Y, X | X → (dp+Y) | -------- | 2 | 5 |
| 0xC9 | MOV !abs, X | X → (abs) | -------- | 3 | 5 |
| 0xCB | MOV dp, Y | Y → (dp) | -------- | 2 | 4 |
| 0xDB | MOV dp+X, Y | Y → (dp+X) | -------- | 2 | 5 |
| 0xCC | MOV !abs, Y | Y → (abs) | -------- | 3 | 5 |

### 8-bit Data Transmission (Register/Memory to Register/Memory)

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x7D | MOV A, X | A ← X | N-----Z- | 1 | 2 |
| 0xDD | MOV A, Y | A ← Y | N-----Z- | 1 | 2 |
| 0x5D | MOV X, A | X ← A | N-----Z- | 1 | 2 |
| 0xFD | MOV Y, A | Y ← A | N-----Z- | 1 | 2 |
| 0x9D | MOV X, SP | X ← SP | N-----Z- | 1 | 2 |
| 0xBD | MOV SP, X | SP ← X | -------- | 1 | 2 |
| 0xFA | MOV dp, dp | (dp) ← (dp) | -------- | 3 | 5 |
| 0x8F | MOV dp, #imm | (dp) ← immediate | -------- | 3 | 5 |

### 8-bit Arithmetic

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x88 | ADC A, #imm | A += imm + C | NV--H-ZC | 2 | 2 |
| 0x86 | ADC A, (X) | A += (X) + C | NV--H-ZC | 1 | 3 |
| 0x84 | ADC A, dp | A += (dp) + C | NV--H-ZC | 2 | 3 |
| 0x94 | ADC A, dp+X | A += (dp+X) + C | NV--H-ZC | 2 | 4 |
| 0x85 | ADC A, !abs | A += (abs) + C | NV--H-ZC | 3 | 4 |
| 0x95 | ADC A, !abs+X | A += (abs+X) + C | NV--H-ZC | 3 | 5 |
| 0x96 | ADC A, !abs+Y | A += (abs+Y) + C | NV--H-ZC | 3 | 5 |
| 0x87 | ADC A, [dp+X] | A += (indirect dp+X) + C | NV--H-ZC | 2 | 6 |
| 0x97 | ADC A, [dp]+Y | A += (indirect dp)+Y + C | NV--H-ZC | 2 | 6 |
| 0x99 | ADC (X), (Y) | (X) += (Y) + C | NV--H-ZC | 1 | 5 |
| 0x89 | ADC dp, dp | (dp) += (dp) + C | NV--H-ZC | 3 | 6 |
| 0x98 | ADC dp, #imm | (dp) += imm + C | NV--H-ZC | 3 | 5 |
| 0xA8 | SBC A, #imm | A -= imm - !C | NV--H-ZC | 2 | 2 |
| 0xA6 | SBC A, (X) | A -= (X) - !C | NV--H-ZC | 1 | 3 |
| 0xA4 | SBC A, dp | A -= (dp) - !C | NV--H-ZC | 2 | 3 |
| 0xB4 | SBC A, dp+X | A -= (dp+X) - !C | NV--H-ZC | 2 | 4 |
| 0xA5 | SBC A, !abs | A -= (abs) - !C | NV--H-ZC | 3 | 4 |
| 0xB5 | SBC A, !abs+X | A -= (abs+X) - !C | NV--H-ZC | 3 | 5 |
| 0xB6 | SBC A, !abs+Y | A -= (abs+Y) - !C | NV--H-ZC | 3 | 5 |
| 0xA7 | SBC A, [dp+X] | A -= (indirect dp+X) - !C | NV--H-ZC | 2 | 6 |
| 0xB7 | SBC A, [dp]+Y | A -= (indirect dp)+Y - !C | NV--H-ZC | 2 | 6 |
| 0xB9 | SBC (X), (Y) | (X) -= (Y) - !C | NV--H-ZC | 1 | 5 |
| 0xA9 | SBC dp, dp | (dp) -= (dp) - !C | NV--H-ZC | 3 | 6 |
| 0xB8 | SBC dp, #imm | (dp) -= imm - !C | NV--H-ZC | 3 | 5 |

### 8-bit Compare

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x68 | CMP A, #imm | A - imm (flags only) | N-----ZC | 2 | 2 |
| 0x66 | CMP A, (X) | A - (X) | N-----ZC | 1 | 3 |
| 0x64 | CMP A, dp | A - (dp) | N-----ZC | 2 | 3 |
| 0x74 | CMP A, dp+X | A - (dp+X) | N-----ZC | 2 | 4 |
| 0x65 | CMP A, !abs | A - (abs) | N-----ZC | 3 | 4 |
| 0x75 | CMP A, !abs+X | A - (abs+X) | N-----ZC | 3 | 5 |
| 0x76 | CMP A, !abs+Y | A - (abs+Y) | N-----ZC | 3 | 5 |
| 0x67 | CMP A, [dp+X] | A - (indirect dp+X) | N-----ZC | 2 | 6 |
| 0x77 | CMP A, [dp]+Y | A - (indirect dp)+Y | N-----ZC | 2 | 6 |
| 0x79 | CMP (X), (Y) | (X) - (Y) | N-----ZC | 1 | 5 |
| 0x69 | CMP dp, dp | (dp) - (dp) | N-----ZC | 3 | 6 |
| 0x78 | CMP dp, #imm | (dp) - imm | N-----ZC | 3 | 5 |
| 0xC8 | CMP X, #imm | X - imm | N-----ZC | 2 | 2 |
| 0x3E | CMP X, dp | X - (dp) | N-----ZC | 2 | 3 |
| 0x1E | CMP X, !abs | X - (abs) | N-----ZC | 3 | 4 |
| 0xAD | CMP Y, #imm | Y - imm | N-----ZC | 2 | 2 |
| 0x7E | CMP Y, dp | Y - (dp) | N-----ZC | 2 | 3 |
| 0x5E | CMP Y, !abs | Y - (abs) | N-----ZC | 3 | 4 |

### 8-bit Logical Operations

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x28 | AND A, #imm | A &= imm | N-----Z- | 2 | 2 |
| 0x26 | AND A, (X) | A &= (X) | N-----Z- | 1 | 3 |
| 0x24 | AND A, dp | A &= (dp) | N-----Z- | 2 | 3 |
| 0x34 | AND A, dp+X | A &= (dp+X) | N-----Z- | 2 | 4 |
| 0x25 | AND A, !abs | A &= (abs) | N-----Z- | 3 | 4 |
| 0x35 | AND A, !abs+X | A &= (abs+X) | N-----Z- | 3 | 5 |
| 0x36 | AND A, !abs+Y | A &= (abs+Y) | N-----Z- | 3 | 5 |
| 0x27 | AND A, [dp+X] | A &= (indirect dp+X) | N-----Z- | 2 | 6 |
| 0x37 | AND A, [dp]+Y | A &= (indirect dp)+Y | N-----Z- | 2 | 6 |
| 0x39 | AND (X), (Y) | (X) &= (Y) | N-----Z- | 1 | 5 |
| 0x29 | AND dp, dp | (dp) &= (dp) | N-----Z- | 3 | 6 |
| 0x38 | AND dp, #imm | (dp) &= imm | N-----Z- | 3 | 5 |
| 0x08 | OR A, #imm | A \|= imm | N-----Z- | 2 | 2 |
| 0x06 | OR A, (X) | A \|= (X) | N-----Z- | 1 | 3 |
| 0x04 | OR A, dp | A \|= (dp) | N-----Z- | 2 | 3 |
| 0x14 | OR A, dp+X | A \|= (dp+X) | N-----Z- | 2 | 4 |
| 0x05 | OR A, !abs | A \|= (abs) | N-----Z- | 3 | 4 |
| 0x15 | OR A, !abs+X | A \|= (abs+X) | N-----Z- | 3 | 5 |
| 0x16 | OR A, !abs+Y | A \|= (abs+Y) | N-----Z- | 3 | 5 |
| 0x07 | OR A, [dp+X] | A \|= (indirect dp+X) | N-----Z- | 2 | 6 |
| 0x17 | OR A, [dp]+Y | A \|= (indirect dp)+Y | N-----Z- | 2 | 6 |
| 0x19 | OR (X), (Y) | (X) \|= (Y) | N-----Z- | 1 | 5 |
| 0x09 | OR dp, dp | (dp) \|= (dp) | N-----Z- | 3 | 6 |
| 0x18 | OR dp, #imm | (dp) \|= imm | N-----Z- | 3 | 5 |
| 0x48 | EOR A, #imm | A ^= imm | N-----Z- | 2 | 2 |
| 0x46 | EOR A, (X) | A ^= (X) | N-----Z- | 1 | 3 |
| 0x44 | EOR A, dp | A ^= (dp) | N-----Z- | 2 | 3 |
| 0x54 | EOR A, dp+X | A ^= (dp+X) | N-----Z- | 2 | 4 |
| 0x45 | EOR A, !abs | A ^= (abs) | N-----Z- | 3 | 4 |
| 0x55 | EOR A, !abs+X | A ^= (abs+X) | N-----Z- | 3 | 5 |
| 0x56 | EOR A, !abs+Y | A ^= (abs+Y) | N-----Z- | 3 | 5 |
| 0x47 | EOR A, [dp+X] | A ^= (indirect dp+X) | N-----Z- | 2 | 6 |
| 0x57 | EOR A, [dp]+Y | A ^= (indirect dp)+Y | N-----Z- | 2 | 6 |
| 0x59 | EOR (X), (Y) | (X) ^= (Y) | N-----Z- | 1 | 5 |
| 0x49 | EOR dp, dp | (dp) ^= (dp) | N-----Z- | 3 | 6 |
| 0x58 | EOR dp, #imm | (dp) ^= imm | N-----Z- | 3 | 5 |

### 8-bit Increment/Decrement

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0xBC | INC A | ++A | N-----Z- | 1 | 2 |
| 0xAB | INC dp | ++(dp) | N-----Z- | 2 | 4 |
| 0xBB | INC dp+X | ++(dp+X) | N-----Z- | 2 | 5 |
| 0xAC | INC !abs | ++(abs) | N-----Z- | 3 | 5 |
| 0x3D | INC X | ++X | N-----Z- | 1 | 2 |
| 0xFC | INC Y | ++Y | N-----Z- | 1 | 2 |
| 0x9C | DEC A | --A | N-----Z- | 1 | 2 |
| 0x8B | DEC dp | --(dp) | N-----Z- | 2 | 4 |
| 0x9B | DEC dp+X | --(dp+X) | N-----Z- | 2 | 5 |
| 0x8C | DEC !abs | --(abs) | N-----Z- | 3 | 5 |
| 0x1D | DEC X | --X | N-----Z- | 1 | 2 |
| 0xDC | DEC Y | --Y | N-----Z- | 1 | 2 |

### 8-bit Shift/Rotate

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x1C | ASL A | C ← A ← 0 | N-----ZC | 1 | 2 |
| 0x0B | ASL dp | C ← (dp) ← 0 | N-----ZC | 2 | 4 |
| 0x1B | ASL dp+X | C ← (dp+X) ← 0 | N-----ZC | 2 | 5 |
| 0x0C | ASL !abs | C ← (abs) ← 0 | N-----ZC | 3 | 5 |
| 0x5C | LSR A | 0 → A → C | N-----ZC | 1 | 2 |
| 0x4B | LSR dp | 0 → (dp) → C | N-----ZC | 2 | 4 |
| 0x5B | LSR dp+X | 0 → (dp+X) → C | N-----ZC | 2 | 5 |
| 0x4C | LSR !abs | 0 → (abs) → C | N-----ZC | 3 | 5 |
| 0x3C | ROL A | C ← A ← C | N-----ZC | 1 | 2 |
| 0x2B | ROL dp | C ← (dp) ← C | N-----ZC | 2 | 4 |
| 0x3B | ROL dp+X | C ← (dp+X) ← C | N-----ZC | 2 | 5 |
| 0x2C | ROL !abs | C ← (abs) ← C | N-----ZC | 3 | 5 |
| 0x7C | ROR A | C → A → C | N-----ZC | 1 | 2 |
| 0x6B | ROR dp | C → (dp) → C | N-----ZC | 2 | 4 |
| 0x7B | ROR dp+X | C → (dp+X) → C | N-----ZC | 2 | 5 |
| 0x6C | ROR !abs | C → (abs) → C | N-----ZC | 3 | 5 |
| 0x9F | XCN A | Swap nibbles: A = (A>>4) \| (A<<4) | N-----Z- | 1 | 5 |

### 16-bit Operations

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0xBA | MOVW YA, dp | YA ← word(dp) | N-----Z- | 2 | 5 |
| 0xDA | MOVW dp, YA | word(dp) ← YA | -------- | 2 | 5 |
| 0x3A | INCW dp | ++word(dp) | N-----Z- | 2 | 6 |
| 0x1A | DECW dp | --word(dp) | N-----Z- | 2 | 6 |
| 0x7A | ADDW YA, dp | YA += word(dp) | NV--H-ZC | 2 | 5 |
| 0x9A | SUBW YA, dp | YA -= word(dp) | NV--H-ZC | 2 | 5 |
| 0x5A | CMPW YA, dp | YA - word(dp) | N-----ZC | 2 | 4 |

### Multiply/Divide

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0xCF | MUL YA | YA = Y * A | N-----Z- | 1 | 9 |
| 0x9E | DIV YA, X | A = YA / X, Y = YA % X | NV--H-Z- | 1 | 12 |

### Decimal Adjust

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0xDF | DAA A | Decimal adjust for addition | N-----ZC | 1 | 3 |
| 0xBE | DAS A | Decimal adjust for subtraction | N-----ZC | 1 | 3 |

### Branch Instructions

All branches: 2 cycles if not taken, 4 cycles if taken.

| Opcode | Syntax | Condition | Bytes |
|--------|--------|-----------|-------|
| 0x2F | BRA rel | Always | 2 |
| 0xF0 | BEQ rel | Z = 1 (Equal) | 2 |
| 0xD0 | BNE rel | Z = 0 (Not Equal) | 2 |
| 0xB0 | BCS rel | C = 1 (Carry Set) | 2 |
| 0x90 | BCC rel | C = 0 (Carry Clear) | 2 |
| 0x70 | BVS rel | V = 1 (Overflow Set) | 2 |
| 0x50 | BVC rel | V = 0 (Overflow Clear) | 2 |
| 0x30 | BMI rel | N = 1 (Minus/Negative) | 2 |
| 0x10 | BPL rel | N = 0 (Plus/Positive) | 2 |

### Bit Branch Instructions

Branch on bit: 5 cycles if not taken, 7 cycles if taken.

| Opcode | Syntax | Condition | Bytes |
|--------|--------|-----------|-------|
| 0x03 | BBS dp.0, rel | dp.0 = 1 | 3 |
| 0x23 | BBS dp.1, rel | dp.1 = 1 | 3 |
| 0x43 | BBS dp.2, rel | dp.2 = 1 | 3 |
| 0x63 | BBS dp.3, rel | dp.3 = 1 | 3 |
| 0x83 | BBS dp.4, rel | dp.4 = 1 | 3 |
| 0xA3 | BBS dp.5, rel | dp.5 = 1 | 3 |
| 0xC3 | BBS dp.6, rel | dp.6 = 1 | 3 |
| 0xE3 | BBS dp.7, rel | dp.7 = 1 | 3 |
| 0x13 | BBC dp.0, rel | dp.0 = 0 | 3 |
| 0x33 | BBC dp.1, rel | dp.1 = 0 | 3 |
| 0x53 | BBC dp.2, rel | dp.2 = 0 | 3 |
| 0x73 | BBC dp.3, rel | dp.3 = 0 | 3 |
| 0x93 | BBC dp.4, rel | dp.4 = 0 | 3 |
| 0xB3 | BBC dp.5, rel | dp.5 = 0 | 3 |
| 0xD3 | BBC dp.6, rel | dp.6 = 0 | 3 |
| 0xF3 | BBC dp.7, rel | dp.7 = 0 | 3 |

### Compare and Branch

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x2E | CBNE dp, rel | Compare A to (dp), branch if ≠ | -------- | 3 | 5/7 |
| 0xDE | CBNE dp+X, rel | Compare A to (dp+X), branch if ≠ | -------- | 3 | 6/8 |
| 0x6E | DBNZ dp, rel | --(dp), branch if not zero | -------- | 3 | 5/7 |
| 0xFE | DBNZ Y, rel | --Y, branch if not zero | -------- | 2 | 4/6 |

### Jump Instructions

| Opcode | Syntax | Description | Bytes | Cycles |
|--------|--------|-------------|-------|--------|
| 0x5F | JMP !abs | PC = abs | 3 | 3 |
| 0x1F | JMP [!abs+X] | PC = word(abs+X) | 3 | 6 |

### Call/Return Instructions

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x3F | CALL !abs | Call subroutine at abs | -------- | 3 | 8 |
| 0x4F | PCALL upage | Call subroutine at $FF00+u | -------- | 2 | 6 |
| 0x01 | TCALL 0 | Call [$FFDE] | -------- | 1 | 8 |
| 0x11 | TCALL 1 | Call [$FFDC] | -------- | 1 | 8 |
| 0x21 | TCALL 2 | Call [$FFDA] | -------- | 1 | 8 |
| 0x31 | TCALL 3 | Call [$FFD8] | -------- | 1 | 8 |
| 0x41 | TCALL 4 | Call [$FFD6] | -------- | 1 | 8 |
| 0x51 | TCALL 5 | Call [$FFD4] | -------- | 1 | 8 |
| 0x61 | TCALL 6 | Call [$FFD2] | -------- | 1 | 8 |
| 0x71 | TCALL 7 | Call [$FFD0] | -------- | 1 | 8 |
| 0x81 | TCALL 8 | Call [$FFCE] | -------- | 1 | 8 |
| 0x91 | TCALL 9 | Call [$FFCC] | -------- | 1 | 8 |
| 0xA1 | TCALL 10 | Call [$FFCA] | -------- | 1 | 8 |
| 0xB1 | TCALL 11 | Call [$FFC8] | -------- | 1 | 8 |
| 0xC1 | TCALL 12 | Call [$FFC6] | -------- | 1 | 8 |
| 0xD1 | TCALL 13 | Call [$FFC4] | -------- | 1 | 8 |
| 0xE1 | TCALL 14 | Call [$FFC2] | -------- | 1 | 8 |
| 0xF1 | TCALL 15 | Call [$FFC0] | -------- | 1 | 8 |
| 0x0F | BRK | Software interrupt [$FFDE] | ---1-0-- | 1 | 8 |
| 0x6F | RET | Return from subroutine | -------- | 1 | 5 |
| 0x7F | RETI | Return from interrupt | RESTORED | 1 | 6 |

### Stack Operations

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x2D | PUSH A | Push A to stack | -------- | 1 | 4 |
| 0x4D | PUSH X | Push X to stack | -------- | 1 | 4 |
| 0x6D | PUSH Y | Push Y to stack | -------- | 1 | 4 |
| 0x0D | PUSH PSW | Push PSW to stack | -------- | 1 | 4 |
| 0xAE | POP A | Pop A from stack | -------- | 1 | 4 |
| 0xCE | POP X | Pop X from stack | -------- | 1 | 4 |
| 0xEE | POP Y | Pop Y from stack | -------- | 1 | 4 |
| 0x8E | POP PSW | Pop PSW from stack | RESTORED | 1 | 4 |

### Bit Operations

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x02 | SET1 dp.0 | Set bit 0 of (dp) | -------- | 2 | 4 |
| 0x22 | SET1 dp.1 | Set bit 1 of (dp) | -------- | 2 | 4 |
| 0x42 | SET1 dp.2 | Set bit 2 of (dp) | -------- | 2 | 4 |
| 0x62 | SET1 dp.3 | Set bit 3 of (dp) | -------- | 2 | 4 |
| 0x82 | SET1 dp.4 | Set bit 4 of (dp) | -------- | 2 | 4 |
| 0xA2 | SET1 dp.5 | Set bit 5 of (dp) | -------- | 2 | 4 |
| 0xC2 | SET1 dp.6 | Set bit 6 of (dp) | -------- | 2 | 4 |
| 0xE2 | SET1 dp.7 | Set bit 7 of (dp) | -------- | 2 | 4 |
| 0x12 | CLR1 dp.0 | Clear bit 0 of (dp) | -------- | 2 | 4 |
| 0x32 | CLR1 dp.1 | Clear bit 1 of (dp) | -------- | 2 | 4 |
| 0x52 | CLR1 dp.2 | Clear bit 2 of (dp) | -------- | 2 | 4 |
| 0x72 | CLR1 dp.3 | Clear bit 3 of (dp) | -------- | 2 | 4 |
| 0x92 | CLR1 dp.4 | Clear bit 4 of (dp) | -------- | 2 | 4 |
| 0xB2 | CLR1 dp.5 | Clear bit 5 of (dp) | -------- | 2 | 4 |
| 0xD2 | CLR1 dp.6 | Clear bit 6 of (dp) | -------- | 2 | 4 |
| 0xF2 | CLR1 dp.7 | Clear bit 7 of (dp) | -------- | 2 | 4 |
| 0x0E | TSET1 !abs | Test and set bits with A | N-----Z- | 3 | 6 |
| 0x4E | TCLR1 !abs | Test and clear bits with A | N-----Z- | 3 | 6 |
| 0x4A | AND1 C, mem.bit | C &= mem.bit | -------C | 3 | 4 |
| 0x6A | AND1 C, /mem.bit | C &= ~mem.bit | -------C | 3 | 4 |
| 0x0A | OR1 C, mem.bit | C \|= mem.bit | -------C | 3 | 5 |
| 0x2A | OR1 C, /mem.bit | C \|= ~mem.bit | -------C | 3 | 5 |
| 0x8A | EOR1 C, mem.bit | C ^= mem.bit | -------C | 3 | 5 |
| 0xEA | NOT1 mem.bit | Complement mem.bit | -------- | 3 | 5 |
| 0xAA | MOV1 C, mem.bit | C ← mem.bit | -------C | 3 | 4 |
| 0xCA | MOV1 mem.bit, C | mem.bit ← C | -------- | 3 | 6 |

### PSW Flag Operations

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x60 | CLRC | Clear Carry flag | -------0 | 1 | 2 |
| 0x80 | SETC | Set Carry flag | -------1 | 1 | 2 |
| 0xED | NOTC | Complement Carry flag | -------c | 1 | 3 |
| 0xE0 | CLRV | Clear V and H flags | -0--0--- | 1 | 2 |
| 0x20 | CLRP | Clear Direct Page flag | --0----- | 1 | 2 |
| 0x40 | SETP | Set Direct Page flag | --1----- | 1 | 2 |
| 0xA0 | EI | Enable interrupts (unused) | ------1- | 1 | 3 |
| 0xC0 | DI | Disable interrupts (unused) | ------0- | 1 | 3 |

### Other Instructions

| Opcode | Syntax | Description | Flags | Bytes | Cycles |
|--------|--------|-------------|-------|-------|--------|
| 0x00 | NOP | No operation | -------- | 1 | 2 |
| 0xEF | SLEEP | Enter sleep mode | -------- | 1 | ? |
| 0xFF | STOP | Enter stop mode | -------- | 1 | ? |

## Hardware Registers

| Address | Name | Access | Description |
|---------|------|--------|-------------|
| $F0 | Undocumented | ?/W | Unknown function |
| $F1 | Control | /W | Control register (timers, port clear) |
| $F2 | DSP Address | R/W | DSP register address pointer |
| $F3 | DSP Data | R/W | DSP register data read/write |
| $F4-$F7 | Port 0-3 | R/W | Communication ports with SNES |
| $F8-$F9 | - | R/W | Regular memory |
| $FA-$FC | Timer 0-2 | /W | Timer divisor values |
| $FD-$FF | Counter 0-2 | R/ | Timer counter values (4-bit, read-only) |

## Timer Operation

**Timers 0, 1:** Count at 8KHz (8000 Hz)
**Timer 2:** Counts at 64KHz (64000 Hz)

### Timer Configuration
1. Ensure timer is disabled (clear bit in control register $F1)
2. Write divisor to timer register ($FA-$FC)
3. Enable timer (set bit in control register $F1)
4. Read counter register ($FD-$FF) periodically
5. Counter increments when internal counter reaches divisor value
6. Reading counter resets it to 0

**Example:** For 15ms timer at 8KHz: divisor = 15ms * 8000Hz = 120 ($78)

## BRR Audio Compression

BRR (Bit Rate Reduction) is the sample compression format used by the DSP.

### BRR Block Structure (9 bytes)
- 1 byte header
- 8 bytes compressed sample data (16 nibbles, 2 samples per byte)

### Header Byte
| Bits | Name | Description |
|------|------|-------------|
| 7-4 | RANGE | Shift value for 4-bit samples (0-12) |
| 3-2 | FILTER | Decompression filter (0-3) |
| 1 | LOOP | Loop flag (set for all blocks in looped samples) |
| 0 | END | End flag (decoder stops or loops when encountered) |

### Filter Coefficients
| Filter | Coef A | Coef B |
|--------|--------|--------|
| 0 | 0 | 0 |
| 1 | 0.9375 | 0 |
| 2 | 1.90625 | -0.9375 |
| 3 | 1.796875 | -0.8125 |

### Decompression Algorithm
1. Read 4-bit sample nibble
2. Shift left by RANGE value
3. Get filter coefficients A and B from table
4. Add (LAST_SAMPLE1 * A) to sample
5. Add (LAST_SAMPLE2 * B) to sample
6. LAST_SAMPLE2 = LAST_SAMPLE1
7. LAST_SAMPLE1 = current sample
8. Output sample

## Implementation Notes

### Direct Page Flag
- P=0: Direct page at $0000-$00FF
- P=1: Direct page at $0100-$01FF
- Set with SETP, clear with CLRP
- Affects all direct page addressing modes

### Stack Behavior
- Stack resides in Page 1 ($0100-$01FF)
- SP points to next available location
- PUSH decrements SP then writes
- POP reads then increments SP
- Initial SP value from IPL ROM: $EF

### Half Carry Flag
- Used for BCD arithmetic with DAA/DAS instructions
- Cannot be set directly
- Cleared by CLRV instruction

### Communication Ports
- 4 bidirectional 8-bit ports ($F4-$F7 on SPC, $2140-$2143 on SNES)
- Each port has separate read and write buffers
- Hardware quirk: 16-bit writes to $2140/1 may affect $2143
- Always use read-modify-write when conflicts possible

### Interrupts
- I flag exists but interrupts not supported in hardware
- BRK instruction: Software interrupt via vector at $FFDE
- RETI restores PSW and PC from stack

### TCALL Table
- 16 subroutine vectors at $FFC0-$FFDF (2 bytes each)
- TCALL n calls routine at [$FFC0 + 2*(15-n)]
- Single-byte instruction for common routines
- TCALL 0 = $FFDE, TCALL 15 = $FFC0

### Bit Addressing
- Memory bit operations use 13-bit address
- Bit number encoded in top 3 bits of address byte
- Example: SET1 $20.5 sets bit 5 of address $0020
- Works with direct page addresses only

### DIV Limitations
- Only works if quotient < $200
- Output contains garbage if quotient exceeds limit
- Check dividend/divisor before using

### Timing Accuracy
- Minimum instruction: 2 cycles
- All opcodes take even number of cycles
- Clock: 1.024 MHz (1024000 Hz)
- 32000 Hz sample rate for audio

## DSP Quick Reference

See separate DSP documentation for full register details.

### DSP Access via $F2/$F3
```
MOV $F2, #register_address  ; Set DSP register pointer
MOV $F3, #value             ; Write to DSP register
MOV A, $F3                  ; Read from DSP register
```

### Voice Registers (x = voice 0-7)
- $x0: VOL (L) - Left volume
- $x1: VOL (R) - Right volume
- $x2/$x3: P (L/H) - 14-bit pitch
- $x4: SRCN - Source number (sample index)
- $x5/$x6: ADSR - Envelope settings
- $x7: GAIN - Manual envelope control
- $x8: ENVX - Current envelope value (read)
- $x9: OUTX - Current waveform value (read)

### Global Registers
- $0C/$1C: MVOL - Main volume L/R
- $2C/$3C: EVOL - Echo volume L/R
- $4C: KON - Key on (start voices)
- $5C: KOF - Key off (release voices)
- $6C: FLG - Flags (reset, mute, echo enable, noise clock)
- $7C: ENDX - End flags (sample finished)
- $xD: Special registers (EFB, PMON, NON, EON, DIR, ESA, EDL)
- $xF: COEF - FIR filter coefficients

## References

- [Super Famicom Dev Wiki - SPC700 Reference](https://wiki.superfamicom.org/spc700-reference)
- Based on SPCTECH by eKid and Anomie's documentation
- BRR compression format documentation
- DSP register maps and echo system documentation
