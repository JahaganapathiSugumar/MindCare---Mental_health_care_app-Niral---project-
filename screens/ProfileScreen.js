import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  DeviceEventEmitter,
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
  Image,
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
import TopBackButton from '../components/ui/Premium/TopBackButton';

const { width } = Dimensions.get('window');

// Light color scheme
const COLORS = {
  background: '#F0F4F8',
  card: '#FFFFFF',
  primary: '#4A90D9',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E8EDF2',
  shadow: 'rgba(0,0,0,0.06)',
  gold: '#F1C40F',
  purple: '#8E44AD',
  accent: '#E67E22',
  pink: '#FF6B9D',
};

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

  const getAvatarDisplay = () => {
    if (updatingPhoto) {
      return <ActivityIndicator size="small" color={COLORS.primary} />;
    }
    
    if (profile?.photoURL) {
      return (
        <Image 
          source={{ uri: profile.photoURL }} 
          style={{ width: 72, height: 72, borderRadius: 36 }}
          onError={() => {
            console.log('Failed to load profile image');
          }}
        />
      );
    }
    
    return <Text style={{ fontSize: 36 }}>👤</Text>;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: COLORS.background }]}>
      <TopBackButton fallbackRoute="Home" />
      
      <Animated.ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>👤 Profile</Text>
              <Text style={styles.headerSubtitle}>Manage your account settings</Text>
            </View>
          </View>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatarGradientBg, profile?.photoURL && { padding: 0 }]}>
                  {getAvatarDisplay()}
                </View>
                <Pressable
                  onPress={handleChangePhoto}
                  disabled={updatingPhoto}
                  style={styles.editBadge}
                >
                  <MaterialCommunityIcons name="camera" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.fullName || 'User'}</Text>
                <Text style={styles.profileEmail}>{profile?.email || 'No email'}</Text>
                <TouchableOpacity style={styles.editProfileBtn} onPress={handleEditProfile}>
                  <MaterialCommunityIcons name="pencil" size={14} color={COLORS.primary} />
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(150).duration(600)}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{moods.length}</Text>
              <Text style={styles.statLabel}>Moods Logged</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile?.streak || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile?.totalXP || 0}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
          </View>
        </Animated.View>

        {/* AI Companion Style */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🤖 AI Companion Style</Text>
            <Pressable onPress={handleEditPersonalization} style={styles.iconButton}>
              <MaterialCommunityIcons name="pencil" size={18} color={COLORS.primary} />
            </Pressable>
          </View>

          <View style={styles.aiChipsContainer}>
            {personalization?.role || personalization?.concern || personalization?.supportStyle ? (
              <>
                {personalization.role && (
                  <View style={[styles.aiChip, { backgroundColor: `${COLORS.primary}15` }]}>
                    <Text style={[styles.aiChipText, { color: COLORS.primary }]}>🎓 {personalization.role}</Text>
                  </View>
                )}
                {personalization.supportStyle && (
                  <View style={[styles.aiChip, { backgroundColor: `${COLORS.purple}15` }]}>
                    <Text style={[styles.aiChipText, { color: COLORS.purple }]}>🌿 {personalization.supportStyle}</Text>
                  </View>
                )}
                {personalization.concern && (
                  <View style={[styles.aiChip, { backgroundColor: `${COLORS.pink}15` }]}>
                    <Text style={[styles.aiChipText, { color: COLORS.pink }]}>🧠 {personalization.concern}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>{t('profile.personalizePrompt', { defaultValue: 'Tap the pencil to personalize your AI.' })}</Text>
            )}
          </View>
        </Animated.View>

        {/* Safety Circle */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('profile.safetyCircle', { defaultValue: '💙 Safety Circle' })}</Text>
          
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
              <View style={styles.safetyActions}>
                <Pressable onPress={handleEditTrustedContact} style={styles.safetyActionBtn}>
                  <MaterialCommunityIcons name="pencil" size={18} color={COLORS.primary} />
                </Pressable>
                <Pressable onPress={handleRemoveTrustedContact} style={styles.safetyActionBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.danger} />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={handleEditTrustedContact} style={styles.safetyCtaCard}>
              <MaterialCommunityIcons name="heart-plus-outline" size={28} color={COLORS.primary} />
              <Text style={styles.safetyCtaText}>{t('profile.addTrustedContact', { defaultValue: 'Add someone you trust' })}</Text>
              <Text style={styles.safetyCtaSubtext}>{t('profile.addTrustedContactSubtext', { defaultValue: 'A contact to reach out to during difficult moments' })}</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* Languages */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('profile.languages', { defaultValue: '🌐 Languages' })}</Text>
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

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('profile.settings', { defaultValue: '⚙️ Settings' })}</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: `${COLORS.purple}15` }]}>
                <MaterialCommunityIcons name="moon-waning-crescent" size={20} color={COLORS.purple} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('profile.darkMode', { defaultValue: 'Dark Mode' })}</Text>
                <Text style={styles.settingSubtitle}>{t('profile.darkModeSubtitle', { defaultValue: 'Soothing for nighttime' })}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: '#E5E7EB', true: COLORS.purple }}
                thumbColor="#FFFFFF"
              />
            </View>
            
            <View style={styles.settingDivider} />
            
            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: `${COLORS.primary}15` }]}>
                <MaterialCommunityIcons name="bell-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('profile.supportiveReminders', { defaultValue: 'Supportive Reminders' })}</Text>
                <Text style={styles.settingSubtitle}>{t('profile.supportiveRemindersSubtitle', { defaultValue: 'Daily check-ins & encouragement' })}</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                disabled={updatingNotifications}
                trackColor={{ false: '#E5E7EB', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: `${COLORS.success}15` }]}>
                <MaterialCommunityIcons name="earth" size={20} color={COLORS.success} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('profile.publicLeaderboard', { defaultValue: 'Public Leaderboard' })}</Text>
                <Text style={styles.settingSubtitle}>{t('profile.publicLeaderboardSubtitle', { defaultValue: 'Opt-in to global ranking' })}</Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={handleTogglePrivacy}
                disabled={updatingPrivacy}
                trackColor={{ false: '#E5E7EB', true: COLORS.success }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: `${COLORS.success}15` }]}>
                <MaterialCommunityIcons name="shield-lock-outline" size={20} color={COLORS.success} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('profile.accountControls', { defaultValue: 'Account & Data Controls' })}</Text>
                <Text style={styles.settingSubtitle}>{t('profile.accountControlsSubtitle', { defaultValue: 'Privacy, downloads, & deletion' })}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => navigation.navigate('AccountDataControls')}
                style={{ padding: 4 }}
              >
                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.logoutContainer}>
          <TouchableOpacity onPress={handleLogout} disabled={loggingOut} style={styles.logoutButton}>
            {loggingOut ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <>
                <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} />
                <Text style={styles.logoutText}>{t('profile.logoutBtn', { defaultValue: 'Logout' })}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}>
          <View style={[styles.modalCard, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>
              {t('profile.editTitle')}
            </Text>
            <Text style={[styles.modalLabel, { color: COLORS.textLight }]}>
              {t('profile.fullName')}
            </Text>
            <TextInput
              value={editName}
              onChangeText={handleNameChange}
              placeholder={t('profile.enterFullName')}
              placeholderTextColor={COLORS.textLight}
              style={[
                styles.modalInput,
                {
                  color: COLORS.text,
                  backgroundColor: `${COLORS.primary}05`,
                  borderColor: editNameError ? COLORS.danger : `${COLORS.primary}20`,
                },
                editNameError ? styles.modalInputError : null,
              ]}
              editable={!savingProfile}
              autoCapitalize="words"
            />
            {editNameError ? <Text style={[styles.errorText, { color: COLORS.danger }]}>{editNameError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setEditVisible(false)}
                disabled={savingProfile}
              >
                <Text style={[styles.cancelText, { color: COLORS.textLight }]}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  { backgroundColor: (savingProfile || !!editNameError) ? COLORS.textLight : COLORS.primary }
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
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <View style={[styles.contactModal, { backgroundColor: COLORS.card }]}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.contactModalHeader}>
                <Text style={[styles.contactModalTitle, { color: COLORS.text }]}>
                  {trustedContact ? 'Edit Contact' : 'Add Trusted Contact'}
                </Text>
                <Text style={[styles.contactModalSubtitle, { color: COLORS.textLight }]}>
                  Someone to reach out to during difficult moments
                </Text>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.inputLabel, { color: COLORS.textLight }]}>Contact Name</Text>
                <TextInput
                  placeholder="e.g., Mom, Friend"
                  placeholderTextColor={COLORS.textLight}
                  value={editContactName}
                  onChangeText={setEditContactName}
                  editable={!savingContact}
                  autoCapitalize="words"
                  style={[styles.contactInput, { color: COLORS.text, backgroundColor: `${COLORS.primary}05`, borderColor: `${COLORS.primary}20` }]}
                />
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={[styles.inputLabel, { color: COLORS.textLight }]}>Phone Number</Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <TextInput
                    placeholder="+91 98765 43210"
                    placeholderTextColor={COLORS.textLight}
                    value={editContactPhone}
                    onChangeText={setEditContactPhone}
                    keyboardType="phone-pad"
                    editable={!savingContact}
                    style={[styles.contactInput, { flex: 1, color: COLORS.text, backgroundColor: `${COLORS.primary}05`, borderColor: `${COLORS.primary}20` }]}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      handleOpenContactsForEdit();
                    }}
                    disabled={savingContact || loadingContacts}
                    style={[styles.contactsBtn, { backgroundColor: `${COLORS.primary}15` }]}
                  >
                    <MaterialCommunityIcons
                      name={loadingContacts ? 'loading' : 'contacts'}
                      size={22}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.contactModalFooter}>
              <TouchableOpacity
                onPress={() => {
                  setEditTrustedContactVisible(false);
                  setEditContactName('');
                  setEditContactPhone('');
                }}
                disabled={savingContact}
                style={[styles.contactCancelBtn, { borderColor: `${COLORS.primary}20` }]}
              >
                <Text style={[styles.contactCancelText, { color: COLORS.primary }]}>Cancel</Text>
              </TouchableOpacity>

              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  handleSaveTrustedContact();
                }}
                disabled={savingContact || !editContactName.trim() || !editContactPhone.trim()}
                style={[
                  styles.contactSaveBtn,
                  { backgroundColor: (savingContact || !editContactName.trim() || !editContactPhone.trim()) ? COLORS.textLight : COLORS.primary }
                ]}
              >
                {savingContact ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.contactSaveText}>Save Contact</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contacts Selection Modal */}
      <Modal visible={showContactsModal} transparent animationType="slide" onRequestClose={() => setShowContactsModal(false)}>
        <SafeAreaView style={[styles.contactsModalContainer, { backgroundColor: COLORS.background }]}>
          <View style={styles.contactsModalHeader}>
            <Text style={[styles.contactsModalTitle, { color: COLORS.text }]}>
              Select Contact
            </Text>
            <TouchableOpacity onPress={() => setShowContactsModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={deviceContacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectContactForEdit(item)}
                style={[styles.contactItem, { backgroundColor: COLORS.card, borderBottomColor: COLORS.border }]}
              >
                <View style={[styles.contactItemAvatar, { backgroundColor: `${COLORS.primary}15` }]}>
                  <Text style={[styles.contactItemInitial, { color: COLORS.primary }]}>
                    {item.name[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactItemName, { color: COLORS.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.contactItemPhone, { color: COLORS.textLight }]}>
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
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <View style={[styles.personalizationModal, { backgroundColor: COLORS.card }]}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.personalizationHeader}>
                <Text style={[styles.personalizationTitle, { color: COLORS.text }]}>
                  Customize Your AI Style
                </Text>
                <Text style={[styles.personalizationSubtitle, { color: COLORS.textLight }]}>
                  Help MindCare understand your needs
                </Text>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.personalizationLabel, { color: COLORS.textLight }]}>Your Role</Text>
                <View style={styles.personalizationOptions}>
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
                      style={[
                        styles.personalizationChip,
                        {
                          backgroundColor: editPersonalization.role === role.id
                            ? COLORS.primary
                            : `${COLORS.primary}08`,
                          borderColor: editPersonalization.role === role.id ? 'transparent' : COLORS.border,
                        }
                      ]}
                    >
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: editPersonalization.role === role.id ? '#FFFFFF' : COLORS.text,
                      }}>
                        {role.icon} {role.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.personalizationLabel, { color: COLORS.textLight }]}>Main Concern</Text>
                <View style={styles.personalizationOptions}>
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
                      style={[
                        styles.personalizationChip,
                        {
                          backgroundColor: editPersonalization.concern === concern.id
                            ? COLORS.purple
                            : `${COLORS.purple}08`,
                          borderColor: editPersonalization.concern === concern.id ? 'transparent' : COLORS.border,
                        }
                      ]}
                    >
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: editPersonalization.concern === concern.id ? '#FFFFFF' : COLORS.text,
                      }}>
                        {concern.icon} {concern.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={[styles.personalizationLabel, { color: COLORS.textLight }]}>Support Style</Text>
                <View style={styles.personalizationOptions}>
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
                      style={[
                        styles.personalizationChip,
                        {
                          backgroundColor: editPersonalization.supportStyle === style.id
                            ? COLORS.success
                            : `${COLORS.success}08`,
                          borderColor: editPersonalization.supportStyle === style.id ? 'transparent' : COLORS.border,
                        }
                      ]}
                    >
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: editPersonalization.supportStyle === style.id ? '#FFFFFF' : COLORS.text,
                      }}>
                        {style.icon} {style.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.personalizationFooter}>
              <TouchableOpacity
                onPress={() => setEditPersonalizationVisible(false)}
                disabled={savingPersonalization}
                style={[styles.personalizationCancelBtn, { borderColor: COLORS.border }]}
              >
                <Text style={[styles.personalizationCancelText, { color: COLORS.textLight }]}>Cancel</Text>
              </TouchableOpacity>

              <Pressable
                onPress={handleSavePersonalization}
                disabled={savingPersonalization || (
                  editPersonalization.role === originalPersonalization.role &&
                  editPersonalization.concern === originalPersonalization.concern &&
                  editPersonalization.supportStyle === originalPersonalization.supportStyle
                )}
                style={[
                  styles.personalizationSaveBtn,
                  {
                    backgroundColor: (
                      editPersonalization.role === originalPersonalization.role &&
                      editPersonalization.concern === originalPersonalization.concern &&
                      editPersonalization.supportStyle === originalPersonalization.supportStyle
                    ) ? COLORS.textLight : COLORS.primary
                  }
                ]}
              >
                {savingPersonalization ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.personalizationSaveText}>Save Changes</Text>
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarGradientBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  editProfileText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  iconButton: {
    padding: 4,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  aiChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  aiChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  safetyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  safetyAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  safetyInfo: {
    flex: 1,
  },
  safetyName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  safetyRelation: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  safetyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  safetyActionBtn: {
    padding: 4,
  },
  safetyCtaCard: {
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  safetyCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 8,
  },
  safetyCtaSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  languageChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  languageChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  languageChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  languageChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  settingDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 48,
  },
  logoutContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.danger}30`,
    backgroundColor: `${COLORS.danger}08`,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
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
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    backgroundColor: `${COLORS.primary}05`,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  modalInputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: `${COLORS.textLight}10`,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  contactModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  contactModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  contactModalSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  contactInput: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1.5,
    borderColor: `${COLORS.primary}20`,
  },
  contactsBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  contactModalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  contactCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  contactCancelText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  contactSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
  },
  contactSaveText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactsModalContainer: {
    flex: 1,
  },
  contactsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contactsModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  contactItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactItemInitial: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactItemName: {
    fontSize: 15,
    fontWeight: '500',
  },
  contactItemPhone: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  personalizationModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  personalizationHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  personalizationTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  personalizationSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  personalizationLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  personalizationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  personalizationChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  personalizationFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  personalizationCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  personalizationCancelText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  personalizationSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
  },
  personalizationSaveText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ProfileScreen;