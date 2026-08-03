import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Alert, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing as REasing } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const THEME = {
  bg: '#0B1220',
  primary: '#3B82F6',
  accent: '#38BDF8',
  danger: '#EF4444',
  text: '#FFFFFF',
  textDim: '#94A3B8',
  cardBg: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
};

export default function EmergencyFAB() {
  const [isModalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500, easing: REasing.inOut(REasing.ease) }),
        withTiming(1, { duration: 1500, easing: REasing.inOut(REasing.ease) })
      ),
      -1,
      true
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1500, easing: REasing.inOut(REasing.ease) }),
        withTiming(0.5, { duration: 1500, easing: REasing.inOut(REasing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: pulseOpacity.value,
    };
  });

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const renderCard = (icon, title, description, buttonText, buttonColor = THEME.primary, onPress) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Text style={{ fontSize: 24 }}>{icon}</Text>
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{description}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={[styles.cardButton, { backgroundColor: buttonColor }]}
        onPress={() => {
          onPress?.();
          setModalVisible(false);
        }}
      >
        <Text style={styles.cardButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <View style={styles.fabContainer}>
        <Animated.View style={[styles.fabGlow, animatedPulseStyle]} />
        <TouchableOpacity style={styles.fab} onPress={toggleModal} activeOpacity={0.8}>
          <MaterialCommunityIcons name="shield-heart" size={26} color="#FFFFFF" />
          <Text style={styles.fabText}>SOS</Text>
        </TouchableOpacity>
      </View>

      <Modal
        isVisible={isModalVisible}
        onBackdropPress={toggleModal}
        onSwipeComplete={toggleModal}
        swipeDirection={['down']}
        style={styles.modal}
        backdropOpacity={0.5}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        useNativeDriverForBackdrop
      >
        <BlurView intensity={80} tint="dark" style={styles.modalContent}>
          <View style={styles.dragIndicator} />
          
          <View style={styles.header}>
            <MaterialCommunityIcons name="shield-check" size={48} color={THEME.primary} />
            <Text style={styles.headerTitle}>Emergency Support</Text>
            <Text style={styles.headerSubtitle}>Need help? We're here for you.</Text>
            
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Location Active</Text>
            </View>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderCard(
              '👤',
              'Call Trusted Contact',
              'Instantly call a trusted person from your Safety Circle.',
              'Call Now',
              THEME.primary,
              () => { Alert.alert('Calling Trusted Contact', 'This would dial your trusted contact.'); }
            )}

            {renderCard(
              '🆘',
              'Send SOS Alert',
              'Send your live location and an emergency message to all trusted contacts.',
              'Send SOS',
              THEME.danger,
              () => { Alert.alert('SOS Sent', 'An alert has been dispatched to your trusted contacts.'); }
            )}

            {renderCard(
              '☎️',
              'Crisis Helpline',
              'Call your country\'s mental health crisis helpline.',
              'Call Helpline',
              THEME.primary,
              () => { Alert.alert('Helpline', 'Calling 988...'); }
            )}

            {renderCard(
              '📍',
              'Share Live Location',
              'Share real-time location with trusted contacts for a configurable duration.',
              'Share Location',
              THEME.primary,
              () => { Alert.alert('Location Shared', 'Your live location is now being shared.'); }
            )}

            {renderCard(
              '🤖',
              'Emergency AI Support',
              'Start an AI-guided calming conversation with grounding exercises.',
              'Start Emergency Chat',
              THEME.accent,
              () => { navigation.navigate('Chat'); }
            )}

            {renderCard(
              '🫁',
              'Guided Calming',
              '4-7-8 Breathing, Box Breathing, and Panic Recovery.',
              'Start Breathing',
              '#10B981',
              () => { navigation.navigate('GuidedBreathing'); }
            )}

            <View style={styles.privacyBanner}>
              <MaterialCommunityIcons name="lock" size={14} color={THEME.textDim} />
              <Text style={styles.privacyText}>
                Your emergency information is encrypted and shared only with your trusted contacts when you choose or when emergency features are activated.
              </Text>
            </View>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </BlurView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  fabGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fabText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 1,
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    height: height * 0.75,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(11, 18, 32, 0.75)',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    color: THEME.text,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: THEME.textDim,
    fontSize: 15,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: THEME.cardBg,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDesc: {
    color: THEME.textDim,
    fontSize: 13,
    lineHeight: 18,
  },
  cardButton: {
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  cardButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    gap: 12,
  },
  privacyText: {
    flex: 1,
    color: THEME.textDim,
    fontSize: 12,
    lineHeight: 18,
  }
});
