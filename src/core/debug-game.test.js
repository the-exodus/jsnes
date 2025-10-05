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

  it('should show game state after 10 frames', () => {
    console.log('\nStarting King Arthur World debug analysis...\n');

    // Track ALL memory writes to I/O region
    const ioWrites = {};
    const originalWriteIO = emulator.memory.writeIO.bind(emulator.memory);
    emulator.memory.writeIO = function(address, value) {
      const name = getRegisterName(address);
      if (!ioWrites[name]) {
        ioWrites[name] = [];
      }
      if (ioWrites[name].length < 5) { // Only store first few
        ioWrites[name].push(value);
      }
      return originalWriteIO(address, value);
    };

    function getRegisterName(addr) {
      const names = {
        0x2100: 'INIDISP', 0x2101: 'OBSEL', 0x2105: 'BGMODE', 0x2106: 'MOSAIC',
        0x2107: 'BG1SC', 0x2108: 'BG2SC', 0x2109: 'BG3SC', 0x210A: 'BG4SC',
        0x210B: 'BG12NBA', 0x210C: 'BG34NBA',
        0x210D: 'BG1HOFS', 0x210E: 'BG1VOFS',
        0x212C: 'TM', 0x212D: 'TS',
        0x2115: 'VMAIN', 0x2116: 'VMADD_L', 0x2117: 'VMADD_H',
        0x2118: 'VMDATAL', 0x2119: 'VMDATAH',
        0x2121: 'CGADD', 0x2122: 'CGDATA',
        0x4200: 'NMITIMEN', 0x4201: 'WRIO', 
        0x420B: 'MDMAEN', 0x420C: 'HDMAEN',
        0x2137: 'SLHV', 0x4210: 'RDNMI', 0x4211: 'TIMEUP', 0x4212: 'HVBJOY',
        0x4218: 'JOY1L', 0x4219: 'JOY1H'
      };
      if (addr >= 0x4300 && addr <= 0x437F) {
        const ch = Math.floor((addr - 0x4300) / 16);
        const reg = addr % 16;
        const regNames = ['DMAP', 'BBAD', 'A1TL', 'A1TH', 'A1B', 'DASL', 'DASH', 'DASB', 'A2AL', 'A2AH', 'NTRL', 'NTRH', 'UNU_C', 'UNU_D', 'UNU_E', 'UNU_F'];
        return `DMA${ch}_${regNames[reg]}`;
      }
      return names[addr] || `$${addr.toString(16).toUpperCase().padStart(4, '0')}`;
    }

    for (let frame = 0; frame < 10; frame++) {
      emulator.runFrame();
      
      console.log(`\n=== Frame ${frame} ===`);
      console.log(`INIDISP: $${emulator.ppu.registers.inidisp.toString(16).padStart(2, '0')} (force blank: ${(emulator.ppu.registers.inidisp & 0x80) ? 'ON' : 'OFF'})`);
      console.log(`TM: $${emulator.ppu.registers.tm.toString(16).padStart(2, '0')} (layers: ${getEnabledLayers(emulator.ppu.registers.tm)})`);
      console.log(`BGMODE: $${emulator.ppu.registers.bgmode.toString(16).padStart(2, '0')} (mode ${emulator.ppu.registers.bgmode & 0x07})`);
      
      // Check registers
      console.log(`BG1SC: $${emulator.ppu.registers.bg1sc.toString(16).padStart(2, '0')}`);
      console.log(`BG12NBA: $${emulator.ppu.registers.bg12nba.toString(16).padStart(2, '0')}`);
      
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

    // Show what registers were written
    console.log('\n=== I/O Register Writes (first 5 values) ===');
    const sortedWrites = Object.entries(ioWrites).sort((a, b) => {
      // Sort DMA registers together
      if (a[0].startsWith('DMA') && !b[0].startsWith('DMA')) return 1;
      if (!a[0].startsWith('DMA') && b[0].startsWith('DMA')) return -1;
      return a[0].localeCompare(b[0]);
    });
    for (const [name, values] of sortedWrites) {
      const valStr = values.map(v => '$' + v.toString(16).padStart(2, '0')).join(', ');
      console.log(`${name}: ${valStr} (${values.length} writes total)`);
    }

    function getEnabledLayers(tm) {
      const layers = [];
      if (tm & 0x01) layers.push('BG1');
      if (tm & 0x02) layers.push('BG2');
      if (tm & 0x04) layers.push('BG3');
      if (tm & 0x08) layers.push('BG4');
      if (tm & 0x10) layers.push('OBJ');
      return layers.length > 0 ? layers.join(', ') : 'none';
    }

    // Dump first few VRAM words
    console.log('\n=== First 32 VRAM words (16-bit) ===');
    for (let i = 0; i < 32; i++) {
      const low = emulator.ppu.memory.vram[i * 2];
      const high = emulator.ppu.memory.vram[i * 2 + 1];
      const word = (high << 8) | low;
      console.log(`[$${(i * 2).toString(16).padStart(4, '0')}] = $${word.toString(16).padStart(4, '0')}`);
    }

    // Dump first few CGRAM colors
    console.log('\n=== First 16 CGRAM colors ===');
    for (let i = 0; i < 16; i++) {
      const low = emulator.ppu.memory.cgram[i * 2];
      const high = emulator.ppu.memory.cgram[i * 2 + 1];
      const color = (high << 8) | low;
      const r = (color >> 0) & 0x1F;
      const g = (color >> 5) & 0x1F;
      const b = (color >> 10) & 0x1F;
      console.log(`[${i}] = $${color.toString(16).padStart(4, '0')} (R:${r} G:${g} B:${b})`);
    }

    expect(true).toBe(true);
  });
});
