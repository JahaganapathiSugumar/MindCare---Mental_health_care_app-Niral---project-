# MindCare - AI-Powered Mental Health Care Platform

A modern, production-ready React Native mental health app with authentication, AI chat support, and Firebase integration.

## Features

✨ **Modern UI Design**
- Clean, minimal interface with calming color palette
- Soft shadows and rounded components
- Responsive layout for all screen sizes
- Smooth animations and transitions

🔐 **Authentication**
- Email/password registration and login
- Firebase Authentication integration
- Persistent user sessions with AsyncStorage
- Comprehensive error handling

🤖 **AI Chat Assistant** (New!)
- OpenAI-powered mental health support
- Secure backend (API key protected)
- Firestore message history
- Real-time typing indicator
- WhatsApp-style UI with GiftedChat
- CBT-based responses
- Full conversation history saved

💾 **Data Management**
- Firestore database for user data storage
- User profile information (name, email, creation date)
- Automatic session persistence
- Chat history storage and retrieval

✅ **Form Validation**
- Email format validation
- Password strength requirements (min 6 characters)
- Password confirmation matching
- Full name validation
- Real-time error feedback

📱 **User Experience**
- Loading indicators during authentication
- User-friendly error messages
- Protected routes based on authentication state
- Smooth navigation transitions
- AI chat accessible from profile screen

## Project Structure

```
agentic-mental-care/
├── App.js                      # Main app entry point
├── app.json                    # Expo configuration
├── firebase.js                 # Firebase configuration and initialization
├── package.json                # Project dependencies
│
├── navigation/
│   └── RootNavigator.js        # Authentication-based navigation
│
├── screens/
│   ├── SignInScreen.js         # Login screen
│   ├── SignUpScreen.js         # Registration screen
│   └── HomeScreen.js           # Home/dashboard screen
│
├── components/
│   ├── CustomInput.js          # Reusable input field component
│   └── CustomButton.js         # Reusable button component
│
└── utils/
    └── validation.js           # Form validation utilities
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Firebase account (https://firebase.google.com)

### Step 1: Install Dependencies

```bash
cd agentic-mental-care
npm install
```

### Step 2: Firebase Setup

1. **Create a Firebase Project:**
   - Go to https://firebase.google.com/console
   - Click "Add Project" and follow the steps
   - Choose your app name and region

2. **Enable Authentication:**
   - In Firebase Console, go to Build → Authentication
   - Click "Get Started"
   - Enable "Email/Password" authentication method

3. **Create Firestore Database:**
   - In Firebase Console, go to Build → Firestore Database
   - Click "Create database"
   - Start in test mode (for development)
   - Choose your region

4. **Get Firebase Config:**
   - In Project Settings (gear icon)
   - Scroll to "Your apps" section
   - Click the Web app icon (</>) to register app
   - Copy the Firebase config

5. **Update firebase.js:**
   ```javascript
   // Replace in firebase.js
   const firebaseConfig = {
     apiKey: 'YOUR_API_KEY',
     authDomain: 'YOUR_PROJECT.firebaseapp.com',
     projectId: 'YOUR_PROJECT_ID',
     storageBucket: 'YOUR_PROJECT.appspot.com',
     messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
     appId: 'YOUR_APP_ID',
   };
   ```

### Step 3: Run the Application

```bash
npm start
```

This will start the Expo development server. You can then:
- Press 'i' for iOS simulator
- Press 'a' for Android emulator
- Scan the QR code with Expo Go app on physical device

### Step 4: Setup AI Chat Backend (Optional but Recommended)

For full AI chat functionality:

1. **Get OpenAI API Key:**
   - Go to https://platform.openai.com/api-keys
   - Create new secret key
   - Copy the key

2. **Setup Backend (Node.js):**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   npm start
   ```

3. **Update Backend URL in Frontend:**
   - Open `services/apiService.js`
   - Change `API_BASE_URL` to your backend server IP/URL
   ```javascript
   const API_BASE_URL = 'http://192.168.1.52:5000'; // Your machine IP
   ```

4. **Test the Chat:**
   - Sign in to the app
   - Go to Profile
   - Click "Talk to AI Support Assistant"
   - Send a message and chat with AI!

📖 **Full Setup Guide:** See [CHAT_SYSTEM.md](./CHAT_SYSTEM.md) for detailed backend configuration and deployment options.

## Key Components

### CustomInput Component
Reusable input field with:
- Password visibility toggle
- Error message display
- Validation state styling
- Icon support

```javascript
<CustomInput
  label="Email"
  placeholder="you@example.com"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  error={errors.email}
/>
```

