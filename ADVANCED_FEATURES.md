# Advanced Features Guide

This guide covers optional advanced features you can add to the MindCare authentication system.

## 1. Password Reset Feature

A complete password reset flow has been implemented in `ForgotPasswordScreen.js`.

### Integration Steps

#### Step 1: Update SignInScreen.js
Add the "Forgot Password?" link functionality:

```javascript
// In SignInScreen.js forgotPassword button
<TouchableOpacity 
  onPress={() => navigation.navigate('ForgotPassword')}
  style={styles.forgotPasswordContainer}
>
  <Text style={styles.forgotPassword}>Forgot Password?</Text>
</TouchableOpacity>
```

#### Step 2: Update RootNavigator.js
Add the ForgotPassword screen to the navigation stack:

```javascript
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// In the Unauthenticated Stack
<Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
```

#### Step 3: Test Password Reset
1. Sign up with an email you can verify
2. On Sign In screen, click "Forgot Password?"
3. Enter email address
4. Check email for reset link
5. Click link to reset password

### Firebase Setup for Password Reset

Password reset is automatically supported by Firebase Authentication. No additional setup needed!

## 2. Enhanced User Profile

Extend the Firestore user document with additional fields:

```javascript
// Update in SignUpScreen.js when creating user
await setDoc(doc(db, 'users', user.uid), {
  uid: user.uid,
  fullName: fullName.trim(),
  email: email.trim(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  
  // Optional fields
  profilePicture: null,
  bio: '',
  timezone: 'UTC',
  notificationsEnabled: true,
  privacyLevel: 'private', // 'private', 'friends', 'public'
});
```

## 3. Email Verification

Add email verification for new accounts:

```javascript
import { sendEmailVerification } from 'firebase/auth';

// In SignUpScreen after creating user
const handleSignUp = async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    // Send email verification
    await sendEmailVerification(userCredential.user);

    // Store user data...
    
    Alert.alert(
      'Verification Email Sent',
      'Check your email to verify your account'
    );
  } catch (error) {
    // Handle error
  }
};
```

## 4. Social Authentication

### Google Sign-In Implementation

```javascript
// Install: expo install expo-google-app-auth

import * as Google from 'expo-auth-session/providers/google';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

// In your component
const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
});

const handleGoogleSignIn = async () => {
  const result = await promptAsync();
  
  if (result?.type === 'success') {
    const { idToken } = result.params;
    const credential = GoogleAuthProvider.credential(idToken);
    
    try {
      const userCredential = await signInWithCredential(auth, credential);
      // User is now signed in
    } catch (error) {
      console.error(error);
    }
  }
};
```

### Apple Sign-In Implementation

```javascript
// Install: expo install expo-apple-authentication

import * as AppleAuthentication from 'expo-apple-authentication';
import { signInWithCredential, OAuthProvider } from 'firebase/auth';

const handleAppleSignIn = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: credential.identityToken,
    });

    const userCredential = await signInWithCredential(auth, firebaseCredential);
    // User is now signed in
  } catch (error) {
    if (error.code === 'ERR_CANCELLED') {
      // User cancelled sign-in
    }
  }
};
```

## 5. Multi-Factor Authentication (MFA)

Enable MFA for enhanced security:

```javascript
import { multiFactor, PhoneMultiFactorGenerator } from 'firebase/auth';

// Check if user has MFA enabled
const enrollMFA = async () => {
  try {
    const user = auth.currentUser;
    
    // Create phone session
    const phoneSession = await PhoneMultiFactorGenerator.session(
      multiFactor(user)
    );
    
    // Get verification code (implement phone input)
    // Phone verification code...
    
  } catch (error) {
    console.error(error);
  }
};
```

## 6. Account Linking

Allow users to link multiple authentication providers:

```javascript
import { linkWithCredential, GoogleAuthProvider } from 'firebase/auth';

const handleLinkGoogleAccount = async () => {
  try {
    const user = auth.currentUser;
    // Get Google credential
    const credential = GoogleAuthProvider.credential(googleIdToken);
    
    // Link accounts
    await linkWithCredential(user, credential);
    
    Alert.alert('Success', 'Google account linked!');
  } catch (error) {
    if (error.code === 'auth/credential-already-in-use') {
      Alert.alert('Error', 'This Google account is already linked');
    }
  }
};
```

## 7. User Presence System

Track online/offline status:

```javascript
import { onDisconnect, update, serverTimestamp } from 'firebase/database';

// When user signs in
const handleUserOnline = async () => {
  const user = auth.currentUser;
  const userStatusRef = ref();
  
  await update(userStatusRef, {
    lastSeen: serverTimestamp(),
    isOnline: true,
  });
};

// Handle disconnect
onDisconnect(userStatusRef).update({
  isOnline: false,
  lastSeen: serverTimestamp(),
});
```

## 8. Analytics Integration

Track authentication events:

```javascript
import { getAnalytics, logEvent } from 'firebase/analytics';

const analytics = getAnalytics(app);

// Track signup
const handleSignUp = async () => {
  try {
    // ... signup logic
    
    logEvent(analytics, 'sign_up', {
      method: 'email',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logEvent(analytics, 'sign_up_failed', {
      error_code: error.code,
    });
  }
};
```

