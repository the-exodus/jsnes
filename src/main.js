import { Renderer } from './ui/renderer.js';
import { AudioPlayer } from './ui/audio.js';
import { InputManager } from './ui/input.js';

/**
 * Main Application
 */
class App {
  constructor() {
    this.worker = null;
    this.renderer = null;
    this.audio = null;
    this.input = null;
    this.running = false;
    
    this.stats = {
      fps: 0,
      frameCount: 0,
      lastTime: performance.now()
    };
    
    this.init();
  }

  /**
   * Initialize application
   */
  async init() {
    console.log('Initializing SNES Emulator...');
    
    // Setup UI elements
    this.setupUI();
    
    // Create renderer
    const canvas = document.getElementById('screen');
    this.renderer = new Renderer(canvas);
    this.renderer.clear();
    this.renderer.showMessage('Load a ROM to start');
    
    // Create audio player
    this.audio = new AudioPlayer();
    
    // Create input manager
    this.input = new InputManager((player, button, pressed) => {
      if (this.worker) {
        this.worker.postMessage({
          type: 'setButton',
          data: { player, button, pressed }
        });
      }
    });
    
    // Create worker
    this.createWorker();
    
    // Setup file input
    this.setupFileInput();
    
    console.log('Emulator initialized');
  }

  /**
   * Create Web Worker
   */
  createWorker() {
    this.worker = new Worker(
      new URL('./worker/emulator-worker.js', import.meta.url),
      { type: 'module' }
    );
    
    this.worker.onmessage = (e) => this.handleWorkerMessage(e);
    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
      this.showError('Emulator error: ' + error.message);
    };
    
    // Initialize worker
    this.worker.postMessage({ type: 'init' });
  }

  /**
   * Handle messages from worker
   */
  handleWorkerMessage(e) {
    const { type, data } = e.data;
    
    switch (type) {
    case 'ready':
      console.log('Worker ready');
      break;
      
    case 'romLoaded':
      console.log('ROM loaded');
      this.renderer.clear();
      this.hideOverlay();
      this.enableButton('startBtn');
      this.enableButton('resetBtn');
      break;
      
    case 'frame': {
      // Render frame
      const framebuffer = new Uint32Array(data.framebuffer);
      this.renderer.renderFrame(framebuffer);
      
      // Play audio
      if (data.audioSamples && data.audioSamples.length > 0) {
        this.audio.playSamples(data.audioSamples);
      }
      
      // Update stats
      this.updateStats();
      break;
    }
      
    case 'error':
      this.showError(data);
      this.stop();
      break;
      
    case 'stateSaved':
      this.downloadState(data);
      break;
      
    case 'saveData':
      this.downloadSaveData(data);
      break;
    }
  }

  /**
   * Setup UI elements
   */
  setupUI() {
    // Start button
    document.getElementById('startBtn').addEventListener('click', () => {
      if (this.running) {
        this.stop();
      } else {
        this.start();
      }
    });
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
      this.reset();
    });
    
    // Save state button
    document.getElementById('saveStateBtn').addEventListener('click', () => {
      this.saveState();
    });
    
    // Save SRAM button
    document.getElementById('saveSRAMBtn').addEventListener('click', () => {
      this.saveSRAM();
    });
  }

  /**
   * Setup file input for ROM loading
   */
  setupFileInput() {
    const romInput = document.getElementById('romInput');
    const loadBtn = document.getElementById('loadBtn');
    
    loadBtn.addEventListener('click', () => {
      romInput.click();
    });
    
    romInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadROM(file);
      }
    });
    
    // Drag and drop
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        this.loadROM(file);
      }
    });
  }

  /**
   * Load ROM file
   */
  async loadROM(file) {
    try {
      console.log('Loading ROM:', file.name);
      this.showMessage('Loading ROM...');
      
      const arrayBuffer = await file.arrayBuffer();
      const romData = new Uint8Array(arrayBuffer);
      
      this.worker.postMessage({
        type: 'loadROM',
        data: romData
      });
      
    } catch (error) {
      console.error('Error loading ROM:', error);
      this.showError('Failed to load ROM: ' + error.message);
    }
  }

  /**
   * Start emulation
   */
  start() {
    if (this.running) return;
    
    console.log('Starting emulation');
    this.running = true;
    this.worker.postMessage({ type: 'start' });
    
    const startBtn = document.getElementById('startBtn');
    startBtn.textContent = 'Stop';
    startBtn.classList.add('active');
  }

  /**
   * Stop emulation
   */
  stop() {
    if (!this.running) return;
    
    console.log('Stopping emulation');
    this.running = false;
    this.worker.postMessage({ type: 'stop' });
    
    const startBtn = document.getElementById('startBtn');
    startBtn.textContent = 'Start';
    startBtn.classList.remove('active');
  }

  /**
   * Reset emulation
   */
  reset() {
    console.log('Resetting emulator');
    this.worker.postMessage({ type: 'reset' });
    this.renderer.clear();
    this.input.reset();
  }

  /**
   * Save state
   */
  saveState() {
    console.log('Saving state');
    this.worker.postMessage({ type: 'saveState' });
  }

  /**
   * Save SRAM
   */
  saveSRAM() {
    console.log('Saving SRAM');
    this.worker.postMessage({ type: 'getSaveData' });
  }

  /**
   * Download state file
   */
  downloadState(state) {
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `save_state_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Download save data
   */
  downloadSaveData(data) {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `save_data_${Date.now()}.srm`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Update FPS stats
   */
  updateStats() {
    this.stats.frameCount++;
    const now = performance.now();
    const elapsed = now - this.stats.lastTime;
    
    if (elapsed >= 1000) {
      this.stats.fps = Math.round((this.stats.frameCount * 1000) / elapsed);
      this.stats.frameCount = 0;
      this.stats.lastTime = now;
      
      document.getElementById('fps').textContent = `FPS: ${this.stats.fps}`;
    }
  }

  /**
   * Show message
   */
  showMessage(message) {
    this.renderer.clear();
    this.renderer.showMessage(message);
  }

  /**
   * Show error
   */
  showError(message) {
    console.error(message);
    this.showOverlay();
    this.showMessage('Error: ' + message);
  }

  /**
   * Enable button
   */
  enableButton(id) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = false;
    }
  }

  /**
   * Hide loading overlay
   */
  hideOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  /**
   * Show loading overlay
   */
  showOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.style.display = 'block';
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
