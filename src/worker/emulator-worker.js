import { Emulator } from '../core/emulator.js';

/**
 * Web Worker for running emulator in background
 */
let emulator = null;
let running = false;
let frameInterval = null;

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
  case 'init':
    emulator = new Emulator();
    self.postMessage({ type: 'ready' });
    break;
    
  case 'loadROM':
    if (emulator) {
      emulator.loadROM(data);
      self.postMessage({ type: 'romLoaded' });
    }
    break;
    
  case 'start':
    if (emulator && !running) {
      running = true;
      runEmulation();
    }
    break;
    
  case 'stop':
    running = false;
    if (frameInterval) {
      clearInterval(frameInterval);
      frameInterval = null;
    }
    break;
    
  case 'reset':
    if (emulator) {
      emulator.reset();
    }
    break;
    
  case 'setButton':
    if (emulator) {
      emulator.setJoypadButton(data.player, data.button, data.pressed);
    }
    break;
    
  case 'saveState':
    if (emulator) {
      const state = emulator.saveState();
      self.postMessage({ type: 'stateSaved', data: state });
    }
    break;
    
  case 'loadState':
    if (emulator) {
      emulator.loadState(data);
      self.postMessage({ type: 'stateLoaded' });
    }
    break;
    
  case 'getSaveData':
    if (emulator) {
      const saveData = emulator.getSaveData();
      self.postMessage({ type: 'saveData', data: saveData });
    }
    break;
    
  case 'loadSaveData':
    if (emulator) {
      emulator.loadSaveData(data);
      self.postMessage({ type: 'saveDataLoaded' });
    }
    break;
  }
};

/**
 * Main emulation loop
 */
function runEmulation() {
  if (!running || !emulator) return;
  
  try {
    // Run one frame
    const framebuffer = emulator.runFrame();
    const audioSamples = emulator.getAudioSamples();
    
    // Send frame data back to main thread
    self.postMessage({
      type: 'frame',
      data: {
        framebuffer: framebuffer.buffer,
        audioSamples: audioSamples
      }
    }, [framebuffer.buffer]);
    
  } catch (error) {
    console.error('Emulation error:', error);
    running = false;
    self.postMessage({ type: 'error', data: error.message });
    return;
  }
  
  // Schedule next frame
  setTimeout(runEmulation, 1000 / 60);
}
