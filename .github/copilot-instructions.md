# Copilot Instructions for JSNES - SNES Emulator

## Project Overview
JSNES is a SNES emulator in JavaScript (ES2022), ~4,000 lines. Runs in browser with 65C816 CPU, PPU, APU, and memory emulation.
**Stack:** Vite 5.0 (build), Vitest 1.0 (tests), ESLint 8.50, Node.js 18+, Canvas/WebAudio/WebWorker APIs.

## Build & Test Workflow (Commands in Order)

**1. Setup:** `npm install` (required first, ~10-15s)  
**2. Test:** `npm test` (~3s, 189/189 pass), `npm run test:watch` (dev), `npm run test:coverage`  
**3. Lint:** `npm run lint` - All errors and warnings fixed! Code is clean.  
**4. Build:** `npm run build` (~300-500ms to dist/), `npm run preview`  
**5. Dev:** `npm run dev` (port 3000, auto-opens browser, HMR enabled) or press F5 in VS Code to launch & debug

**Key Points:**
- ALWAYS `npm install` after cleaning node_modules
- Tests run independently, no build required first
- All tests now pass including emulator tests (hang issue fixed)
- ESLint now passes with zero errors/warnings
- VS Code debug launch config available - press F5 to run and debug
- ALWAYS update `copilot-instructions.md` if necessary after making changes to the project.

## Known Issues
- **Build:** Independent from tests. Can build without testing first.

## Project Structure
```
src/core/          # Emulation core (runs in Web Worker)
  cpu/             # 65C816 CPU - cpu.js (720 lines), cpu.test.js (77 tests, 80%+ coverage)
  ppu/             # Graphics PPU - ppu.js (479 lines), ppu.test.js (37 tests, 81% coverage)
  apu/             # Audio APU - apu.js (149 lines), apu.test.js (23 tests, 100% coverage)
  memory/          # Memory & mappers - memory.js (356 lines), memory.test.js (27 tests, 95%+ coverage)
  emulator.js      # Main coordinator (245 lines), emulator.test.js (25 tests, all passing)
src/ui/            # Browser UI - renderer.js, audio.js, input.js (not tested)
src/worker/        # emulator-worker.js (112 lines, Web Worker wrapper)
src/main.js        # Entry point (342 lines)
index.html, style.css  # UI
vite.config.js     # Build & test config (port 3000, v8 coverage)
.eslintrc.json     # 2-space, single quotes, semicolons, ES2022
package.json       # Scripts & dependencies
.gitignore         # Excludes: node_modules, dist, coverage, *.log, *.smc/sfc/rom
```

**Where to Edit:**
- CPU: src/core/cpu/cpu.js + cpu.test.js
- Graphics: src/core/ppu/ppu.js + ppu.test.js  
- Audio: src/core/apu/apu.js + apu.test.js
- Memory: src/core/memory/memory.js + memory.test.js
- UI: src/main.js, src/ui/*.js, index.html, style.css
- Worker: src/worker/emulator-worker.js

## Code Style (Enforced by ESLint)
- ES2022 modules, 2-space indent, single quotes, semicolons required
- PascalCase (classes), camelCase (functions), UPPER_SNAKE_CASE (constants), _private (methods)
- Typed arrays for memory (Uint8Array, Uint16Array, Int8Array)
- Test pattern: `describe('Name', () => { beforeEach(() => {...}); it('should...', () => {...}); });`

## Testing
**Coverage:** CPU 80%+, PPU 81%, APU 100%, Memory 95%+, Emulator (all 189 tests pass)
**New features:** Write tests alongside code, use `npm run test:watch`, aim for 80%+ coverage, test edge cases.
**Recent additions:** 17 new opcodes implemented (0x00, 0x01, 0x02, 0x03, 0x0E, 0x22, 0x24, 0x30, 0x34, 0x5B, 0x80, 0x9A, 0xAB, 0xC2, 0xDD, 0xE2, 0xFB) with comprehensive tests.

## Workflow for Changes
1. `npm install` (if needed) → 2. Edit code → 3. `npm test` → 4. `npm run lint` → 5. `npm run build`

**Adding features:** Find file in structure above → implement with code style → add test in .test.js → `npm run test:watch` → `npm run build`

**Debug tests:** Node.js env (not browser), console.log allowed, check actual vs expected in output

## Performance
- Hot paths: CPU/PPU loops - minimize allocations, use typed arrays (already done)
- Web Worker keeps emulation off main thread, target 60 FPS

## Trust These Instructions
All commands validated. Only search further if: instructions incomplete for your task, undocumented errors occur, or need implementation details. See README.md, DEVELOPMENT.md, QUICK_START.md, PROJECT_SUMMARY.md for more.
