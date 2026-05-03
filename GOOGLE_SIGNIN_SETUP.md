# Google Sign-In Implementation Guide

## Overview
This guide explains how to set up and configure Google Sign-In authentication for the MindCare mobile app using Expo and Firebase.

## Features Implemented

✅ **Seamless OAuth Flow**: Users can sign in/up with Google using Expo's auth-session  
✅ **Firebase Integration**: Automatic Firebase authentication with Google credentials  
✅ **User Data Storage**: User profiles stored in Firestore with Google profile info  
✅ **Professional UI**: Modern Google Sign-In button with loading states  
✅ **Error Handling**: Graceful error messages for network/auth failures  
✅ **Multi-language Support**: UI strings translated to EN, HI, ML, TA  
✅ **Security**: No credentials stored locally; Firebase handles token management  

---

## Setup Steps

### Step 1: Get Google OAuth Credentials

#### For Web/Testing:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `https://YOUR_EXPO_PROJECT_ID.exp.direct` (for Expo Go)
     - `https://auth.expo.io/@YOUR_USERNAME/YOUR_APP_SLUG`

#### For Android:
1. Get your app's package name and SHA-1 certificate fingerprint
2. In Google Cloud Console, create new OAuth 2.0 Client ID:
   - Type: Android
   - Enter package name: `com.mentalcare.app`
   - Paste SHA-1 fingerprint
3. Download config file (if needed)

#### For iOS:
1. In Google Cloud Console, create new OAuth 2.0 Client ID:
   - Type: iOS
   - Enter bundle ID: `com.mentalcare.app`
   - Get your iOS Client ID

### Step 2: Get Expo Client ID

