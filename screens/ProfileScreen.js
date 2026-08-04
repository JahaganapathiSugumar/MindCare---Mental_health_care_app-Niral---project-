import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { DeviceEventEmitter,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  fetchMoodHistory,
  fetchProfileData,
  logoutCurrentUser,
  updateNotificationPreference,
  updateProfileFullName,
  updateProfilePhoto,
  getPersonalization,
  updatePersonalization,
} from '../services/profileService';
import {
  getTrustedContact,
  isTrustedContactSetup,
  updateTrustedContact,
  removeTrustedContact,
} from '../services/trustedContactService';
import * as Contacts from 'expo-contacts';
import { getFullNameValidationError } from '../utils/validation';
import {
  cancelMindCareScheduledNotifications,
  initializeProactiveNotifications,
} from '../services/notifications';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { FloatingBottomNav } from '../components/ui/Premium/LearningHubCards';

const ProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages, languageMeta } = useLanguage();
  const { theme, isDark, toggleTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const handleScroll = (event) => {
    const currentY = event.nativeEvent.contentOffset.y;
    if (Math.abs(currentY - lastScrollY) > 10) {
      DeviceEventEmitter.emit('onScrollDirection', { scrollingDown: currentY > lastScrollY && currentY > 50 });
      setLastScrollY(currentY);
    }
  };

  const [loggingOut, setLoggingOut] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [updatingNotifications, setUpdatingNotifications] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);
  const [personalization, setPersonalization] = useState(null);
  const [editPersonalizationVisible, setEditPersonalizationVisible] = useState(false);
  const [editPersonalization, setEditPersonalization] = useState({ role: null, concern: null, supportStyle: null });
  const [originalPersonalization, setOriginalPersonalization] = useState({ role: null, concern: null, supportStyle: null });
  const [savingPersonalization, setSavingPersonalization] = useState(false);
  const [trustedContact, setTrustedContact] = useState(null);
  const [editTrustedContactVisible, setEditTrustedContactVisible] = useState(false);
  const [editContactName, setEditContactName] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const profileData = await fetchProfileData();
      const moodData = await fetchMoodHistory(profileData.userId);
      const personalizationData = await getPersonalization();
      const trustedContactData = await getTrustedContact();

      setProfile(profileData);
      setNotificationsEnabled(profileData.notificationsEnabled !== false);
      setIsPublic(profileData.isPublic === true);
      setMoods(moodData);
      setPersonalization(personalizationData);
      setTrustedContact(trustedContactData);
    } catch (error) {
      console.warn('[Profile] Load error:', error.message || error);
      Alert.alert(t('profile.profileError'), error.message || t('profile.loadFailed', { defaultValue: 'Could not load profile data. Please try again.' }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditProfile = () => {
    const initialName = profile?.fullName || '';
    setEditName(initialName);
    setEditNameError(getFullNameValidationError(initialName));
    setEditVisible(true);
  };

  const handleNameChange = (value) => {
    setEditName(value);
    setEditNameError(getFullNameValidationError(value));
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    const validationMessage = getFullNameValidationError(trimmedName);

    if (validationMessage) {
      setEditNameError(validationMessage);
      Alert.alert(t('profile.validation'), validationMessage);
      return;
    }

    try {
      setSavingProfile(true);
      const savedName = await updateProfileFullName(trimmedName);
      setProfile((prev) => ({
        ...(prev || {}),
        fullName: savedName,
      }));
      setEditVisible(false);
      Alert.alert(t('profile.editTitle'), t('profile.profileUpdateSuccess'));
    } catch (error) {
      console.error('[Profile] Update error:', error.message || error);
      Alert.alert(t('profile.updateFailed'), error.message || t('profile.updateProfileFailed', { defaultValue: 'Could not update your profile.' }));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    Alert.alert(t('profile.signOut'), t('profile.confirmSignOut'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            await logoutCurrentUser();
            // RootNavigator listens to auth state changes and will navigate to SignIn.
          } catch (error) {
            console.error('[Profile] Logout error:', error.message || error);
            Alert.alert(t('profile.logoutFailed'), error.message || t('auth.genericError', { defaultValue: 'Please try again.' }));
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleChangePhoto = async () => {
    if (updatingPhoto) return;

    try {
      setUpdatingPhoto(true);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('profile.permissionRequired'), t('profile.photoPermissionText'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType?.Images || ImagePicker.MediaTypeOptions?.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedImageUri = result.assets[0].uri;
      const savedPhotoURL = await updateProfilePhoto(selectedImageUri);

      setProfile((prev) => ({
        ...(prev || {}),
        photoURL: savedPhotoURL,
      }));

      Alert.alert(t('profile.editTitle'), t('profile.profilePhotoUpdateSuccess'));
    } catch (error) {
      console.error('[Profile] Photo update error:', error.message || error);
      Alert.alert(t('profile.updateFailed'), error.message || t('profile.updatePhotoFailed', { defaultValue: 'Could not update profile photo.' }));
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const handleLanguageChange = async (nextLanguage) => {
    if (!nextLanguage || nextLanguage === language) {
      return;
    }

    try {
      await setLanguage(nextLanguage);
      setProfile((prev) => ({
        ...(prev || {}),
        preferredLanguage: nextLanguage,
      }));
    } catch (error) {
      console.error('[Profile] Language change error:', error.message || error);
      Alert.alert(t('profile.updateFailed'), t('language.changeFailed', { defaultValue: 'Could not change language right now.' }));
    }
  };

  const handleToggleNotifications = async (enabled) => {
    if (!profile?.userId || updatingNotifications) {
      return;
    }

    const previousValue = notificationsEnabled;
    setNotificationsEnabled(enabled);
    setUpdatingNotifications(true);

    try {
      await updateNotificationPreference(enabled);

      if (enabled) {
        await initializeProactiveNotifications({
          userId: profile.userId,
          userName: profile.fullName || t('profile.mindcareUser'),
          language,
          force: true,
        });
      } else {
        await cancelMindCareScheduledNotifications();
      }
    } catch (error) {
      console.error('[Profile] Notification preference error:', error.message || error);
      setNotificationsEnabled(previousValue);
      Alert.alert(t('profile.notificationUpdateFailed'), error.message || t('profile.updateNotificationsFailed', { defaultValue: 'Could not update notification settings.' }));
    } finally {
      setUpdatingNotifications(false);
    }
  };

  const handleTogglePrivacy = async (enabled) => {
    if (!profile?.userId || updatingPrivacy) return;

    const previousValue = isPublic;
    setIsPublic(enabled);
    setUpdatingPrivacy(true);

    try {
      // Need to import updateProfilePrivacy from profileService
      const { updateProfilePrivacy } = require('../services/profileService');
      await updateProfilePrivacy(enabled);
    } catch (error) {
      console.error('[Profile] Privacy update error:', error.message || error);
      setIsPublic(previousValue);
      Alert.alert('Update Failed', 'Could not update privacy settings.');
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const handleToggleDarkMode = async (enabled) => {
    if (enabled !== isDark) {
      await toggleTheme();
    }
  };

  const handleEditPersonalization = () => {
    if (personalization) {
      const personalizationData = {
        role: personalization.role || null,
        concern: personalization.concern || null,
        supportStyle: personalization.supportStyle || null,
      };
      setEditPersonalization(personalizationData);
      setOriginalPersonalization(personalizationData);
    }
    setEditPersonalizationVisible(true);
  };

  const handleSavePersonalization = async () => {
    if (!editPersonalization.role || !editPersonalization.concern || !editPersonalization.supportStyle) {
      Alert.alert(t('personalization.selectOption', { defaultValue: 'Please select an option' }));
      return;
    }

    setSavingPersonalization(true);

    try {
      const updated = await updatePersonalization({
        role: editPersonalization.role,
        concern: editPersonalization.concern,
        supportStyle: editPersonalization.supportStyle,
      });

      setPersonalization(updated);
      setEditPersonalizationVisible(false);
      Alert.alert(t('profile.success'), t('personalization.updateSuccess', { defaultValue: 'Your preferences have been updated!' }));
    } catch (error) {
      console.error('[Profile] Personalization update error:', error.message || error);
      Alert.alert(t('profile.updateFailed'), error.message || t('profile.updateFailed'));
    } finally {
      setSavingPersonalization(false);
    }
  };

  const handleGoBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Home');
  };

  const handleEditTrustedContact = () => {
    if (trustedContact) {
      setEditContactName(trustedContact.name || '');
      setEditContactPhone(trustedContact.phone || '');
    } else {
      setEditContactName('');
      setEditContactPhone('');
    }
    setEditTrustedContactVisible(true);
  };

  const handleSaveTrustedContact = async () => {
    const trimmedName = editContactName.trim();
    const trimmedPhone = editContactPhone.trim();

    if (!trimmedName || !trimmedPhone) {
      Alert.alert(
        t('trustedContact.errorTitle', { defaultValue: 'Incomplete' }),
        t('trustedContact.fillAllFields', { defaultValue: 'Please fill in all fields' })
      );
      return;
    }

    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(trimmedPhone.replace(/\s/g, ''))) {
      Alert.alert(
        t('trustedContact.invalidPhone', { defaultValue: 'Invalid Phone' }),
        t('trustedContact.invalidPhoneMsg', { defaultValue: 'Please enter a valid phone number' })
      );
      return;
    }

    try {
      setSavingContact(true);
      await updateTrustedContact(trimmedName, trimmedPhone.replace(/\s/g, ''));
      const updated = await getTrustedContact();
      setTrustedContact(updated);
      setEditTrustedContactVisible(false);
      Alert.alert(t('profile.success'), t('trustedContact.contactSaved', { defaultValue: 'Trusted contact saved!' }));
    } catch (error) {
      console.error('[Profile] Trusted contact update error:', error.message || error);
      Alert.alert(
        t('trustedContact.errorSaving', { defaultValue: 'Error' }),
        error.message || t('trustedContact.errorSavingMsg', { defaultValue: 'Failed to save contact.' })
      );
    } finally {
      setSavingContact(false);
    }
  };

  const handleOpenContactsForEdit = async () => {
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
      Alert.alert('Error', 'Failed to access contacts. Please try again.');
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSelectContactForEdit = (contact) => {
    setEditContactName(contact.name);
    if (contact.phones && contact.phones.length > 0) {
      setEditContactPhone(contact.phones[0]);
    }
    setShowContactsModal(false);
  };

  const handleRemoveTrustedContact = () => {
    Alert.alert(
      t('trustedContact.removeConfirm', { defaultValue: 'Remove Trusted Contact' }),
      t('trustedContact.removeConfirmMsg', { defaultValue: 'Are you sure? You can add another contact later.' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove', { defaultValue: 'Remove' }),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTrustedContact();
              setTrustedContact(null);
              Alert.alert(t('profile.success'), t('trustedContact.contactRemoved', { defaultValue: 'Trusted contact removed.' }));
            } catch (error) {
              console.error('[Profile] Remove trusted contact error:', error);
              Alert.alert(t('profile.updateFailed'), error.message || 'Failed to remove contact.');
            }
          },
        },
      ]
    );
  };

  const handleOpenContacts = async () => {
    try {
      setLoadingContacts(true);
      const permission = await Contacts.requestPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert(
          t('trustedContact.permissionRequired', { defaultValue: 'Permission Required' }),
          t('trustedContact.contactsPermissionText', { defaultValue: 'Please grant contacts permission.' })
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
          t('trustedContact.noContactsMsg', { defaultValue: 'No contacts found.' })
        );
      }
    } catch (error) {
      console.error('Error accessing contacts:', error);
      Alert.alert('Error', 'Failed to access contacts.');
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSelectContact = (contact) => {
    setEditContactName(contact.name);
    if (contact.phones && contact.phones.length > 0) {
      setEditContactPhone(contact.phones[0]);
    }
    setShowContactsModal(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: isDark ? '#0F172A' : '#F7F9FC' }]}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={[styles.loadingText, { color: theme.mutedText }]}>{t('profile.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: isDark ? '#0F172A' : '#F7F9FC' }]}>
      {/* Animated Background Gradient Circles */}
      {isDark && (
        <>
          <Animated.View style={[styles.bgGradientCircle, styles.bgCircleTop]} />
          <Animated.View style={[styles.bgGradientCircle, styles.bgCircleBottom]} />
        </>
      )}

      <Animated.ScrollView onScroll={handleScroll} scrollEventThrottle={16}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#60A5FA" />}
      >
        {/* ===== HEADER SECTION (TOP HERO AREA) ===== */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarGradientBg}>
              {updatingPhoto ? (
                <ActivityIndicator size="large" color="#6C8EFF" />
              ) : profile?.photoURL ? (
                <Text style={{ fontSize: 48 }}>👤</Text>
              ) : (
                <Text style={{ fontSize: 48 }}>👤</Text>
              )}
            </View>
            <Pressable
              onPress={handleChangePhoto}
              disabled={updatingPhoto}
              style={styles.editBadge}
            >
              <MaterialCommunityIcons name="pencil" size={14} color="#FFFFFF" />
            </Pressable>
          </View>

          <Text style={styles.heroGreeting}>
            Hello, {profile?.fullName ? profile.fullName.split(' ')[0] : 'friend'} 👋
          </Text>
          <Text style={styles.heroSubtitle}>
            Your emotional wellness companion
          </Text>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>🟢 Stable and improving</Text>
          </View>
        </View>

        {/* ===== AI COMPANION SECTION ===== */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your AI Companion Style</Text>
            <Pressable onPress={handleEditPersonalization} style={styles.iconButton}>
              <MaterialCommunityIcons name="pencil" size={18} color="#6C8EFF" />
            </Pressable>
          </View>

          <View style={styles.aiChipsContainer}>
            {personalization?.role || personalization?.concern || personalization?.supportStyle ? (
              <>
                {personalization.role && (
                  <View style={[styles.aiChip, { backgroundColor: '#EAF2FF' }]}>
                    <Text style={[styles.aiChipText, { color: '#6C8EFF' }]}>🎓 {personalization.role}</Text>
                  </View>
                )}
                {personalization.supportStyle && (
                  <View style={[styles.aiChip, { backgroundColor: '#F3ECFF' }]}>
                    <Text style={[styles.aiChipText, { color: '#A98EFF' }]}>🌿 {personalization.supportStyle}</Text>
                  </View>
                )}
                {personalization.concern && (
                  <View style={[styles.aiChip, { backgroundColor: '#FFF0F5' }]}>
                    <Text style={[styles.aiChipText, { color: '#FF8DA1' }]}>🧠 {personalization.concern}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>Tap the pencil to personalize your AI.</Text>
            )}
          </View>
        </Animated.View>

        {/* ===== SAFETY CIRCLE SECTION ===== */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Safety Circle</Text>
          
          {trustedContact ? (
            <View style={styles.safetyCard}>
              <View style={styles.safetyAvatar}>
                <Text style={styles.safetyAvatarText}>
                  {trustedContact.name?.charAt(0).toUpperCase() || '👤'}
                </Text>
              </View>
              <View style={styles.safetyInfo}>
                <Text style={styles.safetyName}>{trustedContact.name}</Text>
                <Text style={styles.safetyRelation}>{trustedContact.phone}</Text>
              </View>
              <Pressable onPress={handleEditTrustedContact} style={styles.iconButton}>
                <MaterialCommunityIcons name="pencil" size={18} color="#6C8EFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={handleEditTrustedContact} style={styles.safetyCtaCard}>
              <MaterialCommunityIcons name="heart-plus-outline" size={24} color="#6C8EFF" style={{ marginBottom: 8 }} />
              <Text style={styles.safetyCtaText}>💙 Add someone you trust</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* ===== ACCOUNT INFORMATION SECTION ===== */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.sectionContainer}>
          <View style={styles.accountCard}>
            <Pressable onPress={handleEditProfile} style={styles.accountEditButton}>
              <MaterialCommunityIcons name="pencil" size={18} color="#6B7280" />
            </Pressable>
            
            <View style={styles.accountRow}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#6C8EFF" style={styles.accountIcon} />
              <View>
                <Text style={styles.accountLabel}>FULL NAME</Text>
                <Text style={styles.accountValue}>{profile?.fullName || 'Not set'}</Text>
              </View>
            </View>
            
            <View style={styles.accountDivider} />
            
            <View style={styles.accountRow}>
              <MaterialCommunityIcons name="email-outline" size={20} color="#6C8EFF" style={styles.accountIcon} />
              <View>
                <Text style={styles.accountLabel}>EMAIL</Text>
                <Text style={styles.accountValue}>{profile?.email || 'Not set'}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ===== LANGUAGE SECTION ===== */}
        <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🌐 Languages</Text>
          <View style={styles.languageChipsContainer}>
            {supportedLanguages.map((code) => {
              const isActive = language === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => {
                    handleLanguageChange(code);
                    Haptics.selectionAsync();
                  }}
                  style={[styles.languageChip, isActive && styles.languageChipActive]}
                >
                  <Text style={[styles.languageChipText, isActive && styles.languageChipTextActive]}>
                    {languageMeta?.[code]?.nativeName || code}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* ===== SETTINGS SECTION ===== */}
        <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.sectionContainer}>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <MaterialCommunityIcons name="moon-waning-crescent" size={22} color="#A98EFF" style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingSubtitle}>Soothing for nighttime</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: '#E5E7EB', true: '#A98EFF' }}
                thumbColor="#FFFFFF"
              />
            </View>
            
            <View style={styles.settingDivider} />
            
            <View style={styles.settingRow}>
              <MaterialCommunityIcons name="bell-outline" size={22} color="#6C8EFF" style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Supportive Reminders</Text>
                <Text style={styles.settingSubtitle}>Daily check-ins & encouragement</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                disabled={updatingNotifications}
                trackColor={{ false: '#E5E7EB', true: '#6C8EFF' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingRow}>
              <MaterialCommunityIcons name="earth" size={22} color="#10B981" style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Public Leaderboard</Text>
                <Text style={styles.settingSubtitle}>Opt-in to global ranking</Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={handleTogglePrivacy}
                disabled={updatingPrivacy}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>
            
            <View style={styles.settingDivider} />
            
            <TouchableOpacity 
              style={styles.settingRow} 
              onPress={() => navigation.navigate('AccountDataControls')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#10B981" style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Account & Data Controls</Text>
                <Text style={styles.settingSubtitle}>Privacy, downloads, & deletion</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={isDark ? '#475569' : '#CBD5E1'} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ===== LOGOUT BUTTON ===== */}
        <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.logoutContainer}>
          <Pressable onPress={handleLogout} disabled={loggingOut} style={styles.logoutButton}>
            {loggingOut ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <MaterialCommunityIcons name="logout" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.logoutText}>Logout</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
</Animated.ScrollView>

      {/* ===== MODALS ===== */}
      {/* Edit Name Modal */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)' }]}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#E2E8F0' : '#1F2937' }]}>
              {t('profile.editTitle')}
            </Text>
            <Text style={[styles.modalLabel, { color: isDark ? '#94A3B8' : '#6B7280' }]}>
              {t('profile.fullName')}
            </Text>
            <TextInput
              value={editName}
              onChangeText={handleNameChange}
              placeholder={t('profile.enterFullName')}
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
              style={[
                styles.modalInput,
                {
                  color: isDark ? '#E2E8F0' : '#1F2937',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(96, 165, 250, 0.05)',
                  borderColor: editNameError ? '#EF4444' : (isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(96, 165, 250, 0.2)'),
                },
                editNameError ? styles.modalInputError : null,
              ]}
              editable={!savingProfile}
              autoCapitalize="words"
            />
            {editNameError ? <Text style={[styles.errorText, { color: '#EF4444' }]}>{editNameError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setEditVisible(false)}
                disabled={savingProfile}
              >
                <Text style={[styles.cancelText, { color: isDark ? '#94A3B8' : '#6B7280' }]}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: (savingProfile || !!editNameError) ? '#94A3B8' : '#60A5FA' }
                ]}
                onPress={handleSaveProfile}
                disabled={savingProfile || !!editNameError}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>{t('common.save')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Trusted Contact Modal */}
      <Modal visible={editTrustedContactVisible} transparent animationType="slide" onRequestClose={() => setEditTrustedContactVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)' }}>
          <View style={{
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 32,
            maxHeight: '85%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 10,
          }}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Header */}
              <View style={{ marginBottom: 28, alignItems: 'center' }}>
                <Text style={{
                  fontSize: 26,
                  fontWeight: '700',
                  color: isDark ? '#E2E8F0' : '#1F2937',
                  marginBottom: 8,
                }}>
                  {trustedContact ? 'Edit Contact' : 'Add Trusted Contact'}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: isDark ? '#94A3B8' : '#6B7280',
                  textAlign: 'center',
                }}>
                  Someone to reach out to during difficult moments
                </Text>
              </View>

              {/* Contact Name Input */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: isDark ? '#94A3B8' : '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 10,
                }}>
                  Contact Name
                </Text>
                <TextInput
                  placeholder={t('trustedContact.contactNamePlaceholder', { defaultValue: 'e.g., Mom, Friend' })}
                  placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                  value={editContactName}
                  onChangeText={setEditContactName}
                  editable={!savingContact}
                  autoCapitalize="words"
                  style={{
                    height: 56,
                    borderRadius: 18,
                    paddingHorizontal: 16,
                    fontSize: 16,
                    fontWeight: '500',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(96, 165, 250, 0.05)',
                    color: isDark ? '#E2E8F0' : '#1F2937',
                    borderWidth: 1.5,
                    borderColor: isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(96, 165, 250, 0.2)',
                  }}
                />
              </View>

              {/* Phone Input */}
              <View style={{ marginBottom: 32 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: isDark ? '#94A3B8' : '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 10,
                }}>
                  Phone Number
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <TextInput
                    placeholder={t('trustedContact.phoneNumberPlaceholder', { defaultValue: '+91 98765 43210' })}
                    placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                    value={editContactPhone}
                    onChangeText={setEditContactPhone}
                    keyboardType="phone-pad"
                    editable={!savingContact}
                    style={{
                      flex: 1,
                      height: 56,
                      borderRadius: 18,
                      paddingHorizontal: 16,
                      fontSize: 16,
                      fontWeight: '500',
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(96, 165, 250, 0.05)',
                      color: isDark ? '#E2E8F0' : '#1F2937',
                      borderWidth: 1.5,
                      borderColor: isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(96, 165, 250, 0.2)',
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      handleOpenContactsForEdit();
                    }}
                    disabled={savingContact || loadingContacts}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      backgroundColor: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(96, 165, 250, 0.1)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: '#60A5FA',
                    }}
                  >
                    <MaterialCommunityIcons
                      name={loadingContacts ? 'loading' : 'contacts'}
                      size={22}
                      color="#60A5FA"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 12,
              marginTop: 8,
              borderTopWidth: 1,
              borderTopColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(96, 165, 250, 0.1)',
              paddingTop: 16,
            }}>
              <TouchableOpacity
                onPress={() => {
                  setEditTrustedContactVisible(false);
                  setEditContactName('');
                  setEditContactPhone('');
                }}
                disabled={savingContact}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: 'transparent',
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(96, 165, 250, 0.2)',
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: '600',
                  color: isDark ? '#A7D8FF' : '#0369A1',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  handleSaveTrustedContact();
                }}
                disabled={savingContact || !editContactName.trim() || !editContactPhone.trim()}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: (savingContact || !editContactName.trim() || !editContactPhone.trim()) ? '#94A3B8' : '#60A5FA',
                }}
              >
                {savingContact ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{
                    textAlign: 'center',
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#FFFFFF',
                  }}>
                    Save Contact
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contacts Selection Modal */}
      <Modal visible={showContactsModal} transparent animationType="slide" onRequestClose={() => setShowContactsModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(96, 165, 250, 0.1)',
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: isDark ? '#E2E8F0' : '#1F2937' }}>
              {t('trustedContact.selectContact', { defaultValue: 'Select Contact' })}
            </Text>
            <TouchableOpacity onPress={() => setShowContactsModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={isDark ? '#E2E8F0' : '#1F2937'} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={deviceContacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectContactForEdit(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 0.5,
                  borderBottomColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(96, 165, 250, 0.1)',
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                }}
              >
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(96, 165, 250, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: isDark ? '#E0E7FF' : '#0369A1' }}>
                    {item.name[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: isDark ? '#E2E8F0' : '#1F2937' }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#6B7280', marginTop: 4 }}>
                    {item.phones[0]}
                  </Text>
                </View>
              </Pressable>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </SafeAreaView>
      </Modal>

      {/* Personalization Modal */}
      <Modal visible={editPersonalizationVisible} transparent animationType="slide" onRequestClose={() => setEditPersonalizationVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)' }}>
          <View style={{
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 32,
            maxHeight: '90%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 10,
          }}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Header */}
              <View style={{ marginBottom: 28, alignItems: 'center' }}>
                <Text style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: isDark ? '#E2E8F0' : '#1F2937',
                  marginBottom: 8,
                }}>
                  Customize Your AI Style
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: isDark ? '#94A3B8' : '#6B7280',
                  textAlign: 'center',
                }}>
                  Help MindCare understand your needs
                </Text>
              </View>

              {/* Role Section */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: isDark ? '#94A3B8' : '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 12,
                }}>
                  Your Role
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { id: 'student', icon: '🎓', label: 'Student' },
                    { id: 'professional', icon: '💼', label: 'Professional' },
                    { id: 'homemaker', icon: '🏠', label: 'Homemaker' },
                  ].map((role) => (
                    <TouchableOpacity
                      key={role.id}
                      onPress={() => {
                        setEditPersonalization({ ...editPersonalization, role: role.id });
                        Haptics.selectionAsync();
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 20,
                        backgroundColor: editPersonalization.role === role.id
                          ? '#60A5FA'
                          : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(96, 165, 250, 0.05)',
                        borderWidth: editPersonalization.role === role.id ? 0 : 1,
                        borderColor: editPersonalization.role === role.id ? 'transparent' : (isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(96, 165, 250, 0.2)'),
                      }}
                    >
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '500',
                        color: editPersonalization.role === role.id ? '#FFFFFF' : (isDark ? '#E0E7FF' : '#0369A1'),
                      }}>
                        {role.icon} {role.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Concern Section */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: isDark ? '#94A3B8' : '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 12,
                }}>
                  Main Concern
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { id: 'stress', icon: '😣', label: 'Stress' },
                    { id: 'anxiety', icon: '😟', label: 'Anxiety' },
                    { id: 'overthinking', icon: '🧠', label: 'Overthinking' },
                    { id: 'lowMood', icon: '🌧', label: 'Low Mood' },
                  ].map((concern) => (
                    <TouchableOpacity
                      key={concern.id}
                      onPress={() => {
                        setEditPersonalization({ ...editPersonalization, concern: concern.id });
                        Haptics.selectionAsync();
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 20,
                        backgroundColor: editPersonalization.concern === concern.id
                          ? '#8B5CF6'
                          : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(139, 92, 246, 0.05)',
                        borderWidth: editPersonalization.concern === concern.id ? 0 : 1,
                        borderColor: editPersonalization.concern === concern.id ? 'transparent' : (isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(139, 92, 246, 0.2)'),
                      }}
                    >
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '500',
                        color: editPersonalization.concern === concern.id ? '#FFFFFF' : (isDark ? '#D8B4FE' : '#7C3AED'),
                      }}>
                        {concern.icon} {concern.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Support Style */}
              <View style={{ marginBottom: 32 }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: isDark ? '#94A3B8' : '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 12,
                }}>
                  Support Style
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { id: 'calm', icon: '🌿', label: 'Calm' },
                    { id: 'motivational', icon: '🚀', label: 'Motivational' },
                    { id: 'practical', icon: '🔧', label: 'Practical' },
                  ].map((style) => (
                    <TouchableOpacity
                      key={style.id}
                      onPress={() => {
                        setEditPersonalization({ ...editPersonalization, supportStyle: style.id });
                        Haptics.selectionAsync();
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 20,
                        backgroundColor: editPersonalization.supportStyle === style.id
                          ? '#22C55E'
                          : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(34, 197, 94, 0.05)',
                        borderWidth: editPersonalization.supportStyle === style.id ? 0 : 1,
                        borderColor: editPersonalization.supportStyle === style.id ? 'transparent' : (isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(34, 197, 94, 0.2)'),
                      }}
                    >
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '500',
                        color: editPersonalization.supportStyle === style.id ? '#FFFFFF' : (isDark ? '#86EFAC' : '#15803D'),
                      }}>
                        {style.icon} {style.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={{
              flexDirection: 'row',
              gap: 12,
              marginTop: 12,
              borderTopWidth: 1,
              borderTopColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(96, 165, 250, 0.1)',
              paddingTop: 16,
            }}>
              <TouchableOpacity
                onPress={() => setEditPersonalizationVisible(false)}
                disabled={savingPersonalization}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: 'transparent',
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(96, 165, 250, 0.2)',
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: '600',
                  color: isDark ? '#A7D8FF' : '#0369A1',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <Pressable
                onPress={handleSavePersonalization}
                disabled={savingPersonalization || (
                  editPersonalization.role === originalPersonalization.role &&
                  editPersonalization.concern === originalPersonalization.concern &&
                  editPersonalization.supportStyle === originalPersonalization.supportStyle
                )}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: (
                    editPersonalization.role === originalPersonalization.role &&
                    editPersonalization.concern === originalPersonalization.concern &&
                    editPersonalization.supportStyle === originalPersonalization.supportStyle
                  ) ? '#94A3B8' : '#60A5FA',
                }}
              >
                {savingPersonalization ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{
                    textAlign: 'center',
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#FFFFFF',
                  }}>
                    Save Changes
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <FloatingBottomNav activeTab="Profile" onTabPress={(tab) => navigation.navigate(tab)} />
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  screen: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  
  // Header / Hero Section
  heroSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGradientBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C8EFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#A98EFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F6F8FC',
  },
  heroGreeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
  },
  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },

  // Generic Sections
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  iconButton: {
    padding: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // AI Companion Section
  aiChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  aiChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  aiChipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Emotional Journey Section
  emptyJourneyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyJourneyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 50,
  },
  timelineNodeContainer: {
    width: 20,
    alignItems: 'center',
    marginRight: 16,
  },
  timelineNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6C8EFF',
    marginTop: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#EAF2FF',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 16,
  },
  timelineEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  timelineMood: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  timelineDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  // Safety Circle
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  safetyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  safetyAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6C8EFF',
  },
  safetyInfo: {
    flex: 1,
  },
  safetyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  safetyRelation: {
    fontSize: 14,
    color: '#6B7280',
  },
  safetyCtaCard: {
    backgroundColor: '#EAF2FF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CDE0FF',
  },
  safetyCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6C8EFF',
  },

  // Account Card
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    position: 'relative',
  },
  accountEditButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  accountIcon: {
    marginRight: 16,
  },
  accountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  accountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  accountDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
    marginLeft: 36,
  },

  // Languages
  languageChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  languageChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  languageChipActive: {
    borderColor: '#6C8EFF',
    backgroundColor: '#EAF2FF',
  },
  languageChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  languageChipTextActive: {
    color: '#6C8EFF',
    fontWeight: '600',
  },

  // Settings
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 38,
  },

  // Logout
  logoutContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Modal styles remaining the same generally
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#6C8EFF',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ProfileScreen;
