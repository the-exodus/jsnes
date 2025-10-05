/**
 * Debug test to analyze test-game2.sfc execution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { Emulator } from './emulator.js';

describe('Debug test-game2.sfc', () => {
  let emulator;
  let rom;

  beforeEach(() => {
    const romPath = '/home/runner/work/jsnes/jsnes/snes-test-roms/test-game2.sfc';
    rom = new Uint8Array(readFileSync(romPath));
    emulator = new Emulator();
    emulator.loadROM(rom);
  });

  it('should test game progress with new I/O registers', () => {
    console.log('\nTesting King Arthur World with new I/O registers...\n');

    // Track writes to $4200
    const nmitemenWrites = [];
    const originalWriteIO = emulator.memory.writeIO.bind(emulator.memory);
    emulator.memory.writeIO = function(address, value) {
      if (address === 0x4200) {
        nmitemenWrites.push({ frame: emulator.ppu.frame, value });
      }
      return originalWriteIO(address, value);
    };

    function getEnabledLayers(tm) {
      const layers = [];
      if (tm & 0x01) layers.push('BG1');
      if (tm & 0x02) layers.push('BG2');
      if (tm & 0x04) layers.push('BG3');
      if (tm & 0x08) layers.push('BG4');
      if (tm & 0x10) layers.push('OBJ');
      return layers.length > 0 ? layers.join(', ') : 'none';
    }

    for (let frame = 0; frame < 120; frame++) {
      emulator.runFrame();
      
      if (frame % 10 === 0 || (frame >= 5 && frame <= 15)) {
        console.log(`\n=== Frame ${frame} ===`);
        console.log(`INIDISP: $${emulator.ppu.registers.inidisp.toString(16).padStart(2, '0')} (force blank: ${(emulator.ppu.registers.inidisp & 0x80) ? 'ON' : 'OFF'})`);
        console.log(`TM: $${emulator.ppu.registers.tm.toString(16).padStart(2, '0')} (layers: ${getEnabledLayers(emulator.ppu.registers.tm)})`);
        console.log(`BGMODE: $${emulator.ppu.registers.bgmode.toString(16).padStart(2, '0')} (mode ${emulator.ppu.registers.bgmode & 0x07})`);
        console.log(`BG1SC: $${emulator.ppu.registers.bg1sc.toString(16).padStart(2, '0')}`);
        console.log(`BG12NBA: $${emulator.ppu.registers.bg12nba.toString(16).padStart(2, '0')}`);
        console.log(`NMI enabled: ${emulator.nmiEnabled}, Auto-joypad: ${emulator.autoJoypadEnabled}`);
        
        // Check VRAM
        let vramNonZero = 0;
        for (let j = 0; j < 1000; j++) {
          if (emulator.ppu.memory.vram[j] !== 0) vramNonZero++;
        }
        console.log(`VRAM: ${vramNonZero}/1000 first bytes non-zero`);
        
        // Check CGRAM
        let cgramNonZero = 0;
        for (let j = 0; j < 512; j++) {
          if (emulator.ppu.memory.cgram[j] !== 0) cgramNonZero++;
        }
        console.log(`CGRAM: ${cgramNonZero}/512 bytes non-zero`);
      }
    }

    console.log(`\n=== NMITIMEN ($4200) Writes ===`);
    console.log(`Total writes: ${nmitemenWrites.length}`);
    if (nmitemenWrites.length > 0) {
      console.log('Values:');
      nmitemenWrites.forEach(w => {
        console.log(`  Frame ${w.frame}: $${w.value.toString(16).padStart(2, '0')} (NMI=${(w.value & 0x80) ? 'on' : 'off'}, JOY=${(w.value & 0x01) ? 'on' : 'off'})`);
      });
    } else {
      console.log('NO WRITES TO $4200 - Game never enables NMI/auto-joypad!');
    }

    expect(true).toBe(true);
  });
});
