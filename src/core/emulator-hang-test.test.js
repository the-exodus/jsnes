import { describe, it, expect, beforeEach } from 'vitest';
import { Emulator, JoypadButton } from './emulator.js';

describe('Emulator', () => {
  let emulator;

  beforeEach(() => {
    console.log('Creating emulator...');
    emulator = new Emulator();
    console.log('Emulator created!');
  });

  describe('Initialization', () => {
    it('should initialize all components', () => {
      console.log('Running test...');
      expect(emulator.cpu).toBeDefined();
      expect(emulator.ppu).toBeDefined();
      expect(emulator.apu).toBeDefined();
      expect(emulator.memory).toBeDefined();
      console.log('Test passed!');
    });
  });
});
