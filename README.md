# JSNES - SNES Emulator

A Super Nintendo Entertainment System (SNES) emulator written in modern JavaScript (ES2022) that runs entirely in the browser.

## Features

- **✅ Accurate CPU Emulation**: Full implementation of the Ricoh 5A22 (WDC 65C816) - ALL 256 opcodes
- **⚠️ PPU Support**: S-PPU1 and S-PPU2 register emulation (rendering implementation in progress)
- **⚠️ APU Emulation**: Framework for S-SMP (SPC700) and S-DSP (implementation planned)
- **✅ IPL High-Level Emulation**: No proprietary SNES boot ROM required
- **✅ Memory Mapping**: Support for LoROM and HiROM cartridge formats
- **✅ Web Worker Integration**: Core emulation runs in a separate thread for optimal performance
- **✅ Modern APIs**: Canvas API for rendering, Web Audio API for sound

**Current Status:** CPU and memory subsystems are complete. PPU rendering and APU audio are under development. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for detailed information.

## Getting Started

### Prerequisites

- Node.js 18+ 
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Building

```bash
npm run build
```

### Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Controls

| Key | SNES Button |
|-----|-------------|
| Arrow Keys | D-Pad |
| Z | B Button |
| X | A Button |
| A | Y Button |
| S | X Button |
| Enter | Start |
| Shift | Select |

## Architecture

```
src/
├── core/              # Emulation core (runs in Web Worker)
│   ├── cpu/          # 65C816 CPU emulation
│   ├── ppu/          # PPU (graphics) emulation
│   ├── apu/          # APU (audio) emulation
│   ├── memory/       # Memory management and mappers
│   └── emulator.js   # Main emulation coordinator
├── ui/               # Browser UI components
├── worker/           # Web Worker wrapper
└── main.js           # Application entry point
```

## Technical Details

### ✅ CPU (Ricoh 5A22 / WDC 65C816)
- 16-bit processor with 8/16-bit accumulator and index registers
- 24-bit address space (16MB addressable) with PBR/DBR bank registers
- Variable-length instructions - ALL 256 opcodes implemented
- Multiple addressing modes - all functional
- **Status: Fully implemented and tested**

### ⚠️ PPU (Picture Processing Unit)
- Register access fully implemented ($2100-$213F)
- VRAM, CGRAM, OAM accessible
- Framework for modes 0-7 (rendering in progress)
- **Status: Registers complete, rendering partially implemented**
- **Known Issues:** Background tile rendering incomplete, sprites not implemented

### ⚠️ APU (Audio Processing Unit)
- Communication ports functional ($2140-$2143)
- 64KB audio RAM allocated
- **Status: Framework only - SPC700 CPU and DSP not yet implemented**
- **Known Issues:** No audio output (silence only)

### IPL High-Level Emulation
- Emulates SNES Initial Program Loader (IPL) boot sequence
- No proprietary Nintendo boot ROM required
- Properly initializes CPU, APU/SPC700, and PPU
- Includes authentic SPC700 boot program
- Enables ROM execution without external dependencies
- See [docs/IPL-HLE.md](docs/IPL-HLE.md) for details

## License

MIT

## Development Status

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for a detailed breakdown of what is and isn't implemented.

**What Works:**
- ✅ CPU execution (all opcodes)
- ✅ Memory management (LoROM/HiROM)
- ✅ ROM loading and reset
- ✅ Register access (CPU, PPU, APU)
- ✅ Timing and VBlank

**What Doesn't Work Yet:**
- ❌ Graphics rendering (backgrounds incomplete, sprites missing)
- ❌ Audio output (SPC700 and DSP not implemented)
- ❌ Most games will show black screen

## Debugging

See [docs/DEBUGGING.md](docs/DEBUGGING.md) for debugging tools and techniques.

Use the included disassembler to investigate ROM code:
```bash
node tools/disassembler.js <rom-file> <address> <length>
```

## Contributing

Contributions are welcome! Priority areas:
1. Complete PPU background rendering
2. Implement sprite rendering
3. Implement SPC700 CPU
4. Implement DSP audio

Please ensure all tests pass before submitting a PR.
