# JSNES - SNES Emulator

A fully functioning Super Nintendo Entertainment System (SNES) emulator written in modern JavaScript (ES2022) that runs entirely in the browser.

## Features

- **Accurate CPU Emulation**: Full implementation of the Ricoh 5A22 (WDC 65C816)
- **PPU Support**: S-PPU1 and S-PPU2 emulation with all background modes and sprite rendering
- **APU Emulation**: S-SMP (SPC700) and S-DSP for authentic audio
- **Memory Mapping**: Support for LoROM and HiROM cartridge formats
- **Web Worker Integration**: Core emulation runs in a separate thread for optimal performance
- **Modern APIs**: Canvas API for rendering, Web Audio API for sound

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

### CPU (Ricoh 5A22 / WDC 65C816)
- 16-bit processor with 8/16-bit accumulator and index registers
- 24-bit address space (16MB addressable)
- Variable-length instructions
- Multiple addressing modes

### PPU (Picture Processing Unit)
- Multiple background modes (Mode 0-7)
- Up to 128 sprites per frame
- 15-bit color (32,768 colors)
- Multiple background layers with different priorities

### APU (Audio Processing Unit)
- Sony SPC700 CPU (8-bit)
- 8-channel wavetable synthesizer
- 64KB audio RAM
- Real-time DSP effects

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting a PR.
