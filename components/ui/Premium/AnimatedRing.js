import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const AnimatedRing = ({
  radius = 50,
  strokeWidth = 12,
  progress = 0, // 0 to 1
  color = '#38BDF8',
  backgroundColor = 'rgba(255,255,255,0.1)',
  duration = 1500,
  delay = 0,
}) => {
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;
  
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withDelay(
      delay,
      withTiming(progress, {
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
  }, [progress, delay, duration]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - animatedProgress.value * circumference;
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={{ width: radius * 2, height: radius * 2, transform: [{ rotate: '-90deg' }] }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
        {/* Background Track */}
        <Circle
          cx={radius}
          cy={radius}
          r={innerRadius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Ring */}
        <AnimatedCircle
          cx={radius}
          cy={radius}
          r={innerRadius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};
