'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';

extend({ MeshLineGeometry, MeshLineMaterial });

interface LanyardProps {
    position?: [number, number, number];
    gravity?: [number, number, number];
    fov?: number;
    transparent?: boolean;
    profileImageUrl?: string | null;
}

/**
 * Component to safely load the profile photo texture.
 * useTexture MUST be called in a component that is always rendered
 * if we want to avoid hook violations. Or we can just use a sub-component.
 */
function CardTexture({ url, fallbackMaterial }: { url: string, fallbackMaterial: any }) {
    const texture = useTexture(url);
    return (
        <meshPhysicalMaterial
            map={texture}
            map-anisotropy={16}
            clearcoat={1}
            clearcoatRoughness={0.15}
            roughness={0.9}
            metalness={0.8}
        />
    );
}

export default function Lanyard({
    position = [0, 0, 30],
    gravity = [0, -40, 0],
    fov = 20,
    transparent = true,
    profileImageUrl = null
}: LanyardProps) {
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{
            position: 'relative',
            zIndex: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        }}>
            <Canvas
                camera={{ position: position, fov: fov }}
                dpr={[1, isMobile ? 1.5 : 2]}
                gl={{ alpha: transparent }}
                onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
            >
                <ambientLight intensity={Math.PI} />
                <Suspense fallback={null}>
                    <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
                        <Band isMobile={isMobile} profileImageUrl={profileImageUrl} />
                    </Physics>
                    <Environment blur={0.75}>
                        <Lightformer
                            intensity={2}
                            color="white"
                            position={[0, -1, 5]}
                            rotation={[0, 0, Math.PI / 3]}
                            scale={[100, 0.1, 1]}
                        />
                    </Environment>
                </Suspense>
            </Canvas>
        </div>
    );
}

function Band({ maxSpeed = 50, minSpeed = 0, isMobile = false, profileImageUrl }: {
    maxSpeed?: number;
    minSpeed?: number;
    isMobile?: boolean;
    profileImageUrl?: string | null;
}) {
    const band = useRef<any>(null);
    const fixed = useRef<any>(null);
    const j1 = useRef<any>(null);
    const j2 = useRef<any>(null);
    const j3 = useRef<any>(null);
    const card = useRef<any>(null);

    const vec = new THREE.Vector3();
    const ang = new THREE.Vector3();
    const rot = new THREE.Vector3();
    const dir = new THREE.Vector3();

    const segmentProps = {
        type: 'dynamic' as const,
        canSleep: true,
        colliders: false as const,
        angularDamping: 4,
        linearDamping: 4,
    };

    // Safely load assets
    const { nodes, materials } = useGLTF('/models/card.glb') as any;
    const texture = useTexture('/models/lanyard.png');

    const [curve] = useState(
        () =>
            new THREE.CatmullRomCurve3([
                new THREE.Vector3(),
                new THREE.Vector3(),
                new THREE.Vector3(),
                new THREE.Vector3(),
            ])
    );
    const [dragged, drag] = useState<any>(false);
    const [hovered, hover] = useState(false);

    useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
    useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
    useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
    useSphericalJoint(j3, card, [
        [0, 0, 0],
        [0, 1.5, 0],
    ]);

    useEffect(() => {
        if (hovered) {
            document.body.style.cursor = dragged ? 'grabbing' : 'grab';
            return () => void (document.body.style.cursor = 'auto');
        }
    }, [hovered, dragged]);

    useFrame((state, delta) => {
        if (dragged) {
            vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
            dir.copy(vec).sub(state.camera.position).normalize();
            vec.add(dir.multiplyScalar(state.camera.position.length()));
            [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
            card.current?.setNextKinematicTranslation({
                x: vec.x - dragged.x,
                y: vec.y - dragged.y,
                z: vec.z - dragged.z,
            });
        }
        if (fixed.current) {
            [j1, j2].forEach((ref) => {
                if (!ref.current.lerped)
                    ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
                const clampedDistance = Math.max(
                    0.1,
                    Math.min(1, ref.current.lerped.distanceTo(ref.current.translation()))
                );
                ref.current.lerped.lerp(
                    ref.current.translation(),
                    delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
                );
            });
            curve.points[0].copy(j3.current.translation());
            curve.points[1].copy(j2.current.lerped);
            curve.points[2].copy(j1.current.lerped);
            curve.points[3].copy(fixed.current.translation());
            if (band.current?.geometry) {
                band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));
            }
            ang.copy(card.current.angvel());
            rot.copy(card.current.rotation());
            card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
        }
    });

    curve.curveType = 'chordal';
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

    // Early return if model assets aren't ready
    if (!nodes?.card || !materials?.base) return null;

    return (
        <>
            <group position={[0, 4, 0]}>
                <RigidBody ref={fixed} {...segmentProps} type="fixed" />
                <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
                    <BallCollider args={[0.1]} />
                </RigidBody>
                <RigidBody
                    position={[2, 0, 0]}
                    ref={card}
                    {...segmentProps}
                    type={dragged ? 'kinematicPosition' : 'dynamic'}
                >
                    <CuboidCollider args={[0.8, 1.125, 0.01]} />
                    <group
                        scale={2.25}
                        position={[0, -1.2, -0.05]}
                        onPointerOver={() => hover(true)}
                        onPointerOut={() => hover(false)}
                        onPointerUp={(e: any) => (
                            e.target.releasePointerCapture(e.pointerId), drag(false)
                        )}
                        onPointerDown={(e: any) => (
                            e.target.setPointerCapture(e.pointerId),
                            drag(
                                new THREE.Vector3()
                                    .copy(e.point)
                                    .sub(vec.copy(card.current.translation()))
                            )
                        )}
                    >
                        <mesh geometry={nodes.card.geometry}>
                            {profileImageUrl ? (
                                <Suspense fallback={<meshPhysicalMaterial {...materials.base} />}>
                                    <CardTexture url={profileImageUrl} fallbackMaterial={materials.base} />
                                </Suspense>
                            ) : (
                                <meshPhysicalMaterial
                                    {...materials.base}
                                    clearcoat={1}
                                    clearcoatRoughness={0.15}
                                    roughness={0.9}
                                    metalness={0.8}
                                />
                            )}
                        </mesh>
                        <mesh
                            geometry={nodes.clip.geometry}
                            material={materials.metal}
                        />
                        <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
                    </group>
                </RigidBody>
            </group>
            <mesh ref={band}>
                {/* @ts-ignore */}
                <meshLineGeometry />
                {/* @ts-ignore */}
                <meshLineMaterial
                    color="white"
                    depthTest={false}
                    resolution={isMobile ? [1000, 2000] : [1000, 1000]}
                    useMap
                    map={texture}
                    repeat={[-4, 1]}
                    lineWidth={1}
                />
            </mesh>
        </>
    );
}

useGLTF.preload('/models/card.glb');
useTexture.preload('/models/lanyard.png');
