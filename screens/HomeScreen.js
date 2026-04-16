import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { getFirebaseInstance } from '../firebase';

const HomeScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get current user from Firebase
    const { auth } = getFirebaseInstance();
    if (auth && auth.currentUser) {
      const currentUser = auth.currentUser;
      setUser({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || 'User',
      });
    }
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const { auth } = getFirebaseInstance();
      if (!auth) {
        Alert.alert('Error', 'Firebase not initialized');
        setLoading(false);
        return;
      }
      // Sign out using Firebase
      await signOut(auth);
      // Navigate back to SignIn
      navigation.replace('SignIn');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Logout Failed', error.message || 'Please try again');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>👋 Welcome!</Text>
          <Text style={styles.emailText}>{user.email}</Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Mental Wellness Journey</Text>
            <Text style={styles.cardDescription}>
              Start exploring our resources and tools to support your mental health.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Check-in</Text>
            <TouchableOpacity style={styles.checkInButton}>
              <Text style={styles.checkInButtonText}>How are you feeling today?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#667eea" />
            ) : (
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 32,
    marginTop: 12,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 14,
    color: '#666',
  },
  mainContent: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  checkInButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  checkInButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;
