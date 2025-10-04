import { CPU } from './src/core/cpu/cpu.js';
import { Memory } from './src/core/memory/memory.js';

const memory = new Memory();
const cpu = new CPU(memory);
const table = cpu.opcodeTable;

const missing = [];
const implemented = [];

for (let i = 0; i < 256; i++) {
  const hex = '0x' + i.toString(16).toUpperCase().padStart(2, '0');
  if (table[i]) {
    implemented.push(hex);
  } else {
    missing.push(hex);
  }
}

console.log('MISSING OPCODES (' + missing.length + ' total):');
console.log(missing.join(', '));
console.log('\nIMPLEMENTED OPCODES (' + implemented.length + ' total):');
console.log(implemented.join(', '));
