# Deployment Guide

Complete guide for deploying the MindCare app to iOS, Android, and Web.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [iOS App Store Deployment](#ios-app-store-deployment)
3. [Google Play Store Deployment](#google-play-store-deployment)
4. [Web Deployment](#web-deployment)
5. [Post-Deployment](#post-deployment)

## Pre-Deployment Checklist

Before deploying to any platform:

### Code & Security
- [ ] Remove all TODO comments
- [ ] Update firebase.js with production credentials
- [ ] Update Firestore security rules (not test mode)
- [ ] Remove console.log statements
- [ ] Enable HTTPS only
- [ ] Test on actual devices
- [ ] Implement proper error handling
- [ ] Add crash reporting (Firebase Crashlytics)

### App Configuration
- [ ] Update app version in package.json
- [ ] Update app.json with correct names and URLs
- [ ] Add app icon (1024x1024 PNG)
- [ ] Add splash screen (1242x2436 PNG for iOS)
- [ ] Review terms of service
- [ ] Create privacy policy

### Testing
- [ ] Test all authentication flows
- [ ] Test on slow network (throttle)
- [ ] Test with low storage
- [ ] Test offline scenarios
- [ ] Performance testing
- [ ] Security testing

### Firebase Setup
- [ ] Enable production Firestore rules
- [ ] Set up Cloud Functions if needed
- [ ] Enable monitoring and alerts
- [ ] Verify backup settings
- [ ] Test in staging environment

## iOS App Store Deployment

### Requirements
- Mac with Xcode installed
- Apple Developer Account ($99/year)
- iOS device or simulator
- TestFlight account

### Step 1: Prepare Certificates and Identifiers

1. Go to [Apple Developer Console](https://developer.apple.com)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Create App ID:
   - Bundle ID: `com.mentalcare.app.ios`
   - Capabilities: Email, Password
4. Create Provisioning Profile for App ID
5. Download certificates

### Step 2: Setup Expo for iOS Build

```bash
# Build for iOS
eas build --platform ios

# Follow prompts:
# - Sign in to Expo account
# - Create EAS project
# - Choose device type
# - Accept defaults or customize
```

### Step 3: Configure App Signing

In app.json:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.mentalcare.app",
      "buildNumber": "1",
      "supportsTabletMode": true,
      "infoPlist": {
        "NSCameraUsageDescription": "We need camera access for profile pictures",
        "NSPhotoLibraryUsageDescription": "We need access to your photos"
      }
    }
  }
}
```

### Step 4: Submit to TestFlight

```bash
# Build production iOS
eas build --platform ios --auto-submit

# Or manually submit:
# 1. Connect Apple ID
# 2. Review build details
# 3. Submit to TestFlight
# 4. Invite testers for beta testing
```

### Step 5: App Store Review

1. Complete app information:
   - Description
   - Screenshots (minimum 2 per device)
   - Keywords
   - Support email
   - Privacy policy URL

2. Set age rating:
   - Mental health: 4+, 12+, or 17+?
   - Recommend: 12+ or 17+ for health apps

3. Review content rights
4. Set pricing and availability
5. Submit for review

**Review time:** 1-3 days typically

**Common rejection reasons:**
- Broken authentication
- Incomplete functionality
- Privacy policy missing
- Terms of service missing
- Metadata or screenshot issues

### Step 6: Release to App Store

After approval:
1. Review final details
2. Prepare release notes
3. Select "Release This Version"
4. Monitor analytics

## Google Play Store Deployment

### Requirements
- Google Play Developer Account ($25 one-time)
- Android device or emulator
- Signing certificate

### Step 1: Create Google Play Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Fill in app details:
   - App name: MindCare
   - Default language: English
   - App or game: App
   - Category: Health & Fitness or Medical

### Step 2: Setup Android Build

```bash
# Build for Android
eas build --platform android

# Choose options:
# - Build type: apk (testing) or aab (production)
# - For release: use aab
```

### Step 3: Generate Signing Key

```bash
# First time only - create keystore
eas build --platform android \
  --auto-submit \
  --local \
  --signature-key=new

# Store credentials securely!
```

### Step 4: Configure Android Settings

In app.json:
```json
{
  "expo": {
    "android": {
      "package": "com.mentalcare.app",
      "versionCode": 1,
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ],
      "integrityFile": ""
    }
  }
}
```

### Step 5: Upload Build

1. Go to Google Play Console → Your app
2. Navigate to "Release" → "Production"
3. Create new release
4. Upload signed AAB file
5. Add release notes
6. Review content rating

### Step 6: Content Rating

1. Complete questionnaire
2. Submit for rating
3. Receive age certification

### Step 7: Store Listing

1. Add app icon (512x512)
2. Add screenshots (5-8 minimum)
3. Add feature graphic (1024x500)
4. Write app description
5. Add privacy policy
6. Complete store listing

### Step 8: App Review

1. Submit for review
2. Wait for approval (usually 24 hours)
3. Address any rejections

**Common issues:**
- Permissions not justified
- Privacy policy missing
- Broken authentication
- Insufficient app functionality

### Step 9: Release

After approval:
1. Review final details
2. Click "Manage release"
3. Add release notes
4. Set rollout percentage (start at 5%)
5. Gradually increase to 100%

## Web Deployment

### Option 1: Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

### Option 2: Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Deploy
firebase deploy --only hosting
```

### Option 3: Netlify

1. Connect GitHub repository
2. Configure build settings:
   ```
   Build command: npm run build
   Publish directory: build/
   ```
3. Set environment variables
4. Deploy

### Step 1: Prepare Web Build

```bash
# Build web version
npx expo export:web

# Output goes to: web-build/
```

### Step 2: Configure Domain

1. Purchase domain (Namecheap, GoDaddy, etc.)
2. Point DNS to deployment service
3. Enable SSL/HTTPS
4. Setup redirects

### Step 3: Setup Environment Variables

In `.env.production`:
```bash
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
# ... other variables
```

### Step 4: Configure Deployment

Update package.json:
```json
{
  "scripts": {
    "build": "expo export:web",
    "start": "expo start:web"
  }
}
```

### Step 5: Deploy & Monitor

```bash
# Test locally
npm run start

# Build for production
npm run build

# Deploy to chosen platform
vercel
```

## POST-Deployment

### Monitoring & Analytics

1. **Firebase Console**
   - Set up Analytics events
   - Monitor crashes
   - Check performance

2. **App Store/Play Store Insights**
   - Track user acquisition
   - Monitor retention
   - Check crash reports
   - Review user ratings

3. **Custom Monitoring**
   - Set up error tracking (Sentry)
   - Configure performance monitoring
   - Create dashboards

### Feedback & Updates

1. **Respond to Reviews**
   - Reply to user reviews
   - Address concerns
   - Thank positive reviews

2. **Regular Updates**
   - Fix bugs promptly
   - Add features based on feedback
   - Keep dependencies updated

3. **Release Management**
   ```bash
   # Create release branches
   git checkout -b release/v1.1.0
   
   # Update version
   # npm version minor
   
   # Build and deploy
   # Tag release
   git tag -a v1.1.0
   ```

### Version Management

```
Version Format: MAJOR.MINOR.PATCH

Examples:
- 1.0.0 - Initial release
- 1.0.1 - Bug fix
- 1.1.0 - New feature
- 2.0.0 - Breaking changes

Update in:
- package.json
- app.json (expo.version)
- GitHub releases
- Store listings
```

### Continuous Integration/Deployment

Setup automated deployments:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm test
      - run: eas build --platform all
      - run: eas submit
```

## Troubleshooting Deployment

### iOS Issues

| Issue | Solution |
|-------|----------|
| Cert expired | Renew in Apple Developer Console |
| Build fails | Check Xcode version, clear cache |
| App crashes | Check Firebase config, review crash logs |
| Slow review | Ensure all fields complete, check guidelines |

### Android Issues

| Issue | Solution |
|-------|----------|
| Upload fails | Check AAB format, verify signature |
| App crashes | Check Firebase config, review Play Console logs |
| Permission issues | Update AndroidManifest.xml, test permissions |
| Slow review | Ensure policy compliance, complete questionnaire |

### Web Issues

| Issue | Solution |
|-------|----------|
| Build fails | Clear cache: `npm cache clean --force` |
| Env vars not loaded | Check .env file, restart server |
| Deploy fails | Check CLI version, verify credentials |

## Post-Launch Timeline

**Week 1-2:**
- Monitor crash reports
- Respond to initial reviews
- Check analytics
- Gather feedback

**Month 1:**
- Fix critical bugs
- Optimize performance
- Plan first update
- Engage with users

**Month 2+:**
- Release regular updates
- Add new features
- Maintain quality
- Build community

## Security Checklist - Production

- [ ] Update all dependencies
- [ ] Run security audit: `npm audit`
- [ ] Enable HTTPS only
- [ ] Secure API endpoints
- [ ] Implement rate limiting
- [ ] Enable security headers
- [ ] Setup monitoring
- [ ] Regular backups
- [ ] Privacy policy published
- [ ] GDPR compliant
- [ ] Data encryption enabled
- [ ] Regular security reviews

## Resources

- [Expo Deployment Docs](https://docs.expo.dev/deploy)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines)
- [Google Play Policies](https://play.google.com/about/developer-content-policy)
- [Firebase Docs](https://firebase.google.com/docs)
- [App Store Optimization Guide](https://developer.apple.com/app-store/optimize)

## Support

For deployment help:
- EAS Build Discord: https://chat.expo.dev
- Stack Overflow tag: `expo`, `react-native`
- Firebase Support: https://firebase.google.com/support
- Community Forums

---

Congratulations on deploying your app! 🎉

Monitor performance, gather user feedback, and keep improving!
