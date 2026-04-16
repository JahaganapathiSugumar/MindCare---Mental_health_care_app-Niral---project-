# Quick Start Guide

Get the MindCare authentication system up and running in 15 minutes!

## 5-Minute Setup

### 1. Install Dependencies (2 min)
```bash
cd f:\Agentic_mental_care
npm install
```

### 2. Setup Firebase (2 min)

1. Go to https://firebase.google.com/console
2. Create new project
3. Enable Email/Password authentication
4. Create Firestore database
5. Copy credentials

### 3. Update firebase.js (1 min)

Open `firebase.js` and replace:
```javascript
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

### 4. Run the App (1 min)
```bash
npm start
```

Press:
- `i` for iOS simulator
- `a` for Android emulator
- Scan QR code for physical device

## 10-Minute Testing

### Test Sign Up
1. Click "Sign Up" link
2. Fill in form:
   - Name: John Doe
   - Email: test@example.com
   - Password: password123
   - Confirm: password123
3. Click "Create Account"
4. Check Firebase Console → Authentication → Users

### Test Sign In
1. Click "Sign In" link
2. Enter email and password
3. Should navigate to Home screen
4. Click "Sign Out" to logout

### Test Validation
Try these to see validation errors:
- Empty email
- Invalid email (no @)
- Password < 6 chars
- Passwords don't match

## Project Structure

```
f:\Agentic_mental_care\
├── App.js                 ← Main app entry
├── firebase.js            ← Firebase config (UPDATE THIS)
├── package.json
├── app.json
│
├── screens/
│   ├── SignInScreen.js    ← Login screen
│   ├── SignUpScreen.js    ← Registration screen
│   └── HomeScreen.js      ← Home after login
│
├── components/
│   ├── CustomInput.js     ← Reusable input
│   └── CustomButton.js    ← Reusable button
│
├── navigation/
│   └── RootNavigator.js   ← Navigation setup
│
└── utils/
    └── validation.js      ← Form validation
```

## Key Features

✅ **Easy Integration**
- Firebase authentication built in
- Firestore database ready
- Navigation pre-configured

✅ **Modern UI**
- Soft colors and shadows
- Responsive design
- Smooth animations

✅ **Production Ready**
- Error handling
- Loading states
- Session persistence

✅ **Clean Code**
- Functional components
- Reusable components
- Well organized

## Common Tasks

### Change Color Scheme
Colors in `components/CustomButton.js` and `components/CustomInput.js`:
```javascript
backgroundColor: '#667eea', // Change this
```

Available colors:
- Primary: `#667eea` (blue)
- Background: `#f8f9fa` (light gray)
- Error: `#ff6b6b` (red)

### Add Custom Input Field
```javascript
<CustomInput
  label="Phone Number"
  placeholder="123-456-7890"
  value={phoneNumber}
  onChangeText={setPhoneNumber}
  keyboardType="phone-pad"
  error={errors.phoneNumber}
/>
```

### Access Current User
```javascript
import { auth } from './firebase';

const user = auth.currentUser;
if (user) {
  console.log('User email:', user.email);
}
```

### Store Extra User Data
In `SignUpScreen.js`, add fields:
```javascript
await setDoc(doc(db, 'users', user.uid), {
  uid: user.uid,
  fullName: fullName.trim(),
  email: email.trim(),
  createdAt: new Date().toISOString(),
  // Add these:
  phoneNumber: phone,
  dateOfBirth: dob,
  preferredLanguage: 'en',
});
```

### Listen for User Changes
```javascript
import { onSnapshot, doc } from 'firebase/firestore';

useEffect(() => {
  if (!auth.currentUser) return;

  const unsubscribe = onSnapshot(
    doc(db, 'users', auth.currentUser.uid),
    (doc) => {
      console.log('User data:', doc.data());
    }
  );

  return unsubscribe;
}, []);
```

## Troubleshooting

### Firebase Config Not Working?
```
1. Check apiKey is not 'YOUR_API_KEY'
2. Ensure projectId matches Firebase project
3. Go to Firebase Console > Project Settings
4. Copy values exactly (no extra spaces)
```

### Sign Up Button Not Working?
```
1. Check Firebase Console > Authentication
2. Verify Email/Password is enabled
3. Check console for errors (Cmd+D → Debug)
4. Try with valid email and 6+ char password
```

### Home Screen Not Showing?
```
1. Check auth state: auth.currentUser should exist
2. Verify navigation is set up correctly
3. Check RootNavigator.js has Home screen
4. Look for console errors
```

### Can't Sign In?
```
1. Verify user exists in Firebase Console
2. Check email and password exactly
3. Ensure AsyncStorage is working
4. Clear app cache and reload
```

## Next Steps

### Short Term (1-2 hours)
- [ ] Customize colors to match your brand
- [ ] Add app logo/icon
- [ ] Test all authentication flows
- [ ] Deploy to test device

### Medium Term (1-2 days)
- [ ] Add more user profile fields
- [ ] Implement password reset (ForgotPasswordScreen included)
- [ ] Setup analytics
- [ ] Add privacy policy

### Long Term (1-2 weeks)
- [ ] Deploy to App Store
- [ ] Deploy to Google Play
- [ ] Deploy web version
- [ ] Monitor and improve

## Useful Scripts

```bash
# Start development
npm start

# Start iOS
npm run ios

# Start Android
npm run android

# Start web
npm run web

# Check for issues
npm audit

# Update dependencies
npm update

# Clear cache
expo cache clean
```

## File Modifications Checklist

- [ ] firebase.js - Added Firebase config
- [ ] Tested Sign Up
- [ ] Tested Sign In
- [ ] Tested validation
- [ ] Viewed Firestore data
- [ ] Customized colors
- [ ] Added app logo
- [ ] Ready to deploy

## Important Notes

⚠️ **Security**
- Never commit real Firebase credentials
- Use .env file for production
- Enable Firestore security rules before publishing

⚠️ **Testing**
- Always test on physical device before publishing
- Test with slow network conditions
- Test with invalid credentials

⚠️ **Performance**
- Monitor app size (target < 100MB)
- Test on low-end devices
- Monitor auth response times

## Support

**Quick Help:**
1. Check `TROUBLESHOOTING.md` for solutions
2. Search error message in Firebase docs
3. Check console logs (Cmd+D on iOS)

**Deployment Help:**
1. Read `DEPLOYMENT.md` for platform-specific guides
2. Follow `FIREBASE_SETUP.md` for Firebase configuration
3. Check `ADVANCED_FEATURES.md` for extra features

**API Reference:**
1. [Firebase Auth Docs](https://firebase.google.com/docs/auth/web/start)
2. [React Navigation Docs](https://reactnavigation.org)
3. [Expo Docs](https://docs.expo.dev)

## Video Walkthrough

Coming soon! For now, follow this Quick Start guide step-by-step.

## Feedback

Found an issue or have a suggestion? 
- Check existing issues
- Report in TROUBLESHOOTING.md
- Share your implementation

---

**Ready to build?** Start with step 1 above! 🚀

Need more help? Read the full README.md for detailed information.
