import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Theme } from '../components/ui/Premium/Theme';
import { GlassCard } from '../components/ui/Premium/GlassCard';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import { getNearbyProfessionals } from '../services/therapistService';

const { width, height } = Dimensions.get('window');

const CARD_WIDTH = width * 0.85;
const CARD_MARGIN = 10;

export default function NearbyTherapistsScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  
  const [location, setLocation] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(true);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      setPermissionGranted(true);
      setPermissionModalVisible(false);
      fetchLocationAndData();
    }
  };

  const requestPermission = async () => {
    setPermissionModalVisible(false);
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setPermissionGranted(true);
      fetchLocationAndData();
    } else {
      setLoading(false);
      // Fallback or warning
    }
  };

  const fetchLocationAndData = async () => {
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc.coords);
      
      const nearby = getNearbyProfessionals(loc.coords.latitude, loc.coords.longitude, 10);
      setProfessionals(nearby);
      
      // Focus map
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }, 1000);

    } catch (error) {
      console.warn("Location error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onMarkerPress = (item) => {
    setSelectedId(item.id);
    mapRef.current?.animateToRegion({
      latitude: item.coordinate.latitude - 0.02, // Offset so marker is above the card
      longitude: item.coordinate.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 500);
  };

  // ----------------------------------------------------
  // PERMISSION MODAL
  // ----------------------------------------------------
  if (permissionModalVisible) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <Animated.View entering={FadeInDown.duration(800)}>
            <GlassCard style={styles.permissionCard}>
              <View style={styles.permissionIconWrapper}>
                <MaterialCommunityIcons name="map-marker-radius" size={48} color={Theme.colors.primary} />
              </View>
              <Text style={styles.permissionTitle}>Allow Location Access</Text>
              <Text style={styles.permissionDesc}>
                MindCare uses your location only to help you discover nearby psychologists, psychiatrists, counselling centres, and mental health clinics. Your location is never stored permanently and is only used with your permission.
              </Text>
              
              <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                <Text style={styles.primaryBtnText}>Allow While Using App</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.secondaryBtnText}>Not Now</Text>
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // ----------------------------------------------------
  // MAP VIEW
  // ----------------------------------------------------
  return (
    <View style={styles.container}>
      {location ? (
        <Animated.View entering={FadeIn.duration(800)} style={StyleSheet.absoluteFillObject}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            customMapStyle={mapStyleDark} // Dark theme map
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {professionals.map((item) => (
              <Marker
                key={item.id}
                coordinate={item.coordinate}
                onPress={() => onMarkerPress(item)}
              >
                <View style={[styles.markerContainer, selectedId === item.id && styles.markerSelected]}>
                  <MaterialCommunityIcons 
                    name={item.type === 'Clinic' ? 'hospital-building' : 'doctor'} 
                    size={20} 
                    color="#FFF" 
                  />
                </View>
              </Marker>
            ))}
          </MapView>
        </Animated.View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Discovering nearby services...</Text>
        </View>
      )}

      {/* Header Overlay */}
      <SafeAreaView style={styles.headerOverlay} pointerEvents="box-none">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnOverlay}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#FFF" />
        </TouchableOpacity>
        <GlassCard style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={24} color={Theme.colors.textDim} />
          <Text style={styles.searchText}>Search area or specialty...</Text>
        </GlassCard>
      </SafeAreaView>

      {/* Horizontal Carousel of Results */}
      {professionals.length > 0 && (
        <Animated.View entering={SlideInDown.delay(500).duration(800)} style={styles.carouselContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
          >
            {professionals.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                activeOpacity={0.9}
                onPress={() => navigation.navigate('TherapistProfile', { id: item.id })}
              >
                <GlassCard style={[styles.resultCard, selectedId === item.id && styles.resultCardSelected]}>
                  <View style={styles.cardHeader}>
                    <Image source={{ uri: item.photoUrl }} style={styles.cardImage} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.cardType}>{item.type}</Text>
                      <View style={styles.cardMeta}>
                        <View style={styles.metaBadge}><Text style={styles.metaText}>{item.rating} ⭐</Text></View>
                        <View style={styles.metaBadge}><Text style={styles.metaText}>{item.distance}</Text></View>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardFee}>{item.fee}</Text>
                    <Text style={[styles.cardStatus, { color: item.isOpen ? Theme.colors.success : Theme.colors.danger }]}>
                      {item.isOpen ? 'Open Now' : 'Closed'}
                    </Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

// ----------------------------------------------------
// STYLES
// ----------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  permissionCard: {
    padding: 32,
    alignItems: 'center',
  },
  permissionIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionDesc: {
    color: Theme.colors.textDim,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: Theme.colors.textDim,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Theme.colors.textDim,
    marginTop: 16,
    fontSize: 16,
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  markerSelected: {
    backgroundColor: Theme.colors.accent,
    transform: [{ scale: 1.2 }],
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  backBtnOverlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 18, 32, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 18, 32, 0.8)',
  },
  searchText: {
    color: Theme.colors.textDim,
    marginLeft: 8,
    fontSize: 15,
  },
  carouselContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  carouselContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2, // Center the first item
  },
  resultCard: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
    padding: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(11, 18, 32, 0.9)', // slightly more opaque to pop from map
  },
  resultCardSelected: {
    borderColor: Theme.colors.primary,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardType: {
    color: Theme.colors.textDim,
    fontSize: 14,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardFee: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cardStatus: {
    fontSize: 14,
    fontWeight: '600',
  }
});

// A standard dark style for React Native Maps
const mapStyleDark = [
  {
    "elementType": "geometry",
    "stylers": [{"color": "#242f3e"}]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#746855"}]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#242f3e"}]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#d59563"}]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#d59563"}]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{"color": "#263c3f"}]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#6b9a76"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{"color": "#38414e"}]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#212a37"}]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#9ca5b3"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{"color": "#746855"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{"color": "#1f2835"}]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#f3d19c"}]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{"color": "#17263c"}]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{"color": "#515c6d"}]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [{"color": "#17263c"}]
  }
];
