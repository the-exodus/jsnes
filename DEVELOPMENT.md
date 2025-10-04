# Development Guide

## Getting Started

### Prerequisites
- Node.js 18 or higher
- Modern web browser (Chrome, Firefox, Edge, or Safari)
- Text editor or IDE

### Installation
```bash
# Clone the repository
git clone https://github.com/the-exodus/jsnes.git
cd jsnes

# Install dependencies
npm install

# Start development server
npm run dev
```

The emulator will open automatically at `http://localhost:3000`

## Project Architecture

### Core Emulation (src/core/)
The core emulation runs independently of the browser and can be tested in isolation.

#### CPU (cpu/cpu.js)
The CPU emulator implements the 65C816 processor:
- **Registers**: A (accumulator), X, Y (index), S (stack pointer), PC (program counter), P (status), PBR (program bank), DBR (data bank)
- **Modes**: Supports both 8-bit and 16-bit accumulator/index register modes
- **Opcodes**: Implements load, store, arithmetic, logical, branch, jump, and stack operations
- **Interrupts**: NMI and IRQ handling with proper vector support

When adding new opcodes:
1. Add the opcode handler function
2. Add the opcode to the opcode table in `buildOpcodeTable()`
3. Add comprehensive unit tests
4. Document the addressing mode and cycle count

#### PPU (ppu/ppu.js)
The PPU handles all graphics rendering:
- **Registers**: Controls for backgrounds, sprites, scrolling, and effects
- **Memory**: VRAM (64KB), CGRAM (512B palette), OAM (544B sprite data)
- **Modes**: Supports all 8 background modes (0-7)
- **Rendering**: Scanline-based rendering with proper timing

When modifying PPU:
- Test with different background modes
- Verify VRAM access timing
- Check sprite priority and rendering order
- Validate color conversion (15-bit BGR → 32-bit RGBA)

#### APU (apu/apu.js)
The APU provides audio capabilities:
- **CPU**: SPC700 processor (8-bit)
- **Memory**: 64KB dedicated audio RAM
- **DSP**: 8-channel sound processor
- **Communication**: 4 ports for CPU-APU data exchange

Current implementation is simplified. For full audio:
1. Implement all SPC700 opcodes
2. Add DSP envelope and filter processing
3. Implement proper sample interpolation
4. Add echo and reverb effects

#### Memory (memory/memory.js)
Manages all memory regions and cartridge mapping:
- **WRAM**: 128KB work RAM
- **SRAM**: 128KB save RAM (cartridge)
- **ROM**: Cartridge ROM (variable size)
- **Mappers**: LoROM and HiROM auto-detection

When adding mapper support:
1. Implement the mapping function
2. Add detection logic in `detectMapper()`
3. Test with ROMs using that mapper
4. Verify bank switching works correctly

### User Interface (src/ui/)

#### Renderer (ui/renderer.js)
- Uses Canvas 2D API for pixel-perfect rendering
- Converts Uint32Array framebuffer to ImageData
- Supports integer scaling for crisp pixels

#### Audio (ui/audio.js)
- Uses Web Audio API for low-latency playback
- Buffers samples for smooth playback
- Handles stereo audio mixing

#### Input (ui/input.js)
- Maps keyboard events to SNES controller buttons
- Supports configurable key bindings
- Handles key press/release state

### Web Worker (src/worker/emulator-worker.js)
Runs emulation in background thread:
- Prevents UI blocking
- Handles message passing for ROM loading, control, and frame data
- Manages emulation timing

## Testing

### Writing Tests
All core components should have comprehensive unit tests.

