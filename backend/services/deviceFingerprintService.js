const crypto = require('crypto');

class DeviceFingerprintService {
  /**
   * Generate a device fingerprint hash from browser data
   * @param {Object} fingerprint - Device fingerprint data from client
   * @returns {string} - Unique device hash
   */
  static generateDeviceHash(fingerprint) {
    const {
      screen,
      userAgent,
      language,
      timezone,
      plugins,
      fonts,
      canvas,
      webgl,
      audio
    } = fingerprint;

    // Create a string from all fingerprint components
    const fingerprintString = [
      `screen:${screen?.width}x${screen?.height}x${screen?.colorDepth}`,
      `ua:${userAgent}`,
      `lang:${language}`,
      `tz:${timezone}`,
      `plugins:${plugins?.join(',')}`,
      `fonts:${fonts?.join(',')}`,
      `canvas:${canvas}`,
      `webgl:${webgl}`,
      `audio:${audio}`
    ].filter(Boolean).join('|');

    // Generate SHA-256 hash
    return crypto
      .createHash('sha256')
      .update(fingerprintString)
      .digest('hex')
      .substring(0, 16); // First 16 chars for readability
  }

  /**
   * Extract network information from request
   * @param {Object} req - Express request object
   * @returns {Object} - Network information
   */
  static extractNetworkInfo(req) {
    return {
      // Primary IP detection with proxy support
      ipAddress: req.ip || 
                req.connection.remoteAddress || 
                req.socket.remoteAddress ||
                (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.headers['x-real-ip'] ||
                req.headers['x-client-ip'] ||
                'unknown',
      
      // Forward chain for proxy detection
      forwardedFor: req.headers['x-forwarded-for'],
      realIp: req.headers['x-real-ip'],
      clientIp: req.headers['x-client-ip'],
      
      // ISP and location info (from Cloudflare or similar)
      country: req.headers['cf-ipcountry'] || req.headers['x-country-code'],
      region: req.headers['cf-ipregion'] || req.headers['x-region-code'],
      city: req.headers['cf-ipcity'] || req.headers['x-city'],
      isp: req.headers['cf-connecting-ip-asn'],
      
      // Connection type detection
      connection: req.headers['connection'],
      acceptEncoding: req.headers['accept-encoding'],
      acceptLanguage: req.headers['accept-language'],
      
      // Proxy/VPN detection indicators
      isProxy: this.detectProxy(req),
      isTor: this.detectTor(req),
      isVPN: this.detectVPN(req)
    };
  }

  /**
   * Detect potential proxy usage
   * @param {Object} req - Express request object
   * @returns {boolean} - True if proxy detected
   */
  static detectProxy(req) {
    const proxyHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'x-forwarded',
      'x-cluster-client-ip',
      'via',
      'forwarded'
    ];

    return proxyHeaders.some(header => req.headers[header]);
  }

  /**
   * Detect Tor browser usage
   * @param {Object} req - Express request object
   * @returns {boolean} - True if Tor detected
   */
  static detectTor(req) {
    const userAgent = req.get('User-Agent') || '';
    
    // Common Tor browser signatures
    const torSignatures = [
      'tor browser',
      'torbrowser',
      'mozilla/5.0 (windows nt 10.0; rv:',  // Tor's typical UA pattern
    ];

    return torSignatures.some(signature => 
      userAgent.toLowerCase().includes(signature.toLowerCase())
    ) || req.headers['x-tor'] === '1';
  }

  /**
   * Detect VPN usage (basic checks)
   * @param {Object} req - Express request object
   * @returns {boolean} - True if VPN likely detected
   */
  static detectVPN(req) {
    const ip = req.ip || req.connection.remoteAddress;
    
    // Basic VPN detection (you can enhance with IP databases)
    const commonVpnPorts = ['1194', '1723', '500', '4500'];
    const vpnHeaders = ['x-vpn', 'x-proxy'];
    
    return vpnHeaders.some(header => req.headers[header]) ||
           (req.headers['via'] && req.headers['via'].includes('vpn'));
  }

  /**
   * Analyze device fingerprint for fraud indicators
   * @param {Object} deviceInfo - Complete device information
   * @param {Object} networkInfo - Network information
   * @returns {Array} - Array of fraud flags
   */
  static analyzeFraudIndicators(deviceInfo, networkInfo) {
    const flags = [];

    // Check for headless browser indicators
    if (this.isHeadlessBrowser(deviceInfo)) {
      flags.push({
        type: 'headless_browser',
        description: 'Automated/headless browser detected',
        severity: 'high'
      });
    }

    // Check for proxy/VPN usage
    if (networkInfo.isProxy || networkInfo.isVPN) {
      flags.push({
        type: 'proxy_vpn',
        description: 'Proxy or VPN usage detected',
        severity: 'medium'
      });
    }

    // Check for Tor usage
    if (networkInfo.isTor) {
      flags.push({
        type: 'tor_browser',
        description: 'Tor browser usage detected',
        severity: 'high'
      });
    }

    // Check for suspicious screen resolution (common bot resolutions)
    const suspiciousResolutions = ['1024x768', '800x600', '1366x768'];
    const screenRes = `${deviceInfo.screen?.width}x${deviceInfo.screen?.height}`;
    if (suspiciousResolutions.includes(screenRes)) {
      flags.push({
        type: 'suspicious_screen',
        description: `Common bot screen resolution: ${screenRes}`,
        severity: 'low'
      });
    }

    // Check for missing plugins (headless browsers often lack plugins)
    if (!deviceInfo.plugins || deviceInfo.plugins.length === 0) {
      flags.push({
        type: 'no_plugins',
        description: 'No browser plugins detected',
        severity: 'medium'
      });
    }

    return flags;
  }

