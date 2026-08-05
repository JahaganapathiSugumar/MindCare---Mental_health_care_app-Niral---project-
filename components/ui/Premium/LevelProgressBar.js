import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Theme } from './Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const LevelProgressBar = ({ level, currentXP, totalXP, xpNeededForNextLevel, progress }) => {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring(progress || 0, {
      damping: 20,
      stiffness: 90,
    });
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${Math.max(0, Math.min(100, animatedProgress.value * 100))}%`,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <MaterialCommunityIcons name="star-shooting" size={20} color={Theme.colors.gold} />
          <Text style={styles.levelText}>Level {level}</Text>
        </View>
        <Text style={styles.xpText}>{Math.floor(currentXP)} / {Math.floor(xpNeededForNextLevel)} XP</Text>
      </View>
      
      <View style={styles.track}>
        <Animated.View style={[styles.fill, progressStyle]} />
      </View>
      
      <Text style={styles.totalXpText}>Total Lifetime XP: {Math.floor(totalXP)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    gap: 6,
  },
  levelText: {
    ...Theme.typography.h3,
    color: Theme.colors.gold,
  },
  xpText: {
    ...Theme.typography.body,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  track: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Theme.borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Theme.colors.gold,
    borderRadius: Theme.borderRadius.full,
  },
  totalXpText: {
    ...Theme.typography.caption,
    color: 'rgba(255,255,255,0.5)',
    marginTop: Theme.spacing.sm,
    textAlign: 'right',
  }
});

export default LevelProgressBar;
