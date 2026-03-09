import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import type { MoodTheme } from "@/components/voice-cinematic/voiceData";

interface Props {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  mood: MoodTheme;
}

const seededRandom = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const setGroupOpacity = (group: THREE.Group | null, opacity: number) => {
  if (!group) {
    return;
  }

  group.visible = opacity > 0.01;
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!("opacity" in material)) {
        return;
      }

      material.transparent = true;
      material.opacity = opacity;
    });
  });
};

/** Textured-looking planet with depth */
function Planet({ mood }: { mood: MoodTheme }) {
  const groupRef = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(mood.accent), [mood.accent]);
  const darkColor = useMemo(() => new THREE.Color(mood.accent).multiplyScalar(0.3), [mood.accent]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Core sphere */}
      <mesh>
        <sphereGeometry args={[1.3, 64, 64]} />
        <meshStandardMaterial
          color={darkColor}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      {/* Surface detail layer */}
      <mesh>
        <sphereGeometry args={[1.305, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          metalness={0.3}
          transparent
          opacity={0.4}
          wireframe
        />
      </mesh>
      {/* Atmosphere rim */}
      <mesh scale={1.18}>
        <sphereGeometry args={[1.3, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Outer glow */}
      <mesh scale={1.35}>
        <sphereGeometry args={[1.3, 24, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.03}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

/** Tilted Saturn-style rings with satellites */
function OrbitalSystem({ mood }: { mood: MoodTheme }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringColor = useMemo(() => new THREE.Color(mood.accent), [mood.accent]);

  const satellites = useMemo(() => [
    { orbitRadius: 2.4, speed: 0.5, size: 0.07, offset: 0 },
    { orbitRadius: 3.2, speed: -0.3, size: 0.05, offset: Math.PI * 0.8 },
    { orbitRadius: 4.0, speed: 0.2, size: 0.04, offset: Math.PI * 1.5 },
  ], []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      // Satellites start after the 3 ring meshes
      if (i >= 3 && i < 3 + satellites.length) {
        const sat = satellites[i - 3];
        const angle = t * sat.speed + sat.offset;
        child.position.x = Math.cos(angle) * sat.orbitRadius;
        child.position.z = Math.sin(angle) * sat.orbitRadius;
        child.position.y = Math.sin(angle * 0.3) * 0.15;
      }
    });
  });

  return (
    <group>
      <group ref={groupRef}>
        {/* Orbit rings */}
        {[2.4, 3.2, 4.0].map((radius, i) => (
          <mesh key={`ring-${i}`} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.006 - i * 0.001, 16, 160]} />
            <meshBasicMaterial color={ringColor} transparent opacity={0.18 - i * 0.04} />
          </mesh>
        ))}
        {/* Satellites */}
        {satellites.map((sat, i) => (
          <mesh key={`sat-${i}`}>
            <sphereGeometry args={[sat.size, 12, 12]} />
            <meshStandardMaterial
              color={ringColor}
              emissive={ringColor}
              emissiveIntensity={0.6}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Star tunnel for warp/travel effect */
function StarTunnel({ analyser, isPlaying, mood }: { analyser: AnalyserNode | null; isPlaying: boolean; mood: MoodTheme }) {
  const pointsRef = useRef<THREE.Points>(null);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const count = 1500;
  const tunnelLength = 120;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = seededRandom(i + 1) * Math.PI * 2;
      const radius = 0.5 + seededRandom(i + 101) * 15;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius;
      pos[i * 3 + 2] = (seededRandom(i + 201) - 0.5) * tunnelLength;
      vel[i] = 0.3 + seededRandom(i + 301) * 0.8;
    }
    return [pos, vel];
  }, []);

  const color = useMemo(() => new THREE.Color(mood.accent), [mood.accent]);

  useEffect(() => {
    frequencyDataRef.current = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
  }, [analyser]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position.array as Float32Array;

    let energy = 0;
    const freqData = frequencyDataRef.current;
    if (analyser && freqData && isPlaying) {
      analyser.getByteFrequencyData(freqData);
      energy = freqData.reduce((a, b) => a + b, 0) / (freqData.length * 255);
    }

    const speed = isPlaying ? 0.25 + energy * 0.6 : 0.01;

    for (let i = 0; i < count; i++) {
      posAttr[i * 3 + 2] += velocities[i] * speed;
      if (posAttr[i * 3 + 2] > tunnelLength / 2) {
        posAttr[i * 3 + 2] = -tunnelLength / 2;
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.5 + Math.random() * 15;
        posAttr[i * 3] = Math.cos(angle) * radius;
        posAttr[i * 3 + 1] = Math.sin(angle) * radius;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.05}
        transparent
        opacity={isPlaying ? 0.85 : 0.2}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/** Planet + rings in a slowly tumbling group */
function PlanetSystem({ mood }: { mood: MoodTheme }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.x = Math.sin(t * 0.07) * 0.4 + 0.3;
    groupRef.current.rotation.z = Math.cos(t * 0.05) * 0.3 + 0.1;
    groupRef.current.rotation.y = t * 0.02;
  });

  return (
    <group ref={groupRef}>
      <Planet mood={mood} />
      <OrbitalSystem mood={mood} />
    </group>
  );
}


function CameraController({ isPlaying }: { isPlaying: boolean }) {
  // 0 = at planet, 1 = zoomed past into space
  const flyPhase = useRef(0);
  const camPos = useRef(new THREE.Vector3(0, 1, 7));

  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();

    // Smoothly transition phase
    const targetPhase = isPlaying ? 1 : 0;
    flyPhase.current += (targetPhase - flyPhase.current) * 0.015;
    const p = flyPhase.current;

    // Idle: gentle orbit around planet at z~7
    const idleX = Math.sin(t * 0.08) * 2;
    const idleY = 0.8 + Math.cos(t * 0.06) * 0.5;
    const idleZ = 7;

    // Flying: far past the planet, looking forward
    const flyX = Math.sin(t * 0.03) * 0.3;
    const flyY = Math.cos(t * 0.04) * 0.2;
    const flyZ = -15;

    // Lerp camera position
    const tx = idleX * (1 - p) + flyX * p;
    const ty = idleY * (1 - p) + flyY * p;
    const tz = idleZ * (1 - p) + flyZ * p;

    camPos.current.x += (tx - camPos.current.x) * 0.04;
    camPos.current.y += (ty - camPos.current.y) * 0.04;
    camPos.current.z += (tz - camPos.current.z) * 0.04;

    camera.position.copy(camPos.current);

    // Look at: planet when idle, forward into space when flying
    const lookZ = 0 * (1 - p) + -50 * p;
    camera.lookAt(0, 0, lookZ);
  });

  return null;
}
/** Pixelated Space Invader shape built from boxes */
function SpaceInvader({ opacityRef }: { opacityRef: { current: number } }) {
  const groupRef = useRef<THREE.Group>(null);
  const pixels = useMemo(() => {
    // Classic space invader pattern (11x8)
    const pattern = [
      [0,0,1,0,0,0,0,0,1,0,0],
      [0,0,0,1,0,0,0,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,1,1,0,1,1,1,0,1,1,0],
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,0,1,1,1,1,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,1,0,1],
      [0,0,0,1,1,0,1,1,0,0,0],
    ];
    const boxes: [number, number][] = [];
    for (let y = 0; y < pattern.length; y++) {
      for (let x = 0; x < pattern[y].length; x++) {
        if (pattern[y][x]) boxes.push([x - 5, -(y - 4)]);
      }
    }
    return boxes;
  }, []);

  useFrame(() => {
    setGroupOpacity(groupRef.current, opacityRef.current);
  });

  return (
    <group ref={groupRef}>
      {pixels.map(([x, y], i) => (
        <mesh key={i} position={[x * 0.12, y * 0.12, 0]}>
          <boxGeometry args={[0.11, 0.11, 0.11]} />
          <meshBasicMaterial color="#44ff44" transparent opacity={0} />
        </mesh>
      ))}
    </group>
  );
}

