import React, { useEffect, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';
import Rough from 'react-native-rough';
import Svg from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const MARBLE_SIZE = 40;
const GRAVITY = 0.5;
const BOUNCE_FACTOR = 0.7;
const FRICTION = 0.98;
const NAV_SIZE = 65; // Adjust this value based on your navigation bar height

const BaseMarble = ({ color }: { color: string }) => (
  <Svg
    pointerEvents="none"
    width={MARBLE_SIZE * 2}
    height={MARBLE_SIZE * 2}
  >
    <Rough.Circle
      x={MARBLE_SIZE}
      y={MARBLE_SIZE}
      diameter={MARBLE_SIZE}
      fillWeight={1}
      stroke={color}
      fill={color}
    />
  </Svg>
)

export const AnimatedMarble = ({ translateX, translateY }: { translateX: number; translateY: number; }) => {
  return (
    <Animated.View
      style={{
        transform: [{ translateX }, { translateY }],
        position: "absolute"
      }}
    ><BaseMarble color="purple" /></Animated.View>
  );
};

const Marble = ({ color, delay }: {color: string; delay: number}) => {
  const translateX = useSharedValue(Math.random() * (width - MARBLE_SIZE));
  const translateY = useSharedValue(-MARBLE_SIZE);
  const velocityY = useSharedValue(0);
  const velocityX = useSharedValue((Math.random() - 0.5) * 10);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      velocityY.value += GRAVITY;
      translateY.value += velocityY.value;
      translateX.value += velocityX.value;
      rotation.value += (velocityX.value * 3);

      // Bottom collision
      if (translateY.value > height - NAV_SIZE - MARBLE_SIZE) {
        translateY.value = height - NAV_SIZE - MARBLE_SIZE;
        velocityY.value *= -BOUNCE_FACTOR;
        velocityX.value *= FRICTION;

        // Update rotation when on the ground
        // rotation.value += (velocityX.value * 3);
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
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute' }, animatedStyle]}>
      <BaseMarble color={color} />
    </Animated.View>
  );
};

export default function App() {
  const [marbles, setMarbles] = useState<Record<string, unknown>[]>([]);

  const handleRedPress = () => {
    console.log("Red marble pressed");
    // Add your logic here
  };

  const handleGreenPress = () => {
    console.log("Green marble pressed");
    addNewMarble();
  };

  const addNewMarble = () => {
    // const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    // const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newMarble = {
      color: "purple",
      delay: 0
    };
    setMarbles(prevMarbles => [...prevMarbles, newMarble]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 1,
      }}>
        <TouchableOpacity onPress={handleGreenPress}>
          <BaseMarble color={"purple"} />
        </TouchableOpacity>
      </View>
      {marbles.map((marble, index) => (
        <Marble key={index} color={String(marble?.color) ?? "purple"} delay={Number(marble?.delay) ?? 0} />
      ))}
    </View>
  );
}
