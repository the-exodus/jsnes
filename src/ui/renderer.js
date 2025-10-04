/**
 * Renderer for displaying emulator output
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Set canvas size
    this.width = 256;
    this.height = 224;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    // Create image data
    this.imageData = this.ctx.createImageData(this.width, this.height);
    
    // Apply default CSS scaling
    this.setScale(2);
  }

  /**
   * Set display scale
   */
  setScale(scale) {
    this.canvas.style.width = `${this.width * scale}px`;
    this.canvas.style.height = `${this.height * scale}px`;
    this.canvas.style.imageRendering = 'pixelated';
  }

  /**
   * Render frame from Uint32Array framebuffer
   */
  renderFrame(framebuffer) {
    // Convert Uint32Array to Uint8ClampedArray for ImageData
    const buffer = new Uint32Array(framebuffer);
    const data = new Uint8ClampedArray(buffer.buffer);
    
    this.imageData.data.set(data);
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /**
   * Clear screen
   */
  clear() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Display text message
   */
  showMessage(message) {
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(message, this.width / 2, this.height / 2);
  }
}
