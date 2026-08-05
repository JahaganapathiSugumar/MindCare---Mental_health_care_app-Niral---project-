import React, { useState, useEffect, useRef } from 'react';
import {
  DeviceEventEmitter, View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, SafeAreaView, Dimensions,
  StatusBar, ActivityIndicator, Modal, Linking, Platform
} from 'react-native';
import {
  Search, SlidersHorizontal, Brain, BookOpen, Star, Trophy,
  Filter, RefreshCw, Play, Pause, X, ExternalLink, Volume2,
  VolumeX, Maximize2, Minimize2, Clock, User, Eye, Headphones,
  FileText, Video as VideoIcon, Music, Book
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import { Audio } from 'expo-av';
import TopBackButton from '../components/ui/Premium/TopBackButton';
import {
  FeaturedCard, CategoryChip, RecommendedCard, VideoCard,
  ArticleCard, CBTCard, MeditationCard, StreakWidget,
  AchievementBadge, FloatingBottomNav
} from '../components/ui/Premium/LearningHubCards';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  primary: '#3B82F6',
  text: '#1C3A5C',
  textMuted: '#6E859A',
  overlay: 'rgba(0,0,0,0.7)',
};

const CATEGORIES = [
  'All', 'Videos', 'Articles', 'CBT', 'Meditation', 'Stress', 'Burnout',
  'Sleep', 'Anxiety', 'Mindfulness', 'Depression'
];

// ============ 3 VIDEOS ============
const VIDEO_DATA = [
  {
    id: 'vid1',
    title: "Managing Panic Attacks: Evidence-Based Techniques",
    instructor: "Dr. Sarah Jenkins",
    description: "Learn validated strategies for managing panic attacks including grounding techniques and breathing exercises.",
    views: "12K",
    duration: "14:20",
    category: "Anxiety",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=400&auto=format&fit=crop",
    type: "video"
  },
  {
    id: 'vid2',
    title: "Mindfulness for Beginners: Core Principles",
    instructor: "Alex Rivers",
    description: "A comprehensive introduction to mindfulness meditation with practical exercises for daily life.",
    views: "8.5K",
    duration: "8:45",
    category: "Mindfulness",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=400&auto=format&fit=crop",
    type: "video"
  },
  {
    id: 'vid3',
    title: "CBT for Depression: Behavioral Activation",
    instructor: "Dr. David Kim",
    description: "Learn behavioral activation techniques to structure activities and improve mood.",
    views: "15.3K",
    duration: "18:30",
    category: "Depression",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1511295742362-92c96b124e41?q=80&w=400&auto=format&fit=crop",
    type: "video"
  }
];