Example test structure:
```javascript
describe('ComponentName', () => {
  let component;

  beforeEach(() => {
    component = new ComponentName();
  });

  describe('Feature', () => {
    it('should do something specific', () => {
      // Arrange
      component.setup();
      
      // Act
      const result = component.doSomething();
      
      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Running Tests
```bash
npm test              # Run in watch mode
npm run test:ui       # Run with UI
npm run test:coverage # Generate coverage report
```

### Test Coverage Goals
- **Minimum**: 80% code coverage
- **Critical paths**: 100% coverage (CPU opcodes, memory mapping)
- **Edge cases**: Always test boundary conditions

## Code Style

### JavaScript
- Use ES2022 features
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Use template literals for string interpolation
- Use destructuring where appropriate

### Naming Conventions
- Classes: PascalCase (`CPU`, `PPU`, `Memory`)
- Functions: camelCase (`readMemory`, `executeOpcode`)
- Constants: UPPER_SNAKE_CASE (`CPU_FLAGS`, `VRAM_SIZE`)
- Private methods: prefix with underscore (`_internalMethod`)

### Comments
- Use JSDoc for public functions and classes
- Explain "why" not "what" in comments
- Document complex algorithms
- Reference hardware documentation where applicable

### Performance
- Minimize allocations in hot paths (CPU, PPU inner loops)
- Use typed arrays for memory regions
- Avoid object creation in render loops
- Profile before optimizing

## Debugging

### CPU Debugging
Enable CPU state logging:
```javascript
console.log(`PC: ${this.PC.toString(16)}, A: ${this.A.toString(16)}, P: ${this.P.toString(2)}`);
```

### PPU Debugging
Check register states:
```javascript
console.log(`Mode: ${this.registers.bgmode & 0x07}, TM: ${this.registers.tm.toString(2)}`);
```

### Memory Debugging
Log memory accesses:
```javascript
console.log(`Read: ${address.toString(16)} = ${value.toString(16)}`);
```

## Common Tasks

### Adding a New CPU Opcode
1. Look up the opcode in the 65C816 reference
2. Implement the handler function in `CPU` class
3. Add to `buildOpcodeTable()` with correct cycle count
4. Write unit tests covering:
   - Basic operation
   - Flag updates
   - Edge cases (zero, negative, overflow)
   - Different addressing modes

### Adding a New PPU Feature
1. Identify the relevant registers
2. Implement register read/write in `writeRegister()`/`readRegister()`
3. Update rendering logic in `renderScanline()` or related methods
4. Test with known ROM patterns
5. Add unit tests for register behavior

### Optimizing Performance
1. Profile with browser DevTools
2. Identify hot paths
3. Optimize data structures (use typed arrays)
4. Reduce function calls in loops
5. Cache calculations when possible
6. Measure before and after

## Troubleshooting

### Tests Failing
- Check that all dependencies are installed
- Ensure Node.js version is 18+
- Clear node_modules and reinstall if needed

### Build Errors
- Check for syntax errors with ESLint
- Verify all imports are correct
- Check Vite configuration

### Runtime Errors
- Check browser console for errors
- Verify ROM format is supported
- Check that Web Workers are supported

### Performance Issues
- Ensure emulation is running in Web Worker
- Check for memory leaks
- Profile CPU/PPU render loops
- Reduce logging in production builds

## Resources

### SNES Hardware Documentation
- [65C816 CPU Reference](https://wiki.superfamicom.org/65816-reference)
- [SNES Development Manual](https://problemkaputt.de/fullsnes.htm)
- [PPU Registers](https://wiki.superfamicom.org/ppu-registers)
- [SPC700 Reference](https://wiki.superfamicom.org/spc700-reference)

### Emulation Resources
- [Emulation General Wiki](https://emulation.gametechwiki.com/)
- [NES Dev Wiki](https://wiki.nesdev.com/) (similar concepts)

### Tools
- [VS Code](https://code.visualstudio.com/) with JavaScript/TypeScript extension
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Vitest](https://vitest.dev/) for testing

## Contributing

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Ensure all tests pass
6. Run linter and fix issues
7. Submit pull request with clear description

### Code Review Guidelines
- All code must have tests
- Maintain existing code style
- Document complex logic
- Update documentation if needed

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Run full test suite
4. Build production version
5. Tag release in git
6. Deploy to hosting platform

---

Happy coding! 🎮
