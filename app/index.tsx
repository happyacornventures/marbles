import * as p2 from 'p2';
import React, { useEffect, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
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

import { Platform } from 'react-native';

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
  const [lastDropDate, setLastDropDate] = useState<string | null>(null);
  const [canDrop, setCanDrop] = useState(false);
  const [percentGood, setPercentGood] = useState(100);

  const addNewMarble = (color: string, timestamp?: number, heightModifier = 2): Record<string, unknown> => {
    const randomX = Math.random() * (width - MARBLE_SIZE);
    const randomVelocity = (Math.random() - 0.5) * 10;

    const newMarble = {
      timestamp: timestamp || Date.now(),
      color,
      delay: 0,
      x: makeMutable(randomX), // width / 2
      y: makeMutable(-MARBLE_SIZE * heightModifier),
      rotation: makeMutable(0),
      body: new p2.Body({
                mass: 1,
                position: [randomX, height + (MARBLE_SIZE * heightModifier)], // width / 2
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
    // saveItems(marbles.value.map(({timestamp, color, }) => ({ timestamp, color })));
    // setCount(count + 1);
    return newMarble;
  };

  const updatePercentGood = () => {
    const totalMarbles = marbles.value.length;
    const goodMarbles = marbles.value.filter((marble) => marble.color === "green").length;
    if (totalMarbles === 0) return 100; // Avoid division by zero
    setPercentGood(Math.round((goodMarbles / totalMarbles) * 100));
  };

  const loadItems = async () => {
    try {
      let parsed;
      if(Platform.OS !== 'web') {
        console.log(`Loading marbles from ${FILE_URI}`);
        const content = await FileSystem.readAsStringAsync(FILE_URI);
        parsed = JSON.parse(content);
      } else {
        const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        console.log(`loading marbles from ${BaseDirectory.AppData} ${FILE_NAME}`);
        const text = await readTextFile(FILE_NAME, { baseDir: BaseDirectory.AppData });
        parsed = JSON.parse(text);
      }
      parsed.marbles.forEach((item: Record<string, unknown>, index: number) => addNewMarble(item.color as string, item.timestamp as number, index + 2));
      setCount(parsed.marbles.length || 0);

      // Update lastDropDate based on the most recent marble
      if (parsed.marbles.length > 0) {
        const mostRecentMarble = parsed.marbles.reduce((latest: any, current: any) =>
          latest.timestamp > current.timestamp ? latest : current
        );
        setLastDropDate(new Date(mostRecentMarble.timestamp).toDateString());
      }

      console.log(parsed.marbles.length, 'marbles loaded');
      const marbleValues = parsed.marbles.map((item: Record<string, unknown>) => item.color === "green" ? 1 : 0);
      const dailyAverage = marbleValues.map((value: number, index: number, arr: number[]) => {
        console.log('Calculating daily average for index:', index, 'value:', value);
        return marbleValues.slice(Math.max(0, index - 6), index + 1)
                           .reduce((acc: number, val: number) => acc + val, 0) / Math.min(7, index + 1);
      });
      console.log('Daily average:', dailyAverage);

      // caculate exponential moving average
      const alpha = 0.1; // Smoothing factor
      // const ema = dailyAverage.reduce((acc: number[], value: number, index: number) => {
      const ema = marbleValues.reduce((acc: number[], value: number, index: number) => {
        if (index === 0) {
          acc.push(value); // First value is the same
        } else {
          const prevEma = acc[index - 1];
          const newEma = (value * alpha) + (prevEma * (1 - alpha));
          acc.push(newEma);
        }
        return acc;
      }, []);

      // console.log('Exponential Moving Average:', ema);
      console.log('Exponential Moving Average:', ema.map((value: number) => Math.round(value * 100) / 100));

    } catch (err) {
      // File might not exist yet
      console.log('No saved data found, starting fresh.');
      marbles.value = [];
      // set last drop date to 1970-01-01
      setLastDropDate(new Date(0).toDateString());
    }
  }

  const saveItems = async (content: unknown[]) => {
    try {
      if(Platform.OS!== 'web') {
        console.log(`Saving marbles to ${FILE_URI}`);
        await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify({ marbles: content }));
      } else {
        const { create, exists, mkdir, writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        if (!(await exists(FILE_NAME, { baseDir: BaseDirectory.AppData }))) {
          console.log(`File ${FILE_NAME} does not exist, creating it.`);
          await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true });
          await create(FILE_NAME, { baseDir: BaseDirectory.AppData });
        }
        console.log(`Saving marbles to ${BaseDirectory.AppData} ${FILE_NAME}`);
        await writeTextFile(FILE_NAME, JSON.stringify({ marbles: content }), { baseDir: BaseDirectory.AppData });
      }
    } catch (err) {
      console.error('Error saving data:', err);
    }
  }

  const canDropMarble = () => {
    if (!lastDropDate) return false;
    const now = new Date();
    const currentDate = now.toDateString();
    const currentHour = now.getHours();
    // drop after 5 PM
    const dropTime = 17; // Set this to 6 for 6 AM, or 7 for 7 AM

    // Allow dropping if it's a new day and after the drop time
    return lastDropDate !== currentDate && currentHour >= dropTime;
  };

  const handleRedPress = () => {
    const newMarble = addNewMarble("red");
    saveItems(marbles.value.map(({timestamp, color, }) => ({ timestamp, color })));
    setCount(count + 1);
    setLastDropDate(new Date().toDateString());
  };

  const handleGreenPress = () => {
    const newMarble = addNewMarble("green");
    saveItems(marbles.value.map(({timestamp, color, }) => ({ timestamp, color })));
    setCount(count + 1);
    setLastDropDate(new Date().toDateString());
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

  useEffect(() => {
      updatePercentGood();
      setCanDrop(canDropMarble());
  }, [lastDropDate]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View><Text>Percent Good: {percentGood}%</Text></View>
      {canDrop && (<View style={{
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
      </View>)}
      {marbles.value.map((marble, index) => (
        <Marble key={index} {...marble} />
      ))}
    </View>
  );
}