### CustomButton Component
Reusable button with:
- Loading state indicator
- Disabled state handling
- Smooth animations
- Soft shadow effect

```javascript
<CustomButton
  title="Sign In"
  onPress={handleSignIn}
  loading={loading}
  disabled={loading}
/>
```

### Validation Utilities
Comprehensive validation functions:
- `validateEmail()` - Email format validation
- `validatePassword()` - Password strength check
- `validatePasswordMatch()` - Confirm password validation
- `validateSignUp()` - Validate all signup fields
- `validateSignIn()` - Validate all signin fields
- `getErrorMessage()` - Firebase to user-friendly error conversion

## Sign Up Flow

1. User enters Full Name, Email, Password, and Confirm Password
2. Form validation occurs
3. Firebase creates user account
4. User data stored in Firestore
5. User redirected to Sign In screen
6. Confirmation alert shown

**Validation Rules:**
- Full Name: Minimum 2 characters
- Email: Valid email format
- Password: Minimum 6 characters
- Confirm Password: Must match password

## Sign In Flow

1. User enters Email and Password
2. Form validation occurs
3. Firebase authenticates user
4. Session persisted via AsyncStorage
5. User navigated to Home screen
6. Auth state monitored for persistence

**Error Handling:**
- Invalid email format
- User not found
- Wrong password
- Too many login attempts

## Authentication State Management

The `RootNavigator` component handles authentication state:
- Listens to `auth.onAuthStateChanged()`
- Shows appropriate screen stack based on user state
- Persists session using AsyncStorage
- Handles loading state

```javascript
auth.onAuthStateChanged((user) => {
  if (user) {
    // Show authenticated screens (Home)
  } else {
    // Show authentication screens (SignIn/SignUp)
  }
});
```

## Firestore Data Structure

### Users Collection
```javascript
{
  uid: "user_unique_id",
  fullName: "John Doe",
  email: "john@example.com",
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z"
}
```

## Environment Variables

For production, use environment variables:

```bash
# Create .env file
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
```

## Color Palette

- **Primary:** #667eea (Soft indigo blue)
- **Background:** #f8f9fa (Light gray)
- **Text:** #1a1a1a (Dark gray)
- **Secondary Text:** #666 (Medium gray)
- **Border:** #e0e0e0 (Light border)
- **Error:** #ff6b6b (Red)

## Best Practices Implemented

✅ **Security**
- Firebase Authentication for secure signup/login
- Password validation and confirmation
- AsyncStorage for persistent sessions
- Error handling for Firebase operations

✅ **Performance**
- Reusable components
- Optimized re-renders with hooks
- Async/await for async operations
- Lazy loading with React Navigation

✅ **UX/UI**
- Loading states during operations
- Real-time validation feedback
- Disabled buttons during loading
- User-friendly error messages
- Responsive design

✅ **Code Quality**
- Functional components with hooks
- Clean separation of concerns
- Validation utilities in separate file
- Well-structured navigation
- Comprehensive comments

## Troubleshooting

### Firebase Config Not Loading
- Ensure firebase.js has correct credentials
- Check Firebase project settings
- Verify firebaseConfig object

### Authentication Fails
- Check Firebase Authentication rules
- Ensure email/password method is enabled
- Verify user exists in Firebase Console

### AsyncStorage Not Persisting
- Check app permissions on device
- Ensure @react-native-async-storage/async-storage is installed
- Test on physical device (simulators may have issues)

### Navigation Issues
- Clear app cache: `expo cache`
- Restart development server
- Ensure navigation structure is correct

## Next Steps

To extend this authentication system:

1. **Add Password Reset**
   ```javascript
   sendPasswordResetEmail(auth, email)
   ```

2. **Social Authentication**
   - Google Sign-In
   - Apple Sign-In
   - Facebook Login

3. **Enhanced User Profile**
   - Profile picture upload
   - Bio and interests
   - Account settings

4. **Analytics**
   - Track user signup/login
   - Monitor authentication errors
   - User retention metrics

5. **Biometric Authentication**
   - Fingerprint login
   - Face ID authentication

## Dependencies

- **react-native** - Mobile app framework
- **expo** - Development platform
- **firebase** - Backend services
- **@react-navigation/native** - Navigation library
- **@react-navigation/stack** - Stack navigation
- **@react-native-async-storage/async-storage** - Local storage

## License

This project is open source and available for use in your applications.

## Support

For issues or questions:
1. Check Firebase documentation
2. Review React Navigation docs
3. Check community forums
4. Consult Firebase support

---

Built with ❤️ for mental health awareness and support.
