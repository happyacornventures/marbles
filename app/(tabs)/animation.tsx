import React, { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import Rough from 'react-native-rough';
import Svg from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const MARBLE_SIZE = 20;
const GRAVITY = 0.5;
const BOUNCE_FACTOR = 0.7;
const FRICTION = 0.98;

const Marble = ({ color, delay }: {color: string; delay: number}) => {
  const translateX = useSharedValue(Math.random() * (width - MARBLE_SIZE));
  const translateY = useSharedValue(-MARBLE_SIZE);
  const velocityY = useSharedValue(0);
  const velocityX = useSharedValue((Math.random() - 0.5) * 10);

  useEffect(() => {
    const animate = () => {
      velocityY.value += GRAVITY;
      translateY.value += velocityY.value;
      translateX.value += velocityX.value;

      // Bottom collision
      if (translateY.value > height - MARBLE_SIZE) {
        translateY.value = height - MARBLE_SIZE;
        velocityY.value *= -BOUNCE_FACTOR;
        velocityX.value *= FRICTION;
      }

      // Side collisions
      if (translateX.value < 0 || translateX.value > width - MARBLE_SIZE) {
        velocityX.value *= -BOUNCE_FACTOR;
        translateX.value = Math.max(0, Math.min(translateX.value, width - MARBLE_SIZE));
      }

      requestAnimationFrame(animate);
    };

    setTimeout(() => {
      animate();
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute' }, animatedStyle]}>
      <Svg
        pointerEvents="none"
        width={MARBLE_SIZE * 2}
        height={MARBLE_SIZE * 2}
      >
        <Rough.Circle
          x={MARBLE_SIZE}
          y={MARBLE_SIZE}
          diameter={MARBLE_SIZE}
          fillWeight={3}
          stroke={color}
          fill={color}
        />
      </Svg>
    </Animated.View>
  );
};

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Marble color="red" delay={0} />
      <Marble color="blue" delay={500} />
      <Marble color="green" delay={1000} />
    </View>
  );
}
