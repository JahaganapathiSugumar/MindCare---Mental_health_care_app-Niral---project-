import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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

const ProfileHeader = ({ fullName, email }) => {
  const initials = getInitials(fullName, email);

  return (
    <View style={styles.wrapper}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <Text style={styles.nameText}>{fullName || 'MindCare User'}</Text>
      <Text style={styles.emailText}>{email || 'No email available'}</Text>
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
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#2B5F87',
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