## 9. Custom User Claims

Add custom metadata to users:

```javascript
// Backend (Node.js Cloud Function)
const admin = require('firebase-admin');

exports.setCustomClaims = functions.https.onCall(async (data, context) => {
  const uid = data.uid;
  
  try {
    await admin.auth().setCustomUserClaims(uid, {
      role: 'user',
      premium: false,
    });
    
    return { message: 'Custom claims set' };
  } catch (error) {
    return { error: error.message };
  }
});

// Frontend - Access custom claims
const handleGetUserRole = async () => {
  const user = auth.currentUser;
  const idTokenResult = await user.getIdTokenResult();
  const role = idTokenResult.claims.role;
};
```

## 10. Rate Limiting & Throttling

Implement rate limiting for authentication:

```javascript
// In validation.js or separate file
let loginAttempts = {};

export const checkRateLimit = (email, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const userAttempts = loginAttempts[email] || [];
  
  // Remove old attempts outside the window
  const recentAttempts = userAttempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return false; // Rate limit exceeded
  }
  
  recentAttempts.push(now);
  loginAttempts[email] = recentAttempts;
  return true;
};

// In SignInScreen
const handleSignIn = async () => {
  if (!checkRateLimit(email)) {
    Alert.alert(
      'Too Many Attempts',
      'Please try again later'
    );
    return;
  }
  
  // ... continue with sign in
};
```

## 11. Biometric Authentication

Add fingerprint/Face ID support:

```javascript
// Install: expo install expo-local-authentication

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const isBiometricAvailable = async () => {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
};

export const saveBiometricCredentials = async (email, password) => {
  await AsyncStorage.setItem('biometric_email', email);
  // Note: Don't store actual password, use token instead
};

export const authenticateWithBiometric = async () => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      reason: 'Authenticate to access your account',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });

    if (result.success) {
      const email = await AsyncStorage.getItem('biometric_email');
      return { success: true, email };
    }
    
    return { success: false };
  } catch (error) {
    return { success: false, error };
  }
};
```

## 12. Offline Authentication

Enable offline access with sessions:

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save user session on login
const saveUserSession = async (user) => {
  const session = {
    uid: user.uid,
    email: user.email,
    token: await user.getIdToken(),
    expiresAt: Date.now() + 3600 * 1000, // 1 hour
  };
  
  await AsyncStorage.setItem('user_session', JSON.stringify(session));
};

// Check offline session validity
const validateOfflineSession = async () => {
  const sessionString = await AsyncStorage.getItem('user_session');
  
  if (!sessionString) return null;
  
  const session = JSON.parse(sessionString);
  
  if (Date.now() > session.expiresAt) {
    // Session expired
    await AsyncStorage.removeItem('user_session');
    return null;
  }
  
  return session;
};
```

## 13. Push Notifications Integration

Add push notifications for authentication events:

```javascript
// Install: expo install expo-notifications

import * as Notifications from 'expo-notifications';

const setupPushNotifications = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    
    if (newStatus !== 'granted') return;
  }
  
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Store token in Firestore
  if (auth.currentUser) {
    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      { pushToken: token },
      { merge: true }
    );
  }
};

// Notify on new sign-in
const notifyNewSignIn = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New Sign In',
      body: 'Your account was accessed from a new device',
      data: { deviceId: 'device_id' },
    },
    trigger: { seconds: 1 },
  });
};
```

## 14. Security Keys (WebAuthn)

For browsers/web apps:

```javascript
// Not yet fully supported in React Native
// Available for web implementation:
// https://firebase.google.com/docs/auth/web/webauthn

// For now, implement in web portal
```

## 15. Account Recovery & Deletion

Implement account recovery and deletion:

```javascript
import { reauthenticateWithCredential, deleteUser, EmailAuthProvider } from 'firebase/auth';

export const deleteUserAccount = async (password) => {
  try {
    const user = auth.currentUser;
    
    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    
    // Delete user data from Firestore
    await deleteDoc(doc(db, 'users', user.uid));
    
    // Delete user from Firebase Auth
    await deleteUser(user);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

## Implementation Priority

**Recommended order for adding features:**

1. ✅ Password Reset (Easy - Already included)
2. 📧 Email Verification (Easy)
3. 🔐 MFA (Medium)
4. 🎯 Social Auth (Medium - Popular)
5. 👆 Biometrics (Medium)
6. 📊 Analytics (Easy)
7. 🔗 Account Linking (Hard)
8. 📱 Push Notifications (Medium)
9. 🪶 Custom Claims (Hard)
10. 🔒 Rate Limiting (Easy)

## Testing Advanced Features

Always test:
- Edge cases (nil values, invalid inputs)
- Network failures
- Token expiration
- Concurrent requests
- Device rotation
- Background/foreground transitions

## Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Expo Docs](https://docs.expo.dev)
- [React Navigation Docs](https://reactnavigation.org)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)

---

Need help implementing any of these features? Refer to the official documentation or reach out to the community!
