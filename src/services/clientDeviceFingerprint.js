/**
 * Client-side Device Fingerprinting Service
 * Collects browser and device information for fraud detection
 */

/**
 * Collect comprehensive device fingerprint
 * @returns {Promise<Object>} Device fingerprint data
 */
export const collectFingerprint = async () => {
  const fingerprint = {};

  try {
    // Basic browser info
    fingerprint.userAgent = navigator.userAgent;
    fingerprint.language = navigator.language || navigator.userLanguage;
    fingerprint.languages = navigator.languages ? navigator.languages.join(',') : '';
    fingerprint.platform = navigator.platform;
    fingerprint.cookieEnabled = navigator.cookieEnabled;
    fingerprint.doNotTrack = navigator.doNotTrack;

    // Screen information
    fingerprint.screen = {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight
    };

    // Timezone
    fingerprint.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fingerprint.timezoneOffset = new Date().getTimezoneOffset();

    // Hardware info
    fingerprint.hardwareConcurrency = navigator.hardwareConcurrency;
    fingerprint.maxTouchPoints = navigator.maxTouchPoints;
    fingerprint.deviceMemory = navigator.deviceMemory;

    // Plugins
    fingerprint.plugins = getPlugins();

    // Fonts
    fingerprint.fonts = await getFonts();

    // Canvas fingerprint
    fingerprint.canvas = getCanvasFingerprint();

    // WebGL fingerprint
    fingerprint.webgl = getWebGLFingerprint();

    // Audio fingerprint
    fingerprint.audio = await getAudioFingerprint();

    // Network info
    fingerprint.connection = getConnectionInfo();

    // Local storage info
    fingerprint.storage = getStorageInfo();

    // Battery info (if available)
    fingerprint.battery = await getBatteryInfo();

    // Geolocation (if permission granted)
    fingerprint.geolocation = await getGeolocation();

    // Automation detection
    fingerprint.automation = detectAutomation();

  } catch (error) {
    console.warn('Error collecting fingerprint:', error);
  }

  return fingerprint;
};

/**
 * Get installed plugins
 * @returns {Array} List of plugin names
 */
const getPlugins = () => {
  if (!navigator.plugins) return [];
  
  const plugins = [];
  for (let i = 0; i < navigator.plugins.length; i++) {
    plugins.push(navigator.plugins[i].name);
  }
  return plugins;
};

/**
 * Detect available fonts
 * @returns {Promise<Array>} List of available fonts
 */
const getFonts = async () => {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
    'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Impact', 'Tahoma', 'Geneva'
  ];

  const availableFonts = [];
  
  for (const font of testFonts) {
    if (await isFontAvailable(font, baseFonts)) {
      availableFonts.push(font);
    }
  }

  return availableFonts;
};

/**
 * Check if a specific font is available
 * @param {string} font Font name to test
 * @param {Array} baseFonts Base fonts to compare against
 * @returns {Promise<boolean>} True if font is available
 */
const isFontAvailable = (font, baseFonts) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';

    context.textBaseline = 'top';
    context.font = `${testSize} ${baseFonts[0]}`;
    const baselineSize = context.measureText(testString).width;

    context.font = `${testSize} ${font}, ${baseFonts[0]}`;
    const testSize1 = context.measureText(testString).width;

    context.font = `${testSize} ${font}, ${baseFonts[1]}`;
    const testSize2 = context.measureText(testString).width;

    resolve(testSize1 !== baselineSize || testSize2 !== baselineSize);
  });
};

/**
 * Generate canvas fingerprint
 * @returns {string} Canvas fingerprint hash
 */
const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Draw various shapes and text
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device Fingerprint Canvas 🛡️', 2, 2);
    
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillRect(100, 5, 80, 30);
    
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.fillRect(120, 15, 80, 30);

    // Create circular gradient
    const gradient = ctx.createRadialGradient(150, 50, 0, 150, 50, 50);
    gradient.addColorStop(0, '#FF0000');
    gradient.addColorStop(1, '#0000FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(100, 40, 100, 40);

    return canvas.toDataURL();
  } catch (error) {
    return 'canvas-blocked';
  }
};

/**
 * Generate WebGL fingerprint
 * @returns {Object} WebGL fingerprint data
 */
const getWebGLFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'webgl-not-supported';

    const result = {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      extensions: gl.getSupportedExtensions(),
      maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
    };

    return JSON.stringify(result);
  } catch (error) {
    return 'webgl-blocked';
  }
};