  /**
   * Detect headless browser indicators
   * @param {Object} deviceInfo - Device information
   * @returns {boolean} - True if headless browser detected
   */
  static isHeadlessBrowser(deviceInfo) {
    const indicators = [
      // No plugins
      !deviceInfo.plugins || deviceInfo.plugins.length === 0,
      
      // Suspicious canvas fingerprint
      deviceInfo.canvas === 'canvas-blocked' || !deviceInfo.canvas,
      
      // Missing WebGL
      !deviceInfo.webgl || deviceInfo.webgl === 'webgl-blocked',
      
      // Headless-specific user agents
      deviceInfo.userAgent?.includes('HeadlessChrome') ||
      deviceInfo.userAgent?.includes('PhantomJS') ||
      deviceInfo.userAgent?.includes('SlimerJS')
    ];

    // If 2 or more indicators are true, likely headless
    return indicators.filter(Boolean).length >= 2;
  }

  /**
   * Check for device fingerprint reuse across multiple accounts
   * @param {string} deviceHash - Device fingerprint hash
   * @param {string} currentUserId - Current user ID
   * @returns {Promise<Object>} - Analysis results
   */
  static async checkDeviceReuse(deviceHash, currentUserId) {
    const Order = require('../models/Order');
    
    // Find orders with same device hash from different users
    const ordersWithSameDevice = await Order.find({
      'securityInfo.deviceFingerprint': deviceHash,
      uid: { $ne: currentUserId }
    })
    .select('uid securityInfo.ipAddress orderedAt')
    .limit(50)
    .sort({ orderedAt: -1 });

    const uniqueUsers = new Set(ordersWithSameDevice.map(order => order.uid));
    const uniqueIPs = new Set(ordersWithSameDevice.map(order => order.securityInfo?.ipAddress).filter(Boolean));

    return {
      deviceReused: ordersWithSameDevice.length > 0,
      userCount: uniqueUsers.size,
      ipCount: uniqueIPs.size,
      recentOrders: ordersWithSameDevice.slice(0, 10),
      riskLevel: this.calculateDeviceRiskLevel(uniqueUsers.size, uniqueIPs.size, ordersWithSameDevice.length)
    };
  }

  /**
   * Calculate risk level based on device sharing patterns
   * @param {number} userCount - Number of different users
   * @param {number} ipCount - Number of different IPs
   * @param {number} orderCount - Total orders from device
   * @returns {string} - Risk level
   */
  static calculateDeviceRiskLevel(userCount, ipCount, orderCount) {
    if (userCount > 10 || orderCount > 100) return 'critical';
    if (userCount > 5 || orderCount > 50) return 'high';
    if (userCount > 2 || orderCount > 20) return 'medium';
    return 'low';
  }

  /**
   * Generate comprehensive security report
   * @param {Object} req - Express request object
   * @param {Object} deviceFingerprint - Client-side fingerprint
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Complete security analysis
   */
  static async generateSecurityReport(req, deviceFingerprint, userId) {
    const networkInfo = this.extractNetworkInfo(req);
    const deviceHash = this.generateDeviceHash(deviceFingerprint);
    const fraudIndicators = this.analyzeFraudIndicators(deviceFingerprint, networkInfo);
    const deviceReuseAnalysis = await this.checkDeviceReuse(deviceHash, userId);

    // Calculate overall risk score
    let riskScore = 0;
    fraudIndicators.forEach(flag => {
      switch (flag.severity) {
        case 'low': riskScore += 10; break;
        case 'medium': riskScore += 25; break;
        case 'high': riskScore += 50; break;
        case 'critical': riskScore += 100; break;
      }
    });

    // Add device reuse risk
    switch (deviceReuseAnalysis.riskLevel) {
      case 'low': riskScore += 5; break;
      case 'medium': riskScore += 20; break;
      case 'high': riskScore += 40; break;
      case 'critical': riskScore += 80; break;
    }

    const securityInfo = {
      ...networkInfo,
      deviceFingerprint: deviceHash,
      deviceInfo: deviceFingerprint,
      sessionId: crypto.randomUUID(),
      timestamp: new Date()
    };

    return {
      securityInfo,
      fraudIndicators,
      deviceReuseAnalysis,
      riskScore,
      riskLevel: riskScore < 20 ? 'low' : 
                 riskScore < 50 ? 'medium' :
                 riskScore < 80 ? 'high' : 'critical',
      requiresReview: riskScore >= 50
    };
  }
}

module.exports = DeviceFingerprintService;
