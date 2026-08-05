import React, { useState, useEffect } from 'react';
import { View, DeviceEventEmitter, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Alert, Linking, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing as REasing } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { getTrustedContact } from '../../../services/trustedContactService';
import { getAuth_ } from '../../../firebase';

const { width, height } = Dimensions.get('window');

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
};

export default function EmergencyFAB() {
  const [isModalVisible, setModalVisible] = useState(false);
  const [trustedContact, setTrustedContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const scrollOpacity = useSharedValue(1);
  const scrollScale = useSharedValue(1);

  useEffect(() => {
    const scrollSub = DeviceEventEmitter.addListener('onScrollDirection', ({ scrollingDown }) => {
      scrollOpacity.value = withTiming(scrollingDown ? 0.4 : 1, { duration: 300 });
      scrollScale.value = withTiming(scrollingDown ? 0.8 : 1, { duration: 300 });
    });
    return () => scrollSub.remove();
  }, []);

  useEffect(() => {
    loadTrustedContact();
  }, []);

  const loadTrustedContact = async () => {
    try {
      const contact = await getTrustedContact();
      setTrustedContact(contact);
    } catch (error) {
      console.error('Error loading trusted contact:', error);
    }
  };

  const scrollAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: scrollOpacity.value,
      transform: [{ scale: scrollScale.value }]
    };
  });

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

  const handleCallTrustedContact = async () => {
    try {
      await loadTrustedContact();
      
      if (!trustedContact || !trustedContact.phone) {
        Alert.alert(
          'No Trusted Contact',
          'You haven\'t added a trusted contact yet. Would you like to add one now?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Add Contact', 
              onPress: () => {
                setModalVisible(false);
                navigation.navigate('Profile');
              }
            }
          ]
        );
        return;
      }

      const cleanPhone = trustedContact.phone.replace(/\s/g, '');
      
      if (!cleanPhone || cleanPhone.length < 5) {
        Alert.alert('Invalid Phone Number', 'The trusted contact phone number is invalid. Please update it in your profile.');
        return;
      }

      Alert.alert(
        `Call ${trustedContact.name}?`,
        `You are about to call your trusted contact: ${trustedContact.name}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call Now', 
            onPress: async () => {
              try {
                const phoneUrl = Platform.select({
                  ios: `tel:${cleanPhone}`,
                  android: `tel:${cleanPhone}`,
                });
                
                const canOpen = await Linking.canOpenURL(phoneUrl);
                if (canOpen) {
                  await Linking.openURL(phoneUrl);
                  setModalVisible(false);
                } else {
                  Alert.alert('Error', 'Unable to make a call from this device.');
                }
              } catch (error) {
                console.error('Error making call:', error);
                Alert.alert('Error', 'Failed to make the call. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error calling trusted contact:', error);
      Alert.alert('Error', 'Failed to call trusted contact. Please try again.');
    }
  };

  const renderCard = (icon, title, description, buttonText, buttonColor = COLORS.primary, onPress) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${buttonColor}15` }]}>
          <Text style={{ fontSize: 22 }}>{icon}</Text>
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{description}</Text>
          {trustedContact && (
            <View style={styles.contactInfo}>
              <MaterialCommunityIcons name="account" size={14} color={COLORS.textLight} />
              <Text style={styles.contactName}>{trustedContact.name}</Text>
              <Text style={styles.contactPhone}>• {trustedContact.phone}</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity 
        style={[styles.cardButton, { backgroundColor: buttonColor }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
        <Text style={styles.cardButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Animated.View style={[styles.fabContainer, scrollAnimatedStyle]}>
        <Animated.View style={[styles.fabGlow, animatedPulseStyle]} />
        <TouchableOpacity style={styles.fab} onPress={toggleModal} activeOpacity={0.8}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#FFFFFF" />
          <Text style={styles.fabText}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>

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
        <BlurView intensity={90} tint="light" style={styles.modalContent}>
          <View style={styles.dragIndicator} />
          
          <View style={styles.header}>
            <View style={[styles.headerIconWrapper, { backgroundColor: `${COLORS.primary}15` }]}>
              <MaterialCommunityIcons name="shield-check" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.headerTitle}>Emergency Support</Text>
            <Text style={styles.headerSubtitle}>Need help? We're here for you.</Text>
            
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Available • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </View>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderCard(
              '👤',
              trustedContact ? `Call ${trustedContact.name}` : 'Call Trusted Contact',
              trustedContact 
                ? `Instantly call your trusted contact for support.` 
                : 'Add a trusted contact in your profile to enable emergency calls.',
              'Call Now',
              trustedContact ? COLORS.primary : COLORS.textLight,
              handleCallTrustedContact
            )}

            {!trustedContact && (
              <TouchableOpacity 
                style={styles.addContactBtn}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate('Profile');
                }}
              >
                <MaterialCommunityIcons name="account-plus" size={20} color={COLORS.primary} />
                <Text style={styles.addContactBtnText}>Add Trusted Contact</Text>
              </TouchableOpacity>
            )}

            <View style={styles.privacyBanner}>
              <MaterialCommunityIcons name="lock" size={16} color={COLORS.textLight} />
              <Text style={styles.privacyText}>
                Your emergency information is encrypted and shared only with your trusted contacts when you choose or when emergency features are activated.
              </Text>
            </View>
            
            <View style={{ height: 20 }} />
          </ScrollView>
        </BlurView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  fabGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fabText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: 1,
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    height: height * 0.7,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    overflow: 'hidden',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: COLORS.textLight,
    fontSize: 14,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  statusText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDesc: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 18,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  contactName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  contactPhone: {
    color: COLORS.textLight,
    fontSize: 12,
  },
  cardButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  addContactBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  privacyBanner: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.textLight}08`,
    padding: 14,
    borderRadius: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  privacyText: {
    flex: 1,
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
  }
});