# Troubleshooting & Best Practices

Comprehensive guide for common issues and best practices for the MindCare authentication system.

## Common Issues & Solutions

### Authentication Issues

#### 1. Users Can't Sign Up
**Symptoms:**
- Sign up button doesn't work
- No error message displayed
- App crashes

**Solutions:**
```javascript
// Make sure Firebase is properly initialized
// Check firebase.js configuration

// Debug the signup process
const handleSignUp = async () => {
  try {
    console.log('Starting signup...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    console.log('User created:', userCredential.user.uid);
    
    // Store data
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      // ... user data
    });
    console.log('User data stored');
  } catch (error) {
    console.error('Signup error:', error.code, error.message);
    // Show user-friendly error
  }
};
```

**Checklist:**
- [ ] Firebase config is correct
- [ ] Email/password authentication is enabled
- [ ] Firestore is initialized
- [ ] Check browser console for errors
- [ ] Verify email format is valid
- [ ] Password is at least 6 characters

#### 2. Firebase Authentication Not Working
**Error:** `auth/app-not-initialized` or `auth/invalid-api-key`

**Solutions:**
```javascript
// Check firebase.js initialization
import { auth, db } from './firebase';

// Verify auth object exists
console.log(auth); // Should not be undefined

// Check firebase config
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY', // Not empty
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

**Checklist:**
- [ ] All firebase config values are filled
- [ ] Values match Firebase Console exactly
- [ ] No typos in apiKey or projectId
- [ ] Firebase app is initialized before use

#### 3. "SignInScreen is not a function"
**Error:** Navigation or component import error

**Solutions:**
```javascript
// Wrong import
import SignInScreen from '../screens/SigningScreen'; // Typo!

// Correct import
import SignInScreen from '../screens/SignInScreen'; // Check filename

// Verify file exists at: f:\Agentic_mental_care\screens\SignInScreen.js
```

**Checklist:**
- [ ] Check filename spelling (case-sensitive)
- [ ] Verify file path exists
- [ ] Component exports correctly
- [ ] No circular imports

#### 4. AsyncStorage Not Persisting
**Symptom:** User session lost on app restart

**Solutions:**
```javascript
// Make sure AsyncStorage is imported
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check persistence is configured in firebase.js
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Test persistence
const testPersistence = async () => {
  try {
    await AsyncStorage.setItem('test', 'value');
    const value = await AsyncStorage.getItem('test');
    console.log('AsyncStorage works:', value);
  } catch (error) {
    console.error('AsyncStorage error:', error);
  }
};
```

### Firestore Issues

#### 5. "Firestore is not defined"
**Solutions:**
```javascript
// Make sure Firestore is imported in firebase.js
import { getFirestore } from 'firebase/firestore';

export const db = getFirestore(app);

// And imported in screens
import { db } from '../firebase';
```

#### 6. Firestore Rules Permission Denied
**Symptom:** Error when trying to write to Firestore

**Solutions:**
```javascript
// Check current rules in Firebase Console > Firestore > Rules

// Development rules (test mode)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 1, 1);
    }
  }
}

// Production rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own documents
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    allow read, write: if false; // Deny all other access
  }
}

// Test rules in Rules Simulator
// 1. Go to Firebase Console > Firestore > Rules
// 2. Click "Rules Simulator"
// 3. Test read/write operations
```

**Checklist:**
- [ ] Rules allow the operation
- [ ] User is authenticated
- [ ] Document path matches rules
- [ ] Test in Rules Simulator

### Navigation Issues

#### 7. Navigation Not Working
**Symptom:** Screens don't change on button press

**Solutions:**
```javascript
// Make sure navigation prop is passed
const SignInScreen = ({ navigation }) => {
  // navigation should exist here
  
  const handleSignIn = async () => {
    // ...
    navigation.replace('Home'); // This should work
  };
};

// In parent component, ensure Navigation container exists
<NavigationContainer>
  <Stack.Navigator>
    <Stack.Screen name="SignIn" component={SignInScreen} />
  </Stack.Navigator>
</NavigationContainer>

