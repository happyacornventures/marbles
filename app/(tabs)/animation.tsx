import React, { useEffect, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import Animated, {
  makeMutable,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming
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
    position: [width / 2, 60],
  });
  const groundShape = new p2.Box({ width: width, height: 60 });
  groundShape.material = surfaceMaterial;
  groundBody.addShape(groundShape);
  groundBody.type = p2.Body.STATIC;
  world.addBody(groundBody);

  // Left wall
  const leftWall = new p2.Body({
    position: [10, height / 2],
  });
  const leftShape = new p2.Box({ width: 20, height: height });
  leftShape.material = surfaceMaterial;
  leftWall.addShape(leftShape);
  leftWall.type = p2.Body.STATIC;
  world.addBody(leftWall);

  // Right wall
  const rightWall = new p2.Body({
    position: [width - 10, height / 2],
  });
  const rightShape = new p2.Box({ width: 20, height: height });
  rightShape.material = surfaceMaterial;
  rightWall.addShape(rightShape);
  rightWall.type = p2.Body.STATIC;
  world.addBody(rightWall);

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
      x: makeMutable(0),
      y: makeMutable(0),
      translateX: makeMutable(Math.random() * (width - MARBLE_SIZE)),
      translateY: makeMutable(-MARBLE_SIZE),
      velocityY: makeMutable(0),
      velocityX: makeMutable((Math.random() - 0.5) * 10),
      rotation: makeMutable(0),
      body: new p2.Body({
                mass: 1,
                position: [200 + 2 * (MARBLE_SIZE + 2), height - 50 - 1 * (MARBLE_SIZE + 2)],
                damping: 0.2,
                angularDamping: 0.2,
            })
    };

    const shape = new p2.Circle({ radius: MARBLE_SIZE / 2 });
    shape.material = marbleMaterial;

    newMarble.body.addShape(shape);

    newMarble.body.velocity = [Math.random() * 200 - 100, Math.random() * 200 - 100]; // Random initial velocity
    newMarble.body.angularVelocity = Math.random() * 10 - 5; // Random rotation speed

    world.addBody(newMarble.body);

    // not even sure this is needed anymore
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
