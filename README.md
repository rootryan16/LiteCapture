# LiteCapture - Lightweight Screen Recorder

A highly optimized screen recording application designed specifically for low-end PCs (2-4GB RAM, older CPUs). LiteCapture allows users to create high-quality screen recordings with minimal system resource usage.

## Features

- **Ultra-optimized for low-end hardware**: Special presets for very old computers
- **Multiple resolution options**: 360p, 480p, 720p, 1080p with automatic detection
- **Adjustable frame rate**: 10fps to 60fps with low-end optimized presets
- **Flexible capture modes**: Full screen, application window, or browser tab
- **Audio options**: System audio and/or microphone with volume control
- **Multiple video formats**: WebM (smaller size) and MP4 (more compatible)
- **Codec selection**: VP8 (compatibility), VP9 (efficiency), H.264 (if available)
- **Dark/light theme**: Reduce eye strain with dark mode
- **Recent recordings list**: Easily access your previous recordings
- **Automatic optimization**: Detects device capabilities and applies appropriate settings
- **File size estimation**: See estimated file size while recording
- **Custom save location**: Choose where to save your recordings

## System Requirements

- **Minimum**: 
  - Windows 7/8/10/11 (32-bit or 64-bit)
  - 2GB RAM
  - Dual-core CPU
  - 50MB free disk space

- **Recommended**:
  - Windows 10/11 (64-bit)
  - 4GB RAM
  - Quad-core CPU
  - 100MB free disk space

## Usage Instructions

1. **Select recording settings**:
   - Choose a preset based on your PC's capabilities
   - Or customize individual settings (resolution, frame rate, etc.)

2. **Select capture mode**:
   - Full Screen: Captures your entire display
   - Application Window: Captures a specific window
   - Browser Tab: Captures a specific browser tab

3. **Configure audio**:
   - Enable/disable system audio
   - Enable/disable microphone
   - Adjust microphone volume if needed

4. **Start recording**:
   - Click the "Record" button
   - Select what you want to capture when prompted
   - Recording will begin immediately

5. **During recording**:
   - Use Pause/Resume if needed
   - Monitor recording time and file size
   - Click Stop when finished

6. **Access recordings**:
   - Recordings are saved to your chosen location
   - Recent recordings appear in the list at the bottom
   - Click on a recording to open it

## Building from Source

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/litecapture.git
   cd litecapture
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the application:
   ```
   npm start
   ```

### Building Executable

To build the application as an executable:

#### Windows:
```
npm run build:win
```

#### macOS:
```
npm run build:mac
```

#### Linux:
```
npm run build:linux
```

The built application will be available in the `dist` folder.

## Optimization Tips for Very Low-End PCs

1. Use the "Ultra Light" preset for the best performance
2. Disable preview during recording to save resources
3. Close other applications while recording
4. Record at 360p or 480p resolution
5. Use 10-15fps for smoother recording on very old PCs
6. Use WebM format with VP8 codec for best compatibility
7. If experiencing crashes, try running with `--disable-gpu` flag

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Electron.js for the cross-platform desktop framework
- MediaRecorder API for the core recording functionality
- All contributors who helped optimize this application for low-end devices
