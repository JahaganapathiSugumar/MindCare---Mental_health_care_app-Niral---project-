import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated } from 'react-native';
import {
  Svg,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Text as SvgText,
  Line,
  Circle,
  Rect,
} from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedReanimated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Mood emoji mapping
const moodEmojis = {
  1: '😢',
  2: '😰',
  3: '😐',
  4: '😊',
};

const moodLabels = {
  1: 'Sad',
  2: 'Anxious',
  3: 'Neutral',
  4: 'Happy',
};

const moodColors = {
  1: '#EF4444',
  2: '#F59E0B',
  3: '#3B82F6',
  4: '#10B981',
};

export default function MoodOverviewGraph({ moods = [], onMoodPress }) {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [viewMode, setViewMode] = useState('hourly');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPoint, setTooltipPoint] = useState(null);
  const [timerProgress, setTimerProgress] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const tooltipTimer = useRef(null);
  const progressInterval = useRef(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimer.current) {
        clearTimeout(tooltipTimer.current);
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Animate tooltip in
  const animateTooltipIn = (point) => {
    setTooltipPoint(point);
    setShowTooltip(true);
    setTimerProgress(0);
    
    // Reset progress animation
    progressAnim.setValue(0);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Animate tooltip out
  const animateTooltipOut = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowTooltip(false);
      setTooltipPoint(null);
      setTimerProgress(0);
    });
  };

  // Start progress animation
  const startProgressAnimation = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    setTimerProgress(0);
    progressAnim.setValue(0);
    
    const startTime = Date.now();
    const duration = 5000; // 5 seconds
    
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setTimerProgress(progress);
      progressAnim.setValue(progress);
      
      if (progress >= 1) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    }, 50);
  };

  // Show tooltip with 5 second delay
  const showTooltipWithDelay = (point) => {
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
      tooltipTimer.current = null;
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    animateTooltipIn(point);
    startProgressAnimation();

    tooltipTimer.current = setTimeout(() => {
      animateTooltipOut();
      tooltipTimer.current = null;
    }, 5000);
  };

  // Handle point hover/press
  const handlePointHover = (point) => {
    setHoveredPoint(point);
    if (point) {
      showTooltipWithDelay(point);
    }
  };

  const handlePointPress = (point) => {
    if (selectedPoint?.index === point.index) {
      setSelectedPoint(null);
      if (tooltipTimer.current) {
        clearTimeout(tooltipTimer.current);
        tooltipTimer.current = null;
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      animateTooltipOut();
    } else {
      setSelectedPoint(point);
      showTooltipWithDelay(point);
      if (onMoodPress) {
        const moodData = moods[point.index] || { mood: 'neutral' };
        onMoodPress(moodData);
      }
    }
  };

  // Get score from mood data
  const getScore = (m) => {
    if (m.score !== undefined) return m.score;
    const moodMap = { happy: 4, neutral: 3, anxious: 2, sad: 1 };
    return moodMap[(m.mood || 'neutral').toLowerCase()] || 3;
  };

  // Get timestamp from mood data
  const getTimestamp = (m) => {
    if (m.createdAt) {
      if (m.createdAt.seconds) {
        return new Date(m.createdAt.seconds * 1000);
      }
      if (m.createdAt.toDate) {
        return m.createdAt.toDate();
      }
      return new Date(m.createdAt);
    }
    return new Date();
  };

  // Prepare data based on view mode
  const prepareData = () => {
    if (!moods || moods.length === 0) {
      return { data: [3, 3, 3, 3, 3, 3, 3], labels: ['', '', '', '', '', '', ''] };
    }

    let sortedMoods = [...moods].sort((a, b) => {
      const dateA = getTimestamp(a);
      const dateB = getTimestamp(b);
      return dateA - dateB;
    });

    const now = new Date();
    const last24Hours = sortedMoods.filter(m => {
      const date = getTimestamp(m);
      const diff = (now - date) / (1000 * 60 * 60);
      return diff <= 24;
    });

    let data = [];
    let labels = [];

    if (viewMode === 'hourly') {
      for (let i = 11; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(hour.getHours() - i);
        const hourStr = hour.getHours() + ':00';
        labels.push(hourStr);

        let found = false;
        for (const mood of last24Hours) {
          const moodDate = getTimestamp(mood);
          if (moodDate.getHours() === hour.getHours() && 
              moodDate.getDate() === hour.getDate()) {
            data.push(getScore(mood));
            found = true;
            break;
          }
        }
        if (!found) {
          data.push(3);
        }
      }
    } else {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        labels.push(days[date.getDay()]);

        let dayMoods = [];
        for (const mood of sortedMoods) {
          const moodDate = getTimestamp(mood);
          if (moodDate.toDateString() === date.toDateString()) {
            dayMoods.push(getScore(mood));
          }
        }
        const avg = dayMoods.length > 0 
          ? dayMoods.reduce((a, b) => a + b, 0) / dayMoods.length
          : 3;
        data.push(Math.round(avg));
      }
    }

    return { data, labels };
  };

  const chartData = prepareData();
  const data = chartData.data;
  const labels = chartData.labels;

  // Graph dimensions
  const graphWidth = width - 60;
  const graphHeight = 200;
  const padding = { top: 20, bottom: 35, left: 35, right: 15 };
  const chartWidth = graphWidth - padding.left - padding.right;
  const chartHeight = graphHeight - padding.top - padding.bottom;

  const minScore = 1;
  const maxScore = 4;
  const range = maxScore - minScore;

  const points = data.map((score, index) => {
    const x = padding.left + (index * chartWidth) / Math.max(1, data.length - 1);
    const y = padding.top + chartHeight - ((score - minScore) / range) * chartHeight;
    return { x, y, score, index };
  });

  const buildPath = () => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const xc = (p0.x + p1.x) / 2;
      const yc = (p0.y + p1.y) / 2;
      path += ` Q ${p0.x} ${p0.y} ${xc} ${yc}`;
      if (i === points.length - 2) {
        path += ` T ${p1.x} ${p1.y}`;
      }
    }
    return path;
  };

  const buildAreaPath = () => {
    const path = buildPath();
    if (!path) return '';
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    return `${path} L ${lastX} ${padding.top + chartHeight} L ${firstX} ${padding.top + chartHeight} Z`;
  };

  const calculateStats = () => {
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const last = data[data.length - 1] || 3;
    const first = data[0] || 3;
    const change = last - first;
    const direction = change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'stable';
    return { average: avg, current: last, direction, change };
  };

  const stats = calculateStats();

  const isPointActive = (point) => {
    return selectedPoint?.index === point.index || hoveredPoint?.index === point.index;
  };

  // Render tooltip
  const renderTooltip = (point) => {
    if (!point || !showTooltip) return null;
    
    const moodEmoji = moodEmojis[point.score] || '😐';
    const moodLabel = moodLabels[point.score] || 'Neutral';
    const color = moodColors[point.score] || '#3B82F6';
    const timeLabel = labels[point.index] || '';

    return (
      <G opacity={fadeAnim}>
        <Rect
          x={point.x - 45}
          y={point.y - 55}
          width={90}
          height={45}
          rx={8}
          fill="rgba(0,0,0,0.88)"
          stroke={color}
          strokeWidth={1.5}
        />
        <SvgText
          x={point.x}
          y={point.y - 38}
          fontSize="13"
          fill="#FFFFFF"
          textAnchor="middle"
          fontWeight="bold"
        >
          {moodEmoji} {moodLabel}
        </SvgText>
        <SvgText
          x={point.x}
          y={point.y - 24}
          fontSize="9"
          fill="rgba(255,255,255,0.5)"
          textAnchor="middle"
        >
          {timeLabel}
        </SvgText>
        <SvgText
          x={point.x}
          y={point.y - 13}
          fontSize="8"
          fill={color}
          textAnchor="middle"
          fontWeight="500"
        >
          Score: {point.score}/4
        </SvgText>
      </G>
    );
  };

  return (
    <AnimatedReanimated.View entering={FadeInDown.duration(500)} style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: '#000000' }]}>
  📊 Mood Overview