// Debug navigation state
const handleDebugNavigation = () => {
  console.log('Navigation state:', navigation.getState());
};
```

#### 8. White Screen After Login
**Symptom:** User authenticated but Home screen doesn't show

**Solutions:**
```javascript
// In RootNavigator.js, check auth state listener
useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    console.log('Auth state changed:', user ? user.email : 'signed out');
    setUser(user);
    setLoading(false);
  });
  
  return unsubscribe;
}, []);

// Verify screens are defined
<Stack.Screen name="Home" component={HomeScreen} />

// Check HomeScreen doesn't crash
// Add error boundary if needed
```

### Performance Issues

#### 9. App Slow or Laggy
**Solutions:**
```javascript
// Optimize re-renders with useMemo
import { useMemo } from 'react';

const MyComponent = ({ data }) => {
  const memoizedValue = useMemo(() => {
    return expensiveCalculation(data);
  }, [data]);
};

// Check for unnecessary re-renders
console.log('Component rendered');

// Optimize images
// Use optimized image sizes
// Implement image lazy loading

// Remove heavy console.logs in production
```

#### 10. Memory Leaks
**Solutions:**
```javascript
// Unsubscribe from listeners
useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(callback);
  
  return () => {
    unsubscribe(); // Cleanup
  };
}, []);

// Clean up timers and intervals
useEffect(() => {
  const timer = setTimeout(() => {
    // ...
  }, 1000);
  
  return () => clearTimeout(timer); // Cleanup
}, []);

// Avoid circular dependencies in useEffect
```

## Best Practices

### 1. Security Best Practices

#### Secure Firebase Config
```javascript
// ❌ Wrong - config in code
const firebaseConfig = {
  apiKey: 'AIzaSy...',
  // ...
};

// ✅ Correct - config from environment
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  // ...
};
```

#### Validate on Both Sides
```javascript
// ✅ Validate on frontend AND backend
export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Also implement Firebase Rules for backend validation
// rules_version = '2';
// service cloud.firestore {
//   match /users/{userId} {
//     allow create: if request.resource.data.email matches /.*@.*/;
//   }
// }
```

#### Secure Password Handling
```javascript
// ✅ Clear sensitive data
const handleSignUp = async () => {
  // ... signup logic
  
  // Clear password from state
  setPassword('');
  setConfirmPassword('');
};

// Don't log passwords
// Use only HTTPS
// Implement rate limiting
```

### 2. Code Quality Best Practices

#### Use TypeScript (Optional)
```typescript
// Define interfaces
interface User {
  uid: string;
  email: string;
  fullName: string;
  createdAt: string;
}

interface SignUpFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}
```

#### Proper Error Handling
```javascript
// ✅ Handle all errors
const handleSignIn = async () => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Specific error handling
    } else if (error.code === 'auth/wrong-password') {
      // Other handling
    } else {
      // Generic error handling
    }
  }
};
```

#### Constants and Config
```javascript
// ✅ Use constants
const PASSWORD_MIN_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const API_TIMEOUT = 30000;

// ✅ Separate config
// config.js
export const CONFIG = {
  API_TIMEOUT,
  PASSWORD_MIN_LENGTH,
  EMAIL_REGEX,
};
```

### 3. Testing Best Practices

#### Test Authentication Flows
```javascript
// Test signup
test('Sign up creates user', async () => {
  const user = await createUserWithEmailAndPassword(
    auth,
    'test@example.com',
    'password123'
  );
  expect(user.user.email).toBe('test@example.com');
});

// Test signin
test('Sign in authenticates user', async () => {
  await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
  expect(auth.currentUser.email).toBe('test@example.com');
});

// Test validation
test('Email validation works', () => {
  expect(validateEmail('test@example.com')).toBe(true);
  expect(validateEmail('invalid-email')).toBe(false);
});
```

#### Test Error Handling
```javascript
test('Sign in fails with wrong password', async () => {
  try {
    await signInWithEmailAndPassword(auth, 'test@example.com', 'wrong');
    fail('Should have thrown error');
  } catch (error) {
    expect(error.code).toBe('auth/wrong-password');
  }
});
```

### 4. Performance Best Practices

#### Lazy Loading
```javascript
// ✅ Import screens lazily
const SignInScreen = lazy(() => import('../screens/SignInScreen'));

// Use React.Suspense
<Suspense fallback={<LoadingScreen />}>
  <SignInScreen />
