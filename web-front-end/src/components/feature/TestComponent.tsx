"use client";

import React, { useRef, useEffect } from "react";
import useSWR from "swr";
import { gsap } from "gsap";
import * as THREE from "three";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TestComponent = () => {
  const { data, error } = useSWR(
    "https://api.github.com/repos/vercel/swr",
    fetcher
  );
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (boxRef.current) {
      gsap.to(boxRef.current, {
        rotation: "+=360",
        duration: 2,
        ease: "none",
        repeat: -1,
      });
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });
      renderer.setSize(200, 200);

      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      camera.position.z = 5;

      const animate = () => {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
      };

      animate();
    }
  }, []);

  if (error) return <div className="text-red-500">Failed to load</div>;
  if (!data) return <div className="text-blue-500">Loading...</div>;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Next.js Project Test</h1>

      <div className="p-4 border rounded-lg">
        <h2 className="text-xl font-semibold">SWR Test</h2>
        <p>Repo: {data.name}</p>
        <p>Description: {data.description}</p>
        <p>Stars: {data.stargazers_count}</p>
      </div>

      <div className="p-4 border rounded-lg">
        <h2 className="text-xl font-semibold">GSAP Test</h2>
        <div ref={boxRef} className="w-24 h-24 bg-green-500 rounded-lg" />
      </div>

      <div className="p-4 border rounded-lg">
        <h2 className="text-xl font-semibold">Three.js Test</h2>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default TestComponent;