/**
 * Generate audio fingerprint
 * @returns {Promise<string>} Audio fingerprint
 */
const getAudioFingerprint = async () => {
  return new Promise((resolve) => {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      oscillator.type = 'triangle';
      oscillator.frequency.value = 1000;
      gainNode.gain.value = 0;

      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      scriptProcessor.onaudioprocess = function(event) {
        const buffer = event.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += Math.abs(buffer[i]);
        }
        
        context.close();
        resolve(sum.toString());
      };

      oscillator.start(0);
      oscillator.stop(context.currentTime + 0.1);
    } catch (error) {
      resolve('audio-blocked');
    }
  });
};

/**
 * Get connection information
 * @returns {Object} Connection info
 */
const getConnectionInfo = () => {
  if (!navigator.connection && !navigator.mozConnection && !navigator.webkitConnection) {
    return { supported: false };
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  return {
    supported: true,
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData
  };
};

/**
 * Get storage information
 * @returns {Object} Storage capabilities
 */
const getStorageInfo = () => {
  const storage = {
    localStorage: false,
    sessionStorage: false,
    indexedDB: false,
    webSQL: false
  };

  try {
    storage.localStorage = !!window.localStorage;
  } catch (e) {}

  try {
    storage.sessionStorage = !!window.sessionStorage;
  } catch (e) {}

  try {
    storage.indexedDB = !!window.indexedDB;
  } catch (e) {}

  try {
    storage.webSQL = !!window.openDatabase;
  } catch (e) {}

  return storage;
};

/**
 * Get battery information (if available)
 * @returns {Promise<Object>} Battery info
 */
const getBatteryInfo = async () => {
  try {
    if (navigator.getBattery) {
      const battery = await navigator.getBattery();
      return {
        charging: battery.charging,
        level: battery.level,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    }
    return { supported: false };
  } catch (error) {
    return { error: 'blocked' };
  }
};

/**
 * Get approximate geolocation (if permission granted)
 * @returns {Promise<Object>} Location info
 */
const getGeolocation = async () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ supported: false });
      return;
    }

    const timeout = setTimeout(() => {
      resolve({ timeout: true });
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        resolve({
          latitude: Math.round(position.coords.latitude * 100) / 100, // Rounded for privacy
          longitude: Math.round(position.coords.longitude * 100) / 100,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        clearTimeout(timeout);
        resolve({ error: error.message });
      },
      { timeout: 2000 }
    );
  });
};

/**
 * Detect automation tools
 * @returns {Object} Automation detection results
 */
const detectAutomation = () => {
  const indicators = {
    webdriver: !!window.navigator.webdriver,
    phantom: !!window.phantom || !!window._phantom,
    selenium: !!window.__selenium_unwrapped || !!window.__webdriver_unwrapped,
    nightmare: !!window.__nightmare,
    headlessChrome: /HeadlessChrome/.test(navigator.userAgent),
    chromeExtensions: !!window.chrome && !!window.chrome.runtime,
    automationFrameworks: [
      'webdriver', 'selenium', 'phantom', 'nightmare', 'puppeteer'
    ].some(framework => navigator.userAgent.toLowerCase().includes(framework))
  };

  const detected = Object.values(indicators).some(indicator => indicator === true);

  return {
    detected,
    indicators,
    confidence: detected ? 'high' : 'low'
  };
};

/**
 * Generate a simple hash from fingerprint
 * @param {Object} fingerprint Full fingerprint object
 * @returns {string} Fingerprint hash
 */
const hashFingerprint = (fingerprint) => {
  const str = JSON.stringify(fingerprint);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
};

/**
 * Main function to collect and send fingerprint
 * @returns {Promise<Object>} Complete fingerprint with hash
 */
export const collect = async () => {
  const fingerprint = await collectFingerprint();
  const automation = detectAutomation();
  
  const result = {
    ...fingerprint,
    automation,
    hash: hashFingerprint(fingerprint),
    timestamp: Date.now()
  };

  return result;
};

// Default export with all methods
const ClientDeviceFingerprint = {
  collect,
  collectFingerprint,
  getPlugins,
  getFonts,
  getCanvasFingerprint,
  getWebGLFingerprint,
  getAudioFingerprint,
  getConnectionInfo,
  getStorageInfo,
  getBatteryInfo,
  getGeolocation,
  detectAutomation,
  hashFingerprint
};

export default ClientDeviceFingerprint;
