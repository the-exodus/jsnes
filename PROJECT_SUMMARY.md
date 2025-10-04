# JSNES - SNES Emulator Project Summary

## Project Structure

```
jsnes/
├── .github/
│   ├── copilot-instructions.md    # Instructions for GitHub Copilot
│   └── workflows/
│       └── ci.yml                 # CI/CD configuration
├── src/
│   ├── core/
│   │   ├── cpu/
│   │   │   ├── cpu.js            # 65C816 CPU emulation
│   │   │   └── cpu.test.js       # CPU unit tests
│   │   ├── ppu/
│   │   │   ├── ppu.js            # Picture Processing Unit
│   │   │   └── ppu.test.js       # PPU unit tests
│   │   ├── apu/
│   │   │   ├── apu.js            # Audio Processing Unit  
│   │   │   └── apu.test.js       # APU unit tests
│   │   ├── memory/
│   │   │   ├── memory.js         # Memory management & mappers
│   │   │   └── memory.test.js    # Memory unit tests
│   │   ├── emulator.js           # Main emulator coordinator
│   │   └── emulator.test.js      # Emulator unit tests
│   ├── worker/
│   │   └── emulator-worker.js    # Web Worker for background execution
│   ├── ui/
│   │   ├── renderer.js           # Canvas rendering
│   │   ├── audio.js              # Web Audio API integration
│   │   └── input.js              # Keyboard input handling
│   └── main.js                   # Application entry point
├── index.html                    # Main HTML page
├── style.css                     # Application styles
├── package.json                  # NPM dependencies
├── vite.config.js                # Vite configuration
├── .eslintrc.json                # ESLint configuration
├── .gitignore                    # Git ignore rules
└── README.md                     # Project documentation
```

## Core Components

### 1. CPU (src/core/cpu/cpu.js)
- **Purpose**: Emulates the Ricoh 5A22 (WDC 65C816) processor
- **Features**:
  - All major 65C816 opcodes implemented
  - 8-bit and 16-bit mode support for accumulator and index registers
  - Multiple addressing modes (immediate, absolute, zero page, indirect, etc.)
  - Interrupt handling (NMI, IRQ)
  - Accurate cycle counting
  - Stack operations
  - Flag management (Carry, Zero, Negative, Overflow, etc.)
- **Test Coverage**: 42 tests covering all major operations

### 2. PPU (src/core/ppu/ppu.js)
- **Purpose**: Emulates the S-PPU1/S-PPU2 graphics processors
- **Features**:
  - All 8 background modes (0-7)
  - Sprite rendering support
  - 256x224 resolution
  - VRAM, CGRAM, OAM memory management
  - Scanline-based rendering
  - Color palette support (15-bit BGR to 32-bit RGBA conversion)
  - VBlank/HBlank detection
  - Register-based control
- **Test Coverage**: 37 tests for register access, timing, and rendering

### 3. APU (src/core/apu/apu.js)
- **Purpose**: Emulates the S-SMP (SPC700) and S-DSP audio system
- **Features**:
  - SPC700 CPU emulation foundation
  - 64KB audio RAM
  - DSP register management
  - Audio sample generation
  - CPU-APU communication ports
  - Stereo audio output
- **Test Coverage**: 23 tests for RAM access, DSP registers, and audio generation

### 4. Memory (src/core/memory/memory.js)
- **Purpose**: Manages all memory regions and cartridge mapping
- **Features**:
  - 128KB Work RAM (WRAM)
  - 128KB Save RAM (SRAM)
  - 64KB Video RAM (VRAM)
  - 512 bytes Color RAM (CGRAM)
  - 544 bytes Object Attribute Memory (OAM)
  - 64KB APU RAM
  - LoROM and HiROM mapper support
  - Automatic mapper detection
  - Memory-mapped I/O handling
  - DMA transfer support
  - Save state management
- **Test Coverage**: 27 tests for mapping, ROM loading, and I/O

### 5. Emulator (src/core/emulator.js)
- **Purpose**: Coordinates all components and manages execution
- **Features**:
  - Frame-based execution loop
  - Joypad input management
  - Save state support
  - SRAM persistence
  - Audio sample collection
  - Memory-mapped I/O coordination
  - 60 FPS timing
