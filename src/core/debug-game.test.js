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

    // Track the REP/LDA/TAX sequence that should initialize X
    const initTrace = [];
    const originalStep = emulator.cpu.step.bind(emulator.cpu);
    emulator.cpu.step = function() {
      const pc = (this.PBR << 16) | this.PC;
      
      // Track the initialization sequence at $02DE65-$02DE6A
      if (emulator.ppu.frame === 5 && pc >= 0x02DE65 && pc <= 0x02DE6C && initTrace.length < 10) {
        const opcode = emulator.memory.read(pc);
        initTrace.push({
          pc,
          opcode,
          A_before: this.A,
          X_before: this.X,
          P_before: this.P
        });
      }
      
      const result = originalStep();
      
      // Track after execution
      if (initTrace.length > 0 && initTrace[initTrace.length - 1].A_after === undefined) {
        const last = initTrace[initTrace.length - 1];
        last.A_after = this.A;
        last.X_after = this.X;
        last.P_after = this.P;
      }
      
      return result;
    };

    // Track writes to $4200 and SRAM access
    const nmitemenWrites = [];
    let sramReads = 0;
    let sramWrites = 0;
    
    const originalWriteIO = emulator.memory.writeIO.bind(emulator.memory);
    emulator.memory.writeIO = function(address, value) {
      if (address === 0x4200) {
        nmitemenWrites.push({ frame: emulator.ppu.frame, value });
      }
      return originalWriteIO(address, value);
    };
    
    const originalRead = emulator.memory.read.bind(emulator.memory);
    emulator.memory.read = function(address) {
      const bank = (address >> 16) & 0xFF;
      const offset = address & 0xFFFF;
      if (bank < 0x70 && offset >= 0x6000 && offset < 0x8000) {
        sramReads++;
      }
      return originalRead(address);
    };
    
    const originalWrite = emulator.memory.write.bind(emulator.memory);
    emulator.memory.write = function(address, value) {
      const bank = (address >> 16) & 0xFF;
      const offset = address & 0xFFFF;
      if (bank < 0x70 && offset >= 0x6000 && offset < 0x8000) {
        sramWrites++;
      }
      return originalWrite(address, value);
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
    
    console.log(`\n=== SRAM Access ===`);
    console.log(`SRAM reads: ${sramReads}`);
    console.log(`SRAM writes: ${sramWrites}`);
    
    // Check SRAM content
    let sramNonZero = 0;
    for (let i = 0; i < 100; i++) {
      if (emulator.memory.sram[i] !== 0) sramNonZero++;
    }
    console.log(`SRAM first 100 bytes non-zero: ${sramNonZero}`);
    console.log('First 32 SRAM bytes:', Array.from(emulator.memory.sram.slice(0, 32)).map(v => v.toString(16).padStart(2, '0')).join(' '));
    
    // Show initialization sequence trace
    console.log(`\n=== REP/LDA/TAX initialization sequence at $02DE65 ===`);
    console.log('Expected: REP #$30 (16-bit mode), LDA #$0000, TAX (X should become $0000)');
    initTrace.forEach((entry, i) => {
      console.log(`[${i}] $${entry.pc.toString(16).padStart(6, '0')}: ${entry.opcode.toString(16).padStart(2, '0')} | A: ${entry.A_before.toString(16).padStart(4, '0')}->${entry.A_after ? entry.A_after.toString(16).padStart(4, '0') : '????'} X: ${entry.X_before.toString(16).padStart(4, '0')}->${entry.X_after ? entry.X_after.toString(16).padStart(4, '0') : '????'} P: ${entry.P_before.toString(16).padStart(2, '0')}->${entry.P_after ? entry.P_after.toString(16).padStart(2, '0') : '??'}`);
    });

    expect(true).toBe(true);
  });
});
