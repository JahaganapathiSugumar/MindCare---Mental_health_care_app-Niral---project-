import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as Contacts from 'expo-contacts';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const TrustedContactScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const handleSaveContact = async () => {
    if (!contactName.trim() || !phoneNumber.trim()) {
      Alert.alert(
        t('trustedContact.errorTitle', { defaultValue: 'Incomplete' }),
        t('trustedContact.fillAllFields', { defaultValue: 'Please fill in all fields' })
      );
      return;
    }

    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      Alert.alert(
        t('trustedContact.invalidPhone', { defaultValue: 'Invalid Phone' }),
        t('trustedContact.invalidPhoneMsg', { defaultValue: 'Please enter a valid phone number' })
      );
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
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
        trustedContactSetup: true,
      };

      const db = getFirestore();
      await setDoc(doc(db, 'users', user.uid), trustedContactData, { merge: true });

      await AsyncStorage.setItem('trustedContactAdded', 'true');
      await AsyncStorage.setItem('emergencyContact', JSON.stringify(trustedContactData.emergencyContact));
      navigation.replace('Home');
    } catch (error) {
      console.error('Error saving trusted contact:', error);
      Alert.alert(
        t('trustedContact.errorSaving', { defaultValue: 'Error' }),
        t('trustedContact.errorSavingMsg', { defaultValue: 'Failed to save contact. Please try again.' })
      );
      setLoading(false);
    }
  };

  const handleOpenContacts = async () => {
    try {
      setLoadingContacts(true);
      const permission = await Contacts.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        Alert.alert(
          t('trustedContact.permissionRequired', { defaultValue: 'Permission Required' }),
          t('trustedContact.contactsPermissionText', { defaultValue: 'Please grant contacts permission to select a contact.' })
        );
        setLoadingContacts(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (data.length > 0) {
        const contactsWithPhone = data
          .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
          .map(contact => ({
            id: contact.id,
            name: contact.name || 'Unknown',
            phones: contact.phoneNumbers.map(p => p.number),
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setDeviceContacts(contactsWithPhone);
        setShowContactsModal(true);
      } else {
        Alert.alert(
          t('trustedContact.noContacts', { defaultValue: 'No Contacts' }),
          t('trustedContact.noContactsMsg', { defaultValue: 'No contacts found on your device.' })
        );
      }
    } catch (error) {
      console.error('Error accessing contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSelectContact = (contact) => {
    setContactName(contact.name);
    if (contact.phones && contact.phones.length > 0) {
      setPhoneNumber(contact.phones[0]);
    }
    setShowContactsModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F7F9FC', '#E8F1FF']}
        style={StyleSheet.absoluteFill}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="shield-account" size={32} color="#4A90E2" />
            </View>
            <Text style={styles.title}>Safety Circle</Text>
            <Text style={styles.subtitle}>
              Your safety matters. Who can we reach out to if you ever feel completely overwhelmed?
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Name</Text>
              <TextInput
                placeholder="e.g., Mom, Best Friend, Partner"
                placeholderTextColor="#A0B3C6"
                value={contactName}
                onChangeText={setContactName}
                style={styles.input}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <TextInput
                  placeholder="+1 234 567 8900"
                  placeholderTextColor="#A0B3C6"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={handleOpenContacts}
                  disabled={loading || loadingContacts}
                  style={styles.contactsButton}
                >
                  {loadingContacts ? (
                    <ActivityIndicator size="small" color="#4A90E2" />
                  ) : (
                    <MaterialCommunityIcons name="contacts-outline" size={24} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.privacyNote}>
              <MaterialCommunityIcons name="lock-outline" size={18} color="#4A90E2" style={styles.privacyIcon} />
              <Text style={styles.privacyText}>
                We will only notify this contact in critical situations or if you explicitly request us to.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.footer}>
          <TouchableOpacity
            onPress={handleSaveContact}
            disabled={loading}
            activeOpacity={0.8}
            style={styles.saveButton}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Contact</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>

      <Modal
        visible={showContactsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity onPress={() => setShowContactsModal(false)} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#1C3A5C" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={deviceContacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelectContact(item)}
                style={styles.contactItem}
              >
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phones[0]}</Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.contactList}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C3A5C',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6E859A',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  formContainer: {
    marginTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C3A5C',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1C3A5C',
    borderWidth: 2,
    borderColor: '#E8F1FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactsButton: {
    width: 56,
    height: 56,
    backgroundColor: '#EAF4FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 2,
    borderColor: '#CDE3FA',
  },
  privacyNote: {
    flexDirection: 'row',
    backgroundColor: '#EAF4FF',
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  privacyIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: '#2C5AA0',
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    paddingTop: 10,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: '#6E859A',
    fontSize: 15,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8F1FF',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C3A5C',
  },
  closeButton: {
    padding: 4,
  },
  contactList: {
    paddingVertical: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C3A5C',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6E859A',
  },
});

export default TrustedContactScreen;
