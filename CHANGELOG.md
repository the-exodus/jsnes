# Changelog

All notable changes to the JSNES SNES Emulator project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **IPL High-Level Emulation (HLE)** - Major feature addition
  - Eliminates need for proprietary SNES IPL ROM dump
  - 31-byte SPC700 boot ROM at $FFC0-$FFFF with authentic initialization sequence
  - Proper CPU power-on state (emulation mode, P=$34, SP=$01FF)
  - APU/SPC700 boot program with DSP initialization (SP=$EF, safe state)
  - PPU initialization with cleared VRAM/CGRAM/OAM and force blank
  - Correct reset sequence ordering (PPU → APU → CPU)
  - 34 comprehensive tests covering all IPL HLE aspects
  - Full documentation in `docs/IPL-HLE.md`
  - ROMs can now boot without external IPL ROM file

## [0.1.0] - 2025-10-04

### Added
- Initial project structure and build system
- Core CPU emulation (65C816/Ricoh 5A22)
  - Load/Store operations (LDA, LDX, LDY, STA, STX, STY)
  - Transfer operations (TAX, TAY, TXA, TYA)
  - Arithmetic operations (ADC, SBC)
  - Logical operations (AND, ORA, EOR)
  - Increment/Decrement (INC, DEC)
  - Flag operations (CLC, SEC, CLI, SEI, CLD, SED, CLV)
  - Stack operations (PHA, PLA)
  - Jump operations (JMP, JSR, RTS, RTI)
  - Interrupt handling (NMI, IRQ)
  - Multiple addressing modes (immediate, absolute, zero page, indexed, indirect)
- PPU emulation (S-PPU1/S-PPU2)
  - All 8 background modes (Mode 0-7)
  - Scanline-based rendering
  - VRAM, CGRAM, OAM memory management
  - Register-based control system
  - VBlank/HBlank timing
  - 256x224 resolution support
  - 15-bit color palette (32,768 colors)
- APU emulation foundation (S-SMP/S-DSP)
  - SPC700 CPU structure
  - 64KB audio RAM
  - DSP register system
  - Communication ports
  - Audio sample generation framework
- Memory management system
  - 128KB Work RAM (WRAM)
  - 128KB Save RAM (SRAM)
  - 64KB Video RAM (VRAM)
  - 512-byte Color RAM (CGRAM)
  - 544-byte Object Attribute Memory (OAM)
  - LoROM mapper support
  - HiROM mapper support
  - Automatic mapper detection
  - Memory-mapped I/O handling
- Main emulator coordinator
  - Frame-based execution loop
  - Component synchronization
  - Joypad input management
  - Save state system
  - SRAM persistence
- Browser integration
  - Web Worker for background execution
  - Canvas-based rendering
  - Web Audio API integration
  - Keyboard input handling
  - File loading (drag & drop support)
- User interface
  - Modern, responsive design
  - ROM loading interface
  - Emulation controls (Start/Stop/Reset)
  - Save state management
  - SRAM export functionality
  - FPS counter
  - Control reference display
- Testing infrastructure
  - Vitest test framework
  - 154 unit tests across all components
  - Code coverage reporting
  - CI/CD with GitHub Actions
- Documentation
  - Comprehensive README
  - Development guide
  - Project summary
  - GitHub Copilot instructions
  - Code style guidelines

### Technical Details
- ES2022 JavaScript throughout
- ES Modules for clean imports
- Vite build system
- ESLint for code quality
- Modern browser APIs (Canvas, Web Audio, Web Workers)
- Minimal external dependencies

### Test Coverage
- CPU: 42 tests
- PPU: 37 tests
- APU: 23 tests
- Memory: 27 tests
- Emulator: 25 tests
- Total: 154 tests

### Performance
- 60 FPS target frame rate
- Web Worker execution to prevent UI blocking
- Efficient memory management with typed arrays
- Optimized rendering pipeline

### Known Limitations
- CPU: Not all 256 opcodes implemented (major opcodes only)
- PPU: Sprite rendering not yet implemented
- APU: Simplified audio (full SPC700 opcodes pending)
- Audio: Basic sample generation (DSP effects pending)
- Memory: DMA timing simplified

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## [Unreleased]

### Planned for v0.2.0
- Complete CPU opcode implementation
- Full sprite rendering system
- Enhanced audio with DSP effects
- Additional mapper support
- Gamepad controller support
- Save state UI improvements

### Planned for v0.3.0
- Debugger interface
- Performance optimizations
- Enhanced compatibility
- Cheat code support
- Screenshot functionality

### Future Considerations
- Netplay multiplayer
- Video recording
- Rewind functionality
- Turbo mode
- Custom shaders

---

## Release Notes

### v0.1.0 Initial Release
This is the first functional release of JSNES, a Super Nintendo Entertainment System emulator written in modern JavaScript. The emulator can load and run SNES ROMs with basic CPU, PPU, and APU emulation. It features a clean browser-based interface with save states and SRAM export capabilities.

**Key Highlights:**
- ✅ Fully testable and modular architecture
- ✅ Modern ES2022 codebase
- ✅ Comprehensive unit test coverage
- ✅ Web Worker execution for performance
- ✅ LoROM and HiROM cartridge support

**Try it out:**
1. Load a SNES ROM file
2. Click Start to begin emulation
3. Use keyboard controls to play
4. Save your progress with save states

For detailed documentation, see README.md and DEVELOPMENT.md.
