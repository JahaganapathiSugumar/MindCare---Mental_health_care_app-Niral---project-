# Firebase Setup Guide

Complete step-by-step guide to set up Firebase for the MindCare authentication system.

## 1. Create Firebase Project

### Step 1.1: Visit Firebase Console
1. Go to https://firebase.google.com
2. Click on "Go to console" button
3. Sign in with your Google account

### Step 1.2: Create New Project
1. Click "Create a project" or "Add project"
2. Enter project name: `agentic-mental-care` (or your preferred name)
3. Click "Continue"
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"
6. Wait for project to be provisioned

## 2. Enable Authentication

### Step 2.1: Access Authentication
1. In Firebase Console, select your project
2. Click on "Build" in the left sidebar
3. Select "Authentication"
4. Click "Get Started"

### Step 2.2: Enable Email/Password Authentication
1. In the "Sign-in method" tab
2. Look for "Email/Password"
3. Click on it to expand
4. Toggle "Enable" to ON
5. Keep "Password account creation" enabled
6. Click "Save"

**Authentication methods should show:**
- ✅ Email/Password - Enabled

## 3. Set Up Firestore Database

### Step 3.1: Create Firestore Database
1. In Firebase Console, click "Build"
2. Select "Firestore Database"
3. Click "Create database"

### Step 3.2: Configure Database
1. **Location**: Choose closest region to your users
2. **Security Rules**: Select "Start in test mode"
   - **Note**: For development only. Secure before production.
3. Click "Create"

### Step 3.3: Security Rules for Testing
Your default test rules should be:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 1, 1);
    }
  }
}
```

### Step 3.4: Update Production Rules
**Before publishing, update to secure rules:**

In Firestore Console → Rules tab, replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Only authenticated users can read/write their own data
      allow read, write: if request.auth.uid == userId;
      
      // Allow creating new user documents during signup
      allow create: if request.auth.uid == userId;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 4. Get Firebase Configuration

### Step 4.1: Copy Firebase Config
1. In Firebase Console, click gear icon (⚙️) → "Project Settings"
2. Scroll to "Your apps" section
3. Click on Web app icon: `</>`
4. Enter app nickname: `MindCare Web`
5. Check "Also set up Firebase Hosting"
6. Click "Register app"

### Step 4.2: Copy Configuration
You'll see a code snippet like:

```javascript
// For Firebase JS SDK v7.20.0 and later, measure performance of your app
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
```

Look for the `firebaseConfig` object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcd1234efgh5678"
};
```

## 5. Update firebase.js Configuration

### Step 5.1: Open firebase.js
Location: `f:\Agentic_mental_care\firebase.js`

### Step 5.2: Replace Configuration
Replace the TODO placeholder with your actual config:

```javascript
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',           // from Firebase config
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

**Example of filled config:**
```javascript
const firebaseConfig = {
  apiKey: 'AIzaSyDXx-AqKLqqe_K_wU_C8zXxkFz-5Y7h9oo',
  authDomain: 'agentic-mental-care.firebaseapp.com',
  projectId: 'agentic-mental-care',
  storageBucket: 'agentic-mental-care.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef123456',
};
```

## 6. Verify Setup in Firebase Console

### Step 6.1: Test Authentication
1. In Authentication → Users tab
2. Create a test user:
   - Email: `test@example.com`
   - Password: `password123`
3. Click "Add user"

### Step 6.2: Check Firestore
1. Go to Firestore Database
2. Create a test collection:
   - Collection ID: `users`
   - Document ID: (auto-generated)
   - Add fields:
     ```
     fullName: "Test User"
     email: "test@example.com"
     createdAt: timestamp
     ```

### Step 6.3: Verify Rules
1. Go to Rules tab
2. Ensure rules are in place
3. Click "Publish" after any changes

## 7. Environment Variables (Optional but Recommended)

### Create .env file
In project root, create `.env`:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc...
```

### Update firebase.js to use .env
```javascript
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
```

## 8. Install Dependencies

```bash
npm install
```

This will install:
- firebase
- @react-native-async-storage/async-storage
- @react-navigation/native
- @react-navigation/stack
- react-native-screens
- react-native-safe-area-context

## 9. Run the Application

```bash
npm start
```

Test with:
1. **Sign Up**: Create new account
   - Check Firestore: New user document created
   - Check Authentication: New user appears in Users tab

2. **Sign In**: Login with created account
   - Check AsyncStorage: Session persisted
   - Check Navigation: Home screen displays

3. **Sign Out**: Logout from app
   - Check Authentication state: Changed to unauthenticated
   - Check Navigation: Returns to Sign In screen

## 10. Troubleshooting

### Firebase Config Not Working
**Error**: "Missing or invalid API key"

**Solution:**
- Double-check config values in firebase.js
- Ensure no extra quotes or spaces
- Verify credentials from Firebase Console

### Authentication Fails
**Error**: "auth/configuration-not-found"

**Solution:**
- Enable Email/Password authentication in Firebase Console
- Check project ID matches
- Clear app cache: `expo cache`

### Firestore Writes Fail
**Error**: "Missing or insufficient permissions"

**Solution:**
- Check Firestore security rules
- Use test mode rules during development
- Verify authentication is working

### Can't Create User
**Error**: "auth/weak-password"

**Solution:**
- Password must be at least 6 characters
- Check password validation in frontend

## 11. Production Checklist

Before deploying to production:

- [ ] Update Firestore security rules (don't use test mode)
- [ ] Enable HTTPS-only connections
- [ ] Set up custom domain
- [ ] Enable backup and recovery
- [ ] Set up monitoring and alerts
- [ ] Review Firebase pricing
- [ ] Implement password reset
- [ ] Add social authentication
- [ ] Set up analytics
- [ ] Test on iOS and Android devices

## 12. Firebase Console Features

### Monitor Usage
1. **Dashboard** - Overview of project
2. **Firestore** - Database management
3. **Authentication** - User management
4. **Analytics** - User behavior
5. **Monitoring** - Performance metrics
6. **Rules Simulator** - Test security rules

### Manage Settings
1. **Project Settings** - Configuration and credentials
2. **Users and Permissions** - Team access management
3. **Billing** - Payment and usage
4. **Connected Apps** - Link other Firebase projects

## Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Authentication Docs**: https://firebase.google.com/docs/auth
- **Firestore Docs**: https://firebase.google.com/docs/firestore
- **React Native Firebase**: https://rnfirebase.io
- **Community Support**: Stack Overflow, Firebase Forum

## Security Best Practices

1. **Never commit firebase.js with real keys**
   - Use .env file with .gitignore
   - Rotate API keys regularly

2. **Use Firebase Rules**
   - Validate user authentication
   - Restrict database access
   - Prevent data breaches

3. **Enable Monitoring**
   - Track failed login attempts
   - Monitor suspicious activities
   - Review access logs

4. **Keep Dependencies Updated**
   - Run `npm update`
   - Check for security patches
   - Test before deploying

---

For additional support, refer to the README.md and Firebase official documentation.
