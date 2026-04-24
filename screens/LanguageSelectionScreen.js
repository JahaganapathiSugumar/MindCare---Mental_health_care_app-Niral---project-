import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

const LanguageSelectionScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { language, setLanguage, supportedLanguages, languageMeta } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(language || 'en');
  const [saving, setSaving] = useState(false);

  const languageItems = useMemo(() => {
    return supportedLanguages.map((code) => ({
      code,
      nativeName: languageMeta?.[code]?.nativeName || code,
      englishName: languageMeta?.[code]?.englishName || code,
    }));
  }, [languageMeta, supportedLanguages]);

  const handleContinue = async () => {
    if (saving) {
      return;
    }

    try {
      setSaving(true);
      await setLanguage(selectedLanguage);

      if (route?.params?.onCompleteRoute) {
        navigation.reset({
          index: 0,
          routes: [{ name: route.params.onCompleteRoute }],
        });
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('language.title')}</Text>
        <Text style={styles.subtitle}>{t('language.subtitle')}</Text>

        <View style={styles.languageList}>
          {languageItems.map((item) => {
            const isSelected = item.code === selectedLanguage;
            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.languageItem, isSelected ? styles.languageItemSelected : null]}
                onPress={() => setSelectedLanguage(item.code)}
                activeOpacity={0.9}
              >
                <View>
                  <Text style={styles.nativeName}>{item.nativeName}</Text>
                  <Text style={styles.englishName}>{item.englishName}</Text>
                </View>
                {isSelected ? <Text style={styles.check}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>{t('language.continue')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F8FD',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#163A58',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#4E7491',
    lineHeight: 20,
  },
  languageList: {
    marginTop: 26,
    gap: 10,
  },
  languageItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CFE2F3',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageItemSelected: {
    borderColor: '#2A7FBF',
    backgroundColor: '#EAF4FD',
  },
  nativeName: {
    color: '#1D3E5B',
    fontSize: 18,
    fontWeight: '700',
  },
  englishName: {
    marginTop: 2,
    color: '#6A879D',
    fontSize: 12,
    fontWeight: '600',
  },
  check: {
    color: '#2A7FBF',
    fontSize: 20,
    fontWeight: '800',
  },
  continueButton: {
    marginTop: 'auto',
    backgroundColor: '#2A7FBF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LanguageSelectionScreen;
