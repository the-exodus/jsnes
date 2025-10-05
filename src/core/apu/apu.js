/**
 * APU (Audio Processing Unit) for SNES
 * Emulates the SPC700 CPU and DSP
 */
export class APU {
  constructor(memory) {
    this.memory = memory;
    
    // SPC700 registers
    this.A = 0;      // Accumulator
    this.X = 0;      // X register
    this.Y = 0;      // Y register
    this.SP = 0xFF;  // Stack pointer
    this.PC = 0;     // Program counter
    this.PSW = 0;    // Program status word
    
    // DSP registers
    this.dspRegisters = new Uint8Array(128);
    
    // Audio output
    this.sampleRate = 32000;
    this.buffer = [];
    
    // Timing
    this.cycles = 0;
    
    this.reset();
  }

  reset() {
    // IPL HLE: SPC700 boot initialization
    // The IPL ROM sets up the SPC700 with initial values
    
    this.A = 0;          // Accumulator cleared
    this.X = 0;          // X register cleared  
    this.Y = 0;          // Y register cleared
    this.SP = 0xEF;      // Stack pointer set to $EF (as per IPL boot code)
    this.PC = 0xFFC0;    // Reset vector in APU RAM (IPL boot program location)
    this.PSW = 0;        // Processor status word cleared
    
    // DSP registers initialized
    this.dspRegisters.fill(0);
    
    // Set DSP to safe state (as IPL boot code does)
    // FLG register ($6C): Reset DSP, mute, disable echo
    this.dspRegisters[0x6C] = 0xE0;
    // KON register ($4C): All voices off
    this.dspRegisters[0x4C] = 0x00;
    // KOF register ($5C): All voices off  
    this.dspRegisters[0x5C] = 0x00;
    
    this.buffer = [];
    this.cycles = 0;
    
    // Don't clear APU RAM here - it's initialized in Memory.setupIPLHLE()
    // which includes the boot ROM at $FFC0-$FFFF
    // Only clear the working area (leave boot ROM intact)
    for (let i = 0; i < 0xFFC0; i++) {
      this.memory.apuRam[i] = 0;
    }
    
    // Initialize communication ports with IPL ready signals
    // IPL boot code writes $AA to port 0 and $BB to port 1
    this.memory.apuRam[0xF4] = 0xAA; // Port 0
    this.memory.apuRam[0xF5] = 0xBB; // Port 1
    this.memory.apuRam[0xF6] = 0x00; // Port 2
    this.memory.apuRam[0xF7] = 0x00; // Port 3
  }

  /**
   * Execute APU for a number of cycles
   */
  step(cpuCycles) {
    // APU runs at approximately 1.024 MHz (vs CPU at ~3.58 MHz)
    const apuCycles = Math.floor(cpuCycles * 0.286);
    
    for (let i = 0; i < apuCycles; i++) {
      this.executeInstruction();
    }
    
    // Generate audio samples
    this.generateSamples(apuCycles);
  }

  /**
   * Execute one SPC700 instruction
   */
  executeInstruction() {
    // Simplified SPC700 emulation
    // Full implementation would have all 256 opcodes
    // eslint-disable-next-line no-unused-vars
    const opcode = this.readAPURAM(this.PC);
    this.PC = (this.PC + 1) & 0xFFFF;
    
    // NOP for now - actual implementation needs full opcode table
    this.cycles += 2;
  }

  /**
   * Generate audio samples
   */
  generateSamples(cycles) {
    // Simplified DSP emulation
    // Actual implementation would process 8 voices
    const samplesNeeded = Math.floor((cycles * this.sampleRate) / 1024000);
    
    for (let i = 0; i < samplesNeeded; i++) {
      // Generate silence for now
      this.buffer.push(0, 0); // Left and right channels
    }
  }

  /**
   * Read from APU RAM
   */
  readAPURAM(address) {
    return this.memory.apuRam[address & 0xFFFF];
  }

  /**
   * Write to APU RAM
   */
  writeAPURAM(address, value) {
    this.memory.apuRam[address & 0xFFFF] = value & 0xFF;
  }

  /**
   * Write to DSP register
   */
  writeDSP(register, value) {
    if (register < 128) {
      this.dspRegisters[register] = value;
    }
  }

  /**
   * Read from DSP register
   */
  readDSP(register) {
    if (register < 128) {
      return this.dspRegisters[register];
    }
    return 0;
  }

  /**
   * Get audio buffer
   */
  getAudioBuffer() {
    const buffer = this.buffer;
    this.buffer = [];
    return buffer;
  }

  /**
   * Write to communication port (from CPU)
   */
  writePort(port, value) {
    // Ports 0-3 are used for CPU-APU communication
    if (port >= 0 && port < 4) {
      this.writeAPURAM(0xF4 + port, value);
    }
  }

  /**
   * Read from communication port (from CPU)
   */
  readPort(port) {
    if (port >= 0 && port < 4) {
      return this.readAPURAM(0xF4 + port);
    }
    return 0;
  }
}
