import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function AccountDataControlsScreen({ navigation }) {
  // Toggle states
  const [privacyToggles, setPrivacyToggles] = useState({
    anonymousAnalytics: true,
    personalizedAi: true,
    moodTracking: true,
    notifications: true,
    voiceHistory: false,
    storeAiReports: true,
  });

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState(null);
  
  // Loading states
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
    setTimeout(() => setModalConfig(null), 300); // Wait for animation
  };

  const executeAction = async () => {
    setIsProcessing(true);
    // Simulate network delay
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
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrapper, buttonRed && { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <MaterialCommunityIcons name={icon} size={24} color={buttonRed ? '#EF4444' : '#60A5FA'} />
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
        </View>
        
        {description && <Text style={styles.cardDescription}>{description}</Text>}
        
        {children}
        
        {buttonText && (
          <TouchableOpacity
            style={[styles.actionButton, buttonRed ? styles.actionButtonRed : styles.actionButtonPrimary]}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, buttonRed && styles.actionButtonTextRed]}>{buttonText}</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#E2E8F0" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account & Data Controls</Text>
        <View style={styles.subtitleContainer}>
          <MaterialCommunityIcons name="shield-check" size={18} color="#60A5FA" style={styles.shieldGlow} />
          <Text style={styles.headerSubtitle}>You are always in control of your personal information and wellness data.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
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

        {/* 4. Download My Data */}
        {renderCard({
          delay: 400,
          icon: 'download-outline',
          title: 'Download My Data',
          description: 'Request a copy of all your personal information stored within MindCare.',
          children: (
            <View style={styles.downloadList}>
              {['Profile Information', 'AI Chat History', 'Mood History', 'Daily Reports', 'Reflections', 'Preferences', 'Safety Circle Information'].map((item, idx) => (
                <View key={idx} style={styles.checkListItem}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
                  <Text style={styles.checkListText}>{item}</Text>
                </View>
              ))}
              
              <View style={styles.exportFormats}>
                <Text style={styles.formatsLabel}>Formats:</Text>
                {['PDF', 'JSON', 'CSV', 'ZIP'].map(f => (
                  <View key={f} style={styles.formatBadge}>
                    <Text style={styles.formatBadgeText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          ),
          buttonText: downloadReady ? 'Download Ready (ZIP)' : (isProcessing ? 'Generating...' : 'Generate ZIP File'),
          onPress: downloadReady ? () => {} : handleDownloadData
        })}

        {/* 5. Privacy Settings */}
        {renderCard({
          delay: 500,
          icon: 'lock-outline',
          title: 'Privacy & Permissions',
          children: (
            <View style={styles.togglesContainer}>
              {[
                { key: 'anonymousAnalytics', label: 'Anonymous Analytics', desc: 'Help us improve MindCare by sharing anonymized usage data.' },
                { key: 'personalizedAi', label: 'Personalized AI Learning', desc: 'Allow Nova to adapt to your personality and history.' },
                { key: 'moodTracking', label: 'Mood Tracking', desc: 'Store your emotional state to generate wellness trends.' },
                { key: 'notifications', label: 'Notification Permissions', desc: 'Receive check-ins and supportive reminders.' },
                { key: 'voiceHistory', label: 'Voice Conversation History', desc: 'Keep transcriptions of your voice calls with Nova.' },
                { key: 'storeAiReports', label: 'Store AI Reports', desc: 'Save daily summaries securely to your device.' },
              ].map((toggle, idx) => (
                <View key={toggle.key} style={[styles.toggleRow, idx !== 5 && styles.toggleBorder]}>
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleLabel}>{toggle.label}</Text>
                    <Text style={styles.toggleDesc}>{toggle.desc}</Text>
                  </View>
                  <Switch
                    value={privacyToggles[toggle.key]}
                    onValueChange={() => handleToggle(toggle.key)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#60A5FA' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              ))}
            </View>
          )
        })}

        {/* Security Card */}
        <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.securityCard}>
          <MaterialCommunityIcons name="shield-lock" size={32} color="#10B981" />
          <Text style={styles.securityTitle}>Your Privacy Matters</Text>
          <View style={styles.securityList}>
            {['End-to-end encrypted communication', 'Secure cloud storage', 'GDPR-ready data practices', 'Delete your data anytime', 'AI conversations remain confidential'].map((item, idx) => (
              <View key={idx} style={styles.securityItem}>
                <View style={styles.securityDot} />
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
          <View style={styles.modalContent}>
            <View style={[styles.modalIconWrapper, modalConfig?.isDestructive && { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <MaterialCommunityIcons 
                name={modalConfig?.isDestructive ? 'alert-outline' : 'information-outline'} 
                size={32} 
                color={modalConfig?.isDestructive ? '#EF4444' : '#60A5FA'} 
              />
            </View>
            <Text style={styles.modalTitle}>{modalConfig?.title}</Text>
            <Text style={styles.modalDescription}>{modalConfig?.description}</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeModal} disabled={isProcessing}>
                <Text style={styles.modalCancelText}>Cancel</Text>
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
    backgroundColor: '#0B132B',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backText: {
    color: '#E2E8F0',
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
  shieldGlow: {
    marginRight: 8,
    marginTop: 2,
    textShadowColor: 'rgba(96, 165, 250, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  headerSubtitle: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  cardContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  cardDescription: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  actionButtonPrimary: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  actionButtonRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#60A5FA',
  },
  actionButtonTextRed: {
    color: '#EF4444',
  },
  downloadList: {
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 16,
    borderRadius: 12,
  },
  checkListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkListText: {
    color: '#E2E8F0',
    marginLeft: 10,
    fontSize: 14,
  },
  exportFormats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  formatsLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginRight: 12,
  },
  formatBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  formatBadgeText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  togglesContainer: {
    marginTop: -10,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  toggleBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  toggleText: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  toggleDesc: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
  },
  securityCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  securityTitle: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 16,
  },
  securityList: {
    width: '100%',
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  securityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 12,
  },
  securityText: {
    color: '#A7F3D0',
    fontSize: 14,
  },
  bottomText: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 16,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmPrimary: {
    backgroundColor: '#3B82F6',
  },
  modalConfirmRed: {
    backgroundColor: '#EF4444',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
