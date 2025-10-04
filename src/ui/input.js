import { JoypadButton } from '../core/emulator.js';

/**
 * Input manager for keyboard controls
 */
export class InputManager {
  constructor(onButtonChange) {
    this.onButtonChange = onButtonChange;
    this.keyMap = this.createDefaultKeyMap();
    this.pressedKeys = new Set();
    
    this.setupEventListeners();
  }

  /**
   * Create default keyboard mapping
   */
  createDefaultKeyMap() {
    return {
      // D-Pad
      'ArrowUp': { player: 0, button: JoypadButton.UP },
      'ArrowDown': { player: 0, button: JoypadButton.DOWN },
      'ArrowLeft': { player: 0, button: JoypadButton.LEFT },
      'ArrowRight': { player: 0, button: JoypadButton.RIGHT },
      
      // Face buttons
      'KeyZ': { player: 0, button: JoypadButton.B },      // B
      'KeyX': { player: 0, button: JoypadButton.A },      // A
      'KeyA': { player: 0, button: JoypadButton.Y },      // Y
      'KeyS': { player: 0, button: JoypadButton.X },      // X
      
      // Shoulder buttons
      'KeyQ': { player: 0, button: JoypadButton.L },      // L
      'KeyW': { player: 0, button: JoypadButton.R },      // R
      
      // Start/Select
      'Enter': { player: 0, button: JoypadButton.START },
      'ShiftRight': { player: 0, button: JoypadButton.SELECT },
      'ShiftLeft': { player: 0, button: JoypadButton.SELECT }
    };
  }

  /**
   * Setup keyboard event listeners
   */
  setupEventListeners() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  /**
   * Handle key down
   */
  handleKeyDown(event) {
    const mapping = this.keyMap[event.code];
    if (mapping && !this.pressedKeys.has(event.code)) {
      event.preventDefault();
      this.pressedKeys.add(event.code);
      this.onButtonChange(mapping.player, mapping.button, true);
    }
  }

  /**
   * Handle key up
   */
  handleKeyUp(event) {
    const mapping = this.keyMap[event.code];
    if (mapping && this.pressedKeys.has(event.code)) {
      event.preventDefault();
      this.pressedKeys.delete(event.code);
      this.onButtonChange(mapping.player, mapping.button, false);
    }
  }

  /**
   * Update key mapping
   */
  setKeyMapping(key, player, button) {
    this.keyMap[key] = { player, button };
  }

  /**
   * Clear all pressed keys
   */
  reset() {
    for (const key of this.pressedKeys) {
      const mapping = this.keyMap[key];
      if (mapping) {
        this.onButtonChange(mapping.player, mapping.button, false);
      }
    }
    this.pressedKeys.clear();
  }
}
