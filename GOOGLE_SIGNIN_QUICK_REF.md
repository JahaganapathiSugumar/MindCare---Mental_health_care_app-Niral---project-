# Google Sign-In Quick Reference

## 🚀 Quick Start (5 minutes)

### 1. Get Client ID
```bash
# From Google Cloud Console
# Type: Web, redirect URI: https://YOUR_EXPO_PROJECT.exp.direct
# Copy the Client ID
```

### 2. Create .env
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID
```

### 3. Enable Firebase
Firebase Console → Authentication → Google → Toggle ON

### 4. Test
```bash
npm start
# Tap "Continue with Google" on SignIn/SignUp screens
```

---

## 📝 Using Google Sign-In in Your Code

### In a Screen Component:

```javascript
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { signInWithGoogle } from '../services/authService';

export default function MyScreen() {
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Initialize Google OAuth
  const [, , googlePromptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });
  
  WebBrowser.maybeCompleteAuthSession();
  
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle(googlePromptAsync);
      if (result.success) {
        console.log('Logged in:', result.user.email);
        // Navigation happens automatically
      } else {
        Alert.alert('Error', result.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };
  
  return (
    <GoogleSignInButton 
      onPress={handleGoogleSignIn}
      loading={googleLoading}
    />
  );
}
```

---

## 🔑 API Reference

### signInWithGoogle(promptAsync)

```javascript
const result = await signInWithGoogle(promptAsync);

// Success
if (result.success) {
  result.user = {
    uid: string,
    email: string,
    displayName: string,
    photoURL: string,
    isNewUser: boolean
  }
}

// Error
if (!result.success) {
  result.error = 'cancelled' | 'network_error' | 'invalid_credential' | ...
  result.message = 'User-friendly error message'
}
```

### signOutUser()

```javascript
const result = await signOutUser();
if (result.success) {
  // User signed out
}
```

### getCurrentUser()

```javascript
const user = await getCurrentUser();
if (user) {
  console.log(user.email);
}
```

---

## 🎨 GoogleSignInButton Props

```javascript
<GoogleSignInButton
  onPress={() => handleGoogleSignIn()}  // Required
  loading={isLoading}                     // Optional, default: false
  disabled={isSigningIn}                  // Optional, default: false
  style={{ marginTop: 10 }}               // Optional, custom styles
/>
```

---

## 🔍 Console Logs

During development, check these logs:

```javascript
// Google auth initialization
[GoogleAuth] Google Auth initialized successfully

// Sign-in start
[GoogleSignIn] Starting Google authentication...

// Got token
[GoogleSignIn] Got ID token from Google

// Firebase sign-in
[GoogleSignIn] Signing in to Firebase...
[GoogleSignIn] Firebase sign-in successful

// Firestore storage
[GoogleSignIn] Creating new user document
[GoogleSignIn] User data saved to Firestore

// Errors
[GoogleSignIn] Error: ...
```

---

## ⚠️ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Google Auth not initialized" | Add `.env` with `EXPO_PUBLIC_GOOGLE_CLIENT_ID` |
| "Invalid client ID" | Verify Client ID is correct and matches OAuth app |
| "User cancelled" | This is normal, no error shown |
| "Network error" | Check internet connection |
| No user in Firestore | Verify Firebase Google provider is enabled |
| Button doesn't respond | Check `googlePromptAsync` is not null |
| Dark mode looks off | Button automatically adapts (isDark prop) |

---

## 📱 Testing Checklist

```
☐ Button appears on SignIn screen
☐ Button appears on SignUp screen
☐ Tapping button opens Google OAuth
☐ Can select Google account
☐ User created in Firebase Authentication
☐ User profile saved in Firestore
☐ Navigates to Home after success
☐ Error messages display correctly
☐ Loading state shows spinner
☐ Button disabled during auth
☐ Works in dark mode
☐ All language translations work
☐ Works on Android
☐ Works on iOS
☐ Console logs are clean
```

---

## 🔐 Security Checklist

```
☐ No credentials in .env.example
☐ EXPO_PUBLIC_* only for safe values
☐ Firebase rules restrict user access
☐ Email verification enabled (optional)
☐ No console.log of sensitive data
☐ HTTPS enforced for OAuth
☐ Token expiry handled by Firebase
```

---

## 📊 Firestore Structure

```
users/{uid}
├─ uid: string
├─ email: string
├─ fullName: string
├─ photoURL: string
├─ authProvider: "google"
├─ createdAt: timestamp
├─ updatedAt: timestamp
├─ lastSignInAt: timestamp
├─ notificationsEnabled: boolean
└─ preferredLanguage: string
```

---

## 🌐 Environment Variables

Required:
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` - From Google Cloud Console

Optional (for production builds):
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` - For iOS builds
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` - For Android builds

---

## 📦 Dependencies

```json
{
  "expo-auth-session": "~7.0.11",
  "expo-web-browser": "~15.0.11",
  "firebase": "^10.14.1",
  "react-native": "0.81.5"
}
```

All already in `package.json`. No additional install needed.

---

## 🎯 Success Criteria

✅ User can sign in with Google  
✅ User can sign up with Google  
✅ Profile saved in Firestore  
✅ Navigation works automatically  
✅ Errors handled gracefully  
✅ Works offline (with cached auth)  
✅ Multi-language support works  
✅ Dark mode supported  
✅ No console errors  
✅ Ready for production  

---

## 💡 Pro Tips

1. **Test on real device**: Emulator may have connectivity issues
2. **Use Chrome DevTools**: For web testing with debug logs
3. **Check Firebase Emulator**: For local Firebase testing
4. **Monitor network tab**: See OAuth redirects
5. **Use Redux DevTools**: To inspect auth state
6. **Log user data**: `console.log(firebase.auth().currentUser)`
7. **Cache user photo**: Use `Image.prefetch()` for Google photos

---

## 📞 Quick Support

**Setup Help**: See `GOOGLE_SIGNIN_SETUP.md`  
**Implementation Details**: See `GOOGLE_SIGNIN_IMPLEMENTATION.md`  
**Code Issues**: Check console.logs with `[GoogleSignIn]` prefix  
**Firebase Issues**: Check Firebase Console logs  

---

## 🚦 Traffic Light Status

🟢 **Working**
- User can sign in/up
- Data stored in Firestore
- Error messages display

🟡 **Needs Attention**
- Check .env configuration
- Verify Firebase provider enabled
- Review console logs

🔴 **Not Working**
- Check all setup steps in `GOOGLE_SIGNIN_SETUP.md`
- Verify Google Cloud Console credentials
- Enable Firebase Google provider
- Restart app after .env changes

---

**Last Updated**: 2026-05-03  
**Version**: 1.0.0  
**Status**: Production Ready