/** Sleek Gattaca-style ship */
function GattacaShip({ opacityRef }: { opacityRef: { current: number } }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    setGroupOpacity(groupRef.current, opacityRef.current);
  });

  return (
    <group ref={groupRef}>
      {/* Fuselage */}
      <mesh>
        <coneGeometry args={[0.08, 0.5, 4]} />
        <meshStandardMaterial color="#ccddff" emissive="#4488ff" emissiveIntensity={0.5} transparent opacity={0} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Wings */}
      <mesh position={[0, -0.1, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.4, 0.01, 0.08]} />
        <meshStandardMaterial color="#aabbee" emissive="#4488ff" emissiveIntensity={0.3} transparent opacity={0} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Engine glow */}
      <mesh position={[0, -0.28, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#88ccff" transparent opacity={0} />
      </mesh>
    </group>
  );
}

/** Laser bolt */
function LaserBolt({ opacityRef }: { opacityRef: { current: number } }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    setGroupOpacity(groupRef.current, opacityRef.current);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.02, 0.3, 0.02]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0} />
      </mesh>
    </group>
  );
}

/** Easter egg: random space invader encounter */
function SpaceInvaderEasterEgg() {
  const [active, setActive] = useState(false);
  const timer = useRef(0);
  const invaderPos = useRef(new THREE.Vector3(8, 3, -20));
  const shipPos = useRef(new THREE.Vector3(12, 1, -18));
  const laserPos = useRef(new THREE.Vector3(0, 0, 0));
  const shipOpacityRef = useRef(0);
  const invaderOpacityRef = useRef(0);
  const laserOpacityRef = useRef(0);
  const explodingRef = useRef(false);
  const invaderGroup = useRef<THREE.Group>(null);
  const shipGroup = useRef<THREE.Group>(null);
  const laserGroup = useRef<THREE.Group>(null);
  const explosionParticles = useRef<THREE.Points>(null);
  const explosionMaterialRef = useRef<THREE.PointsMaterial>(null);

  // Random trigger between short idle windows without a reschedule race.
  useEffect(() => {
    if (active) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActive(true);
      timer.current = 0;
      const x = (Math.random() - 0.5) * 16;
      const y = (Math.random() - 0.3) * 8;
      const z = -18 - Math.random() * 10;
      invaderPos.current.set(x, y, z);
      shipPos.current.set(x + 6, y - 2, z + 2);
      explodingRef.current = false;
      shipOpacityRef.current = 0;
      invaderOpacityRef.current = 0;
      laserOpacityRef.current = 0;
    }, 8000 + Math.random() * 12000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [active]);

  const explosionPositions = useMemo(() => {
    const pos = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) {
      pos[i * 3] = (seededRandom(i + 401) - 0.5) * 0.1;
      pos[i * 3 + 1] = (seededRandom(i + 501) - 0.5) * 0.1;
      pos[i * 3 + 2] = (seededRandom(i + 601) - 0.5) * 0.1;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!active) return;
    timer.current += delta;
    const t = timer.current;

    if (t < 2) {
      // Ship flies toward invader
      const p = t / 2;
      shipPos.current.lerp(
        new THREE.Vector3(invaderPos.current.x + 0.5, invaderPos.current.y - 0.5, invaderPos.current.z + 1),
        0.02
      );
      shipOpacityRef.current = Math.min(p * 2, 1);
      invaderOpacityRef.current = Math.min(p * 2, 1);
      laserOpacityRef.current = 0;
    } else if (t < 2.5) {
      // Fire laser
      laserPos.current.copy(shipPos.current).add(new THREE.Vector3(0, 0.3, 0));
      laserPos.current.lerp(invaderPos.current, (t - 2) * 2);
      laserOpacityRef.current = 1;
    } else if (t < 3.5) {
      // Explosion
      laserOpacityRef.current = 0;
      invaderOpacityRef.current = Math.max(0, 1 - (t - 2.5) * 2);
      explodingRef.current = true;
      if (explosionParticles.current) {
        const arr = explosionParticles.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < 60; i++) {
          arr[i * 3] += (Math.random() - 0.5) * 0.05;
          arr[i * 3 + 1] += (Math.random() - 0.5) * 0.05;
          arr[i * 3 + 2] += (Math.random() - 0.5) * 0.05;
        }
        explosionParticles.current.geometry.attributes.position.needsUpdate = true;
      }
    } else if (t < 5) {
      // Ship flies off
      explodingRef.current = false;
      invaderOpacityRef.current = 0;
      shipPos.current.x += delta * 4;
      shipPos.current.y += delta * 1.5;
      shipOpacityRef.current = Math.max(0, 1 - (t - 3.5) * 1.5);
    } else {
      setActive(false);
      shipOpacityRef.current = 0;
      invaderOpacityRef.current = 0;
      laserOpacityRef.current = 0;
      explodingRef.current = false;
    }

    invaderGroup.current?.position.copy(invaderPos.current);
    shipGroup.current?.position.copy(shipPos.current);
    shipGroup.current?.rotation.set(Math.PI / 2, 0, 0);
    laserGroup.current?.position.copy(laserPos.current);
    explosionParticles.current?.position.copy(invaderPos.current);
    if (explosionParticles.current) {
      explosionParticles.current.visible = explodingRef.current;
    }
    if (explosionMaterialRef.current) {
      explosionMaterialRef.current.opacity = explodingRef.current ? invaderOpacityRef.current : 0;
    }
  });

  if (!active) return null;

  return (
    <>
      <group ref={invaderGroup}>
        <SpaceInvader opacityRef={invaderOpacityRef} />
      </group>
      <group ref={shipGroup}>
        <GattacaShip opacityRef={shipOpacityRef} />
      </group>
      <group ref={laserGroup}>
        <LaserBolt opacityRef={laserOpacityRef} />
      </group>
      <points ref={explosionParticles} visible={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[explosionPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={explosionMaterialRef} color="#44ff44" size={0.06} transparent opacity={0} blending={THREE.AdditiveBlending} />
      </points>
    </>
  );
}

const Voice3DScene = ({ analyser, isPlaying, mood }: Props) => {
  return (
    <>
      <ambientLight intensity={0.08} />
      <pointLight position={[5, 4, 6]} intensity={0.5} color={mood.accent} />
      <pointLight position={[-4, -2, -4]} intensity={0.15} color="#aabbff" />
      <directionalLight position={[3, 2, 5]} intensity={0.3} />

      <CameraController isPlaying={isPlaying} />

      <PlanetSystem mood={mood} />

      <StarTunnel analyser={analyser} isPlaying={isPlaying} mood={mood} />
      <SpaceInvaderEasterEgg />
      <Stars radius={80} depth={80} count={5000} factor={2} saturation={0} fade speed={0.15} />
    </>
  );
};

export default Voice3DScene;
