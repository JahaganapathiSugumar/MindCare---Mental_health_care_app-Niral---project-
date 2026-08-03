import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Theme } from '../components/ui/Premium/Theme';
import { GlassCard } from '../components/ui/Premium/GlassCard';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { getTherapistProfile } from '../services/therapistService';

const { width } = Dimensions.get('window');

export default function TherapistProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // The id is passed from the map or hub. Default to 'professional-1' if missing.
  const id = route.params?.id || 'professional-1';
  const profile = getTherapistProfile(id);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Image & Header */}
        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: profile.photoUrl }} style={styles.coverImage} />
            <View style={styles.imageOverlay} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialCommunityIcons name="chevron-left" size={32} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.title}>{profile.title}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}><Text style={styles.badgeText}>{profile.rating} ⭐ ({profile.reviews})</Text></View>
                <View style={styles.badge}><Text style={styles.badgeText}>{profile.experience}</Text></View>
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.content}>
          {/* Action Buttons */}
          <Animated.View entering={FadeInUp.delay(100).duration(600)} style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryBtn}>
              <MaterialCommunityIcons name="calendar-check" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Book Appointment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn}>
              <MaterialCommunityIcons name="heart-outline" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn}>
              <MaterialCommunityIcons name="share-variant" size={24} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* Bio */}
          <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </Animated.View>

          {/* Areas of Expertise */}
          <Animated.View entering={FadeInUp.delay(300).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Areas of Expertise</Text>
            <View style={styles.tagsContainer}>
              {profile.areasOfExpertise.map((exp, i) => (
                <View key={i} style={styles.tag}><Text style={styles.tagText}>{exp}</Text></View>
              ))}
            </View>
          </Animated.View>

          {/* Details Grid */}
          <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.gridSection}>
            <GlassCard style={styles.gridCard}>
              <MaterialCommunityIcons name="translate" size={24} color={Theme.colors.primary} />
              <Text style={styles.gridCardTitle}>Languages</Text>
              <Text style={styles.gridCardValue}>{profile.languages.join(', ')}</Text>
            </GlassCard>
            
            <GlassCard style={styles.gridCard}>
              <MaterialCommunityIcons name="cash" size={24} color={Theme.colors.primary} />
              <Text style={styles.gridCardTitle}>Consultation</Text>
              <Text style={styles.gridCardValue}>{profile.price}</Text>
            </GlassCard>
          </Animated.View>
          
          {/* Available Slots */}
          <Animated.View entering={FadeInUp.delay(500).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Available Slots</Text>
            {profile.availableSlots.map((day, idx) => (
              <View key={idx} style={styles.slotDay}>
                <Text style={styles.slotDayTitle}>{day.date}</Text>
                <View style={styles.slotRow}>
                  {day.times.map((time, tIdx) => (
                    <TouchableOpacity key={tIdx} style={styles.slotBtn}>
                      <Text style={styles.slotText}>{time}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </Animated.View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageContainer: {
    width: '100%',
    height: 350,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 32, 0.4)',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  headerInfo: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  name: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  title: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: -40, // Pull up over the image slightly
    marginBottom: 24,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  bioText: {
    color: Theme.colors.textDim,
    fontSize: 15,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    color: Theme.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  gridSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    flex: 1,
    padding: 16,
    alignItems: 'flex-start',
  },
  gridCardTitle: {
    color: Theme.colors.textDim,
    fontSize: 13,
    marginTop: 12,
    marginBottom: 4,
  },
  gridCardValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  slotDay: {
    marginBottom: 16,
  },
  slotDayTitle: {
    color: Theme.colors.textDim,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 12,
  },
  slotBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  slotText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  }
});
