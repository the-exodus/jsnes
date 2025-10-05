# JSNES Implementation Status

## Overview
This document provides an honest assessment of what is actually implemented in the emulator versus what is documented. This investigation was conducted to identify why test-game2.sfc (King Arthur's World) does not render.

**Last Updated:** October 2024  
**Investigation Scope:** Full code review of all core components

---

## ✅ Fully Implemented Components

### CPU (65C816)
**Status:** ✅ **Complete** (100%)
- ✅ All 256 opcodes implemented
- ✅ 24-bit addressing with PBR/DBR bank registers
- ✅ 8/16-bit accumulator and index modes
- ✅ Emulation mode and native mode switching
- ✅ NMI and IRQ interrupt handling
- ✅ All addressing modes functional
- ✅ Status flags (N, V, M, X, D, I, Z, C)
- ✅ Stack operations
- ✅ Reset vector loading

**Test Coverage:** 119 tests, 80%+ coverage

### Memory Management
**Status:** ✅ **Complete** (95%)
- ✅ 128KB WRAM
- ✅ 128KB SRAM (cartridge save RAM)
- ✅ LoROM mapper with auto-detection
- ✅ HiROM mapper with auto-detection
- ✅ ROM header validation
- ✅ Bank mirroring
- ✅ I/O register mapping ($2000-$5FFF)
- ⚠️ ExHiROM and other special mappers not implemented

**Test Coverage:** 27 tests, 95%+ coverage

### IPL High-Level Emulation
**Status:** ✅ **Complete** (100%)
- ✅ CPU initialization (registers, flags, reset vector)
- ✅ PPU initialization (force blank, clear memory)
- ✅ APU initialization (SPC700 boot ROM, DSP reset)
- ✅ SPC700 boot ROM at $FFC0-$FFFF
- ✅ Proper initialization order
- ✅ No proprietary boot ROM required

**Test Coverage:** 34 comprehensive tests

---

## ⚠️ Partially Implemented Components

### PPU (Picture Processing Unit)
**Status:** ⚠️ **Partially Implemented** (40%)

#### What IS Implemented:
- ✅ Register read/write ($2100-$213F)
- ✅ VRAM access ($2118-$2119)
- ✅ CGRAM (palette) access ($2121-$2122)
- ✅ OAM access ($2104)
- ✅ Scanline timing (262 scanlines, VBlank detection)
- ✅ All 8 background modes defined (renderMode0-7)
- ✅ Frame buffer (256x224 pixels, RGBA format)
- ✅ Color conversion (15-bit BGR → 32-bit RGBA)
- ✅ Force blank handling
- ✅ Layer enable/disable (TM register)

#### What is NOT Implemented:
- ❌ **Background rendering is INCOMPLETE**
  - `renderBackground()` exists but has simplified tilemap addressing
  - Comment says: "simplified - actual implementation needs proper addressing"
  - Tilemap base address calculation incomplete
  - No support for tilemap size variations (32x32, 64x32, 32x64, 64x64)
  - No support for tile flipping properly
  
- ❌ **Sprite rendering is STUB ONLY**
  - `renderSprites()` function exists but is empty
  - Comment: "Simplified sprite rendering - Actual implementation needs proper OAM parsing and priority handling"
  - OAM is accessible but not parsed
  - No sprite-to-sprite or sprite-to-background priority
  
- ❌ **Mode 7 is STUB**
  - `renderMode7()` just calls `renderBackground()` with 8bpp
  - No matrix transformation implemented
  - No rotation/scaling
  
- ❌ **Missing Features:**
  - No mosaic effect
  - No window masking
  - No color math/blending
  - No interlace mode
  - No hi-res modes (512x224, 512x448)
  - No offset-per-tile scrolling (Mode 2/4)
  - Tile pixel reading incomplete
  - Background priority not implemented

**Test Coverage:** 50 tests, 81% coverage (but tests don't cover actual rendering)

**Why Games Don't Render:**
1. Background tilemap addressing is incomplete
2. Sprites are not rendered at all
3. Even if force blank is off and layers enabled, there's no actual graphics output

### APU (Audio Processing Unit)
**Status:** ⚠️ **Stub Implementation** (10%)

#### What IS Implemented:
- ✅ APU registers ($2140-$2143) accessible
- ✅ 64KB APU RAM allocated
- ✅ DSP registers (128 bytes) allocated
- ✅ SPC700 boot ROM in IPL HLE
- ✅ Communication ports between CPU and APU
- ✅ Step timing framework

#### What is NOT Implemented:
- ❌ **SPC700 CPU is STUB**
  - `executeInstruction()` is a NOP
  - Comment: "Simplified SPC700 emulation - Full implementation would have all 256 opcodes"
  - PC increments but no actual instruction execution
  
- ❌ **DSP is STUB**
  - `generateSamples()` outputs silence
  - Comment: "Simplified DSP emulation - Actual implementation would process 8 voices"
  - No ADSR envelope processing
  - No sample playback
  - No echo/reverb
  - No pitch modulation
  
- ❌ **Audio Output:**
  - Returns empty buffer (silence only)
  - Web Audio API integration exists in UI but receives no data

**Test Coverage:** 23 tests, 100% coverage (but only tests stubs)

**Impact:** No audio output at all. Games play silently.

---

## 🎯 What Actually Works

### ✅ Core Emulation Loop
- CPU executes instructions correctly
- Memory reads/writes work
- Registers are accessible
- NMI triggers on VBlank
- Frame timing works (60 FPS)

### ✅ ROM Loading
- ROMs load successfully
- Mapper detection works
- Reset vector reads correctly
- Memory mapping functional

### ❌ Graphics Output
- **DOES NOT WORK** - Background rendering incomplete
- **DOES NOT WORK** - Sprite rendering not implemented
- Force blank can be turned off, but nothing renders
- Layers can be enabled, but no tiles appear

### ❌ Audio Output
- **DOES NOT WORK** - SPC700 not implemented
- **DOES NOT WORK** - DSP not implemented
- Complete silence

---

## 📊 Summary Table

| Component | Implementation | Functional | Tests Pass | Notes |
|-----------|---------------|------------|------------|-------|
| CPU | 100% | ✅ Yes | ✅ Yes | Fully working |
| Memory | 95% | ✅ Yes | ✅ Yes | LoROM/HiROM only |
| IPL HLE | 100% | ✅ Yes | ✅ Yes | Complete |
| PPU Registers | 100% | ✅ Yes | ✅ Yes | Read/write works |
| PPU Rendering | 40% | ❌ No | ⚠️ Partial | Stubs only |
| Sprites | 0% | ❌ No | ✅ Yes | Not implemented |
| APU SPC700 | 5% | ❌ No | ⚠️ Stubs | NOP only |
| APU DSP | 0% | ❌ No | ⚠️ Stubs | Silence only |

---

## 🔍 Why test-game2.sfc Doesn't Render

Based on investigation, the game is executing correctly but stays in initialization because:

1. **Background Rendering Incomplete**
   - Game writes tile data to VRAM ✅
   - Game sets up palette in CGRAM ❌ (stays empty)
   - Game enables layers ❌ (stays disabled - TM=$00)
   - Even if enabled, `renderBackground()` won't produce correct output

2. **Sprite Rendering Missing**
   - Game likely uses sprites for important graphics
   - `renderSprites()` is an empty stub
   - No sprites will ever appear

3. **Game is Waiting**
   - Keeps force blank ON (INIDISP=$FF)
   - Keeps layers disabled (TM=$00)
   - Likely waiting for:
     - Proper VRAM/tilemap setup
     - DMA completion
     - Missing hardware feature
     - Timing-sensitive initialization

---

## 🛠️ What Needs to be Implemented

### Priority 1: Graphics Output
1. **Complete Background Rendering**
   - Proper tilemap address calculation
   - Support all tilemap sizes
   - Implement tile flipping
   - Fix pixel extraction from tile data
   - Add background priority
   
2. **Implement Sprite Rendering**
   - Parse OAM correctly
   - Render sprites with proper priority
   - Handle sprite sizes
   - Implement sprite-to-background priority

3. **Implement Mode 7**
   - Matrix transformation
   - Rotation and scaling
   - HDMA for per-scanline effects

### Priority 2: Audio
1. **Implement SPC700 CPU**
   - All 256 opcodes
   - Proper addressing modes
   - Timing accuracy

2. **Implement DSP**
   - 8-voice sample playback
   - ADSR envelope
   - Echo/reverb effects
   - Filters

### Priority 3: Advanced Features
1. **HDMA** (Horizontal DMA)
2. **Color Math** (transparency, blending)
3. **Window Masking**
4. **Mosaic Effect**

---

## 🎓 Learning Resources

### For Implementation
- [Fullsnes by problemkaputt](https://problemkaputt.de/fullsnes.htm) - Complete hardware reference
- [SNES Development Wiki](https://wiki.superfamicom.org/) - Register details
- [Bsnes Source Code](https://github.com/bsnes-emu/bsnes) - Reference implementation

### Disassembler Tools
- Use `node tools/disassembler.js` to examine ROM code
- Trace register writes with debugging code
- Compare with known-good emulators (Bsnes, Snes9x)

---

## 📝 Conclusion

**README Claims:** "Fully functioning SNES emulator" with "PPU Support: S-PPU1 and S-PPU2 emulation with all background modes and sprite rendering" and "APU Emulation: S-SMP (SPC700) and S-DSP for authentic audio"

**Reality:** 
- ✅ CPU: Fully implemented and working
- ✅ Memory: Fully implemented and working
- ⚠️ PPU: Registers work, but rendering is 40% complete (backgrounds incomplete, sprites missing)
- ⚠️ APU: Completely non-functional (stubs only, no audio)

**The emulator CAN:**
- Load ROMs
- Execute code
- Access all registers
- Run at 60 FPS

**The emulator CANNOT:**
- Render graphics (backgrounds incomplete, sprites missing)
- Play audio (SPC700 and DSP not implemented)
- Run most games successfully

This is why test-game2.sfc shows a black screen despite executing code correctly.
