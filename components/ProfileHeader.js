import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const getInitials = (name, email) => {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
    return initials || 'U';
  }

  if (email && email.length > 0) {
    return email[0].toUpperCase();
  }

  return 'U';
};

const ProfileHeader = ({ fullName, email, photoURL, onPhotoPress, photoLoading = false }) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const initials = getInitials(fullName, email);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [photoURL]);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.avatar, { backgroundColor: isDark ? '#2A2A2A' : '#DDF0FF', borderColor: theme.card }]}>
        {photoURL && !hasImageError ? (
          <Image
            source={{ uri: photoURL }}
            style={styles.avatarImage}
            onError={(event) => {
              console.warn('[ProfileHeader] Profile photo load failed:', photoURL, event?.nativeEvent?.error || 'Unknown image error');
              setHasImageError(true);
            }}
          />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </View>

      <Pressable style={[styles.changePhotoButton, { backgroundColor: isDark ? '#2A2F35' : '#E6F3FF' }]} onPress={onPhotoPress} disabled={photoLoading}>
        {photoLoading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Text style={[styles.changePhotoText, { color: theme.primary }]}>{t('profile.changePhoto')}</Text>
        )}
      </Pressable>

      <Text style={[styles.nameText, { color: theme.text }]}>{fullName || t('profile.mindcareUser')}</Text>
      <Text style={[styles.emailText, { color: theme.mutedText }]}>{email || t('profile.noEmailAvailable')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#DDF0FF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6AA9D9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#2B5F87',
  },
  changePhotoButton: {
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#E6F3FF',
  },
  changePhotoText: {
    color: '#2A7FBF',
    fontWeight: '600',
    fontSize: 13,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#183B56',
    textAlign: 'center',
  },
  emailText: {
    marginTop: 4,
    fontSize: 14,
    color: '#53738D',
    textAlign: 'center',
  },
});

export default ProfileHeader;
