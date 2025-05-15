import React from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import Rough from 'react-native-rough';
import Svg from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const Marble = ({ color, delay }: {color: string; delay: number}) => {
  const translateX = useSharedValue(width / 2);
  const translateY = useSharedValue(height / 2);

  // Animate X
  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width - 100, { duration: 2000 }),
      -1,
      true,
    );
  }, []);

  // Animate Y
  React.useEffect(() => {
    translateY.value = withRepeat(
      withTiming(height - 200, { duration: 1500 }),
      -1,
      true,
    );
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
            width={width}
            height={width}
          >
            <Rough.Circle
              x={40}
              y={40}
              diameter={20}
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

