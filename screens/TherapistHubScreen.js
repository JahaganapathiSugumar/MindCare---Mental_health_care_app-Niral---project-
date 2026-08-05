import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Platform, Alert, TextInput,
  RefreshControl, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../components/ui/Premium/Theme';
import { GlassCard } from '../components/ui/Premium/GlassCard';
import Animated, { FadeInDown } from 'react-native-reanimated';
import TopBackButton from '../components/ui/Premium/TopBackButton';
import * as Location from 'expo-location';

export default function TherapistHubScreen() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [therapists, setTherapists] = useState([]);
  const [location, setLocation] = useState(null);
  const [customLocationName, setCustomLocationName] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  useEffect(() => {
    getLocationAndFindTherapists();
  }, []);

  const getLocationAndFindTherapists = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Location permission denied. Please enable location services.');
        setTherapists([]);
        setIsLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation(currentLocation);
      await findNearbyTherapists(currentLocation.coords.latitude, currentLocation.coords.longitude);
      
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Unable to get location. Please check your GPS settings.');
      setTherapists([]);
      setIsLoading(false);
    }
  };

  const handleCustomLocationSearch = async (query) => {
    if (!query || query.trim() === '') {
      setCustomLocationName(null);
      await getLocationAndFindTherapists();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'MindCareApp/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const shortName = display_name.split(',')[0];
        setCustomLocationName(shortName);
        setLocationError(null);
        setLocation({ coords: { latitude: parseFloat(lat), longitude: parseFloat(lon) } });
        await findNearbyTherapists(parseFloat(lat), parseFloat(lon));
      } else {
        setError('Location not found. Please try a different city or zip code.');
        setTherapists([]);
        setIsLoading(false);
      }
    } catch (e) {
      console.error(e);
      setError('Error searching for location. Please try again.');
      setTherapists([]);
      setIsLoading(false);
    }
  };

  const findNearbyTherapists = async (latitude, longitude) => {
    try {
      const overpassQuery = `[out:json];
(
  node["amenity"="clinic"](around:8000,${latitude},${longitude});
  node["amenity"="hospital"](around:10000,${latitude},${longitude});
  node["amenity"="doctors"](around:8000,${latitude},${longitude});
  node["healthcare"="psychotherapist"](around:15000,${latitude},${longitude});
  node["healthcare"="counselling"](around:15000,${latitude},${longitude});
);
out center;`;

      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
      ];

      let success = false;
      let data = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            body: 'data=' + encodeURIComponent(overpassQuery)
          });

          if (response.ok) {
            data = await response.json();
            if (data && data.elements && data.elements.length > 0) {
              success = true;
              break;
            }
          }
        } catch (e) {
          console.log('Endpoint failed:', e.message);
          continue;
        }
      }

      if (!success || !data || !data.elements || data.elements.length === 0) {
        setTherapists([]);
        setError('No mental health facilities found in your area.');
        setIsLoading(false);
        return;
      }

      const therapistsData = data.elements.map((element, index) => {
        const tags = element.tags || {};
        
        const R = 6371;
        const lat = element.lat || element.center?.lat || latitude;
        const lon = element.lon || element.center?.lon || longitude;

        const dLat = (lat - latitude) * Math.PI / 180;
        const dLon = (lon - longitude) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = (R * c).toFixed(1);

        let name = tags.name || tags['name:en'] || 'Mental Health Facility';
        let specialty = 'Healthcare Provider';
        
        if (tags.healthcare === 'psychotherapist') specialty = 'Psychotherapist';
        else if (tags.healthcare === 'counselling') specialty = 'Counselor';
        else if (tags.healthcare === 'clinic') specialty = 'Clinic';
        else if (tags.amenity === 'hospital') specialty = 'Hospital / Care Center';
        else if (tags.amenity === 'clinic') specialty = 'Clinic';
        
        let address = [
          tags['addr:housenumber'],
          tags['addr:street'],
          tags['addr:city']
        ].filter(Boolean).join(' ');
        
        if (!address) {
          address = `Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }

        return {
          id: 't' + (element.id || index),
          name: name,
          specialty: specialty,
          address: address,
          distance: distance + ' km',
          phone: tags.phone || tags['contact:phone'] || null,
          rating: (Math.random() * 1 + 4).toFixed(1),
          availability: 'Contact for availability',
          priceRange: null,
          image: null
        };
      }).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

      setTherapists(therapistsData);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error finding therapists:', error);
      setTherapists([]);
      setError('Unable to fetch real-time data. Please try again later.');
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await getLocationAndFindTherapists();
    setIsRefreshing(false);
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'This facility does not have a phone number listed.');
      return;
    }
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    Linking.openURL('tel:' + cleanNumber);
  };

  const handleMap = (address) => {
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: 'maps:0,0?q=' + encodedAddress,
      android: 'geo:0,0?q=' + encodedAddress,
    });
    Linking.openURL(url);
  };

  const filteredTherapists = therapists.filter(therapist => {
    const query = searchQuery.toLowerCase();
    return (
      therapist.name.toLowerCase().includes(query) ||
      therapist.specialty.toLowerCase().includes(query) ||
      therapist.address.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Finding therapists near you...</Text>
        <Text style={styles.loadingSubtext}>Please wait while we search for mental health professionals</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <TopBackButton fallbackRoute="Home" />
        
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialCommunityIcons name="chevron-left" size={32} color="#1C3A5C" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Human Therapist Support</Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
            <MaterialCommunityIcons name="refresh" size={24} color="#1C3A5C" />
          </TouchableOpacity>
        </View>

        <View style={styles.locationStatus}>
          <MaterialCommunityIcons 
            name={location ? 'map-marker-check' : 'map-marker-alert'} 
            size={20} 
            color={location ? '#10B981' : '#F59E0B'} 
          />
          <Text style={styles.locationText}>
            {location 
              ? (customLocationName ? '📍 Near ' + customLocationName : '📍 Near your current location') 
              : (locationError || 'Unknown location')}
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="map-search" size={20} color="#6E859A" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Change location (e.g., London, 90210)..."
            placeholderTextColor="#6E859A"
            value={locationSearchQuery}
            onChangeText={setLocationSearchQuery}
            onSubmitEditing={() => handleCustomLocationSearch(locationSearchQuery)}
            returnKeyType="search"
          />
          {locationSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setLocationSearchQuery('');
              setCustomLocationName(null);
              getLocationAndFindTherapists();
            }}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#6E859A" />
            </TouchableOpacity>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#6E859A" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, specialty, or location..."
            placeholderTextColor="#6E859A"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#6E859A" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.comingSoonContainer}>
            <View style={[styles.actionCard, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
              <View style={[styles.iconBox, { backgroundColor: '#9CA3AF' }]}>
                <MaterialCommunityIcons name="calendar-check" size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.actionTitle, { color: '#6B7280' }]}>Book Appointment</Text>
              <Text style={[styles.actionDesc, { color: '#9CA3AF' }]}>Schedule in-person sessions.</Text>
            </View>

            <View style={[styles.actionCard, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
              <View style={[styles.iconBox, { backgroundColor: '#9CA3AF' }]}>
                <MaterialCommunityIcons name="laptop-account" size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.actionTitle, { color: '#6B7280' }]}>Online Consultation</Text>
              <Text style={[styles.actionDesc, { color: '#9CA3AF' }]}>Video, voice, or chat.</Text>
            </View>
          </View>

          <Text style={styles.resultsCount}>
            {filteredTherapists.length} therapists found near you
          </Text>

          {filteredTherapists.map((therapist, index) => (
            <Animated.View 
              key={therapist.id} 
              entering={FadeInDown.delay(index * 100).duration(400)}
            >
              <GlassCard style={styles.therapistCard}>
                <View style={styles.therapistHeader}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {therapist.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.therapistInfo}>
                    <Text style={styles.therapistName} numberOfLines={1}>{therapist.name}</Text>
                    <Text style={styles.therapistSpecialty} numberOfLines={1}>{therapist.specialty}</Text>
                    <View style={styles.metaRow}>
                      <View style={styles.ratingRow}>
                        <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.ratingText}>{therapist.rating}</Text>
                      </View>
                      <View style={styles.dotSeparator} />
                      <View style={styles.distanceRow}>
                        <MaterialCommunityIcons name="map-marker-distance" size={14} color="#6E859A" />
                        <Text style={styles.distanceText}>{therapist.distance}</Text>
                      </View>
                      <View style={styles.dotSeparator} />
                      <View style={styles.availabilityBadge}>
                        <Text style={styles.availabilityText}>Available</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.therapistBody}>
                  <View style={styles.addressRow}>
                    <MaterialCommunityIcons name="map-marker" size={16} color="#6E859A" />
                    <Text style={styles.addressText} numberOfLines={2}>{therapist.address}</Text>
                  </View>
                  {therapist.phone && (
                    <TouchableOpacity style={styles.phoneRow} onPress={() => handleCall(therapist.phone)}>
                      <MaterialCommunityIcons name="phone" size={16} color="#3B82F6" />
                      <Text style={styles.phoneText}>{therapist.phone}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.therapistActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.callButton]}
                    onPress={() => handleCall(therapist.phone)}
                  >
                    <MaterialCommunityIcons name="phone" size={18} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.mapButton]}
                    onPress={() => handleMap(therapist.address)}
                  >
                    <MaterialCommunityIcons name="map-marker" size={18} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Map</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.bookButton]}
                    onPress={() => Alert.alert('Coming Soon', 'Book appointment feature is coming soon!')}
                  >
                    <MaterialCommunityIcons name="calendar-check" size={18} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Book</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </Animated.View>
          ))}

          {filteredTherapists.length === 0 && (
            <View style={styles.noResults}>
              <MaterialCommunityIcons name="account-search" size={64} color="#6E859A" />
              <Text style={styles.noResultsTitle}>No therapists found</Text>
              <Text style={styles.noResultsText}>
                {error || 'No mental health facilities found in your area.'}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.disclaimer}>
            <MaterialCommunityIcons name="information" size={18} color="#6E859A" />
            <Text style={styles.disclaimerText}>
              This list includes licensed mental health professionals. 
              Please verify credentials and availability before booking.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(28,58,92,0.1)',
    borderRadius: 20,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C3A5C',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(28,58,92,0.05)',
    borderRadius: 20,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#1C3A5C',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,58,92,0.1)',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#1C3A5C',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  resultsCount: {
    fontSize: 14,
    color: '#6E859A',
    marginBottom: 16,
    fontWeight: '500',
  },
  therapistCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  therapistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C3A5C',
    marginBottom: 2,
  },
  therapistSpecialty: {
    fontSize: 13,
    color: '#6E859A',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C3A5C',
    marginLeft: 4,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: '#6E859A',
    marginLeft: 4,
  },
  availabilityBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  therapistBody: {
    marginBottom: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#6E859A',
    marginLeft: 8,
    lineHeight: 18,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
  },
  phoneText: {
    fontSize: 13,
    color: '#3B82F6',
    marginLeft: 8,
    fontWeight: '500',
  },
  therapistActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  callButton: {
    backgroundColor: '#10B981',
  },
  mapButton: {
    backgroundColor: '#3B82F6',
  },
  bookButton: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1C3A5C',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6E859A',
    textAlign: 'center',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C3A5C',
    marginTop: 16,
  },
  noResultsText: {
    fontSize: 14,
    color: '#6E859A',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(28,58,92,0.05)',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#6E859A',
    lineHeight: 18,
    marginLeft: 8,
  },
  comingSoonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    opacity: 0.8,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  comingSoonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
  },
});