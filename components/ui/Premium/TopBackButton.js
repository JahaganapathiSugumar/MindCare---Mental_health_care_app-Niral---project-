import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInLeft, FadeOutLeft } from 'react-native-reanimated';

export default function TopBackButton({ fallbackRoute = 'Home' }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(fallbackRoute);
    }
  };

  return (
    <Animated.View 
      entering={FadeInLeft.duration(300)} 
      exiting={FadeOutLeft.duration(200)}
      style={[styles.container, { top: Math.max(insets.top, 16) }]}
    >
      <TouchableOpacity 
        style={styles.button} 
        onPress={handlePress}
        activeOpacity={0.8}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <MaterialCommunityIcons 
          name={Platform.OS === 'ios' ? 'chevron-left' : 'arrow-left'} 
          size={28} 
          color="#1E293B" 
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    zIndex: 9999,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  }
});
