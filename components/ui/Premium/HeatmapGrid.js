import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const COLORS = {
  level0: '#EBEDF0',
  level1: '#9BE9A8',
  level2: '#40C463',
  level3: '#30A14E',
  level4: '#216E39',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E8EDF2',
  selected: '#3B82F6',
};

const getLevel = (count) => {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 10) return 3;
  return 4;
};

const getColor = (level) => {
  switch(level) {
    case 0: return COLORS.level0;
    case 1: return COLORS.level1;
    case 2: return COLORS.level2;
    case 3: return COLORS.level3;
    case 4: return COLORS.level4;
    default: return COLORS.level0;
  }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HeatmapGrid({ data = {}, onDayPress }) {
  const [selectedDate, setSelectedDate] = useState(null);

  // Generate all days of the year
  const getYearDays = () => {
    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const days = [];
    const current = new Date(start);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      days.push({
        date: new Date(current),
        dateStr: dateStr,
        count: data[dateStr] || 0,
        level: getLevel(data[dateStr] || 0),
        isToday: dateStr === new Date().toISOString().split('T')[0],
        month: current.getMonth(),
        dayOfWeek: current.getDay(),
        day: current.getDate(),
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const allDays = getYearDays();

  // Get first day of year offset (0=Sun, 1=Mon)
  const firstDay = new Date(new Date().getFullYear(), 0, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  // Build weeks with proper alignment
  const weeks = [];
  let week = [];
  
  // Add empty cells for offset
  for (let i = 0; i < offset; i++) {
    week.push(null);
  }

  allDays.forEach((day) => {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  });

  // Fill last week
  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }

  // Calculate month label positions
  const getMonthPositions = () => {
    const positions = [];
    const year = new Date().getFullYear();
    let currentWeek = 0;
    
    for (let m = 0; m < 12; m++) {
      // Find the week where this month starts
      let found = false;
      let weekIndex = 0;
      
      for (let w = 0; w < weeks.length; w++) {
        const weekDays = weeks[w];
        for (let d = 0; d < weekDays.length; d++) {
          const day = weekDays[d];
          if (day && day.month === m && day.day === 1) {
            weekIndex = w;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      
      if (found) {
        positions.push({
          month: m,
          weekIndex: weekIndex,
          label: MONTHS[m],
        });
      }
    }
    return positions;
  };

  const monthPositions = getMonthPositions();
  const totalWeeks = weeks.length;

  const handleDayPress = (day) => {
    if (!day) return;
    setSelectedDate(selectedDate?.dateStr === day.dateStr ? null : day);
    if (onDayPress) onDayPress(day);
  };

  const totalActivities = Object.values(data).reduce((sum, count) => sum + count, 0);
  const activeDays = Object.keys(data).filter(date => data[date] > 0).length;

  const cellSize = 12;
  const gap = 1.5;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.scrollContent}>
          {/* Month Labels - Simple row */}
          <View style={styles.monthRow}>
            <View style={styles.monthSpacer} />
            {monthPositions.map((item, index) => {
              const position = item.weekIndex * (cellSize + gap) + 28;
              return (
                <View key={index} style={[styles.monthLabelWrap, { left: position }]}>
                  <Text style={styles.monthLabel}>{item.label}</Text>
                </View>
              );
            })}
          </View>

          {/* Grid */}
          <View style={styles.gridRow}>
            {/* Day Labels */}
            <View style={styles.dayLabelsCol}>
              <Text style={styles.dayLabel}>Mon</Text>
              <Text style={[styles.dayLabel, { marginTop: cellSize + gap }]}>Wed</Text>
              <Text style={[styles.dayLabel, { marginTop: cellSize + gap }]}>Fri</Text>
            </View>

            {/* Weeks */}
            <View style={styles.weeksCol}>
              {weeks.map((week, weekIdx) => (
                <View key={weekIdx} style={[styles.weekColumn, { width: cellSize }]}>
                  {week.map((day, dayIdx) => {
                    if (!day) {
                      return <View key={`empty-${weekIdx}-${dayIdx}`} style={[styles.emptyCell, { width: cellSize, height: cellSize }]} />;
                    }
                    
                    const isSelected = selectedDate?.dateStr === day.dateStr;
                    const isToday = day.isToday;
                    const color = getColor(day.level);
                    
                    return (
                      <TouchableOpacity
                        key={`${weekIdx}-${dayIdx}`}
                        style={[
                          styles.cell,
                          { backgroundColor: color, width: cellSize, height: cellSize },
                          isSelected && styles.cellSelected,
                          isToday && styles.cellToday,
                        ]}
                        onPress={() => handleDayPress(day)}
                        activeOpacity={0.7}
                      >
                        {day.count > 0 && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{day.count}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Stats & Legend */}
      <View style={styles.footer}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalActivities}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeDays}</Text>
            <Text style={styles.statLabel}>Active Days</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalWeeks}</Text>
            <Text style={styles.statLabel}>Weeks</Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>Less</Text>
          <View style={styles.legendColors}>
            <View style={[styles.legendColor, { backgroundColor: COLORS.level0 }]} />
            <View style={[styles.legendColor, { backgroundColor: COLORS.level1 }]} />
            <View style={[styles.legendColor, { backgroundColor: COLORS.level2 }]} />
            <View style={[styles.legendColor, { backgroundColor: COLORS.level3 }]} />
            <View style={[styles.legendColor, { backgroundColor: COLORS.level4 }]} />
          </View>
          <Text style={styles.legendLabel}>More</Text>
        </View>
      </View>

      {/* Selected Date Info */}
      {selectedDate && (
        <View style={styles.dateInfo}>
          <Text style={styles.dateText}>
            {selectedDate.date.toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
          <Text style={styles.dateCount}>{selectedDate.count} activities</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  monthRow: {
    flexDirection: 'row',
    marginBottom: 4,
    height: 16,
    position: 'relative',
  },
  monthSpacer: {
    width: 28,
  },
  monthLabelWrap: {
    position: 'absolute',
    top: 0,
  },
  monthLabel: {
    fontSize: 8,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  gridRow: {
    flexDirection: 'row',
  },
  dayLabelsCol: {
    width: 28,
    paddingTop: 1,
  },
  dayLabel: {
    fontSize: 7,
    color: COLORS.textLight,
    height: 14,
    textAlign: 'right',
    paddingRight: 4,
  },
  weeksCol: {
    flexDirection: 'row',
  },
  weekColumn: {
    flexDirection: 'column',
    marginRight: 1.5,
    alignItems: 'center',
  },
  cell: {
    borderRadius: 2,
    marginBottom: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCell: {
    marginBottom: 1.5,
  },
  cellSelected: {
    borderWidth: 1.5,
    borderColor: COLORS.selected,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: COLORS.text,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
    minWidth: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.3,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  badgeText: {
    fontSize: 4,
    fontWeight: '700',
    color: COLORS.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexWrap: 'wrap',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 7,
    color: COLORS.textLight,
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.border,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendLabel: {
    fontSize: 7,
    color: COLORS.textLight,
  },
  legendColors: {
    flexDirection: 'row',
    gap: 1,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  dateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateText: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '500',
  },
  dateCount: {
    fontSize: 10,
    color: COLORS.textLight,
  },
});