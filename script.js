console.log('Script loaded');
// DOM Elements
const elements = {
  // Settings elements
  captureSelect: document.getElementById('captureSelect'),
  resolutionSelect: document.getElementById('resolutionSelect'),
  fpsSelect: document.getElementById('fpsSelect'),
  bitrateSelect: document.getElementById('bitrateSelect'),
  codecSelect: document.getElementById('codecSelect'),
  optimizationSelect: document.getElementById('optimizationSelect'),
  formatSelect: document.getElementById('formatSelect'),
  audioSystem: document.getElementById('audioSystem'),
  audioMic: document.getElementById('audioMic'),
  micVolume: document.getElementById('micVolume'),
  micVolumeValue: document.getElementById('micVolumeValue'),
  micVolumeContainer: document.getElementById('micVolumeContainer'),
  previewToggle: document.getElementById('previewToggle'),
  savePathLabel: document.getElementById('savePathLabel'),
  browseBtn: document.getElementById('browseBtn'),
  
  // Control elements
  startBtn: document.getElementById('startBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  stopBtn: document.getElementById('stopBtn'),
  previewVideo: document.getElementById('previewVideo'),
  status: document.getElementById('status'),
  timer: document.getElementById('timer'),
  fileSize: document.getElementById('file-size'),
  themeToggle: document.getElementById('themeToggle'),
  
  // Preset buttons
  ultraLightPreset: document.getElementById('ultraLightPreset'),
  lightPreset: document.getElementById('lightPreset'),
  balancedPreset: document.getElementById('balancedPreset'),
  qualityPreset: document.getElementById('qualityPreset'),
  gameModePreset: document.getElementById('gameModePreset'), // New Game Mode button
  
  // Recordings list
  recordingsList: document.getElementById('recordingsList')
};

// State variables
let mediaRecorder = null;
let recordedChunks = [];
let directoryHandle = null;
let recordingStream = null;
let recordingStartTime = 0;
let recordingDuration = 0;
let timerInterval = null;
let estimatedSize = 0;
let recordingPaused = false;
let deviceCapabilities = {
  isLowEndDevice: false,
  isVeryLowEndDevice: false,
  supportsH264: false,
  supportsVP9: false,
  supportsVP8: true,
  maxResolution: '1920x1080'
};

// Constants for optimization
const TIME_SLICE = 1000; // 1 second chunks for better memory usage
const LOW_MEMORY_THRESHOLD = 4; // GB
const LOW_CPU_CORES_THRESHOLD = 4;
const STORAGE_KEY = 'liteCaptureRecordings';

// ===== Initialization =====

// ===== Initialization =====

document.addEventListener('DOMContentLoaded', () => {
  // Log missing elements for debugging
  let missing = false;
  Object.entries(elements).forEach(([key, el]) => {
    if (!el) {
      console.error(`Element not found: ${key}`);
      updateStatus(`Error: Element not found in DOM: ${key}`);
      missing = true;
    } else {
      console.log(`Element found: ${key}`);
    }
  });
  if (missing) {
    updateStatus('App initialization halted due to missing elements. Check your HTML IDs.');
    return;
  }
  // Detect device capabilities on load
  detectDeviceCapabilities();
  // Add Game Mode preset event listener
  if (elements.gameModePreset) {
    elements.gameModePreset.addEventListener('click', () => {
      applyPreset('gameMode');
    });
  }
  // Initialize the app
  initializeApp();
});

// Global JS error handler for debugging
window.onerror = function(message, source, lineno, colno, error) {
  updateStatus(`JS Error: ${message} at ${source}:${lineno}:${colno}`);
  return false;
};

// ===== Core Functions =====

// Initialize the application
function initializeApp() {
  // Set up event listeners
  setupEventListeners();
  
  // Load saved recordings
  loadSavedRecordings();
  
  // Initialize theme
  initializeTheme();
  
  // Set default save path
  elements.savePathLabel.textContent = 'Default Downloads';
  
  // Update volume display
  elements.micVolumeValue.textContent = `${elements.micVolume.value}%`;
  
  // Apply device-specific optimizations
  applyDeviceOptimizations();
  
  // Show status message
  updateStatus('Ready to record. Select your settings and click Record.');
  
  // Hide Browse Save Path button if Directory Picker API isn’t supported
  if (!('showDirectoryPicker' in window)) {
    elements.browseBtn.style.display = 'none';
    elements.savePathLabel.textContent = 'Browser default Downloads';
  }
}

// Detect device capabilities
async function detectDeviceCapabilities() {
  try {
    // Check available memory
    if (navigator.deviceMemory) {
      deviceCapabilities.isLowEndDevice = navigator.deviceMemory <= LOW_MEMORY_THRESHOLD;
      deviceCapabilities.isVeryLowEndDevice = navigator.deviceMemory <= 2;
    } else {
      // Fallback detection based on user agent and platform
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('mobile') || ua.includes('android')) {
        deviceCapabilities.isLowEndDevice = true;
      }
    }
    
    // Check CPU cores if available
    if (navigator.hardwareConcurrency) {
      if (navigator.hardwareConcurrency <= LOW_CPU_CORES_THRESHOLD) {
        deviceCapabilities.isLowEndDevice = true;
      }
      if (navigator.hardwareConcurrency <= 2) {
        deviceCapabilities.isVeryLowEndDevice = true;
      }
    }
    
    // Check codec support
    deviceCapabilities.supportsVP9 = MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
    deviceCapabilities.supportsH264 = MediaRecorder.isTypeSupported('video/webm;codecs=h264') || 
                                     MediaRecorder.isTypeSupported('video/mp4;codecs=h264');
    
    console.log('Device capabilities:', deviceCapabilities);
    
    // Apply appropriate preset based on device capabilities
    if (deviceCapabilities.isVeryLowEndDevice) {
      applyPreset('ultraLight');
    } else if (deviceCapabilities.isLowEndDevice) {
      applyPreset('light');
    }
  } catch (err) {
    console.error('Error detecting device capabilities:', err);
  }
}

