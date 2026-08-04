import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, DeviceEventEmitter } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import NovaCompanion from './NovaCompanion';

export default function GlobalNova() {
  const [novaState, setNovaState] = useState('idle');
  const [isVisible, setIsVisible] = useState(true);
  const [hiddenByRoute, setHiddenByRoute] = useState(false);
  const navigation = useNavigation();

  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const stateSub = DeviceEventEmitter.addListener('setNovaState', (state) => {
      setNovaState(state);
    });

    const scrollSub = DeviceEventEmitter.addListener('onScrollDirection', ({ scrollingDown }) => {
      opacity.value = withTiming(scrollingDown ? 0.4 : 1, { duration: 300 });
      scale.value = withTiming(scrollingDown ? 0.8 : 1, { duration: 300 });
    });

    return () => {
      stateSub.remove();
      scrollSub.remove();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      const currentRoute = navigation.getCurrentRoute();
      if (currentRoute?.name === 'Chat') {
        setHiddenByRoute(true);
      } else {
        setHiddenByRoute(false);
      }
    });
    return unsubscribe;
  }, [navigation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  if (!isVisible || hiddenByRoute) return null;

  return (
    <Animated.View style={[styles.floatingNovaContainer, animatedStyle]}>
      <TouchableOpacity style={styles.closeNovaButton} onPress={() => setIsVisible(false)}>
        <MaterialCommunityIcons name="close" size={16} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => {
          DeviceEventEmitter.emit('setNovaState', 'idle');
          navigation.navigate('Chat');
        }} 
        activeOpacity={0.9}
      >
        <NovaCompanion state={novaState} style={{ transform: [{ scale: 0.6 }] }} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingNovaContainer: {
    position: 'absolute',
    bottom: 180, // Above SOS button (approx 170-190)
    right: 24, // Aligned with SOS
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    width: 90, 
    height: 90,
  },
  closeNovaButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
