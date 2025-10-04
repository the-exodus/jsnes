# JSNES Documentation

This folder contains comprehensive reference documentation for implementing SNES emulation components.

## Documentation Structure

### CPU Documentation (`cpu/`)

- **65C816-opcodes.md** - Complete 65C816 instruction set reference
  - All 256 opcodes organized by operation type
  - Internal registers (A, X, Y, S, DBR, D, PB, PC, P)
  - PSW flags (N, V, M, X, D, I, Z, C, E, B)
  - 24 addressing modes
  - Cycle timing information
  - Implementation notes

### APU Documentation (`apu/`)

- **SPC700-opcodes.md** - Complete SPC700 (S-SMP) instruction set reference
  - Full 8-bit CPU instruction set
  - System overview (1.024MHz, 64KB RAM, 4 I/O ports, 8 channels)
  - Memory map ($0000-$FFFF)
  - CPU registers (A, X, Y, SP, PC, PSW)
  - All opcodes organized by operation type
  - Hardware registers ($F0-$FF)
  - Timer operation details
  - BRR audio compression format
  - DSP quick reference

- **DSP-registers.md** - Complete S-DSP register reference
  - All DSP registers ($x0-$xF for voices 0-7, plus global registers)
  - Voice control (volume, pitch, ADSR, GAIN, envelope)
  - Echo system (buffer, feedback, FIR filter, delay)
  - Sample directory structure
  - Pitch modulation and noise generation
  - Detailed timing tables for ADSR/GAIN envelopes
  - Echo memory safety guidelines
  - Common issues and solutions

### PPU Documentation (`ppu/`)

- **registers.md** - Complete S-PPU1/S-PPU2 register reference
  - All PPU registers ($2100-$213F)
  - Display control (brightness, forced blank, interlace, overscan)
  - Background control (8 modes, tile sizes, scroll offsets)
  - Object/sprite control (sizes, priorities, OAM structure)
  - VRAM access (address modes, data read/write)
  - Mode 7 rotation/scaling (matrix parameters, center coordinates)
  - Color/palette control (CGRAM, color math, windows)
  - Window masking (positions, logic operations)
  - Screen designation (main/sub screen, layer enable)
  - H/V counters and status flags
  - Access timing notes

## Using This Documentation

### For Implementing New CPU Opcodes

1. Open `cpu/65C816-opcodes.md`
2. Find the opcode by number (e.g., $00-$FF) or by mnemonic (e.g., ADC, LDA)
3. Check syntax, addressing mode, bytes, cycles, and flags affected
4. Refer to addressing modes table for operand fetch details
5. Check cycle timing notes for conditional cycle variations
6. Write test cases covering normal operation and edge cases

### For Implementing APU Features

**For SPC700 Instructions:**
1. Open `apu/SPC700-opcodes.md`
2. Find instruction by operation type or opcode
3. Implement instruction logic following syntax and flags
4. Check cycle timing for performance accuracy

**For DSP Features:**
1. Open `apu/DSP-registers.md`
2. Find register by address ($x0-$7F)
3. Implement register read/write behavior
4. For voice features: Follow ADSR/GAIN envelope guidelines
5. For echo: Follow initialization sequence and memory safety rules
6. Refer to timing tables for accurate envelope generation

### For Implementing PPU Features

1. Open `ppu/registers.md`
2. Find register by address ($2100-$213F) or feature name
3. Implement register read/write behavior
4. Check access timing notes (V-Blank, H-Blank, Forced Blank)
5. For background modes: See BGMODE register and mode table
6. For sprites: Follow OAM structure and OBSEL size table
7. For Mode 7: Implement matrix math with M7A-M7D parameters
8. For color math: Follow CGWSEL/CGADSUB formulas

## Implementation Priority

### Phase 1: Core CPU (Basic Functionality)
- Essential opcodes (LDA, STA, JMP, BEQ, etc.)
- Common addressing modes
- Stack operations
- Basic flags

### Phase 2: Extended CPU (Full Compatibility)
- All remaining opcodes
- All addressing modes
- Edge cases and timing accuracy

### Phase 3: PPU Basics (Visual Output)
- Display control registers
- VRAM access
- Simple background rendering (Mode 0/1)
- Basic sprite rendering

### Phase 4: PPU Advanced (Full Graphics)
- All 8 background modes
- Mode 7 rotation/scaling
- Color math and windows
- Accurate timing

### Phase 5: APU Basics (Audio Output)
- SPC700 core instructions
- DSP voice registers
- Basic sample playback
- Volume and pitch control

### Phase 6: APU Advanced (Full Audio)
- Echo effects
- ADSR/GAIN envelopes
- Pitch modulation
- Noise generation
- BRR sample decompression

## Testing Strategy

1. **Unit Tests:** Test individual opcodes/registers in isolation
2. **Integration Tests:** Test component interactions (CPU→PPU, APU→DSP)
3. **Regression Tests:** Ensure changes don't break existing functionality
4. **Accuracy Tests:** Compare against known-good emulators or hardware
5. **Edge Cases:** Test boundary conditions, wraparound, overflow, etc.

## Key Differences from Other Consoles

- **CPU:** 16-bit registers with 8/16-bit mode switching (M/X flags)
- **Memory:** Bank switching (24-bit addressing) instead of simple 16-bit
- **PPU:** Tile-based with 8 different background modes
- **Sprites:** Size tables, priority bits, high table for extended attributes
- **APU:** Separate 8-bit SPC700 CPU with Sony DSP for audio
- **Audio:** BRR sample compression, ADSR envelopes, echo effects

## Additional Resources

- [Super Famicom Development Wiki](https://wiki.superfamicom.org/)
- [Anomie's SNES Documents](http://www.romhacking.net/documents/196/)
- [Fullsnes by Martin Korth](https://problemkaputt.de/fullsnes.htm)
- [65816 Primer by Western Design Center](http://www.westerndesigncenter.com/)
- [SNES Development Manual](https://archive.org/details/SNESDevManual) (official Nintendo docs)

## Contributing

When adding new opcodes, registers, or features:

1. Add comprehensive tests in corresponding `.test.js` file
2. Update this documentation if adding new features
3. Follow existing code style (see `.eslintrc.json`)
4. Aim for 80%+ test coverage
5. Test edge cases and error conditions

## Notes

- All documentation is based on official specs and verified behavior
- Cycle timings are approximations (real hardware has variations)
- Some undocumented behaviors are noted where relevant
- Priority is correctness over performance (optimize later)
