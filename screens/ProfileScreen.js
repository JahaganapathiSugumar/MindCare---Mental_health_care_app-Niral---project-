import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Animated,
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileHeader from '../components/ProfileHeader';
import InfoCard from '../components/InfoCard';
import MoodItem from '../components/MoodItem';
import {
  fetchMoodHistory,
  fetchProfileData,
  logoutCurrentUser,
  updateNotificationPreference,
  updateProfileFullName,
  updateProfilePhoto,
} from '../services/profileService';
import { getFullNameValidationError } from '../utils/validation';
import {
  cancelMindCareScheduledNotifications,
  initializeProactiveNotifications,
} from '../services/notifications';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

const ProfileScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages, languageMeta } = useLanguage();
  const { theme, isDark, toggleTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [updatingNotifications, setUpdatingNotifications] = useState(false);
  const themeFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    themeFadeAnim.setValue(0.7);
    Animated.timing(themeFadeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isDark, themeFadeAnim]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const profileData = await fetchProfileData();
      const moodData = await fetchMoodHistory(profileData.userId);

      setProfile(profileData);
      setNotificationsEnabled(profileData.notificationsEnabled !== false);
      setMoods(moodData);
    } catch (error) {
      console.error('[Profile] Load error:', error.message || error);
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

  const handleToggleDarkMode = async (enabled) => {
    if (enabled !== isDark) {
      await toggleTheme();
    }
  };

  const handleGoBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Home');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#2A7FBF" />
        <Text style={[styles.loadingText, { color: theme.mutedText }]}>{t('profile.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      {!isDark ? <View style={styles.bgCircleTop} /> : null}
      {!isDark ? <View style={styles.bgCircleBottom} /> : null}

      <Animated.ScrollView
        style={{ opacity: themeFadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={theme.primary} />}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel={t('profile.goBack')}
            activeOpacity={0.85}
          >
            <Text style={[styles.backButtonText, { color: theme.text }]}>← {t('common.back')}</Text>
          </TouchableOpacity>
        </View>

        <ProfileHeader
          fullName={profile?.fullName}
          email={profile?.email}
          photoURL={profile?.photoURL}
          onPhotoPress={handleChangePhoto}
          photoLoading={updatingPhoto}
        />

        <InfoCard title={t('profile.profileInfo')} actionLabel={t('profile.editProfile')} onActionPress={handleEditProfile}>
          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}> 
            <Text style={[styles.infoLabel, { color: theme.mutedText }]}>{t('profile.fullName')}</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{profile?.fullName || t('profile.mindcareUser')}</Text>
          </View>

          <View style={styles.infoRowNoBorder}>
            <Text style={[styles.infoLabel, { color: theme.mutedText }]}>{t('profile.email')}</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{profile?.email || t('profile.notAvailable')}</Text>
          </View>
        </InfoCard>

        <InfoCard title={t('language.change')}>
          <Text style={[styles.infoLabel, { color: theme.mutedText }]}>{t('language.current')}</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>
            {languageMeta?.[language]?.nativeName || language}
          </Text>
          <View style={styles.languageListWrap}>
            {supportedLanguages.map((code) => {
              const isActive = language === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.languageChip,
                    {
                      borderColor: isActive ? theme.primary : theme.border,
                      backgroundColor: isActive ? theme.inputBackground : theme.card,
                    },
                  ]}
                  onPress={() => handleLanguageChange(code)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.languageChipText, { color: isActive ? theme.primary : theme.text }]}>
                    {languageMeta?.[code]?.nativeName || code}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </InfoCard>

        <InfoCard title={t('profile.recentMoodHistory')}>
          {moods.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.mutedText }]}>{t('profile.noMoodRecords')}</Text>
          ) : (
            moods.map((item) => (
              <MoodItem key={item.id} mood={item.mood} createdAt={item.createdAt} />
            ))
          )}
        </InfoCard>

        <InfoCard title={t('profile.appearance')}>
          <View style={styles.notificationRow}>
            <View style={styles.notificationTextWrap}>
              <Text style={[styles.notificationTitle, { color: theme.text }]}>{t('profile.darkMode')}</Text>
              <Text style={[styles.notificationSubtitle, { color: theme.mutedText }]}>{t('profile.darkModeSubtitle')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: '#CBDCE8', true: '#6B86A1' }}
              thumbColor={isDark ? '#6FAEFF' : '#F5FAFF'}
            />
          </View>
        </InfoCard>

        <InfoCard title={t('profile.notifications')}>
          <View style={styles.notificationRow}>
            <View style={styles.notificationTextWrap}>
              <Text style={[styles.notificationTitle, { color: theme.text }]}>{t('profile.supportiveReminders')}</Text>
              <Text style={[styles.notificationSubtitle, { color: theme.mutedText }]}>
                {t('profile.supportiveRemindersSubtitle')}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              disabled={updatingNotifications}
              trackColor={{ false: '#CBDCE8', true: '#9EC9E8' }}
              thumbColor={notificationsEnabled ? '#2A7FBF' : '#F5FAFF'}
            />
          </View>
          {updatingNotifications ? (
            <View style={styles.notificationSavingWrap}>
              <ActivityIndicator size="small" color="#2A7FBF" />
              <Text style={[styles.notificationSavingText, { color: theme.mutedText }]}>{t('profile.updatingPreference')}</Text>
            </View>
          ) : null}
        </InfoCard>



        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          )}
        </TouchableOpacity>
      </Animated.ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('profile.editTitle')}</Text>
            <Text style={[styles.modalLabel, { color: theme.mutedText }]}>{t('profile.fullName')}</Text>
            <TextInput
              value={editName}
              onChangeText={handleNameChange}
              placeholder={t('profile.enterFullName')}
              placeholderTextColor={theme.mutedText}
              style={[
                styles.modalInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.inputBackground,
                },
                editNameError ? styles.modalInputError : null,
              ]}
              editable={!savingProfile}
              autoCapitalize="words"
            />
            {editNameError ? <Text style={styles.inlineErrorText}>{editNameError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setEditVisible(false)} disabled={savingProfile}>
                <Text style={[styles.cancelText, { color: theme.mutedText }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, (savingProfile || !!editNameError) ? styles.saveButtonDisabled : null]}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5FAFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FAFF',
  },
  loadingText: {
    marginTop: 10,
    color: '#446A86',
    fontSize: 14,
  },
  bgCircleTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#D7EEFF',
    top: -120,
    right: -80,
    opacity: 0.8,
  },
  bgCircleBottom: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#EAF6FF',
    bottom: -170,
    left: -120,
    opacity: 0.9,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  topBar: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  backButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#EAF2F8',
    paddingBottom: 12,
    marginBottom: 12,
  },
  infoRowNoBorder: {
    paddingBottom: 2,
  },
  infoLabel: {
    color: '#6A879D',
    fontSize: 12,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    color: '#1C415F',
    fontSize: 15,
    fontWeight: '600',
  },
  languageListWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  languageChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#6B879D',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  notificationTitle: {
    color: '#1C415F',
    fontSize: 15,
    fontWeight: '700',
  },
  notificationSubtitle: {
    marginTop: 4,
    color: '#6B879D',
    fontSize: 12,
    lineHeight: 17,
  },
  notificationSavingWrap: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationSavingText: {
    color: '#4E7491',
    fontSize: 12,
    fontWeight: '600',
  },
  chatButton: {
    marginTop: 6,
    marginBottom: 8,
    backgroundColor: '#2A7FBF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A7FBF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  logoutButton: {
    marginTop: 6,
    backgroundColor: '#2B5F87',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2B5F87',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 40, 58, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#113B57',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B3E5A',
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 12,
    color: '#6A879D',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D4E6F3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1C415F',
    backgroundColor: '#F8FCFF',
  },
  modalInputError: {
    borderColor: '#D85C5C',
    backgroundColor: '#FFF7F7',
  },
  inlineErrorText: {
    marginTop: 7,
    color: '#C44D4D',
    fontSize: 12,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  cancelText: {
    color: '#486D88',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2A7FBF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 84,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#8FBBD9',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ProfileScreen;
