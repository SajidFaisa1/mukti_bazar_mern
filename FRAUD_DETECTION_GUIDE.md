# Enhanced Fraud Detection System - IP/MAC/Device Fingerprinting

## Overview
Your marketplace now has a comprehensive fraud detection system that tracks and analyzes device fingerprints, IP addresses, and behavioral patterns to prevent syndicate hoarding and bot attacks.

## How IP/MAC/Device Detection Works

### 1. Device Fingerprinting 🔍
The system collects unique device characteristics:

**Browser Fingerprints:**
- Screen resolution and color depth
- Installed plugins and fonts
- Canvas and WebGL fingerprints
- Audio context fingerprint
- Hardware specs (CPU cores, memory)
- Timezone and language settings

**Network Fingerprints:**
- IP address (with proxy/VPN detection)
- Connection type and speed
- ISP and geolocation data
- Proxy headers analysis

**Behavioral Fingerprints:**
- Mouse movement patterns
- Typing cadence
- Session duration
- Navigation patterns

### 2. IP Address Analysis 🌐

**Multi-layer IP Detection:**
```javascript
// The system captures IP from multiple sources
ipAddress: req.ip || 
          req.connection.remoteAddress || 
          req.headers['x-forwarded-for']?.split(',')[0] ||
          req.headers['x-real-ip'] ||
          req.headers['x-client-ip']
```

**Proxy/VPN Detection:**
- Checks for proxy headers (`X-Forwarded-For`, `Via`, etc.)
- Detects Tor browser signatures
- Identifies VPN usage patterns
- Analyzes connection anomalies

**IP Risk Assessment:**
- Multiple users from same IP
- High order frequency from single IP
- Geographic inconsistencies
- Known proxy/VPN IP ranges

### 3. Device Sharing Detection 📱

**Cross-User Device Analysis:**
```javascript
// Checks if same device is used by multiple accounts
const deviceOrders = await Order.find({
  'securityInfo.deviceFingerprint': deviceHash,
  uid: { $ne: currentUserId }
});
```

**Risk Factors:**
- Same device, different users
- Rapid account switching
- Suspicious timing patterns
- Geographic inconsistencies

### 4. Behavioral Analysis 🧠

**Rapid Ordering Detection:**
- More than 5 orders in 24 hours = High Risk
- More than 10 orders in 24 hours = Critical Risk

**Bulk Hoarding Detection:**
- Order quantity > 100 items = Flagged
- Order quantity > 500 items = Critical

**Value-based Detection:**
- Orders > ৳50,000 = High Value Flag
- Orders > ৳100,000 = Critical Value Flag

## Implementation Details

### Frontend Integration
```javascript
// Device fingerprint is collected during checkout
const deviceFingerprint = await ClientDeviceFingerprint.collect();

// Includes comprehensive device data
{
  userAgent: "Mozilla/5.0...",
  screen: { width: 1920, height: 1080, colorDepth: 24 },
  canvas: "canvas-fingerprint-hash",
  webgl: "webgl-renderer-info",
  plugins: ["Chrome PDF Plugin", ...],
  fonts: ["Arial", "Times New Roman", ...],
  automation: { detected: false, confidence: "low" }
}
```

### Backend Processing
```javascript
// Enhanced fraud detection service
const securityReport = await DeviceFingerprintService.generateSecurityReport(
  req,           // HTTP request with IP/headers
  deviceFingerprint, // Client-side fingerprint
  userId         // Current user ID
);

// Generates comprehensive analysis
{
  securityInfo: { /* Enhanced security data */ },
  fraudIndicators: [ /* Array of detected issues */ ],
  deviceReuseAnalysis: { /* Cross-user device sharing */ },
  riskScore: 85,     // Numerical risk score
  riskLevel: "high", // low/medium/high/critical
  requiresReview: true
}
```

## Fraud Detection Rules

### Automatic Flagging Triggers

1. **Headless Browser Detection**
   - No plugins installed
   - Blocked canvas/WebGL
   - Suspicious user agent
   - **Action:** High risk flag + admin review

2. **Proxy/VPN Usage**
   - Proxy headers detected
   - Tor browser signatures
   - VPN indicators
   - **Action:** Medium risk flag

3. **Device Sharing**
   - Same fingerprint, multiple users
   - Rapid user switching
   - **Action:** High risk flag + verification required

4. **IP Sharing**
   - Multiple users from single IP
   - Excessive order frequency
   - **Action:** IP monitoring + user verification

5. **Automation Detection**
   - Bot signatures in fingerprint
   - Selenium/WebDriver indicators
   - Perfect timing patterns
   - **Action:** Critical flag + immediate block

### Risk Scoring System

```
Low Risk (0-19):     ✅ Auto-approve
Medium Risk (20-49): ⚠️ Enhanced monitoring
High Risk (50-79):   🔍 Manual review required
Critical Risk (80+): 🚨 Block + admin approval
```

## Admin Panel Features

### Real-time Monitoring
- Live fraud detection dashboard
- IP/device sharing analysis
- Risk score distribution
- Hourly fraud patterns

### Detailed Investigation Tools
- Complete device fingerprint view
- Cross-reference IP/device usage
- Historical fraud patterns
- User behavior analytics

### Testing & Validation
```javascript
// Test different fraud scenarios
POST /api/fraud-testing/test-fraud-detection
{
  "testScenario": "headless_browser" | "tor_browser" | "proxy_vpn" | "device_sharing"
}
```

## Security Benefits

### Syndicate Prevention
- **Device Limits:** Detects when single device creates multiple accounts
- **IP Monitoring:** Identifies coordinated attacks from same location  
- **Pattern Recognition:** Spots unusual ordering behaviors
- **Bulk Detection:** Prevents large-scale hoarding attempts

### Bot Protection
- **Automation Detection:** Identifies headless browsers and bots
- **Fingerprint Analysis:** Distinguishes real users from scripts
- **Behavioral Checks:** Validates human-like interactions
- **Rate Limiting:** Prevents rapid automated orders

### Advanced Evasion Detection
- **Proxy Detection:** Identifies attempts to hide real IP
- **VPN Monitoring:** Flags suspicious anonymization
- **Tor Detection:** Identifies privacy browser usage
- **IP Rotation:** Detects coordinated IP switching

## Usage Examples

### Normal User Flow
1. User visits site → Device fingerprint collected
2. Places order → Fraud analysis runs
3. Low risk score → Order approved automatically
4. Fingerprint stored for future reference

### Suspicious Activity Flow
1. Bot/syndicate attempts order
2. Multiple fraud indicators triggered
3. High risk score assigned
4. Order flagged for admin review
5. Admin investigates with full context
6. Decision made with complete fraud analysis

### Cross-Reference Analysis
1. Same device fingerprint across multiple accounts
2. System flags device sharing
3. All orders from device flagged
4. Admin can see complete user network
5. Action taken on entire syndicate

This comprehensive system provides multi-layered protection against sophisticated fraud attempts while maintaining a smooth experience for legitimate users.