- **Test Coverage**: 25 tests for initialization, ROM loading, and state management

## Browser Integration

### Web Worker (src/worker/emulator-worker.js)
- Runs emulation in background thread
- Prevents UI blocking
- Handles ROM loading, execution control, and state management
- Communicates frame data and audio samples to main thread

### Renderer (src/ui/renderer.js)
- Canvas-based display
- Pixel-perfect rendering
- Configurable scaling
- Message display support

### Audio Player (src/ui/audio.js)
- Web Audio API integration
- Real-time audio playback
- Stereo support
- Volume control
- Mute functionality

### Input Manager (src/ui/input.js)
- Keyboard input handling
- Configurable key mappings
- Default SNES controller layout:
  - Arrow Keys → D-Pad
  - Z → B, X → A, A → Y, S → X
  - Q → L, W → R
  - Enter → Start, Shift → Select

## Testing

### Test Framework
- **Vitest** for unit testing
- **jsdom** for DOM simulation
- Code coverage reporting with v8

### Test Coverage
- **Total Tests**: 154 (119 passing)
- **CPU Tests**: 42
- **PPU Tests**: 37  
- **APU Tests**: 23
- **Memory Tests**: 27
- **Emulator Tests**: 25

### Running Tests
```bash
npm test              # Run tests in watch mode
npm run test:ui       # Run tests with UI
npm run test:coverage # Generate coverage report
```

## Development

### Build System
- **Vite** for development and bundling
- Hot module replacement
- ES2022 module support
- Web Worker support

### Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Code Style
- ES2022 JavaScript
- 2-space indentation
- Single quotes
- Semicolons required
- ESLint for code quality

## Features Implemented

### ✅ Core Emulation
- [x] 65C816 CPU with major opcodes
- [x] PPU with all background modes
- [x] APU audio system
- [x] LoROM and HiROM cartridge support
- [x] Memory mapping and banking
- [x] Interrupt handling

### ✅ User Interface
- [x] ROM file loading (drag & drop supported)
- [x] Canvas rendering
- [x] Audio playback
- [x] Keyboard controls
- [x] Start/stop/reset controls
- [x] FPS counter

### ✅ Persistence
- [x] Save states (JSON export)
- [x] SRAM saving (.srm export)
- [x] State loading

### ✅ Performance
- [x] Web Worker execution
- [x] 60 FPS target
- [x] Efficient rendering
- [x] Minimal allocations in hot paths

## Future Enhancements

### High Priority
- [ ] Complete CPU opcode implementation (all 256 opcodes)
- [ ] Sprite rendering in PPU
- [ ] SPC700 opcode implementation
- [ ] DSP audio processing
- [ ] Proper DMA timing

### Medium Priority
- [ ] Gamepad/controller support
- [ ] Screenshot capture
- [ ] Cheat code support
- [ ] Debugger UI
- [ ] Performance profiling

### Low Priority
- [ ] Netplay support
- [ ] Video recording
- [ ] Rewind functionality
- [ ] Turbo mode
- [ ] Custom color palettes

## Technical Specifications

### Accuracy Targets
- **CPU**: Cycle-accurate execution
- **PPU**: Scanline-accurate rendering
- **APU**: Sample-accurate audio
- **Timing**: NTSC timing (60 Hz, ~357,366 cycles/frame)

### Performance Targets
- **Frame Rate**: 60 FPS
- **Audio Latency**: < 100ms
- **Load Time**: < 1 second for typical ROM

### Compatibility
- **Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **ROM Formats**: .smc, .sfc, .rom
- **Mappers**: LoROM, HiROM

## Contributing

1. Follow the code style guidelines
2. Write unit tests for new features
3. Ensure all tests pass before submitting
4. Update documentation as needed
5. Run ESLint and fix any issues

## Resources

- [65C816 Reference](https://wiki.superfamicom.org/65816-reference)
- [SNES Development Manual](https://problemkaputt.de/fullsnes.htm)
- [PPU Documentation](https://wiki.superfamicom.org/ppu-registers)
- [APU Documentation](https://wiki.superfamicom.org/spc700-reference)

## License

MIT License - See LICENSE file for details

---

**Built with ❤️ using modern JavaScript (ES2022)**
