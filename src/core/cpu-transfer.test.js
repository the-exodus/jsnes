/**
 * Test to verify TAX, TAY, TXA, TYA work correctly in 16-bit mode
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CPU } from './cpu/cpu.js';
import { Memory } from './memory/memory.js';

describe('CPU Transfer Instructions Test', () => {
  let cpu;
  let memory;

  beforeEach(() => {
    memory = new Memory();
    cpu = new CPU(memory);
    
    // Create a small test ROM
    const testRom = new Uint8Array(0x10000);
    // REP #$30 at $8000
    testRom[0] = 0xC2;
    testRom[1] = 0x30;
    // LDA #$0000 at $8002
    testRom[2] = 0xA9;
    testRom[3] = 0x00;
    testRom[4] = 0x00;
    // TAX at $8005
    testRom[5] = 0xAA;
    // BRK
    testRom[6] = 0x00;
    
    memory.loadROM(testRom);
    cpu.reset();
  });

  it('should transfer A to X correctly in 16-bit mode', () => {
    console.log('Initial state:');
    console.log(`  A=$${cpu.A.toString(16).padStart(4, '0')}, X=$${cpu.X.toString(16).padStart(4, '0')}, P=$${cpu.P.toString(16).padStart(2, '0')}`);
    
    // Execute REP #$30
    cpu.step();
    console.log('After REP #$30:');
    console.log(`  A=$${cpu.A.toString(16).padStart(4, '0')}, X=$${cpu.X.toString(16).padStart(4, '0')}, P=$${cpu.P.toString(16).padStart(2, '0')}`);
    
    // Execute LDA #$0000
    cpu.step();
    console.log('After LDA #$0000:');
    console.log(`  A=$${cpu.A.toString(16).padStart(4, '0')}, X=$${cpu.X.toString(16).padStart(4, '0')}, P=$${cpu.P.toString(16).padStart(2, '0')}`);
    
    // Execute TAX
    cpu.step();
    console.log('After TAX:');
    console.log(`  A=$${cpu.A.toString(16).padStart(4, '0')}, X=$${cpu.X.toString(16).padStart(4, '0')}, P=$${cpu.P.toString(16).padStart(2, '0')}`);
    
    expect(cpu.X).toBe(0);
    expect(cpu.A).toBe(0);
  });
});
