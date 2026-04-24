import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { setHasSeenOnboarding } from '../utils/storage';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const LOTTIE_SOURCES = {
  welcome: { uri: 'https://assets7.lottiefiles.com/packages/lf20_9wpyhdzo.json' },
  chat: { uri: 'https://assets1.lottiefiles.com/packages/lf20_jcikwtux.json' },
  mood: { uri: 'https://assets5.lottiefiles.com/packages/lf20_2ks3pjua.json' },
  support: { uri: 'https://assets2.lottiefiles.com/packages/lf20_jtbfg2nb.json' },
  done: { uri: 'https://assets3.lottiefiles.com/packages/lf20_touohxv0.json' },
};

const OnboardingScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const userNameFromRoute = route?.params?.userName || 'Friend';
  const listRef = useRef(null);
  const textFadeAnim = useRef(new Animated.Value(1)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const slides = useMemo(() => ([
    {
      id: 'welcome',
      title: t('onboarding.welcomeTitle', { name: userNameFromRoute }),
      description: t('onboarding.welcomeDescription'),
      lottieSource: LOTTIE_SOURCES.welcome,
      colors: ['#EAF6FF', '#D7ECFF', '#F6FBFF'],
    },
    {
      id: 'chat',
      title: t('onboarding.talkFreelyTitle'),
      description: t('onboarding.talkFreelyDescription'),
      lottieSource: LOTTIE_SOURCES.chat,
      colors: ['#EEF8FF', '#DDEFFF', '#F8FCFF'],
    },
    {
      id: 'mood',
      title: t('onboarding.trackMoodTitle'),
      description: t('onboarding.trackMoodDescription'),
      lottieSource: LOTTIE_SOURCES.mood,
      colors: ['#F1F9FF', '#E0F2FF', '#F9FDFF'],
    },
    {
      id: 'insights',
      title: t('onboarding.staySupportedTitle'),
      description: t('onboarding.staySupportedDescription'),
      lottieSource: LOTTIE_SOURCES.support,
      colors: ['#ECF7FF', '#D8EEFF', '#F7FCFF'],
    },
    {
      id: 'finish',
      title: t('onboarding.readyTitle'),
      description: t('onboarding.readyDescription'),
      lottieSource: LOTTIE_SOURCES.done,
      colors: ['#EAF7FF', '#D4ECFF', '#F5FBFF'],
    },
  ]), [t, userNameFromRoute]);

  const currentSlide = slides[activeIndex];
  const isLastSlide = activeIndex === slides.length - 1;

  const fadeInText = () => {
    textFadeAnim.setValue(0.35);
    Animated.timing(textFadeAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const finishOnboarding = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    await setHasSeenOnboarding(true);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const handleNext = () => {
    if (isLastSlide) {
      finishOnboarding();
      return;
    }

    const nextIndex = activeIndex + 1;
    listRef.current?.scrollToIndex({
      index: nextIndex,
      animated: true,
    });
    setActiveIndex(nextIndex);
    fadeInText();
  };

  const handleBack = () => {
    if (activeIndex <= 0) {
      return;
    }

    const previousIndex = activeIndex - 1;
    listRef.current?.scrollToIndex({
      index: previousIndex,
      animated: true,
    });
    setActiveIndex(previousIndex);
    fadeInText();
  };

  const onMomentumScrollEnd = (event) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      fadeInText();
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.illustrationWrap}>
        <LottieView
          source={item.lottieSource}
          autoPlay
          loop
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>
    </View>
  );

  return (
    <LinearGradient colors={currentSlide.colors} style={styles.gradientBackground}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.skipRow}>
          <TouchableOpacity onPress={handleSkip} disabled={saving}>
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          renderItem={renderItem}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={styles.flatList}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        <Animated.View style={[styles.contentWrap, { opacity: textFadeAnim }]}>
          <Text style={styles.stepText}>{t('onboarding.step', { current: activeIndex + 1, total: slides.length })}</Text>
          <Text style={styles.title}>{currentSlide.title}</Text>
          <Text style={styles.description}>{currentSlide.description}</Text>
        </Animated.View>

        <View style={styles.paginationWrap}>
          {slides.map((slide, index) => (
            <View
              key={slide.id}
              style={[
                styles.dot,
                index === activeIndex ? styles.dotActive : null,
              ]}
            />
          ))}
        </View>

        <View style={styles.controlsWrap}>
          <TouchableOpacity
            style={[styles.backButton, activeIndex === 0 ? styles.backButtonDisabled : null]}
            onPress={handleBack}
            disabled={activeIndex === 0 || saving}
          >
            <Text style={[styles.backText, activeIndex === 0 ? styles.backTextDisabled : null]}>{t('onboarding.back')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, saving ? styles.nextButtonDisabled : null]}
            onPress={handleNext}
            disabled={saving}
          >
            <Text style={styles.nextText}>{isLastSlide ? t('onboarding.getStarted') : t('onboarding.next')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  skipRow: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  skipText: {
    color: '#2E5E83',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  flatList: {
    flexGrow: 0,
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrap: {
    marginTop: 8,
    width: width - 80,
    height: 290,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(111, 174, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: '92%',
    height: '92%',
  },
  contentWrap: {
    marginTop: 16,
    alignItems: 'center',
  },
  stepText: {
    color: '#507CA1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 10,
  },
  title: {
    color: '#1F4769',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: '#4A6B86',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  paginationWrap: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    marginHorizontal: 5,
    backgroundColor: 'rgba(50, 103, 144, 0.25)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#2A7FBF',
  },
  controlsWrap: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  backButton: {
    minWidth: 92,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9FC4E0',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonDisabled: {
    opacity: 0.45,
  },
  backText: {
    color: '#3C6483',
    fontSize: 15,
    fontWeight: '700',
  },
  backTextDisabled: {
    color: '#7A99B2',
  },
  nextButton: {
    minWidth: 138,
    borderRadius: 12,
    backgroundColor: '#2A7FBF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 22,
    shadowColor: '#2A7FBF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 6,
  },
  nextButtonDisabled: {
    backgroundColor: '#89B9DD',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default OnboardingScreen;
