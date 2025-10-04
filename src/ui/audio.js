/**
 * Audio player using Web Audio API
 */
export class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.sampleRate = 32000;
    this.bufferSize = 2048;
    this.buffer = [];
    
    this.initAudio();
  }

  /**
   * Initialize Web Audio API
   */
  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate
      });
      
      // Resume context on user interaction (required by browsers)
      document.addEventListener('click', () => {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
      }, { once: true });
      
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  /**
   * Play audio samples
   */
  playSamples(samples) {
    if (!this.audioContext || samples.length === 0) return;
    
    // Add samples to buffer
    this.buffer.push(...samples);
    
    // If we have enough samples, play them
    if (this.buffer.length >= this.bufferSize) {
      this.playBuffer();
    }
  }

  /**
   * Play buffered samples
   */
  playBuffer() {
    if (!this.audioContext || this.buffer.length < 2) return;
    
    // Extract stereo samples
    const numSamples = Math.floor(this.buffer.length / 2);
    const audioBuffer = this.audioContext.createBuffer(2, numSamples, this.sampleRate);
    
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    
    for (let i = 0; i < numSamples; i++) {
      leftChannel[i] = this.buffer[i * 2] / 32768.0;
      rightChannel[i] = this.buffer[i * 2 + 1] / 32768.0;
    }
    
    // Clear buffer
    this.buffer = [];
    
    // Play buffer
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
  }

  /**
   * Set volume
   */
  setVolume(volume) {
    if (this.audioContext) {
      this.audioContext.destination.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Mute/unmute
   */
  setMute(muted) {
    if (this.audioContext) {
      if (muted) {
        this.audioContext.suspend();
      } else {
        this.audioContext.resume();
      }
    }
  }

  /**
   * Clean up
   */
  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
