import { CPU } from './cpu/cpu.js';
import { PPU } from './ppu/ppu.js';
import { APU } from './apu/apu.js';
import { Memory } from './memory/memory.js';

/**
 * Main SNES Emulator
 * Coordinates CPU, PPU, APU, and memory
 */
export class Emulator {
  constructor() {
    this.memory = new Memory();
    this.cpu = new CPU(this.memory);
    this.ppu = new PPU(this.memory);
    this.apu = new APU(this.memory);
    
    // Timing
    this.masterClock = 0;
    this.running = false;
    
    // Frame timing
    this.fps = 60;
    this.cyclesPerFrame = 357366; // NTSC timing
    
    // Setup memory-mapped I/O
    this.setupIOHandlers();
  }

  /**
   * Setup I/O register handlers
   */
  setupIOHandlers() {
    // PPU registers (0x2100-0x213F)
    for (let addr = 0x2100; addr <= 0x213F; addr++) {
      this.memory.registerIOHandler(
        addr,
        () => this.ppu.readRegister(addr),
        (value) => this.ppu.writeRegister(addr, value)
      );
    }
    
    // APU communication ports (0x2140-0x2143)
    for (let port = 0; port < 4; port++) {
      const addr = 0x2140 + port;
      this.memory.registerIOHandler(
        addr,
        () => this.apu.readPort(port),
        (value) => this.apu.writePort(port, value)
      );
    }
    
    // WRAM access port (0x2180-0x2183)
    let wramAddr = 0;
    this.memory.registerIOHandler(0x2180, 
      () => this.memory.wram[wramAddr++ % this.memory.wram.length],
      (value) => this.memory.wram[wramAddr++ % this.memory.wram.length] = value
    );
    
    // Joypad registers (0x4016-0x4017)
    this.memory.registerIOHandler(0x4016,
      () => this.readJoypad(0),
      () => {} // Write triggers auto-joypad read
    );
    this.memory.registerIOHandler(0x4017,
      () => this.readJoypad(1),
      null
    );
    
    // Joypad state
    this.joypad1 = 0;
    this.joypad2 = 0;
  }

  /**
   * Load ROM
   */
  loadROM(romData) {
    this.memory.loadROM(romData);
    this.reset();
  }

  /**
   * Reset emulator
   */
  reset() {
    this.cpu.reset();
    this.ppu.reset();
    this.apu.reset();
    this.masterClock = 0;
  }

  /**
   * Run one frame
   */
  runFrame() {
    const targetCycles = this.cyclesPerFrame;
    let cycles = 0;
    let iterations = 0;
    const maxIterations = targetCycles * 2; // Safety limit to prevent infinite loops
    
    while (cycles < targetCycles && iterations < maxIterations) {
      iterations++;
      
      // Execute CPU
      const cpuCycles = this.cpu.step();
      cycles += cpuCycles;
      
      // If no cycles were executed, break to prevent infinite loop
      if (cpuCycles === 0) {
        console.warn('CPU returned 0 cycles, breaking frame execution');
        break;
      }
      
      // Execute APU (runs at different speed)
      this.apu.step(cpuCycles);
      
      // Execute PPU (dot-based timing)
      // Simplified: Run PPU per scanline
      const scanlinesNeeded = Math.floor(cycles / 1364); // ~1364 cycles per scanline
      
      for (let i = 0; i < scanlinesNeeded; i++) {
        this.ppu.scanlineStep();
      }
    }
    
    this.masterClock += cycles;
    
    // Trigger NMI at VBlank if enabled
    if (this.ppu.inVBlank) {
      this.cpu.nmiPending = true;
    }
    
    return this.ppu.getFrameBuffer();
  }

  /**
   * Set joypad button state
   */
  setJoypadButton(player, button, pressed) {
    const joypad = player === 0 ? 'joypad1' : 'joypad2';
    
    if (pressed) {
      this[joypad] |= button;
    } else {
      this[joypad] &= ~button;
    }
  }

  /**
   * Read joypad state
   */
  readJoypad(player) {
    return player === 0 ? this.joypad1 & 0xFF : this.joypad2 & 0xFF;
  }

  /**
   * Get audio samples
   */
  getAudioSamples() {
    return this.apu.getAudioBuffer();
  }

  /**
   * Save state
   */
  saveState() {
    return {
      cpu: {
        A: this.cpu.A,
        X: this.cpu.X,
        Y: this.cpu.Y,
        S: this.cpu.S,
        PC: this.cpu.PC,
        P: this.cpu.P,
        PBR: this.cpu.PBR,
        DBR: this.cpu.DBR,
        cycles: this.cpu.cycles
      },
      ppu: {
        scanline: this.ppu.scanline,
        frame: this.ppu.frame,
        registers: { ...this.ppu.registers }
      },
      memory: {
        wram: new Uint8Array(this.memory.wram),
        sram: new Uint8Array(this.memory.sram),
        vram: new Uint8Array(this.memory.vram),
        cgram: new Uint8Array(this.memory.cgram),
        oam: new Uint8Array(this.memory.oam)
      }
    };
  }

  /**
   * Load state
   */
  loadState(state) {
    // Restore CPU
    Object.assign(this.cpu, state.cpu);
    
    // Restore PPU
    this.ppu.scanline = state.ppu.scanline;
    this.ppu.frame = state.ppu.frame;
    Object.assign(this.ppu.registers, state.ppu.registers);
    
    // Restore memory
    this.memory.wram.set(state.memory.wram);
    this.memory.sram.set(state.memory.sram);
    this.memory.vram.set(state.memory.vram);
    this.memory.cgram.set(state.memory.cgram);
    this.memory.oam.set(state.memory.oam);
  }

  /**
   * Get save data
   */
  getSaveData() {
    return this.memory.getSaveData();
  }

  /**
   * Load save data
   */
  loadSaveData(data) {
    this.memory.loadSaveData(data);
  }
}

// Joypad button constants
export const JoypadButton = {
  B: 0x80,
  Y: 0x40,
  SELECT: 0x20,
  START: 0x10,
  UP: 0x08,
  DOWN: 0x04,
  LEFT: 0x02,
  RIGHT: 0x01,
  A: 0x8000,     // High byte
  X: 0x4000,     // High byte
  L: 0x2000,     // High byte
  R: 0x1000      // High byte
};
