import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from './Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInLeft } from 'react-native-reanimated';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Just now';
  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return 'Recently';
  }

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
};

const getIconForAction = (action) => {
  if (action?.includes('ACHIEVEMENT')) return { name: 'trophy-award', color: Theme.colors.gold };
  if (action?.includes('CHAT')) return { name: 'robot-outline', color: Theme.colors.purple };
  if (action?.includes('MOOD')) return { name: 'emoticon-happy-outline', color: Theme.colors.primary };
  if (action?.includes('BREATHING') || action?.includes('MEDITATION')) return { name: 'leaf', color: Theme.colors.success };
  if (action?.includes('LOGIN')) return { name: 'login', color: Theme.colors.accent };
  return { name: 'star-four-points-outline', color: '#888' };
};

const getLabelForAction = (action, xp) => {
  if (action === 'ACHIEVEMENT_UNLOCKED') return 'Unlocked an Achievement';
  const formatted = action?.replace(/_/g, ' ').toLowerCase();
  const capitalized = formatted ? formatted.charAt(0).toUpperCase() + formatted.slice(1) : 'Completed Activity';
  return xp ? `${capitalized} (+${xp} XP)` : capitalized;
};

const TimelineCard = ({ item, index, isLast }) => {
  const iconConfig = getIconForAction(item.action);

  return (
    <Animated.View entering={FadeInLeft.delay(index * 100)} style={styles.container}>
      <View style={styles.leftCol}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconConfig.color}20` }]}>
          <MaterialCommunityIcons name={iconConfig.name} size={20} color={iconConfig.color} />
        </View>
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.title}>{getLabelForAction(item.action, item.xpAmount)}</Text>
        {item.achievementId && <Text style={styles.subtitle}>{item.achievementId.replace(/_/g, ' ').toUpperCase()}</Text>}
        <Text style={styles.time}>{formatTimestamp(item.timestamp)}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.sm,
  },
  leftCol: {
    alignItems: 'center',
    width: 40,
    marginRight: Theme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 4,
    marginBottom: -Theme.spacing.sm, // Connect to next item
    zIndex: 1,
  },
  rightCol: {
    flex: 1,
    paddingBottom: Theme.spacing.lg,
    paddingTop: 8,
  },
  title: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  subtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.gold,
    marginTop: 2,
  },
  time: {
    ...Theme.typography.caption,
    color: '#888',
    marginTop: 4,
  }
});

export default TimelineCard;
