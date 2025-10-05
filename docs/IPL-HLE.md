# IPL High-Level Emulation (HLE)

## Overview

The SNES contains a small Initial Program Loader (IPL) ROM that initializes the system on power-up and reset. This IPL ROM is proprietary Nintendo code, so instead of requiring a real dump, JSNES implements **High-Level Emulation (HLE)** that replicates the IPL's functionality.

## What the SNES IPL Does

The real SNES IPL performs several critical initialization tasks:

1. **CPU Initialization**: Sets the 65C816 CPU to a known state
   - Emulation mode (6502 compatibility)
   - 8-bit accumulator and index registers
   - Interrupts disabled
   - Stack pointer at top of stack

2. **APU/SPC700 Boot**: Uploads a small boot program to the SPC700 (audio processor)
   - Sets up communication ports
   - Initializes DSP to safe state
   - Waits for CPU to send audio driver code

3. **Memory Clearing**: Ensures VRAM, CGRAM, and OAM are in known states

4. **Vector Loading**: Reads the cartridge reset vector and jumps to ROM code

## HLE Implementation

### Memory (`src/core/memory/memory.js`)

**Function**: `setupIPLHLE()`

Creates a 31-byte SPC700 boot program at `$FFC0-$FFDF` in APU RAM:

```
$FFC0: CD EF BD     MOV X, #$EF        ; Set stack pointer
$FFC3: E8 00        MOV A, #$00        ; Clear accumulator
$FFC5: C6           MOV (X), A         ; Clear zero page
$FFC6: 1D           DEC X
$FFC7: D0 FC        BNE $FFC5          ; Loop until done
$FFC9: 8F 6C F2     MOV $F2, #$6C      ; Select FLG register
$FFCC: 8F E0 F3     MOV $F3, #$E0      ; Reset, mute, disable echo
$FFCF: 8F 4C F2     MOV $F2, #$4C      ; Select KON register
$FFD2: 8F 00 F3     MOV $F3, #$00      ; Key off all voices
$FFD5: 8F 5C F2     MOV $F2, #$5C      ; Select KOF register
$FFD8: 8F 00 F3     MOV $F3, #$00      ; Ensure voices off
$FFDB: 8F AA F4     MOV $F4, #$AA      ; Write ready signal
$FFDE: 8F BB F5     MOV $F5, #$BB      ; Write ready signal
$FFE1: 2F FE        BRA $FFE1          ; Infinite loop
```

This boot program:
- Sets the SPC700 stack pointer to $EF (standard for SNES)
- Clears zero page memory
- Initializes DSP to safe state (muted, reset)
- Writes ready signals ($AA, $BB) to communication ports
- Enters infinite loop waiting for CPU to upload audio driver

### CPU (`src/core/cpu/cpu.js`)

**Function**: `reset()`

Initializes CPU registers to power-on state:

```javascript
this.A = 0;           // Accumulator cleared
this.X = 0;           // X register cleared
this.Y = 0;           // Y register cleared
this.S = 0x01FF;      // Stack at top ($0100-$01FF)
this.D = 0;           // Direct page at $0000
this.PBR = 0;         // Program bank 0
this.DBR = 0;         // Data bank 0
this.P = 0x34;        // Status: emulation mode, 8-bit, IRQ disabled
this.emulationMode = true;
```

**Status Register (P) Breakdown**:
- Bit 5 (M): 1 = 8-bit memory/accumulator
- Bit 4 (X): 1 = 8-bit index registers
- Bit 2 (I): 1 = IRQ interrupts disabled
- Bit 0-1: Other flags (C, Z, etc.)

The CPU then reads the reset vector from address `$00:FFFC-FFFD` and jumps to that address. If the reset vector is invalid ($0000 or $FFFF), it defaults to $8000.

### APU (`src/core/apu/apu.js`)

**Function**: `reset()`

Initializes SPC700 registers:

```javascript
this.A = 0;           // Accumulator
this.X = 0;           // X register
this.Y = 0;           // Y register
this.SP = 0xEF;       // Stack pointer (as set by boot ROM)
this.PC = 0xFFC0;     // Program counter (boot ROM entry)
this.PSW = 0;         // Processor status
```

**DSP Initialization**:
```javascript
this.dspRegisters[0x6C] = 0xE0;  // FLG: reset, mute, echo off
this.dspRegisters[0x4C] = 0x00;  // KON: all voices off
this.dspRegisters[0x5C] = 0x00;  // KOF: all voices off
```

**Communication Ports**:
```javascript
this.memory.apuRam[0xF4] = 0xAA;  // Port 0: ready signal
this.memory.apuRam[0xF5] = 0xBB;  // Port 1: ready signal
this.memory.apuRam[0xF6] = 0x00;  // Port 2: clear
this.memory.apuRam[0xF7] = 0x00;  // Port 3: clear
```

### PPU (`src/core/ppu/ppu.js`)

**Function**: `reset()`

Initializes PPU state:

```javascript
this.registers.inidisp = 0x80;  // Force blank on (bit 7)
// All other registers = 0
```

Clears video memory:
```javascript
this.memory.vram.fill(0);   // 64KB VRAM
this.memory.cgram.fill(0);  // 512 bytes palette
this.memory.oam.fill(0);    // 544 bytes sprite data
```

### Emulator (`src/core/emulator.js`)

**Function**: `reset()`

Performs reset in correct order:

```javascript
this.ppu.reset();   // 1. Clear video memory
this.apu.reset();   // 2. Setup audio
this.cpu.reset();   // 3. Read vectors and start
this.masterClock = 0;
```

Order matters because CPU needs to read from memory that's already initialized.

## ROM Loading

When loading a ROM, the reset vector must be at the correct offset:

**LoROM**: Address `$00:FFFC` maps to ROM offset `$7FFC`
```javascript
romData[0x7FFC] = 0x00;  // Low byte
romData[0x7FFD] = 0x80;  // High byte (reset vector = $8000)
```

**HiROM**: Address `$00:FFFC` maps to ROM offset `$FFFC`
```javascript
romData[0xFFFC] = 0x00;  // Low byte
romData[0xFFFD] = 0x80;  // High byte
```

## Testing

The `src/core/ipl-hle.test.js` file contains 34 comprehensive tests covering:

1. **Memory IPL Setup** (5 tests)
   - Boot ROM presence and content
   - DSP initialization sequence
   
2. **CPU IPL Reset** (9 tests)
   - Register initialization
   - Status flags
   - Vector loading
   
3. **APU IPL Reset** (7 tests)
   - SPC700 registers
   - DSP state
   - Communication ports
   
4. **PPU IPL Reset** (5 tests)
   - Display state
   - Memory clearing
   
5. **Integration** (8 tests)
   - Full system reset
   - ROM loading
   - Multi-instance consistency

Run tests: `npm test`

## Benefits of HLE

1. **Legal**: No proprietary Nintendo code
2. **Portable**: Works on any platform
3. **Fast**: No need to execute IPL code
4. **Flexible**: Can be customized if needed
5. **Testable**: Easier to validate than real hardware

## References

- SNES Development Manual (Section 3: Boot Sequence)
- Anomie's SNES Memory Mapping Doc
- Fullsnes Hardware Documentation
- No$SNS Debugger Documentation

## Future Improvements

Potential enhancements:

1. **FastROM Detection**: Set CPU speed based on cart header
2. **Region Detection**: PAL vs NTSC timing from cart
3. **Enhanced Mode Detection**: SuperFX, SA-1, etc.
4. **Audio Driver Upload**: Simulate common audio driver initialization

The current implementation is sufficient for running most SNES ROMs without requiring the original IPL ROM.