1. Go to [Expo Dashboard](https://expo.dev/accounts/@YOUR_USERNAME)
2. Select your project
3. Go to Settings → App Signing Credentials
4. Under "EAS Credentials", find your Expo Client ID
5. This is your `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

### Step 3: Configure Environment Variables

Create or update `.env` file in project root:

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_EXPO_CLIENT_ID_HERE
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID_HERE
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID_HERE
```

**Important**: 
- Only `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is required for local development
- iOS and Android client IDs are required for building for those platforms
- Env vars starting with `EXPO_PUBLIC_` are embedded in the app at build time

### Step 4: Update app.json (Optional)

Add Google OAuth redirect scheme to app.json if needed:

```json
{
  "expo": {
    "scheme": "mentalcare",
    "plugins": [
      ["expo-auth-session", { "authorizationUrl": "..." }]
    ]
  }
}
```

### Step 5: Enable Google Sign-In in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mentalhealthapp-86f1e`
3. Go to Authentication → Sign-in method
4. Enable "Google" provider:
   - Click on Google
   - Toggle ON
   - Select project support email
   - Save

### Step 6: Test the Implementation

```bash
# Install dependencies (if needed)
npm install expo-auth-session expo-web-browser

# Start Expo
npm start

# Test on Android
npm run android

# Test on iOS
npm run ios
```

---

## File Structure

```
services/
  └─ authService.js          # Google OAuth and Firebase auth logic
  
components/
  └─ GoogleSignInButton.js   # Reusable Google Sign-In button UI
  
screens/
  ├─ SignInScreen.js         # Updated with Google Sign-In
  └─ SignUpScreen.js         # Updated with Google Sign-In
  
locales/
  ├─ en.json                 # English translations
  ├─ hi.json                 # Hindi translations
  ├─ ml.json                 # Malayalam translations
  └─ ta.json                 # Tamil translations
```

---

## Component Usage

### GoogleSignInButton

Professional button component for Google Sign-In.

```javascript
import GoogleSignInButton from '../components/GoogleSignInButton';

<GoogleSignInButton
  onPress={handleGoogleSignIn}
  loading={googleLoading}
  disabled={isSigningIn}
/>
```

**Props:**
- `onPress` (function) - Callback when button is pressed
- `loading` (boolean) - Show loading spinner
- `disabled` (boolean) - Disable button
- `style` (object) - Additional styles

### authService.js Functions

#### `signInWithGoogle(promptAsync)`
Handles Google OAuth and Firebase authentication.

```javascript
import { signInWithGoogle } from '../services/authService';

const result = await signInWithGoogle(promptAsync);

if (result.success) {
  // User authenticated
  const { user } = result;
  console.log(user.uid, user.email, user.displayName);
} else {
  // Handle error
  console.error(result.error, result.message);
}
```

**Returns:**
```javascript
{
  success: true/false,
  user: {
    uid: string,
    email: string,
    displayName: string,
    photoURL: string,
    isNewUser: boolean
  },
  error: string,     // Only if success: false
  message: string    // User-friendly error message
}
```

#### `signOutUser()`
Sign out current user.

```javascript
import { signOutUser } from '../services/authService';

const result = await signOutUser();
if (result.success) {
  navigation.navigate('SignIn');
}
```

#### `getCurrentUser()`
Get currently authenticated user.

```javascript
import { getCurrentUser } from '../services/authService';

const user = await getCurrentUser();
if (user) {
  console.log(user.email);
}
```

---

## Error Handling

The implementation handles various error scenarios:

| Error | Message | Cause |
|-------|---------|-------|
| `cancelled` | "Sign-in cancelled" | User cancelled OAuth dialog |
| `network_error` | "Network error..." | No internet connection |
| `invalid_credential` | "Invalid credentials..." | Invalid OAuth token |
| `account_exists` | "Email already linked..." | Same email with different provider |
| `not_allowed` | "Google Sign-In not enabled..." | Not configured in Firebase |
| `unknown_error` | "Something went wrong..." | Other errors |

---

## Firebase Firestore Data Structure

When a user signs in with Google, their profile is stored in Firestore:

```
/users/{uid}
├─ uid: string              # Firebase UID
├─ email: string            # Email from Google account
├─ fullName: string         # Display name from Google
├─ photoURL: string         # Profile photo from Google
├─ authProvider: "google"   # Authentication provider
├─ createdAt: timestamp     # Account creation time
├─ updatedAt: timestamp     # Last updated
├─ lastSignInAt: timestamp  # Last login time
├─ notificationsEnabled: boolean
└─ preferredLanguage: string
```

---

## Security Considerations

✅ **No Credentials Stored**: Firebase SDK handles token management internally  
✅ **HTTPS Only**: All OAuth redirects use secure HTTPS  
✅ **Token Security**: ID tokens validated by Firebase servers  
✅ **Session Security**: Credentials stored in AsyncStorage with encryption  
✅ **Provider Validation**: Only Google provider allowed for OAuth flow  

---

## Troubleshooting

### Issue: "Google Sign-In is not configured"
**Solution**: 
- Check `.env` file has `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- Verify Google+ API is enabled in Google Cloud Console
- Restart Expo: `npm start`

### Issue: "Invalid client ID"
**Solution**:
- Verify Client ID is copied correctly
- Check Project ID matches between Google Cloud and Expo
- Ensure correct Client ID type (Web for Expo, Android for APK, iOS for IPA)

### Issue: Authentication fails silently
**Solution**:
- Check Firebase Google Sign-In is enabled
- Verify Firestore has appropriate permissions
- Check browser console for specific errors
- Enable Firebase emulator for debugging

### Issue: "This email is already linked"
**Solution**:
- User has existing account with different provider
- Sign in with original provider (email/password)
- Account linking feature can be added if needed

---

## Testing Checklist

- [ ] Environment variables configured
- [ ] Google OAuth credentials created
- [ ] Firebase Google provider enabled
- [ ] Sign-In button appears on login screen
- [ ] Google OAuth popup opens on button press
- [ ] User can select Google account
- [ ] User profile saved in Firestore
- [ ] Navigation to home screen after auth
- [ ] Error messages display correctly
- [ ] Loading states work as expected
- [ ] Works on both Android and iOS
- [ ] Translations display correctly

---

## Advanced: Custom Configuration

### Using Different Google Project

1. Create new OAuth credentials in different Google Cloud project
2. Update `EXPO_PUBLIC_GOOGLE_CLIENT_ID` in `.env`
3. Enable Google Sign-In in new Firebase project
4. Update Firebase credentials in `firebase.js`

### Adding Facebook/Apple Sign-In

The implementation uses Expo's auth-session which supports multiple providers:

```javascript
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as Apple from 'expo-auth-session/providers/apple';

// Similar implementation for other providers
```

---

## References

- [Expo Auth Session Documentation](https://docs.expo.dev/guides/authentication/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Firebase Google Authentication](https://firebase.google.com/docs/auth/web/google-signin)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

---

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review browser/device console for errors
3. Verify all configuration steps completed
4. Test with Expo Go first before building
