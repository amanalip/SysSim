import React, { useEffect, useState, useRef } from 'react';
import { useViewport } from '@xyflow/react';
import { useStore } from '../../../store/use-store';
import styles from './RequestParticleLayer.module.css';

interface ActiveParticle {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  color: string;
}

export const RequestParticleLayer: React.FC = () => {
  const { activeRequests, nodes, edges, simState, speedMultiplier } = useStore();
  const viewport = useViewport();
  const [particles, setParticles] = useState<ActiveParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Synchronize particles with activeRequests
  useEffect(() => {
    if (simState !== 'running' && simState !== 'paused') {
      setParticles([]);
      return;
    }

    if (activeRequests.length === 0 || edges.length === 0) {
      return;
    }

    const nodePositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      // Node center approximation (width ~180, height ~70)
      nodePositions[n.id] = {
        x: n.position.x + 90,
        y: n.position.y + 35,
      };
    });

    const newParticles: ActiveParticle[] = [];
    const sample = activeRequests.slice(-40); // Cap visible active particles for smooth rendering

    sample.forEach((req, idx) => {
      if (req.path.length > 1) {
        // Find which hop to visualize
        const hopIndex = idx % (req.path.length - 1);
        const sourceHop = req.path[hopIndex];
        const targetHop = req.path[hopIndex + 1];

        const srcPos = nodePositions[sourceHop?.nodeId];
        const tgtPos = nodePositions[targetHop?.nodeId];

        if (srcPos && tgtPos) {
          newParticles.push({
            id: `${req.id}_${hopIndex}`,
            sourceX: srcPos.x,
            sourceY: srcPos.y,
            targetX: tgtPos.x,
            targetY: tgtPos.y,
            progress: (Date.now() / 800 + idx * 0.15) % 1,
            color: req.color || '#58a6ff',
          });
        }
      }
    });

    setParticles(newParticles);
  }, [activeRequests, nodes, edges, simState]);

  // Smooth animation loop
  useEffect(() => {
    if (simState !== 'running') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      setParticles((prev) =>
        prev.map((p) => {
          const nextProg = p.progress + delta * 1.5 * speedMultiplier;
          return {
            ...p,
            progress: nextProg > 1 ? nextProg - 1 : nextProg,
          };
        }),
      );

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [simState, speedMultiplier]);

  if (particles.length === 0) return null;

  return (
    <div className={styles.particleLayer}>
      {particles.map((p) => {
        // Linear interpolation with cubic bezier curve arc
        const currX = p.sourceX + (p.targetX - p.sourceX) * p.progress;
        const currY = p.sourceY + (p.targetY - p.sourceY) * p.progress;

        const screenX = currX * viewport.zoom + viewport.x;
        const screenY = currY * viewport.zoom + viewport.y;

        return (
          <div
            key={p.id}
            className={styles.particle}
            data-testid="request-particle"
            data-request-color={p.color}
            aria-hidden="true"
            style={{
              left: screenX,
              top: screenY,
              backgroundColor: p.color,
              color: p.color,
            }}
          />
        );
      })}
    </div>
  );
};
