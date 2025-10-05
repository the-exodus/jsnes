# Debugging Guide

## Overview
This guide explains how to debug SNES ROMs and investigate why games might not work correctly in the emulator.

## Disassembler Tool

### Installation
The disassembler is included in the `tools/` directory and requires no additional setup beyond installing project dependencies.

```bash
npm install
```

### Usage

Basic syntax:
```bash
node tools/disassembler.js <rom-file> <start-address> <length>
```

Examples:
```bash
# Disassemble first 256 bytes starting from reset vector
node tools/disassembler.js snes-test-roms/test-game2.sfc 0x8000 256

# Disassemble NMI handler
node tools/disassembler.js snes-test-roms/test-game2.sfc 0x801E 128

# Disassemble specific bank
node tools/disassembler.js snes-test-roms/test-game2.sfc 0x028000 512
```

### Output Format
```
Disassembling: snes-test-roms/test-game2.sfc
Address: $8000 - $8100

$008000: 78 18 fb c2 30 a9 00 00 5b a2 ff 01 9a e2 30 48
$008010: ab 58 22 24 dd 02 22 00 80 0e 4c 1a 80 40 c2 30
...
```

## Tracing Execution

### CPU Execution Trace
Add logging to CPU step function to see what's executing:

```javascript
// In src/core/cpu/cpu.js, in step() method
const opcode = this.readCodeByte();
console.log(`PC: $${this.PBR.toString(16)}:${(this.PC-1).toString(16)} ` +
           `Op: $${opcode.toString(16).padStart(2,'0')} ` +
           `A: $${this.A.toString(16)} X: $${this.X.toString(16)} ` +
           `P: $${this.P.toString(2)}`);
```

### Register Write Trace
Track PPU register writes:

```javascript
// In test or main.js
const originalWrite = emulator.ppu.writeRegister.bind(emulator.ppu);
emulator.ppu.writeRegister = function(addr, value) {
  console.log(`PPU[$${addr.toString(16)}] = $${value.toString(16).padStart(2,'0')}`);
  return originalWrite(addr, value);
};
```

### Memory Access Trace
Log memory reads/writes:

```javascript
// Wrap memory read
const originalRead = emulator.memory.read.bind(emulator.memory);
emulator.memory.read = function(addr) {
  const val = originalRead(addr);
  if (addr >= 0x2100 && addr <= 0x213F) {
    console.log(`Read PPU[$${addr.toString(16)}] = $${val.toString(16)}`);
  }
  return val;
};
```

## Common Issues and Solutions

### Issue: Black Screen
**Symptoms:** Game runs but displays only black screen

**Debug Steps:**
1. Check if force blank is ON:
   ```javascript
   console.log('Force Blank:', (emulator.ppu.registers.inidisp & 0x80) ? 'ON' : 'OFF');
   ```

2. Check if layers are enabled:
   ```javascript
   console.log('Layers enabled (TM):', emulator.ppu.registers.tm.toString(2));
   ```

3. Check VRAM content:
   ```javascript
   let nonZero = 0;
   for (let i = 0; i < 1000; i++) {
     if (emulator.memory.vram[i] !== 0) nonZero++;
   }
   console.log(`VRAM has ${nonZero}/1000 non-zero bytes`);
   ```

4. Check palette (CGRAM):
   ```javascript
   let nonZero = 0;
   for (let i = 0; i < emulator.memory.cgram.length; i++) {
     if (emulator.memory.cgram[i] !== 0) nonZero++;
   }
   console.log(`CGRAM has ${nonZero}/${emulator.memory.cgram.length} non-zero bytes`);
   ```

**Common Causes:**
- Background rendering is incomplete (see IMPLEMENTATION_STATUS.md)
- Sprite rendering not implemented
- Palette not initialized
- Game waiting for missing hardware feature

### Issue: Game Stuck in Loop
**Symptoms:** Same code executes repeatedly

**Debug Steps:**
1. Trace PC over several frames:
   ```javascript
   for (let i = 0; i < 10; i++) {
     emulator.runFrame();
     console.log(`Frame ${i}: PC = $${emulator.cpu.PBR.toString(16)}:${emulator.cpu.PC.toString(16)}`);
   }
   ```

2. Check if waiting on register:
   ```javascript
   // Add logging to memory reads
   // See if reading same register repeatedly
   ```

3. Disassemble the loop:
   ```bash
   node tools/disassembler.js rom.sfc 0xADDRESS 64
   ```

### Issue: No Audio
**Symptoms:** Game runs but no sound

**Known Issue:** APU (SPC700 and DSP) are not implemented. See IMPLEMENTATION_STATUS.md.

## Advanced Debugging

### Compare with Known-Good Emulator
Run the same ROM in Bsnes or Snes9x with debugger enabled:
1. Note what registers are being written
2. Note execution flow
3. Compare with our emulator's behavior

### Memory Dump
Export memory regions for analysis:

```javascript
import { writeFileSync } from 'fs';

// Dump VRAM
writeFileSync('vram-dump.bin', emulator.memory.vram);

// Dump CGRAM (palette)
writeFileSync('cgram-dump.bin', emulator.memory.cgram);

// Dump OAM (sprites)
writeFileSync('oam-dump.bin', emulator.memory.oam);
```

### Framebuffer Analysis
Check what's in the framebuffer:

```javascript
let colorCounts = {};
for (let i = 0; i < emulator.ppu.framebuffer.length; i++) {
  const color = emulator.ppu.framebuffer[i];
  colorCounts[color] = (colorCounts[color] || 0) + 1;
}
console.log('Colors in framebuffer:', Object.keys(colorCounts).length);
console.log('Non-black pixels:', emulator.ppu.framebuffer.filter(c => c !== 0xFF000000).length);
```

## Performance Profiling

### Browser DevTools
1. Open browser DevTools (F12)
2. Go to Performance tab
3. Record while emulator runs
4. Look for hot spots in:
   - `CPU.step()`
   - `PPU.renderScanline()`
   - `PPU.renderBackground()`

### Node.js Profiling
```bash
node --prof test-script.js
node --prof-process isolate-*.log > profile.txt
```

## Test ROMs

### Simple Test ROMs
For basic testing, create minimal ROMs that:
1. Turn off force blank
2. Enable one layer
3. Write simple pattern to VRAM
4. Set palette colors

### Official Test ROMs
- SNES Test Program (Peter Lemon)
- 240p Test Suite
- Various homebrew demos

## Reporting Issues

When reporting issues, include:
1. ROM name and version
2. What you see vs. what you expect
3. Execution trace (first 100 instructions)
4. Register states (INIDISP, TM, BGMODE)
5. Memory dump (VRAM, CGRAM if relevant)
6. Disassembly of problem area

## References

- [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) - What's actually implemented
- [Fullsnes](https://problemkaputt.de/fullsnes.htm) - Complete SNES hardware reference
- [SNES Dev Wiki](https://wiki.superfamicom.org/) - Development resources