</Suspense>
```

#### Memoization
```javascript
// ✅ Memoize components
const CustomButton = React.memo(({ title, onPress }) => {
  return button component
});

// Memoize callbacks
const memoizedCallback = useCallback(() => {
  // logic
}, [dependencies]);
```

#### Image Optimization
```javascript
// ✅ Optimize images
import { Image } from 'react-native';

<Image
  source={require('./logo.png')}
  style={{ width: 100, height: 100 }}
  resizeMode="contain"
/>
```

### 5. Monitoring Best Practices

#### Error Tracking
```javascript
// ✅ Setup error tracking
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  enableInExpoDevelopment: true,
  tracesSampleRate: 1.0,
});

// Capture errors
try {
  // logic
} catch (error) {
  Sentry.captureException(error);
}
```

#### Analytics
```javascript
// ✅ Track important events
import { logEvent } from 'firebase/analytics';

const handleSignUp = async () => {
  try {
    // signup logic
    logEvent(analytics, 'sign_up', { method: 'email' });
  } catch (error) {
    logEvent(analytics, 'sign_up_failed', { error_code: error.code });
  }
};
```

## Debugging Tips

### 1. React Native Debugger
```bash
# Install
npm install --save-dev react-native-debugger

# Run app
npm start

# Enable debugger in app
Cmd+D (iOS) or Ctrl+M (Android)
Select "Debug"
```

### 2. Console Logging
```javascript
// ✅ Structured logging
console.log('[SignInScreen]', 'User signed in:', user.email);
console.error('[Firebase]', 'Auth failed:', error.code);
console.warn('[Firebase]', 'Using test rules');

// ❌ Avoid
console.log(password); // Never log sensitive data
```

### 3. Firebase Console
```
Monitor:
- Authentication → Users (check created users)
- Authentication → Events (view auth events)
- Firestore → Data (check stored data)
- Firestore → Rules Simulator (test rules)
```

## Performance Metrics

### Target Performance Metrics

```
Sign In: < 2 seconds
Sign Up: < 3 seconds
Navigation: < 300ms
Form Validation: < 50ms (instant feel)
Database Queries: < 1 second
```

### Measure Performance
```javascript
// Measure function execution
const startTime = performance.now();

await signInWithEmailAndPassword(auth, email, password);

const endTime = performance.now();
console.log(`Sign in took ${endTime - startTime}ms`);
```

## Common Error Codes Reference

```javascript
// Authentication Errors
'auth/user-not-found' - Email not registered
'auth/wrong-password' - Incorrect password
'auth/invalid-email' - Email format invalid
'auth/email-already-in-use' - Email already registered
'auth/weak-password' - Password too weak
'auth/too-many-requests' - Too many attempts
'auth/network-request-failed' - No internet connection
'auth/operation-not-allowed' - Sign-in method disabled

// Firestore Errors
'permission-denied' - User lacks permissions
'not-found' - Document doesn't exist
'invalid-argument' - Request format invalid
'already-exists' - Document exists
'resource-exhausted' - Database quota exceeded
'unavailable' - Service unavailable
```

## Resources for Help

1. **Official Documentation**
   - [Firebase Auth Docs](https://firebase.google.com/docs/auth)
   - [Firestore Docs](https://firebase.google.com/docs/firestore)
   - [Expo Docs](https://docs.expo.dev)

2. **Community**
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)
   - [Firebase Slack](https://firebase-community.appspot.com/)
   - [Expo Discord](https://chat.expo.dev)

3. **Tools**
   - [Firebase Console](https://console.firebase.google.com)
   - [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
   - [Network Throttling](https://developer.chrome.com/docs/devtools/network/)

## Checklist for Production

- [ ] All error messages are user-friendly
- [ ] Loading states implemented everywhere
- [ ] Network errors handled gracefully
- [ ] Sensitive data not logged
- [ ] Firebase rules are production-ready
- [ ] All dependencies up to date
- [ ] Performance optimized
- [ ] Tested on real devices
- [ ] Analytics implemented
- [ ] Error tracking enabled
- [ ] Privacy policy in place
- [ ] Terms of service in place

---

Still having issues? Check the README.md and FIREBASE_SETUP.md guides, or reach out to the community!