// Set up all event listeners
function setupEventListeners() {
  // Button event listeners
  elements.browseBtn.addEventListener('click', browseSaveLocation);
  elements.startBtn.addEventListener('click', startRecording);
  elements.pauseBtn.addEventListener('click', togglePauseRecording);
  elements.stopBtn.addEventListener('click', stopRecording);
  
  // Settings change listeners
  elements.previewToggle.addEventListener('change', togglePreview);
  elements.micVolume.addEventListener('input', updateMicVolumeDisplay);
  elements.themeToggle.addEventListener('change', toggleTheme);
  
  // Preset buttons
  elements.ultraLightPreset.addEventListener('click', () => applyPreset('ultraLight'));
  elements.lightPreset.addEventListener('click', () => applyPreset('light'));
  elements.balancedPreset.addEventListener('click', () => applyPreset('balanced'));
  elements.qualityPreset.addEventListener('click', () => applyPreset('quality'));
}

// ===== Recording Functions =====

// Start recording
async function startRecording() {
  try {
    // Disable start button and update status
    elements.startBtn.disabled = true;
    updateStatus('Initializing capture...');
    
    // Reset recording state
    recordedChunks = [];
    estimatedSize = 0;
    
    // Get stream based on selected capture mode
    recordingStream = await getCaptureStream();
    if (!recordingStream) {
      throw new Error('Failed to get capture stream');
    }
    
    // Set up preview
    elements.previewVideo.srcObject = recordingStream;
    togglePreview();
    
    // Create MediaRecorder with optimized options
    const options = getRecorderOptions();
    mediaRecorder = new MediaRecorder(recordingStream, options);
    
    // Set up data handling
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = finalizeRecording;
    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      updateStatus(`Recording error: ${event.error.name}`);
      stopRecording();
    };
    
    // Start recording with time slices for better memory usage
    mediaRecorder.start(TIME_SLICE);
    
    // Start timer and update UI
    startRecordingTimer();
    updateControlsForRecording(true);
    updateStatus('Recording...');
  } catch (err) {
    console.error('Error starting recording:', err);
    updateStatus(`Error: ${err.message || err.name}`);
    elements.startBtn.disabled = false;
  }
}

