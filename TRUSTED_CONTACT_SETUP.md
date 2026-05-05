# Trusted Contact Feature Documentation

## Overview

The Trusted Contact feature allows users to optionally add an emergency contact that can be notified in critical situations. This feature is **optional** and integrates with SMS notifications via Twilio.

## Flow

1. **After Personalization**: Users see the Trusted Contact setup screen after completing the personalization questionnaire
2. **Optional Setup**: Users can either:
   - Save a trusted contact (name + phone number)
   - Skip for now (can add later from Profile screen)
3. **Storage**: Contact data is stored in Firestore under `users/{userId}` → `emergencyContact` field
4. **Notifications**: In critical situations, the backend can send SMS to the trusted contact

## Data Structure

### Firestore Schema
```json
{
  "users": {
    "{userId}": {
      "email": "user@example.com",
      "role": "student",
      "concern": "anxiety",
      "supportStyle": "calm",
      "emergencyContact": {
        "name": "Mom",
        "phone": "+919876543210",
        "addedAt": "2026-05-05T10:30:00.000Z"
      }
    }
  }
}
```

### AsyncStorage (Local Fallback)
```javascript
{
  "trustedContactAdded": "true",  // or null if skipped
  "emergencyContact": "{...JSON stringified contact...}",
  "trustedContactSkipped": "true"  // if user chose to skip
}
```

## Frontend Components

### 1. TrustedContactScreen (`screens/TrustedContactScreen.js`)
- **Purpose**: Multi-step form displayed after personalization
- **Inputs**: 
  - Contact Name (text)
  - Phone Number (tel)
- **Features**:
  - Phone validation (E.164 format or 10 digits)
  - Privacy message explaining limited notification usage
  - Save or Skip buttons
  - Error handling for incomplete form

### 2. Service Layer (`services/trustedContactService.js`)
Functions available:
- `getTrustedContact()` - Retrieve saved contact
- `isTrustedContactSetup()` - Check if contact is saved
- `hasTrustedContactBeenSkipped()` - Check if user skipped setup
- `updateTrustedContact(name, phone)` - Save/update contact
- `removeTrustedContact()` - Delete contact
- `notifyTrustedContact(userId, message)` - Send emergency SMS

### 3. Navigation Flow (`navigation/RootNavigator.js`)
Navigation sequence after login:
1. Language Selection (if needed)
2. Onboarding Walkthrough (if needed)
3. Personalization Questions (if needed)
4. **Trusted Contact Setup** (NEW - if needed)
5. Home Screen

State tracking:
```javascript
trustedContactSetup = contactAdded === 'true' OR contactSkipped === 'true'
```

## Backend Support

### Emergency Notification Endpoint
**Endpoint**: `POST /emergency/notify`

**Request Body**:
```javascript
{
  userId: "user-id",
  userName: "User Name",
  contactName: "Contact Name",
  contactPhone: "+91XXXXXXXXXX",
  message: "Custom message (optional)"
}
```

**Response**:
```javascript
{
  success: true,
  message: "SMS notification queued for Mom",
  timestamp: "2026-05-05T10:30:00.000Z",
  userId: "user-id"
}
```

**Error Response** (if Twilio not configured):
```javascript
{
  success: false,
  reason: "sms-provider-unavailable",
  message: "SMS service is not configured on the backend."
}
```

## Twilio Integration (Optional - For Production)

### Setup Steps

1. **Get Twilio Credentials**:
   - Create account at https://www.twilio.com
   - Get Account SID, Auth Token
   - Rent a phone number for sending SMS

2. **Install Twilio SDK** in backend:
   ```bash
   cd backend
   npm install twilio
   ```

3. **Set Environment Variables** in `backend/.env`:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

4. **Uncomment SMS Sending** in `backend/server.js` (line ~1430):
   ```javascript
   // Uncomment this block when Twilio is configured:
   const twilio = require('twilio');
   const client = twilio(twilioAccountSid, twilioAuthToken);
   await client.messages.create({
     body: smsBody,
     from: twilioPhoneNumber,
     to: contactPhone,
   });
   ```

## Usage Example

### From Frontend
```javascript
import { notifyTrustedContact } from '../services/trustedContactService';

try {
  const result = await notifyTrustedContact(
    userId,
    "I'm not doing well and need your support"
  );
  console.log('Notification sent:', result);
} catch (error) {
  console.error('Failed to notify:', error);
}
```

### From Profile Screen
Users can:
1. View saved contact info
2. Edit contact details
3. Remove contact
4. Add new contact if none exists

## Privacy & Security

- **Limited Usage**: SMS sent only in critical situations
- **User Control**: Users can add, edit, or remove contact anytime
- **Local Fallback**: Data persisted locally via AsyncStorage
- **Encryption**: Phone numbers stored as plain text (use HTTPS for transit)
- **Consent**: Users explicitly opt-in by saving contact

## Internationalization (i18n)

Translations included for:
- English (en)
- Hindi (hi)
- Tamil (ta)
- Malayalam (ml)

Translation keys:
```json
{
  "trustedContact": {
    "title": "Add a trusted contact",
    "subtitle": "If you're ever feeling overwhelmed...",
    "contactName": "Contact Name",
    "phoneNumber": "Phone Number",
    "saveContact": "Save Contact",
    "skip": "Skip",
    "privacyMessage": "We will only notify this contact...",
    "errorTitle": "Incomplete",
    "fillAllFields": "Please fill in all fields",
    "invalidPhone": "Invalid Phone",
    "invalidPhoneMsg": "Please enter a valid phone number"
  }
}
```

## Testing Checklist

- [ ] Add contact flow works end-to-end
- [ ] Phone validation rejects invalid numbers
- [ ] Skip button works and doesn't show screen again
- [ ] Contact saved to Firestore correctly
- [ ] Contact saved to AsyncStorage correctly
- [ ] Profile screen shows saved contact
- [ ] Profile screen allows editing contact
- [ ] Profile screen allows removing contact
- [ ] All 4 languages display correctly
- [ ] Emergency notification endpoint responds (without Twilio)
- [ ] Twilio integration sends actual SMS (after setup)

## Future Enhancements

1. **Multiple Contacts**: Allow 2-3 trusted contacts
2. **Notification Frequency**: Set how often contacts are notified
3. **Custom Messages**: Let users compose message templates
4. **Call Integration**: Optional phone call notifications
5. **Recipient Confirmation**: Notify contact that they're a trusted contact
6. **Auto-disable**: Disable if contact asks to be removed
7. **Analytics**: Track notification delivery

## Troubleshooting

### Contact not saving
- Check Firebase Firestore rules allow writes to `users/{userId}`
- Check AsyncStorage permissions
- Check browser console for errors

### Phone validation failing
- Accept formats: `+919876543210`, `(987) 654-3210`, `987-654-3210`
- Must have at least 10 digits
- Remove spaces/special chars in storage

### SMS not sending
- Verify Twilio credentials in `.env`
- Check recipient phone is in E.164 format
- Check Twilio account has credits
- Enable Twilio integration in `server.js`

## Support

For issues or questions:
1. Check Firebase Firestore rules
2. Review browser console errors
3. Check backend server logs
4. Verify Twilio configuration (if using SMS)
