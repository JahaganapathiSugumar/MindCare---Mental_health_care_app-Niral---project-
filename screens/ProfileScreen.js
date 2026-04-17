import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileHeader from '../components/ProfileHeader';
import InfoCard from '../components/InfoCard';
import MoodItem from '../components/MoodItem';
import { fetchMoodHistory, fetchProfileData, logoutCurrentUser, updateProfileFullName } from '../services/profileService';
import { getFullNameValidationError } from '../utils/validation';

const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

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
      setMoods(moodData);
    } catch (error) {
      console.error('[Profile] Load error:', error.message || error);
      Alert.alert('Profile Error', error.message || 'Could not load profile data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
      Alert.alert('Validation', validationMessage);
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
      Alert.alert('Profile Updated', 'Your name has been updated successfully.');
    } catch (error) {
      console.error('[Profile] Update error:', error.message || error);
      Alert.alert('Update Failed', error.message || 'Could not update your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            await logoutCurrentUser();
            // RootNavigator listens to auth state changes and will navigate to SignIn.
          } catch (error) {
            console.error('[Profile] Logout error:', error.message || error);
            Alert.alert('Logout Failed', error.message || 'Please try again.');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2A7FBF" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.bgCircleTop} />
      <View style={styles.bgCircleBottom} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#2A7FBF" />}
      >
        <ProfileHeader fullName={profile?.fullName} email={profile?.email} />

        <InfoCard title="Profile Information" actionLabel="Edit Profile" onActionPress={handleEditProfile}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{profile?.fullName || 'MindCare User'}</Text>
          </View>

          <View style={styles.infoRowNoBorder}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email || 'Not available'}</Text>
          </View>
        </InfoCard>

        <InfoCard title="Recent Mood History">
          {moods.length === 0 ? (
            <Text style={styles.emptyText}>No mood records yet</Text>
          ) : (
            moods.map((item) => (
              <MoodItem key={item.id} mood={item.mood} createdAt={item.createdAt} />
            ))
          )}
        </InfoCard>

        <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('Chat')}>
          <Text style={styles.chatButtonText}>Talk to AI Support Assistant</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.logoutText}>Logout</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Text style={styles.modalLabel}>Full Name</Text>
            <TextInput
              value={editName}
              onChangeText={handleNameChange}
              placeholder="Enter your full name"
              placeholderTextColor="#7A97AC"
              style={[styles.modalInput, editNameError ? styles.modalInputError : null]}
              editable={!savingProfile}
              autoCapitalize="words"
            />
            {editNameError ? <Text style={styles.inlineErrorText}>{editNameError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setEditVisible(false)} disabled={savingProfile}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, (savingProfile || !!editNameError) ? styles.saveButtonDisabled : null]}
                onPress={handleSaveProfile}
                disabled={savingProfile || !!editNameError}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
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
  emptyText: {
    color: '#6B879D',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 8,
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