// Toggle pause/resume recording
function togglePauseRecording() {
  if (!mediaRecorder) return;
  
  try {
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      elements.pauseBtn.innerHTML = '<span class="icon">▶</span> Resume';
      updateStatus('Recording paused');
      clearInterval(timerInterval);
      recordingPaused = true;
    } else if (mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      elements.pauseBtn.innerHTML = '<span class="icon">⏸</span> Pause';
      updateStatus('Recording resumed');
      startRecordingTimer();
      recordingPaused = false;
    }
  } catch (err) {
    console.error('Error toggling pause:', err);
    updateStatus(`Error: ${err.message || err.name}`);
  }
}

// Stop recording
function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
  
  try {
    updateStatus('Finalizing recording...');
    mediaRecorder.stop();
    clearInterval(timerInterval);
    
    // Disable controls during finalization
    elements.pauseBtn.disabled = true;
    elements.stopBtn.disabled = true;
  } catch (err) {
    console.error('Error stopping recording:', err);
    updateStatus(`Error: ${err.message || err.name}`);
    resetRecordingState();
  }
}

// Handle incoming data chunks
function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedChunks.push(event.data);
    
    // Update estimated file size
    estimatedSize += event.data.size;
    updateFileSizeDisplay();
  }
}

// Finalize and save the recording
async function finalizeRecording() {
  try {
    // Stop all tracks to release resources
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
    }
    
    // Create appropriate blob based on selected format
    const format = elements.formatSelect.value;
    const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
    const blob = new Blob(recordedChunks, { type: mimeType });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `LiteCapture_${timestamp}.${format}`;
    
    // Save the recording
    await saveRecording(blob, filename);
    
    // Add to recordings list
    addRecordingToList(filename, blob.size, new Date());
    
    // Reset state
    resetRecordingState();
  } catch (err) {
    console.error('Error finalizing recording:', err);
    updateStatus(`Save failed: ${err.message || err.name}`);
    resetRecordingState();
  }
}

// Save the recording to disk
async function saveRecording(blob, filename) {
  try {
    if (directoryHandle) {
      // Save to selected directory using File System Access API
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      updateStatus(`Saved to ${directoryHandle.name}/${filename}`);
    } else {
      // Save using download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      updateStatus('Download started');
    }
    return true;
  } catch (err) {
    console.error('Error saving recording:', err);
    updateStatus(`Save failed: ${err.message || err.name}`);
    return false;
  }
}

// ===== Helper Functions =====

// Get capture stream based on selected mode
async function getCaptureStream() {
  try {
    // Prepare video constraints
    let videoConstraints = getVideoConstraints();
    const captureMode = elements.captureSelect.value;
    const audioSystem = elements.audioSystem.checked;
    const audioMic = elements.audioMic.checked;
    
    if (isElectron() && window.electron && window.electron.getDesktopSources) {
      // Use Electron's desktopCapturer
      const sources = await window.electron.getDesktopSources(['screen', 'window']);
      // Simple: pick the first source matching the mode (can add UI later)
      let source = sources[0];
      if (captureMode === 'window') {
        source = sources.find(s => s.id.startsWith('window:')) || sources[0];
      } else if (captureMode === 'screen') {
        source = sources.find(s => s.id.startsWith('screen:')) || sources[0];
      }
      if (!source) throw new Error('No suitable capture source found');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioSystem, // System audio capture (if supported)
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
            minWidth: videoConstraints.width ? videoConstraints.width.min || videoConstraints.width : 640,
            minHeight: videoConstraints.height ? videoConstraints.height.min || videoConstraints.height : 360,
            maxWidth: videoConstraints.width ? videoConstraints.width.max || videoConstraints.width : 1920,
            maxHeight: videoConstraints.height ? videoConstraints.height.max || videoConstraints.height : 1080,
            frameRate: videoConstraints.frameRate || 24
          }
        }
      });
      // If mic is enabled, mix in mic audio
      if (audioMic) {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const mixedStream = new MediaStream([
          ...stream.getVideoTracks(),
          ...stream.getAudioTracks(),
          ...mic.getAudioTracks()
        ]);
        return mixedStream;
      }
      return stream;
    } else {
      // Browser fallback
      const displayMediaOptions = {
        video: videoConstraints,
        audio: audioSystem || audioMic
      };
      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      // Optionally, mix in mic audio if both are checked
      if (audioSystem && audioMic) {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const mixedStream = new MediaStream([
          ...stream.getVideoTracks(),
          ...stream.getAudioTracks(),
          ...mic.getAudioTracks()
        ]);
        return mixedStream;
      }
      return stream;
    }
  } catch (err) {
    console.error('Error getting capture stream:', err);
    let msg = 'Capture error: ' + (err.message || err.name);
    if (err.name === 'NotAllowedError') {
      msg += ' – Please allow screen recording permission.';
    } else if (err.name === 'NotFoundError') {
      msg += ' – No capture source found.';
    }
    updateStatus(msg);
    return null;
  }
}

