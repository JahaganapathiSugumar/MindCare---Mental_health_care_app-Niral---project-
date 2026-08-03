import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  Defs,
  RadialGradient,
  Stop,
  G,
  Path,
  LinearGradient
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  Easing as REasing,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

export default function NovaCompanion({ state = 'idle', style }) {
  // --- Shared Values for Reanimated ---
  
  // Base floating animation
  const floatY = useSharedValue(0);
  const breathScale = useSharedValue(1);

  // Eyes
  const eyeScaleY = useSharedValue(1); // For blinking
  const eyeGlow = useSharedValue(0.15); // Glow intensity
  const eyeLookY = useSharedValue(0); // Concern (looking down slightly)

  // Arm
  const rightArmAngle = useSharedValue(0);
  const leftArmAngle = useSharedValue(0);

  // Mouth
  // Control point Y for bezier curve. 
  // Base (neutral): 115, Smile: 125, Speak: varies, Concern: 112
  const mouthCpY = useSharedValue(115);

  // Effects
  const waveOpacity = useSharedValue(0);
  const waveScale = useSharedValue(0.8);
  const particleOpacity = useSharedValue(0);
  const medWaveOpacity = useSharedValue(0);
  const medWaveScale = useSharedValue(0.5);
  const orbitRotation = useSharedValue(0);

  // --- Animation Setup ---
  useEffect(() => {
    // 1. Idle Floating (Constant)
    floatY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2000, easing: REasing.inOut(REasing.ease) }),
        withTiming(0, { duration: 2000, easing: REasing.inOut(REasing.ease) })
      ),
      -1,
      true
    );

    // 2. Breathing (Constant)
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2500, easing: REasing.inOut(REasing.ease) }),
        withTiming(1, { duration: 2500, easing: REasing.inOut(REasing.ease) })
      ),
      -1,
      true
    );

    // 3. Blinking Loop (Randomized via setInterval)
    const blinkInterval = setInterval(() => {
      // Don't blink if thinking (eyes closed)
      if (state !== 'thinking') {
        eyeScaleY.value = withSequence(
          withTiming(0.1, { duration: 100 }),
          withTiming(1, { duration: 100 })
        );
      }
    }, Math.random() * 3000 + 3000);

    // 4. Orbit Rotation (Continuous)
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 4000, easing: REasing.linear }),
      -1,
      false
    );

    return () => clearInterval(blinkInterval);
  }, []);

  // --- State Machine ---
  useEffect(() => {
    // Reset defaults first
    eyeGlow.value = withTiming(0.15);
    eyeScaleY.value = withTiming(1);
    eyeLookY.value = withTiming(0);
    mouthCpY.value = withSpring(115);
    rightArmAngle.value = withSpring(0);
    leftArmAngle.value = withSpring(0);
    waveOpacity.value = withTiming(0);
    particleOpacity.value = withTiming(0);
    medWaveOpacity.value = withTiming(0);

    switch (state) {
      case 'idle':
        // Just the defaults
        break;
      
      case 'greeting':
        mouthCpY.value = withSpring(125); // Smile
        // Wave arm
        rightArmAngle.value = withRepeat(
          withSequence(
            withTiming(-30, { duration: 200 }),
            withTiming(20, { duration: 200 })
          ),
          4, // wave 4 times
          true
        );
        break;

      case 'listening':
        eyeGlow.value = withTiming(0.3); // Brighten eyes
        waveOpacity.value = withTiming(1); // Show sound waves
        waveScale.value = withRepeat(
          withTiming(1.2, { duration: 1500, easing: REasing.out(REasing.ease) }),
          -1,
          false
        );
        break;

      case 'thinking':
        eyeScaleY.value = withTiming(0.1); // Close eyes
        particleOpacity.value = withTiming(1); // Orbit particles
        break;

      case 'speaking':
        // Simple speaking animation on mouth
        mouthCpY.value = withRepeat(
          withSequence(
            withTiming(122, { duration: 150 }),
            withTiming(113, { duration: 150 })
          ),
          -1,
          true
        );
        break;

      case 'mood':
        eyeGlow.value = withTiming(0.25);
        mouthCpY.value = withSpring(120);
        particleOpacity.value = withTiming(0.5);
        break;

      case 'report':
        rightArmAngle.value = withSpring(20); // Pointing
        mouthCpY.value = withSpring(120);
        break;

      case 'meditation':
        eyeScaleY.value = withTiming(0.4); // Half closed
        medWaveOpacity.value = withTiming(1);
        medWaveScale.value = withRepeat(
          withTiming(1.5, { duration: 4000 }),
          -1,
          false
        );
        break;

      case 'celebration':
        mouthCpY.value = withSpring(130); // Big smile
        eyeGlow.value = withTiming(0.3);
        // Both arms up
        rightArmAngle.value = withSpring(-40);
        leftArmAngle.value = withSpring(40);
        break;

      case 'concern':
        eyeLookY.value = withTiming(4); // Look down slightly
        mouthCpY.value = withSpring(112); // Flat/slightly sad mouth
        break;
    }
  }, [state]);

  // --- Animated Styles & Props ---
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { scale: breathScale.value }
    ]
  }));

  const rightArmStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: 130 },
      { translateY: 105 },
      { rotate: `${rightArmAngle.value}deg` },
      { translateX: -130 },
      { translateY: -105 }
    ]
  }));

  const leftArmStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: 30 },
      { translateY: 105 },
      { rotate: `${leftArmAngle.value}deg` },
      { translateX: -30 },
      { translateY: -105 }
    ]
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    opacity: particleOpacity.value,
    transform: [{ rotate: `${orbitRotation.value}deg` }]
  }));

  const waveStyle = useAnimatedStyle(() => ({
    opacity: waveOpacity.value,
    transform: [{ scale: waveScale.value }]
  }));

  const medWaveStyle = useAnimatedStyle(() => ({
    opacity: interpolate(medWaveScale.value, [0.5, 1.5], [0.8, 0], Extrapolation.CLAMP),
    transform: [{ scale: medWaveScale.value }]
  }));

  const leftEyeProps = useAnimatedProps(() => ({
    scaleY: eyeScaleY.value,
    translateY: eyeLookY.value,
  }));

  const rightEyeProps = useAnimatedProps(() => ({
    scaleY: eyeScaleY.value,
    translateY: eyeLookY.value,
  }));

  const mouthProps = useAnimatedProps(() => ({
    d: `M 68 115 Q 80 ${mouthCpY.value} 92 115`
  }));

  return (
    <View style={[styles.container, style]}>
      {/* Meditation Waves */}
      <Animated.View style={[styles.medWaves, medWaveStyle]}>
        <View style={styles.medRing1} />
        <View style={styles.medRing2} />
      </Animated.View>

      <Animated.View style={[styles.svgContainer, bodyStyle]}>
        
        {/* Orbit Particles */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.orbitContainer, orbitStyle]}>
          <View style={[styles.particle, { top: '10%', left: '50%' }]} />
          <View style={[styles.particle, { top: '50%', left: '10%', backgroundColor: '#7C4DFF' }]} />
          <View style={[styles.particle, { top: '80%', left: '80%' }]} />
        </Animated.View>

        {/* Listening Waves */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.waveContainer, waveStyle]}>
           <View style={styles.listenRing} />
        </Animated.View>

        <Svg viewBox="0 0 160 185" width="100%" height="100%">
          <Defs>
            <RadialGradient id="bodyGrad" cx="40%" cy="30%" r="70%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="40%" stopColor="#E3F2FD" />
              <Stop offset="100%" stopColor="#B3E5FC" />
            </RadialGradient>
            
            <RadialGradient id="eyeGrad" cx="35%" cy="35%" r="65%">
              <Stop offset="0%" stopColor="#E0F7FA" />
              <Stop offset="50%" stopColor="#29B6F6" />
              <Stop offset="100%" stopColor="#0277BD" />
            </RadialGradient>

            <LinearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#DDEEFF" />
              <Stop offset="100%" stopColor="#B3E5FC" />
            </LinearGradient>
          </Defs>

          {/* MAIN BODY */}
          <Ellipse cx="80" cy="100" rx="62" ry="72" fill="url(#bodyGrad)" />
          {/* Specular Highlight */}
          <Ellipse cx="62" cy="70" rx="22" ry="16" fill="rgba(255,255,255,0.4)" rotation="-15" origin="62,70" />

          {/* LEFT ARM */}
          <AnimatedG style={leftArmStyle}>
            <Ellipse cx="28" cy="110" rx="13" ry="28" fill="url(#armGrad)" rotation="-15" origin="28,110" />
          </AnimatedG>

          {/* RIGHT ARM */}
          <AnimatedG style={rightArmStyle}>
            <Ellipse cx="132" cy="110" rx="13" ry="28" fill="url(#armGrad)" rotation="15" origin="132,110" />
          </AnimatedG>

          {/* EYES */}
          {/* Left Eye */}
          <AnimatedG animatedProps={leftEyeProps} origin="62,90">
             <Circle cx="62" cy="90" r="11" fill="url(#eyeGrad)" />
             <Circle cx="58" cy="86" r="3.5" fill="rgba(255,255,255,0.85)" />
             <Circle cx="62" cy="90" r="5" fill="#013A5C" opacity="0.6" />
          </AnimatedG>

          {/* Right Eye */}
          <AnimatedG animatedProps={rightEyeProps} origin="98,90">
             <Circle cx="98" cy="90" r="11" fill="url(#eyeGrad)" />
             <Circle cx="94" cy="86" r="3.5" fill="rgba(255,255,255,0.85)" />
             <Circle cx="98" cy="90" r="5" fill="#013A5C" opacity="0.6" />
          </AnimatedG>

          {/* MOUTH */}
          <AnimatedPath 
            animatedProps={mouthProps}
            fill="none" 
            stroke="rgba(1,87,155,0.4)" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
          />

          {/* BLUSH */}
          <Ellipse cx="50" cy="106" rx="8" ry="5" fill="rgba(144,202,249,0.2)" />
          <Ellipse cx="110" cy="106" rx="8" ry="5" fill="rgba(144,202,249,0.2)" />

          {/* CHEST GEM */}
          <Circle cx="80" cy="145" r="8" fill="rgba(79,195,247,0.15)" stroke="rgba(79,195,247,0.4)" strokeWidth="1" />
          <Circle cx="80" cy="145" r="4" fill="url(#eyeGrad)" opacity="0.7" />

        </Svg>
      </Animated.View>
      
      {/* SHADOW */}
      <View style={styles.shadow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  svgContainer: {
    width: 160,
    height: 185,
    zIndex: 10
  },
  shadow: {
    position: 'absolute',
    bottom: -10,
    width: 80,
    height: 15,
    borderRadius: 40,
    backgroundColor: 'rgba(79,195,247,0.15)',
    zIndex: 1,
    transform: [{ scaleX: 1.5 }]
  },
  orbitContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4FC3F7',
    shadowColor: '#4FC3F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3
  },
  waveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(79,195,247,0.4)',
    left: 0,
    top: 12
  },
  medWaves: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  medRing1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.2)',
  },
  medRing2: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.1)',
  }
});
