import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { ensureAuthInitialized } from '../firebase';
import { fetchProfileData } from '../services/profileService';
import { fetchDailyMentalReport, generateDailyReportPdf } from '../services/reportService';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows, spacing, typography } from '../utils/uiTokens';

const ReportScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [fileName, setFileName] = useState('');

  const insights = useMemo(() => {
    if (!report) {
      return [];
    }

    return [
      {
        icon: 'chat-outline',
        label: t('report.chatCount', { defaultValue: 'Chats (24h)' }),
        value: Number(report?.insights?.chatCountLast24Hours || 0),
      },
      {
        icon: 'pulse-outline',
        label: t('report.moodCount', { defaultValue: 'Mood check-ins (24h)' }),
        value: Number(report?.insights?.moodCountLast24Hours || 0),
      },
      {
        icon: 'trending-up-outline',
        label: t('report.recovery', { defaultValue: 'Recovery score' }),
        value: report?.moodRecovery ? report.moodRecovery.recoveryScore : '--',
      },
    ];
  }, [report, t]);

  const handleGenerate = useCallback(async () => {
    try {
      setLoading(true);
      const auth = await ensureAuthInitialized();
      if (!auth?.currentUser?.uid) {
        throw new Error('User is not authenticated.');
      }

      const [profile, reportResult] = await Promise.all([
        fetchProfileData(),
        fetchDailyMentalReport(auth.currentUser.uid, language),
      ]);

      if (!reportResult.success || !reportResult.report) {
        throw new Error(reportResult.error || 'Failed to generate report');
      }

      const pdfResult = await generateDailyReportPdf({
        report: reportResult.report,
        userName: profile?.fullName || profile?.email || 'MindCare User',
      });

      setReport(reportResult.report);
      setFileName(pdfResult.fileName || 'mental_report.pdf');

      Alert.alert(
        t('report.successTitle', { defaultValue: 'Report Generated' }),
        t('report.successBody', { defaultValue: 'Your daily mental report PDF is ready and shared.' })
      );
    } catch (error) {
      console.error('[ReportScreen] Generate report failed:', error.message || error);
      Alert.alert(
        t('report.errorTitle', { defaultValue: 'Report Failed' }),
        error.message || t('report.errorBody', { defaultValue: 'Could not generate your daily report right now.' })
      );
    } finally {
      setLoading(false);
    }
  }, [language, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <LinearGradient
        colors={isDark ? ['#1A2129', '#121212'] : ['#EAF4FF', '#F7F9FC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: theme.text }]}>{t('report.title', { defaultValue: 'Daily Mental Report' })}</Text>
            <Text style={[styles.subtitle, { color: theme.mutedText }]}>{t('report.subtitle', { defaultValue: 'AI summary + PDF export for today' })}</Text>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <View style={styles.heroTopRow}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color={theme.primary} />
            <Text style={[styles.heroTitle, { color: theme.text }]}>Daily Mental Health Report</Text>
          </View>
          <Text style={[styles.heroBody, { color: theme.mutedText }]}>
            {t('report.description', { defaultValue: 'Generate a concise report from your last 24h chats and mood trends, then export it as a PDF.' })}
          </Text>

          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: theme.primary }, loading ? styles.generateButtonDisabled : null]}
            onPress={handleGenerate}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.generateButtonText}>{t('report.generating', { defaultValue: 'Generating...' })}</Text>
              </>
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>{t('report.generateCta', { defaultValue: 'Generate Daily Report' })}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {report ? (
          <>
            <View style={styles.insightGrid}>
              {insights.map((item) => (
                <View key={item.label} style={[styles.insightCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                  <Ionicons name={item.icon} size={18} color={theme.primary} />
                  <Text style={[styles.insightValue, { color: theme.text }]}>{item.value}</Text>
                  <Text style={[styles.insightLabel, { color: theme.mutedText }]}>{item.label}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
              <Text style={[styles.previewTitle, { color: theme.text }]}>{t('report.previewTitle', { defaultValue: "Today's Summary" })}</Text>
              <Text style={[styles.previewSummary, { color: theme.mutedText }]}>{report.summary}</Text>

              {report?.moodRecovery ? (
                <View style={[styles.recoveryBadge, { backgroundColor: theme.secondary || '#EAF4FF' }]}>
                  <Text style={[styles.recoveryText, { color: theme.text }]}>
                    {`Recovery: ${report.moodRecovery.initialMood} -> ${report.moodRecovery.finalMood} (${report.moodRecovery.recoveryScore > 0 ? `+${report.moodRecovery.recoveryScore}` : report.moodRecovery.recoveryScore})`}
                  </Text>
                </View>
              ) : null}

              <View style={styles.fileRow}>
                <Ionicons name="document-attach-outline" size={16} color={theme.primary} />
                <Text style={[styles.fileText, { color: theme.mutedText }]} numberOfLines={1}>{fileName}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={[styles.placeholderCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <MaterialCommunityIcons name="notebook-heart-outline" size={30} color={theme.primary} />
            <Text style={[styles.placeholderTitle, { color: theme.text }]}>{t('report.emptyTitle', { defaultValue: 'No report generated yet' })}</Text>
            <Text style={[styles.placeholderBody, { color: theme.mutedText }]}>
              {t('report.emptyBody', { defaultValue: 'Tap Generate Daily Report to create a calm, structured summary of your emotional day.' })}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: typography.subtitle,
    fontWeight: '500',
  },
  heroCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: '#1A3C5A',
    ...shadows.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  heroBody: {
    marginTop: 8,
    fontSize: typography.body,
    lineHeight: 20,
  },
  generateButton: {
    marginTop: 14,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  insightGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  insightCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 94,
  },
  insightValue: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '800',
  },
  insightLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
  },
  previewCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    shadowColor: '#1A3C5A',
    ...shadows.soft,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  previewSummary: {
    marginTop: 8,
    fontSize: typography.body,
    lineHeight: 21,
  },
  recoveryBadge: {
    marginTop: 10,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  recoveryText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  fileRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  placeholderCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  placeholderTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
  },
  placeholderBody: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: typography.body,
    lineHeight: 20,
  },
});

export default ReportScreen;