// ============ 3 ARTICLES ============
const ARTICLE_DATA = [
  {
    id: 'art1',
    title: "Understanding Anxiety: Causes and Coping Strategies",
    summary: "Anxiety disorders affect millions worldwide. Learn about the biological and psychological factors that contribute to anxiety and discover evidence-based coping techniques.",
    fullContent: `# Understanding Anxiety: A Comprehensive Guide

## What is Anxiety?
Anxiety is a natural response to stress, but when it becomes persistent and overwhelming, it can interfere with daily life. Anxiety disorders are the most common mental health conditions, affecting over 40 million adults in the United States alone.

## Biological Factors
Research shows that anxiety disorders are associated with:
- Genetic predisposition
- Neurotransmitter imbalances (particularly serotonin and GABA)
- Amygdala hyperactivity
- HPA axis dysregulation

## Psychological Factors
- Negative thought patterns
- Catastrophizing
- Perfectionism
- Low self-esteem

## Evidence-Based Coping Strategies

### 1. Cognitive Behavioral Therapy (CBT)
CBT is the gold-standard treatment for anxiety. It helps identify and challenge negative thought patterns while developing healthier coping mechanisms.

### 2. Mindfulness Meditation
Regular mindfulness practice reduces anxiety by decreasing rumination, increasing emotional regulation, and reducing stress reactivity.

### 3. Physical Exercise
Exercise releases endorphins, reduces stress hormones, and improves sleep quality.

### 4. Breathing Techniques
Deep breathing exercises activate the parasympathetic nervous system, reducing anxiety symptoms.

### 5. Sleep Hygiene
Poor sleep significantly worsens anxiety. Aim for 7-9 hours of quality sleep.

## When to Seek Professional Help
Consider professional support if anxiety interferes with work or school, affects relationships, causes physical symptoms (chest pain, dizziness), or leads to avoidance behaviors.

Remember: You're not alone, and effective treatments are available.`,
    readTime: "8 min",
    category: "Anxiety",
    source: "OpenLearn",
    image: "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=400&auto=format&fit=crop",
    type: "article"
  },
  {
    id: 'art2',
    title: "The Science of Sleep: Why Rest is Essential for Mental Health",
    summary: "Poor sleep quality is linked to depression, anxiety, and cognitive decline. Understand the science behind sleep and mental health.",
    fullContent: `# The Science of Sleep and Mental Health

## The Sleep-Mental Health Connection
Sleep plays a crucial role in mental health. Chronic sleep deprivation can lead to increased emotional reactivity, impaired cognitive function, higher risk of depression and anxiety, and reduced stress resilience.

## Understanding Sleep Cycles
Sleep consists of several cycles, each lasting about 90 minutes:
- **NREM Stage 1**: Light sleep (5-10%)
- **NREM Stage 2**: Deeper sleep (45-55%)
- **NREM Stage 3**: Deep sleep (15-25%)
- **REM Sleep**: Dreaming stage (20-25%)

## How Sleep Affects Mental Health

### Emotional Processing
REM sleep is essential for processing emotions. Without adequate REM sleep, we become more emotionally reactive and less able to regulate our feelings.

### Memory Consolidation
Deep sleep helps consolidate memories and learning, which is crucial for mental health and cognitive function.

### Neuroplasticity
Sleep promotes neuroplasticity, allowing the brain to adapt and rewire itself in response to experiences.

## Evidence-Based Sleep Strategies

### 1. Consistent Sleep Schedule
Go to bed and wake up at the same time daily, even on weekends.

### 2. Sleep Environment Optimization
- Keep room cool (65-68°F)
- Use blackout curtains
- Minimize noise
- Remove screens 1 hour before bed

### 3. Relaxation Techniques
- Progressive muscle relaxation
- Body scan meditation
- Guided sleep meditations
- Breathing exercises (4-7-8 technique)

### 4. Lifestyle Modifications
Limit caffeine after 2 PM, reduce alcohol intake, exercise regularly (but not within 3 hours of bedtime), and avoid large meals before bed.

## Sleep Recommendations by Age
- Adults: 7-9 hours
- Teenagers: 8-10 hours
- School-age children: 9-11 hours

Remember: Quality sleep is not a luxury—it's a biological necessity for optimal mental health.`,
    readTime: "10 min",
    category: "Sleep",
    source: "OpenLearn",
    image: "https://images.unsplash.com/photo-1511295742362-92c96b124e41?q=80&w=400&auto=format&fit=crop",
    type: "article"
  },
  {
    id: 'art3',
    title: "Recognizing Depression: Early Warning Signs",
    summary: "Key indicators that may signal the onset of depression, including emotional, physical, and behavioral symptoms.",
    fullContent: `# Recognizing Depression: A Guide to Early Intervention

## Understanding Depression
Depression is more than just sadness—it's a persistent condition that affects how you feel, think, and handle daily activities.

## Early Warning Signs

### Emotional Symptoms
- Persistent sadness or empty mood
- Loss of interest in once-enjoyed activities
- Feelings of worthlessness or guilt
- Irritability or frustration
- Anxiety or agitation
- Pessimism and hopelessness

### Physical Symptoms
- Changes in appetite (significant weight loss or gain)
- Sleep disturbances (insomnia or hypersomnia)
- Decreased energy and fatigue
- Restlessness or slowed movements
- Headaches or digestive problems

### Cognitive Symptoms
- Difficulty concentrating
- Poor decision-making
- Memory problems
- Negative thought patterns
- Slowed thinking and speech

### Behavioral Symptoms
- Social withdrawal
- Neglecting responsibilities
- Reduced participation in activities
- Substance abuse
- Self-harm or suicidal thoughts

## When to Seek Help
Seek professional support if you experience persistent symptoms for more than 2 weeks, thoughts of suicide or self-harm, impaired daily functioning, or physical symptoms without medical cause.

## Treatment Options

### Psychotherapy
- **CBT**: Identifies and changes negative thought patterns
- **IPT**: Focuses on relationships and communication
- **Psychodynamic therapy**: Explores unconscious processes

### Medication
Always consult a psychiatrist for medication management.

### Lifestyle Interventions
Regular exercise, healthy nutrition (omega-3s, B-vitamins), adequate sleep, stress reduction practices, and social connection.

Remember: Depression is a treatable condition. Early intervention significantly improves outcomes.`,
    readTime: "6 min",
    category: "Depression",
    source: "OpenLearn",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=400&auto=format&fit=crop",
    type: "article"
  }
];

