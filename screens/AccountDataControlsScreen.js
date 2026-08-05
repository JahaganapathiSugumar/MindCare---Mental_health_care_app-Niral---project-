import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import TopBackButton from '../components/ui/Premium/TopBackButton';

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
  purple: '#8E44AD',
  pink: '#FF6B9D',
};

export default function AccountDataControlsScreen({ navigation }) {
  const [privacyToggles, setPrivacyToggles] = useState({
    anonymousAnalytics: true,
    personalizedAi: true,
    moodTracking: true,
    notifications: true,
    voiceHistory: false,
    storeAiReports: true,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);

  const handleToggle = (key) => {
    Haptics.selectionAsync();
    setPrivacyToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openModal = (config) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalConfig(config);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => setModalConfig(null), 300);
  };

  const executeAction = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsProcessing(false);
    closeModal();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDownloadData = async () => {
    setIsProcessing(true);
    setDownloadReady(false);
    await new Promise(resolve => setTimeout(resolve, 2500));
    setIsProcessing(false);
    setDownloadReady(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderCard = ({ icon, title, description, buttonText, buttonRed = false, onPress, children, delay }) => (
    <Animated.View entering={FadeInDown.delay(delay).duration(600)} style={styles.cardContainer}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrapper, buttonRed && { backgroundColor: `${COLORS.danger}15` }]}>
            <MaterialCommunityIcons name={icon} size={22} color={buttonRed ? COLORS.danger : COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>

        {description && <Text style={styles.cardDescription}>{description}</Text>}

        {children}

        {buttonText && (
          <TouchableOpacity
            style={[styles.actionButton, buttonRed ? styles.actionButtonRed : styles.actionButtonPrimary]}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, buttonRed && styles.actionButtonTextRed]}>{buttonText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <TopBackButton fallbackRoute="Home" />

      <View style={styles.header}>
        <Text style={{height:70}}></Text>
        <Text style={styles.headerTitle}>🔒 Account & Data</Text>
        <Text style={styles.headerSubtitle}>You are always in control of your personal information</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Delete Account */}
        {renderCard({
          delay: 100,
          icon: 'account-remove-outline',
          title: 'Delete Account',
          description: 'Permanently remove your MindCare account, including profile information, conversations, and stored preferences.',
          buttonText: 'Delete Account',
          buttonRed: true,
          onPress: () => openModal({
            title: 'Delete Account?',
            description: 'This action cannot be undone.\n\nThe following will be permanently deleted:\n• Profile Information\n• Chat History\n• Mood History\n• Daily Reports\n• AI Preferences\n• Safety Circle Contacts',
            actionText: 'Delete Forever',
            isDestructive: true
          })
        })}

        {/* 2. Delete Chat History */}
        {renderCard({
          delay: 200,
          icon: 'message-text-outline',
          title: 'Delete Chat History',
          description: 'Remove all AI conversations while keeping your account and preferences.',
          buttonText: 'Delete Chat History',
          buttonRed: true,
          onPress: () => openModal({
            title: 'Delete Chat History?',
            description: 'This will permanently erase all conversations with your AI companion.',
            actionText: 'Delete Chat History',
            isDestructive: true
          })
        })}

        {/* 3. Delete Mood History */}
        {renderCard({
          delay: 300,
          icon: 'emoticon-happy-outline',
          title: 'Delete Mood History',
          description: 'Clear all mood tracking records and emotional analytics.',
          buttonText: 'Delete Mood History',
          buttonRed: true,
          onPress: () => openModal({
            title: 'Delete Mood History?',
            description: 'This action removes all recorded moods, emotional trends, reflections, and AI insights.',
            actionText: 'Delete Mood History',
            isDestructive: true
          })
        })}



        {/* 5. Security Card */}
        <Animated.View entering={FadeInUp.delay(500).duration(600)} style={styles.securityCard}>
          <MaterialCommunityIcons name="shield-lock" size={28} color={COLORS.success} />
          <Text style={styles.securityTitle}>Your Privacy Matters</Text>
          <View style={styles.securityList}>
            {['End-to-end encrypted communication', 'Secure cloud storage', 'GDPR-ready data practices', 'Delete your data anytime', 'AI conversations remain confidential'].map((item, idx) => (
              <View key={idx} style={styles.securityItem}>
                <View style={[styles.securityDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.securityText}>{item}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Text style={styles.bottomText}>
          MindCare believes your emotional wellbeing belongs to you.{"\n"}
          You can access, download, or permanently delete your information whenever you choose.
        </Text>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: COLORS.card }]}>
            <View style={[styles.modalIconWrapper, modalConfig?.isDestructive && { backgroundColor: `${COLORS.danger}15` }]}>
              <MaterialCommunityIcons
                name={modalConfig?.isDestructive ? 'alert-outline' : 'information-outline'}
                size={32}
                color={modalConfig?.isDestructive ? COLORS.danger : COLORS.primary}
              />
            </View>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>{modalConfig?.title}</Text>
            <Text style={[styles.modalDescription, { color: COLORS.textLight }]}>{modalConfig?.description}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeModal} disabled={isProcessing}>
                <Text style={[styles.modalCancelText, { color: COLORS.textLight }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirm, modalConfig?.isDestructive ? styles.modalConfirmRed : styles.modalConfirmPrimary]}
                onPress={() => executeAction()}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>{modalConfig?.actionText}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cardContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardDescription: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  actionButtonPrimary: {
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  actionButtonRed: {
    backgroundColor: `${COLORS.danger}10`,
    borderWidth: 1,
    borderColor: `${COLORS.danger}30`,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionButtonTextRed: {
    color: COLORS.danger,
  },
  togglesContainer: {
    marginTop: -6,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  toggleBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toggleText: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  toggleDesc: {
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 16,
  },
  securityCard: {
    backgroundColor: `${COLORS.success}08`,
    borderWidth: 1,
    borderColor: `${COLORS.success}20`,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  securityTitle: {
    color: COLORS.success,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 14,
  },
  securityList: {
    width: '100%',
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  securityText: {
    color: COLORS.textLight,
    fontSize: 13,
  },
  bottomText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: `${COLORS.textLight}10`,
    alignItems: 'center',
  },
  modalCancelText: {
    fontWeight: '600',
    fontSize: 15,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalConfirmRed: {
    backgroundColor: COLORS.danger,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});