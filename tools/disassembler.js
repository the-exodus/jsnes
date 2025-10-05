#!/usr/bin/env node

/**
 * SNES 65C816 Disassembler
 * Simple tool to disassemble SNES ROM code for debugging
 */

import { readFileSync } from 'fs';
import { Memory } from '../src/core/memory/memory.js';

function disassemble(romFile, startAddr, length) {
  try {
    const romData = readFileSync(romFile);
    const memory = new Memory();
    memory.loadROM(romData);
    
    console.log(`\nDisassembling: ${romFile}`);
    console.log(`Address: $${startAddr.toString(16)} - $${(startAddr + length).toString(16)}\n`);
    
    for (let i = 0; i < length; i += 16) {
      const addr = startAddr + i;
      process.stdout.write(`$${addr.toString(16).padStart(6, '0')}: `);
      
      for (let j = 0; j < 16 && (i + j) < length; j++) {
        const byte = memory.read(addr + j);
        process.stdout.write(`${byte.toString(16).padStart(2, '0')} `);
      }
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (process.argv.length < 5) {
  console.log('Usage: node tools/disassembler.js <rom> <addr> <length>');
  console.log('Example: node tools/disassembler.js snes-test-roms/test-game2.sfc 0x8000 256');
  process.exit(1);
}

disassemble(process.argv[2], parseInt(process.argv[3]), parseInt(process.argv[4]));
