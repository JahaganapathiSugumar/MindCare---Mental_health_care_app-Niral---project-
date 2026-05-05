import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { ThemeContext } from '../context/ThemeContext';

const TrustedContactScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSaveContact = async () => {
    if (!contactName.trim() || !phoneNumber.trim()) {
      Alert.alert(
        t('trustedContact.errorTitle', { defaultValue: 'Incomplete' }),
        t('trustedContact.fillAllFields', { defaultValue: 'Please fill in all fields' })
      );
      return;
    }

    // Basic phone validation (E.164 format or 10 digits)
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      Alert.alert(
        t('trustedContact.invalidPhone', { defaultValue: 'Invalid Phone' }),
        t('trustedContact.invalidPhoneMsg', { defaultValue: 'Please enter a valid phone number' })
      );
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      const trustedContactData = {
        emergencyContact: {
          name: contactName.trim(),
          phone: phoneNumber.replace(/\s/g, ''),
          addedAt: new Date().toISOString(),
        },
      };

      // Save to Firebase Firestore
      const db = getFirestore();
      await setDoc(doc(db, 'users', user.uid), trustedContactData, { merge: true });

      // Save locally to AsyncStorage
      await AsyncStorage.setItem('trustedContactAdded', 'true');
      await AsyncStorage.setItem('emergencyContact', JSON.stringify(trustedContactData.emergencyContact));

      // Navigate to Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('Error saving trusted contact:', error);
      Alert.alert(
        t('trustedContact.errorSaving', { defaultValue: 'Error' }),
        t('trustedContact.errorSavingMsg', { defaultValue: 'Failed to save contact. Please try again.' })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      // Mark as skipped so we don't show this screen again
      await AsyncStorage.setItem('trustedContactSkipped', 'true');
      
      // Navigate to Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('Error skipping trusted contact setup:', error);
      Alert.alert('Error', 'Failed to proceed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            marginTop: 20,
            paddingHorizontal: 24,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: '700', color: theme.text }}>
            {t('trustedContact.title', { defaultValue: 'Add a trusted contact' })}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.mutedText,
              marginTop: 8,
              lineHeight: 22,
            }}
          >
            {t('trustedContact.subtitle', {
              defaultValue: "If you're ever feeling overwhelmed, we can help notify someone you trust.",
            })}
          </Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24, justifyContent: 'space-between', paddingBottom: 24 }}>
          {/* Input Fields */}
          <View style={{ gap: 16 }}>
            {/* Contact Name Input */}
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                {t('trustedContact.contactName', { defaultValue: 'Contact Name' })}
              </Text>
              <TextInput
                placeholder={t('trustedContact.contactNamePlaceholder', { defaultValue: 'e.g., Mom, Friend, Therapist' })}
                placeholderTextColor={theme.mutedText}
                value={contactName}
                onChangeText={setContactName}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  fontSize: 14,
                  fontFamily: 'System',
                }}
                editable={!loading}
              />
            </View>

            {/* Phone Number Input */}
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                {t('trustedContact.phoneNumber', { defaultValue: 'Phone Number' })}
              </Text>
              <TextInput
                placeholder={t('trustedContact.phoneNumberPlaceholder', { defaultValue: '+91 98765 43210' })}
                placeholderTextColor={theme.mutedText}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  fontSize: 14,
                  fontFamily: 'System',
                }}
                editable={!loading}
              />
            </View>

            {/* Privacy Message */}
            <View
              style={{
                backgroundColor: '#F0F8FF',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderLeftWidth: 4,
                borderLeftColor: '#4A90E2',
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <MaterialCommunityIcons
                name="lock-outline"
                size={18}
                color="#4A90E2"
                style={{ marginTop: 2 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: '#2C5AA0',
                  lineHeight: 18,
                }}
              >
                {t('trustedContact.privacyMessage', {
                  defaultValue: 'We will only notify this contact in critical situations.',
                })}
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={{ gap: 12, marginTop: 24 }}>
            {/* Save Contact Button */}
            <TouchableOpacity
              onPress={handleSaveContact}
              disabled={loading}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: loading ? theme.disabled : '#4A90E2',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="white" />
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                  >
                    {t('trustedContact.saveContact', { defaultValue: 'Save Contact' })}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Skip Button */}
            <TouchableOpacity
              onPress={handleSkip}
              disabled={loading}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: theme.inputBackground,
                borderWidth: 1,
                borderColor: theme.border,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text
                style={{
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                {t('trustedContact.skip', { defaultValue: 'Skip' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TrustedContactScreen;