// ============ 3 MEDITATIONS ============
const MEDITATION_DATA = [
  {
    id: 'med1',
    title: "Deep Relaxation Body Scan",
    description: "A 15-minute guided body scan meditation that helps release physical tension and promotes deep relaxation.",
    duration: "15m",
    category: "Mindfulness",
    type: "audio",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=400&auto=format&fit=crop",
    transcript: `# Deep Relaxation Body Scan Meditation

Find a comfortable position, either sitting or lying down...
Close your eyes and take three deep breaths...

Begin to bring your attention to your feet...
Notice any sensations in your feet...
Allow them to relax and release any tension...

Move your attention to your lower legs...
Feel the muscles soften and relax...

Continue moving up through your body...
Your thighs, hips, lower back...
Your abdomen, chest, upper back...

Your shoulders, arms, hands...
Your neck, jaw, and face...

Take a moment to feel your entire body...
Relaxed, peaceful, and at ease...

When you're ready, gently bring your attention back...
And slowly open your eyes...`
  },
  {
    id: 'med2',
    title: "Morning Calm Meditation",
    description: "Start your day with clarity and intention. This 10-minute practice focuses on breath awareness and setting positive intentions.",
    duration: "10m",
    category: "Mindfulness",
    type: "audio",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    image: "https://images.unsplash.com/photo-1528315651484-4dbe277c2299?q=80&w=400&auto=format&fit=crop",
    transcript: `# Morning Calm Meditation

As you wake, take a moment to feel your breath...
Notice the quality of your breath...
Is it shallow or deep? Fast or slow?

Begin to breathe more deeply...
Inhale for 4 counts, hold for 2, exhale for 6...
Let go of any tension with each exhale...

Set an intention for your day...
What would you like to cultivate today?
Perhaps patience, kindness, or presence...

Visualize your day unfolding with ease...
See yourself responding to challenges with grace...
Moving through the day with mindfulness...

When you feel ready, gently open your eyes...
Carry this calm with you through your day...`
  },
  {
    id: 'med3',
    title: "Focus & Clarity Meditation",
    description: "Enhance concentration and mental clarity with this 20-minute focused attention practice.",
    duration: "20m",
    category: "Stress",
    type: "audio",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=400&auto=format&fit=crop",
    transcript: `# Focus & Clarity Meditation

Sit comfortably with your spine upright...
Close your eyes and bring awareness to your breath...

Notice the sensations of breathing...
The rise and fall of your chest...
The feeling of air entering and leaving...

When your mind wanders, gently return to your breath...
This is the practice—noticing and returning...

Imagine your thoughts as clouds in the sky...
Observe them without attachment...
Let them float by as you rest in awareness...

Feel a sense of clarity emerging...
Stillness and focus growing stronger...

Continue this practice for the remainder...
When ready, gradually return to the room...`
  }
];

// ============ 3 CBT COURSES ============
const CBT_DATA = [
  {
    id: 'cbt1',
    title: "Reframing Negative Thinking",
    description: "Learn to identify and challenge automatic negative thoughts using cognitive restructuring techniques.",
    progress: 45,
    category: "CBT",
    steps: 8,
    completed: 4,
    fullContent: `# Reframing Negative Thinking

## Step 1: Identify Automatic Negative Thoughts (ANTs)
Pay attention to your thoughts when you feel stressed or upset.
Common ANTs include:
- "I always mess things up"
- "Everyone thinks I'm incompetent"
- "Nothing ever works out for me"

## Step 2: Challenge Your Thoughts
Ask yourself:
- What's the evidence for this thought?
- What's the evidence against it?
- Is there a more balanced way to think about this?

## Step 3: Create Alternative Thoughts
Replace negative thoughts with more realistic ones.

## Step 4: Practice Regularly
The more you practice, the more automatic this process becomes.`
  },
  {
    id: 'cbt2',
    title: "Cognitive Distortions Masterclass",
    description: "Deep dive into common cognitive distortions and evidence-based strategies to overcome them.",
    progress: 10,
    category: "CBT",
    steps: 12,
    completed: 2,
    fullContent: `# Cognitive Distortions

## Common Cognitive Distortions:
1. All-or-Nothing Thinking
2. Overgeneralization
3. Mental Filter
4. Disqualifying the Positive
5. Jumping to Conclusions
6. Magnification & Minimization

## How to Overcome Cognitive Distortions
- Keep a thought log
- Challenge your assumptions
- Seek evidence for and against your thoughts
- Practice self-compassion
- Work with a therapist`
  },
  {
    id: 'cbt3',
    title: "Behavioural Activation Program",
    description: "A structured approach to increasing engagement in positive activities to improve mood and motivation.",
    progress: 0,
    category: "CBT",
    steps: 10,
    completed: 0,
    fullContent: `# Behavioural Activation Program

## What is Behavioral Activation?
Behavioral activation is a CBT technique that helps you re-engage with life through structured activity scheduling.

## Core Principles:
1. Activity monitoring
2. Activity scheduling
3. Overcoming avoidance
4. Building rewarding experiences

## Steps to Get Started:
1. Track your daily activities
2. Identify patterns of avoidance
3. Schedule small, achievable goals
4. Gradually increase engagement
5. Celebrate progress`
  }
];

