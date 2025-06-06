import React, { useEffect, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import Animated, {
  makeMutable,
  SharedValue,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';
import Rough from 'react-native-rough';
import Svg from 'react-native-svg';

import * as p2 from 'p2';

const { width, height } = Dimensions.get('window');

const MARBLE_SIZE = 40;
const GRAVITY = 0.5;
const BOUNCE_FACTOR = 0.7;
const FRICTION = 0.98;
const NAV_SIZE = 65; // Adjust this value based on your navigation bar height

const useMarblePhysics = (marbles: Record<string, unknown>[]) => {
  useEffect(() => {
    const world = new p2.World({
      gravity: [0, -1000],
    });
  }, []);

};

const prepAnimate = (translateX: SharedValue<number>, translateY: SharedValue<number>, velocityX: SharedValue<number>, velocityY: SharedValue<number>, rotation: SharedValue<number>) => () => {
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
};

const RoughMarble = ({ color }: { color: string }) => (
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

const useMarble = () => {
  const translateX = useSharedValue(Math.random() * (width - MARBLE_SIZE));
  const translateY = useSharedValue(-MARBLE_SIZE);
  const velocityY = useSharedValue(0);
  const velocityX = useSharedValue((Math.random() - 0.5) * 10);
  const rotation = useSharedValue(0);

  return { translateX, translateY, velocityY, velocityX, rotation };
};

const Marble = ({ color, delay, translateX, translateY, velocityY, velocityX, rotation }: Record<string, unknown>) => {

  useEffect(() => {
    const animate = prepAnimate(translateX as Animated.SharedValue<number>, translateY as Animated.SharedValue<number>, velocityX as Animated.SharedValue<number>, velocityY as Animated.SharedValue<number>, rotation as Animated.SharedValue<number>);

    const animateLoop = () => {
      animate();
      requestAnimationFrame(animateLoop);
    };

    setTimeout(() => {
      animateLoop();
    }, Number(delay));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (translateX as SharedValue<number>).value },
      { translateY: (translateY as SharedValue<number>).value },
      { rotate: `${(rotation as SharedValue<number>).value}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute' }, animatedStyle]}>
      <RoughMarble color={String(color)} />
    </Animated.View>
  );
};

export default function App() {
  const [marbles, setMarbles] = useState<Record<string, unknown>[]>([]);

  const addNewMarble = () => {
    // const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    // const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newMarble = {
      color: "purple",
      delay: 0,
      translateX: makeMutable(Math.random() * (width - MARBLE_SIZE)),
      translateY: makeMutable(-MARBLE_SIZE),
      velocityY: makeMutable(0),
      velocityX: makeMutable((Math.random() - 0.5) * 10),
      rotation: makeMutable(0),
    };
    setMarbles(prevMarbles => [...prevMarbles, newMarble]);
  };

  const handleRedPress = () => {
    console.log("Red marble pressed");
    // Add your logic here
  };

  const handleGreenPress = () => {
    console.log("Green marble pressed");
    addNewMarble();
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
          <RoughMarble color={"purple"} />
        </TouchableOpacity>
      </View>
      {marbles.map((marble, index) => (
        <Marble key={index} {...marble} />
      ))}
    </View>
  );
}