// Get video constraints based on settings
function getVideoConstraints() {
  const constraints = {};
  
  // Set resolution if not auto
  if (elements.resolutionSelect.value !== 'auto') {
    const [width, height] = elements.resolutionSelect.value.split('x').map(Number);
    constraints.width = { ideal: width, max: width };
    constraints.height = { ideal: height, max: height };
  }
  
  // Set framerate if available
  if (elements.fpsSelect.value !== 'auto') {
    const fps = parseInt(elements.fpsSelect.value, 10);
    if (elements.optimizationSelect.value === 'gameMode') {
      constraints.frameRate = { ideal: 60, max: 60 };
    } else {
      constraints.frameRate = { ideal: fps, max: fps };
    }
  }
  
  return constraints;
}

// Get optimized recorder options
function getRecorderOptions() {
  const codec = elements.codecSelect.value;
  const format = elements.formatSelect.value;
  const bitrate = parseInt(elements.bitrateSelect.value, 10) || 2000000;
  const optimization = elements.optimizationSelect.value;

  let mimeType = '';
  if (optimization === 'gameMode') {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
      mimeType = 'video/webm;codecs=h264';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    } else {
      mimeType = '';
    }
  } else {
    if (codec === 'h264' && MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
      mimeType = 'video/webm;codecs=h264';
    } else if (codec === 'vp9' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    } else {
      mimeType = '';
    }
  }

  let timeslice = TIME_SLICE;
  let audioBits = 128000;
  if (optimization === 'gameMode') {
    timeslice = 5000; // Larger chunks to reduce overhead
    audioBits = 64000; // Lower audio bitrate to save CPU
  }

  return {
    mimeType,
    videoBitsPerSecond: bitrate,
    audioBitsPerSecond: audioBits,
    timeslice
  };
}

// Browse for save location
async function browseSaveLocation() {
  if ('showDirectoryPicker' in window) {
    try {
      directoryHandle = await window.showDirectoryPicker();
      elements.savePathLabel.textContent = directoryHandle.name;
      updateStatus(`Save location set to: ${directoryHandle.name}`);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Directory selection error:', err);
        updateStatus('Directory selection failed');
      } else {
        updateStatus('Directory selection canceled');
      }
    }
  } else {
    updateStatus('Directory picker not supported in this browser. Files will be downloaded.');
  }
}

// ===== UI and State Management Functions =====

// Update status message
function updateStatus(message) {
  elements.status.textContent = message;
  console.log('Status:', message);
}

// Toggle preview visibility
function togglePreview() {
  if (elements.previewToggle.checked) {
    elements.previewVideo.style.display = 'block';
  } else {
    elements.previewVideo.style.display = 'none';
  }
}

// Update microphone volume display
function updateMicVolumeDisplay() {
  elements.micVolumeValue.textContent = `${elements.micVolume.value}%`;
}

// Update UI controls for recording state
function updateControlsForRecording(isRecording) {
  elements.startBtn.disabled = isRecording;
  elements.pauseBtn.disabled = !isRecording;
  elements.stopBtn.disabled = !isRecording;
  elements.pauseBtn.innerHTML = '<span class="icon">⏸</span> Pause';
  
  // Disable settings during recording
  const settingsElements = [
    elements.captureSelect,
    elements.resolutionSelect,
    elements.fpsSelect,
    elements.bitrateSelect,
    elements.codecSelect,
    elements.formatSelect,
    elements.optimizationSelect,
    elements.browseBtn,
    elements.ultraLightPreset,
    elements.lightPreset,
    elements.balancedPreset,
    elements.qualityPreset,
    elements.gameModePreset
  ];
  
  settingsElements.forEach(element => {
    element.disabled = isRecording;
  });
}