// ============ FEATURED & RECOMMENDED ============
const FEATURED_DATA = [
  ARTICLE_DATA[0],
  {
    id: 'feat2',
    title: "Managing Panic Attacks: Quick Reference Guide",
    summary: "Step-by-step guidance for managing acute panic attacks.",
    readingTime: "4",
    category: "Anxiety",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop",
    type: "article",
    fullContent: ARTICLE_DATA[0].fullContent
  }
];

const RECOMMENDED_DATA = [
  MEDITATION_DATA[0],
  VIDEO_DATA[0],
  ARTICLE_DATA[1],
  MEDITATION_DATA[1],
  VIDEO_DATA[1]
];

export default function LearningHubScreen() {
  const navigation = useNavigation();
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('LearningHub');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null);

  // Video player states
  const videoRef = useRef(null);
  const [videoStatus, setVideoStatus] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Audio player states
  const soundRef = useRef(null);
  const [audioStatus, setAudioStatus] = useState({});
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // Filtered data states - start with all data
  const [filteredArticles, setFilteredArticles] = useState(ARTICLE_DATA);
  const [filteredVideos, setFilteredVideos] = useState(VIDEO_DATA);
  const [filteredMeditations, setFilteredMeditations] = useState(MEDITATION_DATA);
  const [filteredCBT, setFilteredCBT] = useState(CBT_DATA);
  const [filteredFeatured, setFilteredFeatured] = useState(FEATURED_DATA);
  const [filteredRecommended, setFilteredRecommended] = useState(RECOMMENDED_DATA);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // FILTER FUNCTION - NOW WORKING PROPERLY
  useEffect(() => {
    const filterContent = (data) => {
      let filtered = data;
      
      // Filter by category
      if (activeCategory !== 'All') {
        filtered = filtered.filter(item => 
          item.category && item.category.toLowerCase() === activeCategory.toLowerCase()
        );
      }
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item => 
          item.title.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          (item.summary && item.summary.toLowerCase().includes(query))
        );
      }
      
      return filtered;
    };

    // Apply filters to all data
    setFilteredArticles(filterContent(ARTICLE_DATA));
    setFilteredVideos(filterContent(VIDEO_DATA));
    setFilteredMeditations(filterContent(MEDITATION_DATA));
    setFilteredCBT(filterContent(CBT_DATA));
    setFilteredFeatured(filterContent(FEATURED_DATA));
    setFilteredRecommended(filterContent(RECOMMENDED_DATA));
  }, [activeCategory, searchQuery]);

  // Video playback functions
  const handleVideoPress = (video) => {
    setSelectedMedia(video);
    setModalType('video');
    setModalVisible(true);
    setIsPlaying(false);
  };

  const handleVideoPlayback = async (status) => {
    setVideoStatus(status);
    setIsPlaying(status.isPlaying);
  };

  const toggleVideoPlay = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = async () => {
    if (videoRef.current) {
      await videoRef.current.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  // Audio playback functions
  const handleAudioPress = async (audio) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      setSelectedMedia(audio);
      setModalType('audio');
      setModalVisible(true);

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: audio.audioUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setAudioStatus(status);
      setIsAudioPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        setAudioStatus(status);
        if (status.isLoaded) {
          const progress = (status.positionMillis / status.durationMillis) * 100;
          setAudioProgress(progress);
          setIsAudioPlaying(status.isPlaying);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const toggleAudioPlay = async () => {
    if (soundRef.current) {
      if (isAudioPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
      setIsAudioPlaying(!isAudioPlaying);
    }
  };

  // Article view function
  const handleArticlePress = (article) => {
    setSelectedMedia(article);
    setModalType('article');
    setModalVisible(true);
  };

  const closeModal = async () => {
    if (videoRef.current) {
      await videoRef.current.pauseAsync();
    }
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setModalVisible(false);
    setSelectedMedia(null);
    setModalType(null);
    setIsPlaying(false);
    setIsAudioPlaying(false);
    setAudioProgress(0);
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    if (tab === 'Home') navigation.navigate('Home');
    if (tab === 'Chat') navigation.navigate('Chat');
    if (tab === 'Mood') navigation.navigate('Mood');
    if (tab === 'Profile') navigation.navigate('Profile');
  };

  const renderContent = (data, type, renderFunction) => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading {type}s...</Text>
        </View>
      );
    }
    if (data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No {type}s found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters or search</Text>
        </View>
      );
    }
    return renderFunction(data);
  };

  // Render modal content
  const renderModalContent = () => {
    if (!selectedMedia) return null;

    switch (modalType) {
      case 'video':
        return (
          <View style={styles.modalContent}>
            <View style={styles.videoContainer}>
              <Video
                ref={videoRef}
                source={{ uri: selectedMedia.videoUrl }}
                rate={1.0}
                volume={1.0}
                isMuted={isMuted}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                style={styles.videoPlayer}
                onPlaybackStatusUpdate={handleVideoPlayback}
              />
              <View style={styles.videoControls}>
                <TouchableOpacity onPress={toggleVideoPlay} style={styles.controlButton}>
                  {isPlaying ? <Pause color="white" size={30} /> : <Play color="white" size={30} />}
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleMute} style={styles.controlButton}>
                  {isMuted ? <VolumeX color="white" size={24} /> : <Volume2 color="white" size={24} />}
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.modalTitle}>{selectedMedia.title}</Text>
            <Text style={styles.modalSubtitle}>{selectedMedia.instructor}</Text>
            <Text style={styles.modalDescription}>{selectedMedia.description}</Text>
            <View style={styles.modalMeta}>
              <Text style={styles.modalMetaText}>👁 {selectedMedia.views} views</Text>
              <Text style={styles.modalMetaText}>⏱ {selectedMedia.duration}</Text>
            </View>
          </View>
        );

      case 'audio':
        return (
          <View style={styles.modalContent}>
            <View style={styles.audioContainer}>
              <View style={styles.audioArtwork}>
                <Headphones size={60} color={COLORS.primary} />
              </View>
              <View style={styles.audioProgressBar}>
                <View style={[styles.audioProgressFill, { width: `${audioProgress}%` }]} />
              </View>
              <TouchableOpacity onPress={toggleAudioPlay} style={styles.audioPlayButton}>
                {isAudioPlaying ? <Pause color="white" size={40} /> : <Play color="white" size={40} />}
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedMedia.title}</Text>
              <Text style={styles.modalDescription}>{selectedMedia.description}</Text>
              <Text style={styles.modalSubtitle}>Duration: {selectedMedia.duration}</Text>
            </View>
          </View>
        );

      case 'article':
        return (
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedMedia.title}</Text>
            <View style={styles.articleMeta}>
              <Text style={styles.modalSubtitle}>📖 {selectedMedia.readTime || '10 min'}</Text>
              <Text style={styles.modalSubtitle}>🏷 {selectedMedia.category}</Text>
            </View>
            <Text style={styles.articleContent}>{selectedMedia.fullContent || selectedMedia.summary}</Text>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBackButton fallbackRoute="Home" />
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <View style={styles.headerTop}>
            
            <View>
              <Text style={{height:30}}></Text>
              <Text style={styles.title}>Learning Hub</Text>
              <Text style={styles.subtitle}>Evidence-based resources for a healthier mind.</Text>
            </View>
            <TouchableOpacity onPress={() => setIsLoading(true)} style={styles.refreshBtn}>
              <RefreshCw size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Search size={20} color={COLORS.textMuted} style={styles.searchIcon} />
              <TextInput
                placeholder="Search topics, articles, videos..."
                placeholderTextColor={COLORS.textMuted}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <SlidersHorizontal size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Featured */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Today</Text>
          {renderContent(filteredFeatured, 'featured', (data) => (
            <TouchableOpacity onPress={() => handleArticlePress(data[0])}>
              <FeaturedCard
                title={data[0]?.title || "Understanding Anxiety"}
                readingTime={data[0]?.readTime || "6"}
                image={data[0]?.image || "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=600&auto=format&fit=crop"}
                onPress={() => handleArticlePress(data[0])}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                title={cat}
                isSelected={activeCategory === cat}
                onPress={() => setActiveCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Recommended */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended For You</Text>
          {renderContent(filteredRecommended, 'recommended', (data) => (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {data.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    if (item.type === 'video' || item.videoUrl) {
                      handleVideoPress(item);
                    } else if (item.type === 'audio' || item.audioUrl) {
                      handleAudioPress(item);
                    } else {
                      handleArticlePress(item);
                    }
                  }}
                >
                  <RecommendedCard
                    title={item.title}
                    desc={item.description || item.summary || item.desc || 'Learn more about mental health'}
                    difficulty={item.difficulty || 'Beginner'}
                    duration={item.duration || item.readTime || '10 min'}
                    image={item.image || item.thumbnail}
                    delay={index * 200}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ))}
        </View>

        {/* Video Library - 3 Videos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video Library</Text>
          {renderContent(filteredVideos, 'video', (data) => (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {data.map((video) => (
                <TouchableOpacity key={video.id} onPress={() => handleVideoPress(video)}>
                  <VideoCard
                    title={video.title}
                    instructor={video.instructor}
                    views={video.views}
                    duration={video.duration}
                    image={video.thumbnail}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ))}
        </View>

        {/* CBT Center - 3 Courses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CBT Learning Center</Text>
          {renderContent(filteredCBT, 'CBT course', (data) => (
            <View style={styles.verticalList}>
              {data.map((course) => (
                <TouchableOpacity key={course.id} onPress={() => handleArticlePress(course)}>
                  <CBTCard
                    title={course.title}
                    progress={course.progress}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Articles - 3 Articles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evidence-Based Articles</Text>
          {renderContent(filteredArticles, 'article', (data) => (
            <View style={styles.verticalList}>
              {data.map((article) => (
                <TouchableOpacity key={article.id} onPress={() => handleArticlePress(article)}>
                  <ArticleCard
                    title={article.title}
                    summary={article.summary}
                    readTime={article.readTime}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Guided Meditation - 3 Meditations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guided Meditation</Text>
          {renderContent(filteredMeditations, 'meditation', (data) => (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {data.map((meditation) => (
                <TouchableOpacity key={meditation.id} onPress={() => handleAudioPress(meditation)}>
                  <MeditationCard
                    title={meditation.title}
                    duration={meditation.duration}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ))}
        </View>

        {/* Therapist Integration */}
        <View style={[styles.section, { paddingBottom: 100 }]}>
          <Text style={styles.sectionTitle}>Therapist Integration</Text>
          <TouchableOpacity
            style={[styles.searchBar, { marginBottom: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('TherapistHub')}
          >
            <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>View Therapist Hub</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('NearbyTherapists')}
          >
            <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Find Nearby Therapists</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Modal for media playback */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <X color="white" size={28} />
            </TouchableOpacity>
            {renderModalContent()}
          </SafeAreaView>
        </View>
      </Modal>

      <FloatingBottomNav activeTab={activeTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    maxWidth: '85%',
    lineHeight: 20,
  },
  refreshBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  clearText: {
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 5,
  },
  filterBtn: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  categoryScroll: {
    paddingRight: 20,
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  verticalList: {
    gap: 12,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    marginTop: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
    marginBottom: 10,
  },
  modalContent: {
    flex: 1,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 15,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 15,
    color: '#ddd',
    lineHeight: 24,
    marginBottom: 10,
  },
  modalMeta: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
  },
  modalMetaText: {
    color: '#aaa',
    fontSize: 14,
  },
  // Video styles
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'black',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoControls: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 30,
  },
  // Audio styles
  audioContainer: {
    alignItems: 'center',
    padding: 20,
  },
  audioArtwork: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  audioProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginBottom: 30,
    overflow: 'hidden',
  },
  audioProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  audioPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  // Article styles
  articleMeta: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 15,
  },
  articleContent: {
    color: '#ddd',
    fontSize: 16,
    lineHeight: 28,
    paddingBottom: 40,
  },
});