</Text>
          <Text style={styles.subtitle}>
            {viewMode === 'hourly' ? 'Last 12 hours' : 'Last 7 days'}
          </Text>
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'hourly' && styles.toggleActive]}
            onPress={() => {
              setViewMode('hourly');
              setSelectedPoint(null);
              setHoveredPoint(null);
              if (tooltipTimer.current) {
                clearTimeout(tooltipTimer.current);
                tooltipTimer.current = null;
              }
              if (progressInterval.current) {
                clearInterval(progressInterval.current);
                progressInterval.current = null;
              }
              animateTooltipOut();
            }}
          >
            <Text style={[styles.toggleText, viewMode === 'hourly' && styles.toggleTextActive]}>
              Hourly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'daily' && styles.toggleActive]}
            onPress={() => {
              setViewMode('daily');
              setSelectedPoint(null);
              setHoveredPoint(null);
              if (tooltipTimer.current) {
                clearTimeout(tooltipTimer.current);
                tooltipTimer.current = null;
              }
              if (progressInterval.current) {
                clearInterval(progressInterval.current);
                progressInterval.current = null;
              }
              animateTooltipOut();
            }}
          >
            <Text style={[styles.toggleText, viewMode === 'daily' && styles.toggleTextActive]}>
              Daily
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.graphContainer}>
        <Svg width={graphWidth} height={graphHeight}>
          <Defs>
            <SvgLinearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3B82F6" stopOpacity="0.35" />
              <Stop offset="0.6" stopColor="#3B82F6" stopOpacity="0.1" />
              <Stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>

          {/* Y-Axis Grid Lines and Labels */}
          {[4, 3, 2, 1].map((score) => {
            const y = padding.top + chartHeight - ((score - minScore) / range) * chartHeight;
            const isEven = score % 2 === 0;
            return (
              <G key={`grid-${score}`}>
                <Line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke={isEven ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}
                  strokeWidth={isEven ? 0.8 : 0.5}
                  strokeDasharray={isEven ? '4,4' : '2,4'}
                />
                <Rect
                  x={padding.left - 32}
                  y={y - 10}
                  width={28}
                  height={20}
                  rx={5}
                  fill="rgba(0,0,0,0.3)"
                />
                <SvgText
                  x={padding.left - 18}
                  y={y + 4}
                  fontSize="12"
                  fill="#FFFFFF"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {moodEmojis[score]}
                </SvgText>
              </G>
            );
          })}

          {/* X-Axis Line */}
          <Line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
          />

          {/* Area fill */}
          <Path d={buildAreaPath()} fill="url(#moodGrad)" />

          {/* Line path */}
          <Path
            d={buildPath()}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => {
            const color = moodColors[point.score] || '#3B82F6';
            const isActive = isPointActive(point);
            const isSelected = selectedPoint?.index === index;
            const isHovered = hoveredPoint?.index === index;
            
            return (
              <G key={`dot-${index}`}>
                {/* Hover glow */}
                {isHovered && (
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={16}
                    fill="rgba(59, 130, 246, 0.08)"
                    stroke="none"
                  />
                )}

                {/* Data point */}
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? 8 : isHovered ? 7 : 5}
                  fill={isSelected ? '#3B82F6' : color}
                  stroke="#FFFFFF"
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  onPress={() => handlePointPress(point)}
                  onPressIn={() => handlePointHover(point)}
                />

                {/* X-Axis Label */}
                <Rect
                  x={point.x - 20}
                  y={padding.top + chartHeight + 6}
                  width={40}
                  height={16}
                  rx={4}
                  fill={isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(0,0,0,0.2)'}
                />
                <SvgText
                  x={point.x}
                  y={padding.top + chartHeight + 18}
                  fontSize="8"
                  fill={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                  textAnchor="middle"
                  fontWeight={isActive ? '600' : '400'}
                >
                  {labels[index] || ''}
                </SvgText>

                {/* Vertical line for selected */}
                {isSelected && (
                  <Line
                    x1={point.x}
                    y1={point.y + 6}
                    x2={point.x}
                    y2={padding.top + chartHeight}
                    stroke="rgba(59, 130, 246, 0.3)"
                    strokeWidth={1}
                    strokeDasharray="3,3"
                  />
                )}
              </G>
            );
          })}

          {/* Tooltip */}
          {renderTooltip(tooltipPoint)}
        </Svg>
      </View>

      {/* Tooltip info below graph */}
      {showTooltip && tooltipPoint && (
        <Animated.View style={[styles.tooltipInfo, { opacity: fadeAnim }]}>
          <View style={styles.tooltipInfoContent}>
            <Text style={styles.tooltipInfoEmoji}>
              {moodEmojis[tooltipPoint.score] || '😐'}
            </Text>
            <View style={styles.tooltipInfoText}>
              <Text style={styles.tooltipInfoLabel}>
                {moodLabels[tooltipPoint.score] || 'Neutral'}
              </Text>
              <Text style={styles.tooltipInfoTime}>
                {labels[tooltipPoint.index] || ''} • Score: {tooltipPoint.score}/4
              </Text>
            </View>
            <View style={styles.tooltipTimerBar}>
              <View 
                style={[
                  styles.tooltipTimerFill,
                  { width: `${timerProgress * 100}%` }
                ]} 
              />
            </View>
          </View>
        </Animated.View>
      )}

      <View style={styles.footer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={[styles.statValue, { color: moodColors[stats.current] || '#3B82F6' }]}>
            {moodEmojis[stats.current] || '😐'} {moodLabels[stats.current] || 'Neutral'}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Average</Text>
          <Text style={[styles.statValue, { color: '#FFFFFF' }]}>
            {stats.average.toFixed(1)} {moodEmojis[Math.round(stats.average)]}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Trend</Text>
          <Text
            style={[
              styles.statValue,
              { 
                color: stats.direction === 'up' ? '#10B981' : 
                       stats.direction === 'down' ? '#EF4444' : '#F59E0B' 
              },
            ]}
          >
            {stats.direction === 'up' ? '📈' : stats.direction === 'down' ? '📉' : '➡️'}
            {' '}
            {stats.direction === 'up' ? 'Improving' : 
             stats.direction === 'down' ? 'Declining' : 'Stable'}
          </Text>
        </View>
      </View>

      <View style={styles.hintContainer}>
        <MaterialCommunityIcons name="gesture-tap" size={12} color="rgba(255,255,255,0.25)" />
        <Text style={styles.hintText}>
          {selectedPoint ? 'Tap again to deselect' : 'Tap a point for details'}
        </Text>
      </View>
    </AnimatedReanimated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  toggleText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  graphContainer: {
    height: 200,
    marginVertical: 4,
    justifyContent: 'center',
  },
  tooltipInfo: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  tooltipInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tooltipInfoEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  tooltipInfoText: {
    flex: 1,
  },
  tooltipInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tooltipInfoTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  tooltipTimerBar: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  tooltipTimerFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  statLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 3,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 4,
  },
  hintText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '400',
  },
});