// Reset recording state
function resetRecordingState() {
  // Clear recording data
  recordedChunks = [];
  recordingStream = null;
  mediaRecorder = null;
  recordingStartTime = 0;
  recordingDuration = 0;
  estimatedSize = 0;
  recordingPaused = false;
  
  // Reset UI
  updateControlsForRecording(false);
  elements.timer.textContent = '00:00:00';
  elements.fileSize.textContent = '0 MB';
  clearInterval(timerInterval);
  
  // Reset preview
  elements.previewVideo.srcObject = null;
}

// Start recording timer
function startRecordingTimer() {
  if (!recordingStartTime) {
    recordingStartTime = Date.now() - recordingDuration;
  }
  
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!recordingPaused) {
      recordingDuration = Date.now() - recordingStartTime;
      updateTimerDisplay();
    }
  }, 1000);
  
  updateTimerDisplay();
}

// Update timer display
function updateTimerDisplay() {
  const seconds = Math.floor(recordingDuration / 1000) % 60;
  const minutes = Math.floor(recordingDuration / 60000) % 60;
  const hours = Math.floor(recordingDuration / 3600000);
  
  elements.timer.textContent = [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}

// Update file size display
function updateFileSizeDisplay() {
  const sizeInMB = estimatedSize / (1024 * 1024);
  elements.fileSize.textContent = `${sizeInMB.toFixed(1)} MB`;
}

// Toggle dark/light theme
function toggleTheme() {
  const isDarkMode = elements.themeToggle.checked;
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  localStorage.setItem('liteCaptureTheme', isDarkMode ? 'dark' : 'light');
}

// Initialize theme from saved preference
function initializeTheme() {
  const savedTheme = localStorage.getItem('liteCaptureTheme');
  if (savedTheme === 'dark') {
    elements.themeToggle.checked = true;
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

// ===== Preset Management =====

// Apply device optimizations
function applyDeviceOptimizations() {
  // Apply memory-saving techniques for low-end devices
  if (deviceCapabilities.isLowEndDevice) {
    // Reduce animation and transition durations
    document.documentElement.style.setProperty('--transition-duration', '0.1s');
    
    // Reduce preview quality if very low-end
    if (deviceCapabilities.isVeryLowEndDevice) {
      elements.previewVideo.style.filter = 'blur(0.5px)';
    }
  }
}

// Apply preset settings
function applyPreset(presetName) {
  // Re-enable audio controls for all presets
  elements.audioSystem.disabled = false;
  elements.audioMic.disabled = false;
  elements.micVolumeContainer.style.display = 'block';
  
  // Remove active class from all preset buttons
  elements.ultraLightPreset.classList.remove('preset-active');
  elements.lightPreset.classList.remove('preset-active');
  elements.balancedPreset.classList.remove('preset-active');
  elements.qualityPreset.classList.remove('preset-active');
  elements.gameModePreset.classList.remove('preset-active');
  
  // Apply the selected preset
  switch (presetName) {
    case 'ultraLight':
      // Ultra light preset for very low-end devices
      elements.resolutionSelect.value = '480x360';
      elements.fpsSelect.value = '10';
      elements.bitrateSelect.value = '500000';
      elements.codecSelect.value = 'vp8'; // Most compatible
      elements.optimizationSelect.value = 'ultraLight';
      elements.previewToggle.checked = false;
      elements.ultraLightPreset.classList.add('preset-active');
      updateStatus('Ultra Light preset applied - optimized for very low-end devices');
      break;
      
    case 'light':
      // Light preset for low-end devices
      elements.resolutionSelect.value = '640x480';
      elements.fpsSelect.value = '15';
      elements.bitrateSelect.value = '1000000';
      elements.codecSelect.value = deviceCapabilities.supportsVP9 ? 'vp9' : 'vp8';
      elements.optimizationSelect.value = 'light';
      elements.previewToggle.checked = false;
      elements.lightPreset.classList.add('preset-active');
      updateStatus('Light preset applied - optimized for older PCs');
      break;
      
    case 'balanced':
      // Balanced preset for mid-range devices
      elements.resolutionSelect.value = '1280x720';
      elements.fpsSelect.value = '24';
      elements.bitrateSelect.value = '2500000';
      elements.codecSelect.value = deviceCapabilities.supportsVP9 ? 'vp9' : 'vp8';
      elements.optimizationSelect.value = 'balanced';
      elements.previewToggle.checked = true;
      elements.balancedPreset.classList.add('preset-active');
      updateStatus('Balanced preset applied');
      break;
      
    case 'quality':
      // High quality preset for better devices
      elements.resolutionSelect.value = '1920x1080';
      elements.fpsSelect.value = '30';
      elements.bitrateSelect.value = '5000000';
      elements.codecSelect.value = deviceCapabilities.supportsH264 ? 'h264' : (deviceCapabilities.supportsVP9 ? 'vp9' : 'vp8');
      elements.optimizationSelect.value = 'quality';
      elements.formatSelect.value = deviceCapabilities.supportsH264 ? 'mp4' : 'webm';
      elements.qualityPreset.classList.add('preset-active');
      updateStatus('High Quality preset applied');
      break;
    case 'gameMode':
      // Game Mode preset for gaming/streaming (optimized for smoothness)
      elements.resolutionSelect.value = '960x540';
      elements.fpsSelect.value = '60';
      elements.bitrateSelect.value = '3500000';
      elements.codecSelect.value = deviceCapabilities.supportsVP8 ? 'vp8' : (deviceCapabilities.supportsH264 ? 'h264' : 'vp9');
      elements.optimizationSelect.value = 'gameMode';
      elements.formatSelect.value = 'webm';
      elements.previewToggle.checked = false; // Disable preview for max performance
      // Disable audio for game mode
      elements.audioSystem.checked = false;
      elements.audioMic.checked = false;
      elements.audioSystem.disabled = true;
      elements.audioMic.disabled = true;
      elements.micVolumeContainer.style.display = 'none';
      elements.gameModePreset.classList.add('preset-active');
      updateStatus('Game Mode preset applied - 960x540@60fps, audio off, low-latency, preview off');
      break;
  }
}

// ===== Recordings Management =====

// Load saved recordings from localStorage
function loadSavedRecordings() {
  try {
    const savedRecordings = localStorage.getItem(STORAGE_KEY);
    if (savedRecordings) {
      const recordings = JSON.parse(savedRecordings);
      recordings.forEach(recording => {
        addRecordingToList(recording.filename, recording.size, new Date(recording.date));
      });
    }
  } catch (err) {
    console.error('Error loading saved recordings:', err);
  }
}

// Add recording to the list
function addRecordingToList(filename, size, date) {
  // Create recording item element
  const recordingItem = document.createElement('div');
  recordingItem.className = 'recording-item';
  
  // Format file size
  const sizeInMB = size / (1024 * 1024);
  const formattedSize = sizeInMB.toFixed(1) + ' MB';
  
  // Format date
  const formattedDate = date.toLocaleString();
  
  // Set recording item content
  recordingItem.innerHTML = `
    <div class="recording-item-title">${filename}</div>
    <div class="recording-item-info">${formattedSize} • ${formattedDate}</div>
  `;
  
  // Add to DOM
  elements.recordingsList.prepend(recordingItem);
  
  // Save to localStorage
  saveRecordingToStorage(filename, size, date);
}

// Save recording metadata to localStorage
function saveRecordingToStorage(filename, size, date) {
  try {
    // Get existing recordings
    const savedRecordings = localStorage.getItem(STORAGE_KEY);
    let recordings = savedRecordings ? JSON.parse(savedRecordings) : [];
    
    // Add new recording
    recordings.unshift({
      filename,
      size,
      date: date.toISOString()
    });
    
    // Limit to 10 most recent recordings
    if (recordings.length > 10) {
      recordings = recordings.slice(0, 10);
    }
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings));
  } catch (err) {
    console.error('Error saving recording to storage:', err);
  }
}

// ===== Electron/Desktop App Integration =====

// Check if running in Electron
function isElectron() {
  return typeof window !== 'undefined' && 
         typeof window.process === 'object' && 
         typeof window.process.versions === 'object' && 
         !!window.process.versions.electron;
}

// Initialize Electron-specific features if available
if (isElectron()) {
  console.log('Running in Electron - enabling desktop features');
  // These functions would be implemented in the Electron wrapper
  // when packaging as an executable
}

// Export functions for Electron integration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    startRecording,
    stopRecording,
    applyPreset,
    detectDeviceCapabilities
  };
}
