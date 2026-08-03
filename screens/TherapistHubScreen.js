import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../components/ui/Premium/Theme';
import { GlassCard } from '../components/ui/Premium/GlassCard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getGovernmentServices, getSessionHistory } from '../services/therapistService';

export default function TherapistHubScreen() {
  const navigation = useNavigation();
  const govServices = getGovernmentServices();
  const sessions = getSessionHistory();

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
            <Text style={styles.title}>👩‍⚕️ Human Therapist Support</Text>
            <Text style={styles.subtitle}>Connect with licensed mental health professionals whenever you need personalized care.</Text>
          </Animated.View>

          {/* Primary Action Cards */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.grid}>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3B82F6' }]} 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('NearbyTherapists')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#3B82F6' }]}>
                <MaterialCommunityIcons name="calendar-check" size={24} color="#FFF" />
              </View>
              <Text style={styles.actionTitle}>Book Appointment</Text>
              <Text style={styles.actionDesc}>Schedule in-person sessions.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38BDF8' }]} 
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: '#38BDF8' }]}>
                <MaterialCommunityIcons name="laptop-account" size={24} color="#FFF" />
              </View>
              <Text style={styles.actionTitle}>Online Consultation</Text>
              <Text style={styles.actionDesc}>Video, voice, or chat.</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Find Nearby Therapists Full Card */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <TouchableOpacity onPress={() => navigation.navigate('NearbyTherapists')} activeOpacity={0.9}>
              <GlassCard style={styles.nearbyCard}>
                <View style={styles.nearbyContent}>
                  <View style={styles.nearbyText}>
                    <Text style={styles.sectionTitle}>📍 Find Nearby Therapists</Text>
                    <Text style={styles.nearbyDesc}>Discover clinics, psychologists, and hospitals near your current location.</Text>
                  </View>
                  <View style={styles.mapIconBtn}>
                    <MaterialCommunityIcons name="map-marker-radius" size={28} color={Theme.colors.primary} />
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>

          {/* AI Recommendation */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)}>
            <GlassCard style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <MaterialCommunityIcons name="robot-outline" size={24} color={Theme.colors.accent} />
                <Text style={styles.aiTitle}>MindCare Recommendation</Text>
              </View>
              <Text style={styles.aiText}>"Based on your recent mood trends and conversations, you may benefit from speaking with a licensed mental health professional."</Text>
              <View style={styles.aiBtnRow}>
                <TouchableOpacity style={styles.aiBtnPrimary} onPress={() => navigation.navigate('NearbyTherapists')}>
                  <Text style={styles.aiBtnText}>View Therapists</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.aiBtnSecondary}>
                  <Text style={styles.aiBtnTextDim}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Government Support */}
          <Animated.View entering={FadeInDown.delay(500).duration(600)}>
            <Text style={styles.sectionHeader}>National Mental Health Support</Text>
            {govServices.map((gov) => (
              <GlassCard key={gov.id} style={styles.govCard}>
                <View style={styles.govHeader}>
                  <Text style={styles.govName}>{gov.name}</Text>
                  <View style={styles.govBadge}><Text style={styles.govBadgeText}>{gov.type}</Text></View>
                </View>
                <Text style={styles.govDesc}>{gov.description}</Text>
                <View style={styles.govFooter}>
                  <Text style={styles.govHours}><MaterialCommunityIcons name="clock-outline" size={14} /> {gov.hours}</Text>
                  <TouchableOpacity style={styles.govCallBtn}>
                    <MaterialCommunityIcons name="phone" size={16} color="#FFF" />
                    <Text style={styles.govCallText}>Call {gov.phone}</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
            <Text style={styles.noteText}>* Official support services vary by region and availability.</Text>
          </Animated.View>

          {/* Session History */}
          <Animated.View entering={FadeInDown.delay(600).duration(600)} style={{ marginTop: 24 }}>
            <Text style={styles.sectionHeader}>Session History</Text>
            {sessions.map((session) => (
              <GlassCard key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionRow}>
                  <View>
                    <Text style={styles.sessionName}>{session.therapistName}</Text>
                    <Text style={styles.sessionDetails}>{session.type} • {session.duration}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{session.status}</Text>
                  </View>
                </View>
                <Text style={styles.sessionDate}>{new Date(session.date).toLocaleDateString()}</Text>
              </GlassCard>
            ))}
          </Animated.View>

          {/* Privacy Consent */}
          <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.privacyBox}>
            <MaterialCommunityIcons name="shield-lock" size={24} color={Theme.colors.success} style={{ marginBottom: 8 }} />
            <Text style={styles.privacyText}>
              Your therapy sessions and personal information remain confidential and are securely protected. Your AI conversations are never shared with a therapist unless you explicitly choose to do so.
            </Text>
            <TouchableOpacity><Text style={styles.privacyLink}>Privacy Policy</Text></TouchableOpacity>
          </Animated.View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    ...Theme.typography.h1,
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    ...Theme.typography.body,
    fontSize: 15,
    color: Theme.colors.textDim,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  nearbyCard: {
    padding: 20,
    marginBottom: 24,
  },
  nearbyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nearbyText: {
    flex: 1,
    paddingRight: 16,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  nearbyDesc: {
    color: Theme.colors.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  mapIconBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCard: {
    padding: 20,
    marginBottom: 32,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitle: {
    color: Theme.colors.accent,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  aiText: {
    color: '#FFF',
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 16,
  },
  aiBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  aiBtnPrimary: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  aiBtnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  aiBtnText: {
    color: Theme.colors.accent,
    fontWeight: '600',
  },
  aiBtnTextDim: {
    color: Theme.colors.textDim,
    fontWeight: '600',
  },
  sectionHeader: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  govCard: {
    padding: 16,
    marginBottom: 12,
  },
  govHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  govName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  govBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  govBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  govDesc: {
    color: Theme.colors.textDim,
    fontSize: 13,
    marginBottom: 16,
  },
  govFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  govHours: {
    color: Theme.colors.textDim,
    fontSize: 12,
  },
  govCallBtn: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
  },
  govCallText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  noteText: {
    color: Theme.colors.textDim,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  sessionCard: {
    padding: 16,
    marginBottom: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionDetails: {
    color: Theme.colors.textDim,
    fontSize: 13,
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionDate: {
    color: Theme.colors.textDim,
    fontSize: 12,
  },
  privacyBox: {
    marginTop: 32,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    alignItems: 'center',
  },
  privacyText: {
    color: Theme.colors.textDim,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  privacyLink: {
    color: Theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  }
});
