import * as p2 from 'p2';
import React, { useEffect, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import Animated, {
  makeMutable,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import Rough from 'react-native-rough';
import Svg from 'react-native-svg';

import * as FileSystem from 'expo-file-system';

const FILE_NAME = 'marbles.json';
const FILE_URI = FileSystem.documentDirectory + FILE_NAME;

const { width, height } = Dimensions.get('window');

const MOVEMENT_THRESHOLD = 0.1; // Adjust this value as needed
const MARBLE_SIZE = 40;

const world = new p2.World({
  gravity: [0, -1000],
});

const marbleMaterial = new p2.Material();
const surfaceMaterial = new p2.Material();

const contactMaterial = new p2.ContactMaterial(marbleMaterial, surfaceMaterial, {
  restitution: 0.7,     // This controls bounce
  friction: 0.3,
});
world.addContactMaterial(contactMaterial);

  // Floor
  const groundBody = new p2.Body({
    position: [width / 2, 0],
  });
  const groundShape = new p2.Box({ width: width, height: 80 });
  groundShape.material = surfaceMaterial;
  groundBody.addShape(groundShape);
  groundBody.type = p2.Body.STATIC;
  world.addBody(groundBody);

  // Left wall
  const leftWall = new p2.Body({
    position: [-40, height / 2],
  });
  const leftShape = new p2.Box({ width: 20, height: height });
  leftShape.material = surfaceMaterial;
  leftWall.addShape(leftShape);
  leftWall.type = p2.Body.STATIC;
  world.addBody(leftWall);

  // Right wall
  const rightWall = new p2.Body({
    position: [width - 40, height / 2],
  });
  const rightShape = new p2.Box({ width: 20, height: height });
  rightShape.material = surfaceMaterial;
  rightWall.addShape(rightShape);
  rightWall.type = p2.Body.STATIC;
  world.addBody(rightWall);

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

const Marble = ({ color, rotation, x, y }: Record<string, unknown>) => {

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (x as SharedValue<number>).value },
      { translateY: (y as SharedValue<number>).value },
      { rotate: `${-(rotation as SharedValue<number>).value}rad` }, // Note: p2.js uses radians
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute' }, animatedStyle]}>
      <RoughMarble color={String(color)} />
    </Animated.View>
  );
};

export default function App() {
  const [count, setCount] = useState(0);
  const marbles = useSharedValue<Record<string, unknown>[]>([]);

  const addNewMarble = (color: string) => {
    const randomX = Math.random() * (width - MARBLE_SIZE);
    const randomVelocity = (Math.random() - 0.5) * 10;

    const newMarble = {
      timestamp: Date.now(),
      color,
      delay: 0,
      x: makeMutable(randomX),
      y: makeMutable(-MARBLE_SIZE * 2),
      rotation: makeMutable(0),
      body: new p2.Body({
                mass: 1,
                position: [randomX, height + (MARBLE_SIZE * 2)],
                damping: 0.2,
                angularDamping: 0.2,
            })
    };

    const shape = new p2.Circle({ radius: MARBLE_SIZE / 2 });
    shape.material = marbleMaterial;

    newMarble.body.addShape(shape);

    newMarble.body.velocity = [randomVelocity, 0]; // Random initial velocity
    newMarble.body.angularVelocity = Math.random() * 10 - 5; // Random rotation speed

    world.addBody(newMarble.body);

    // not even sure this is needed anymore
    marbles.value.push(newMarble);
    setCount(count + 1);
  };

  const loadItems = async () => {
    try {
      console.log(`Loading marbles from ${FILE_URI}`);
      const content = await FileSystem.readAsStringAsync(FILE_URI);
      const parsed = JSON.parse(content);
      marbles.value = (parsed.marbles || []);
      setCount(parsed.marbles.length || 0);
    } catch (err) {
      // File might not exist yet
      console.log('No saved data found, starting fresh.');
      marbles.value = [];
    }
  }

  const handleRedPress = () => {
    addNewMarble("red");
  };

  const handleGreenPress = () => {
    addNewMarble("green");
  };

  useEffect(() => {
    const step = () => {
      world.step(1 / 60);

      marbles.value.forEach((marble, i) => {
        const velocityMagnitude = Math.sqrt((marble.body as any).velocity[0]**2 + (marble.body as any).velocity[1]**2);
        const angularVelocityMagnitude = Math.abs((marble.body as any).angularVelocity);

        if (velocityMagnitude < MOVEMENT_THRESHOLD && angularVelocityMagnitude < MOVEMENT_THRESHOLD) {
          // If the marble is moving very slowly, consider it at rest
          (marble.body as any).velocity = [0, 0];
          (marble.body as any).angularVelocity = 0;
        }

        (marbles.value[i].x as SharedValue<number>).value = withTiming((marble.body as any).position[0], { duration: 16 });
        (marbles.value[i].y as SharedValue<number>).value = withTiming(height - (marble.body as any).position[1], { duration: 16 });
        (marbles.value[i].rotation as SharedValue<number>).value = (marble.body as any).angle;
      });

      requestAnimationFrame(step);
    };

    const handler = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(handler);
    };
  }, []);

  useEffect(() => {
    loadItems();
  }, []);

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
        <TouchableOpacity onPress={handleRedPress}>
          <RoughMarble color={"red"} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleGreenPress}>
          <RoughMarble color={"green"} />
        </TouchableOpacity>
      </View>
      {marbles.value.map((marble, index) => (
        <Marble key={index} {...marble} />
      ))}
    </View>
  );
}
