import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const InfoCard = ({ title, actionLabel, onActionPress, children }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {actionLabel ? (
          <TouchableOpacity onPress={onActionPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.actionText, { color: theme.primary }]}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#1A3C5A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default InfoCard;
