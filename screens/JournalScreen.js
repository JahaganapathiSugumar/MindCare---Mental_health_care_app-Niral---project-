import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import TopBackButton from '../components/ui/Premium/TopBackButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

export default function JournalScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const [journalText, setJournalText] = useState('');

  const prompts = [
    { title: "Today's Reflection", desc: "What went well today?", icon: "moon-full" },
    { title: "Gratitude", desc: "What are you thankful for?", icon: "heart-outline" },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBackButton fallbackRoute="Home" />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Journal</Text>
            <Text style={[styles.headerSubtitle, { color: theme.mutedText }]}>Reflect on your day</Text>
          </Animated.View>

          <View style={styles.promptsContainer}>
            {prompts.map((prompt, index) => (
              <Animated.View key={index} entering={SlideInDown.delay(100 * index)} style={[styles.promptCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.promptIconWrap}>
                  <MaterialCommunityIcons name={prompt.icon} size={24} color={theme.primary} />
                </View>
                <View style={styles.promptTextWrap}>
                  <Text style={[styles.promptTitle, { color: theme.text }]}>{prompt.title}</Text>
                  <Text style={[styles.promptDesc, { color: theme.mutedText }]}>{prompt.desc}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={SlideInDown.delay(300)} style={styles.editorContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Free Writing</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Start writing here..."
              placeholderTextColor={theme.mutedText}
              multiline
              textAlignVertical="top"
              value={journalText}
              onChangeText={setJournalText}
            />
          </Animated.View>

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]}>
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  promptsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  promptIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  promptTextWrap: {
    flex: 1,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  promptDesc: {
    fontSize: 14,
  },
  editorContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
  },
  saveButton: {
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
