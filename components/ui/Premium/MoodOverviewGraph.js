import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
  Svg,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function MoodOverviewGraph({ moods = [] }) {
  const { theme } = useTheme();

  const data = moods.length
    ? moods.map((m) => m.score)
    : [2, 3, 2, 4, 3, 4, 4];

  const graphWidth = width - 80;
  const graphHeight = 80;
  const padding = 10;

  const maxScore = 4;
  const minScore = 1;
  const range = maxScore - minScore || 1;

  const points = data.map((score, index) => {
    const x =
      padding +
      (index * (graphWidth - padding * 2)) /
      Math.max(1, data.length - 1);

    const y =
      graphHeight -
      padding -
      ((score - minScore) / range) *
      (graphHeight - padding * 2);

    return `${x},${y}`;
  });

  let pathStr = `M ${points[0] ? points[0].split(',')[0] : 0
    } ${points[0] ? points[0].split(',')[1] : 0
    }`;

  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i].split(',').map(Number);
    const [x2, y2] = points[i + 1].split(',').map(Number);

    const xc = (x1 + x2) / 2;
    const yc = (y1 + y2) / 2;

    pathStr += ` Q ${x1} ${y1} ${xc} ${yc}`;

    if (i === points.length - 2) {
      pathStr += ` T ${x2} ${y2}`;
    }
  }

  const areaPath = `${pathStr} L ${points[points.length - 1].split(',')[0]
    } ${graphHeight} L ${points[0].split(',')[0]
    } ${graphHeight} Z`;

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Mood Overview
        </Text>

        <MaterialCommunityIcons
          name="chart-bell-curve-cumulative"
          size={24}
          color="#3B82F6"
        />
      </View>

      <View style={styles.graphContainer}>
        <Svg width={graphWidth} height={graphHeight}>
          <Defs>
            <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0"
                stopColor="#3B82F6"
                stopOpacity="0.3"
              />
              <Stop
                offset="1"
                stopColor="#3B82F6"
                stopOpacity="0"
              />
            </SvgLinearGradient>
          </Defs>

          <Path d={areaPath} fill="url(#grad)" />

          <Path
            d={pathStr}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      <View style={styles.footer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Current Mood</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            Good 😊
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Weekly Avg</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            3.4
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Trend</Text>
          <Text
            style={[
              styles.statValue,
              { color: '#10B981' },
            ]}
          >
            +12% ↗
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: '800',
  },

  graphContainer: {
    height: 80,
    marginBottom: 20,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
  },

  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '600',
  },

  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
});