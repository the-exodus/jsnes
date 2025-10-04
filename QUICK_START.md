# JSNES Quick Start Guide

## 🚀 Get Running in 3 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

The emulator will automatically open in your browser at `http://localhost:3000`

### Step 3: Load a ROM
1. Click the "Load ROM" button
2. Select a SNES ROM file (.smc, .sfc, or .rom)
3. Click "Start" to begin playing!

## 🎮 Controls

| Key | Button |
|-----|--------|
| **Arrow Keys** | D-Pad (Up/Down/Left/Right) |
| **Z** | B Button |
| **X** | A Button |
| **A** | Y Button |
| **S** | X Button |
| **Q** | L Button (Shoulder) |
| **W** | R Button (Shoulder) |
| **Enter** | Start |
| **Shift** | Select |

## 📦 Other Commands

```bash
npm run build         # Build for production
npm run preview       # Preview production build
npm test              # Run tests
npm run test:coverage # Generate coverage report
npm run lint          # Check code style
```

## 🎯 Features

- ✅ Load SNES ROMs (LoROM & HiROM)
- ✅ Full-speed emulation (60 FPS)
- ✅ Audio support
- ✅ Save states (JSON export)
- ✅ Save RAM export (.srm)
- ✅ Drag & drop ROM loading

## 📁 Project Structure

```
jsnes/
├── src/
│   ├── core/        # Emulation core (CPU, PPU, APU, Memory)
│   ├── ui/          # User interface components
│   ├── worker/      # Web Worker for background execution
│   └── main.js      # Application entry point
├── index.html       # Main HTML page
└── style.css        # Application styles
```

## 🐛 Troubleshooting

### ROM Won't Load
- Ensure the file is a valid SNES ROM (.smc, .sfc, or .rom)
- Check browser console for errors
- Try a different ROM file

### No Sound
- Click anywhere on the page to enable audio (browser requirement)
- Check browser audio settings
- Ensure volume is not muted

### Low FPS
- Check CPU usage in task manager
- Try closing other tabs/applications
- Disable browser extensions

### Build Fails
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 📚 Documentation

- **README.md** - Project overview and features
- **DEVELOPMENT.md** - Detailed development guide
- **PROJECT_SUMMARY.md** - Technical documentation
- **CHANGELOG.md** - Version history

## 🧪 Testing

The project has comprehensive unit tests:

```bash
npm test              # Run tests in watch mode
npm run test:ui       # Run tests with UI
npm run test:coverage # Generate coverage report
```

Current test coverage: **119/154 tests passing**

## 🛠️ Development

### Adding New Features
1. Create feature branch
2. Implement feature with tests
3. Run tests: `npm test`
4. Build: `npm run build`
5. Submit pull request

### Code Style
- ES2022 JavaScript
- 2-space indentation
- Single quotes
- Semicolons required

## 🤝 Contributing

Contributions welcome! Please:
1. Follow code style guidelines
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass

## 📄 License

MIT License - See LICENSE file

## 🔗 Resources

- [SNES Dev Manual](https://problemkaputt.de/fullsnes.htm)
- [65C816 Reference](https://wiki.superfamicom.org/65816-reference)
- [GitHub Repository](https://github.com/the-exodus/jsnes)

---

**Happy Emulating! 🎮**

For questions or issues, please open an issue on GitHub.
