import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Flame,
  BarChart2,
} from 'lucide-react';
import { useStore } from '../../store/use-store';
import { simBridge } from '../../engine/sim-bridge';
import { TrafficPattern } from '../../model/types';
import styles from './SimulationControls.module.css';

export const SimulationControls: React.FC = () => {
  const {
    simState,
    speedMultiplier,
    setSpeedMultiplier,
    trafficConfig,
    setTrafficConfig,
    metrics,
    nodes,
    isChaosMode,
    setChaosMode,
    isBottomDrawerOpen,
    setIsBottomDrawerOpen,
  } = useStore();

  const isRunning = simState === 'running';
  const hasNodes = nodes.length > 0;

  const handlePlayPause = () => {
    if (isRunning) {
      simBridge.pause();
    } else if (simState === 'paused') {
      simBridge.resume();
    } else {
      simBridge.start();
    }
  };

  const handleStep = () => {
    simBridge.step();
  };

  const handleReset = () => {
    simBridge.reset();
  };

  const handleSpeedChange = (speed: number) => {
    setSpeedMultiplier(speed);
    simBridge.setSpeed(speed);
  };

  const handlePatternChange = (pattern: TrafficPattern) => {
    setTrafficConfig({ pattern });
    simBridge.syncConfig({ pattern });
  };

  const handleQpsChange = (val: number) => {
    const safeVal = Math.max(1, Math.min(100000, val || 100));
    setTrafficConfig({ baseQps: safeVal });
    simBridge.syncConfig({ baseQps: safeVal });
  };

  const toggleChaos = () => {
    setChaosMode(!isChaosMode);
  };

  return (
    <div className={styles.controlsBar}>
      {/* Primary Play/Pause/Step/Reset */}
      <div className={styles.buttonGroup}>
        <button
          className={`${styles.playBtn} ${isRunning ? styles.playBtnRunning : ''}`}
          onClick={handlePlayPause}
          disabled={!hasNodes}
          title={isRunning ? 'Pause Simulation' : 'Start Simulation'}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
          <span>{isRunning ? 'Pause' : 'Simulate'}</span>
        </button>

        <button
          className={styles.controlBtn}
          onClick={handleStep}
          disabled={!hasNodes || isRunning}
          title="Step forward by 1 tick"
        >
          <SkipForward size={14} />
        </button>

        <button
          className={styles.controlBtn}
          onClick={handleReset}
          disabled={!hasNodes || simState === 'idle'}
          title="Reset simulation metrics"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div className={styles.divider} />

      {/* Traffic Config */}
      <div className={styles.configGroup}>
        <span className={styles.label}>Pattern</span>
        <select
          className={styles.select}
          value={trafficConfig.pattern}
          onChange={(e) => handlePatternChange(e.target.value as TrafficPattern)}
        >
          <option value="steady">Steady</option>
          <option value="bursty">Bursty</option>
          <option value="ramp">Ramp-up</option>
          <option value="spike">Spike</option>
        </select>
      </div>

      <div className={styles.configGroup}>
        <span className={styles.label}>QPS</span>
        <input
          type="number"
          className={styles.qpsInput}
          value={trafficConfig.baseQps}
          onChange={(e) => handleQpsChange(parseInt(e.target.value, 10))}
          min="10"
          max="50000"
          step="50"
        />
      </div>

      <div className={styles.configGroup}>
        <span className={styles.label}>Speed</span>
        <select
          className={styles.select}
          value={speedMultiplier}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
          <option value="10">10x</option>
        </select>
      </div>

      <div className={styles.divider} />

      {/* Chaos Mode Toggle */}
      <button
        className={`${styles.chaosBtn} ${isChaosMode ? styles.chaosBtnActive : ''}`}
        onClick={toggleChaos}
        title="Toggle randomized intermittent chaos failure injection"
      >
        <Flame size={12} />
        <span>Chaos {isChaosMode ? 'ON' : 'OFF'}</span>
      </button>

      {/* Telemetry Stats */}
      <div className={styles.statsCluster}>
        <div className={styles.statItem}>
          <span className={styles.statVal}>{metrics.totalRequestsSent}</span>
          <span className={styles.statLbl}>Sent</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statVal} ${styles.successVal}`}>
            {metrics.totalRequestsSuccess}
          </span>
          <span className={styles.statLbl}>Passed</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statVal} ${styles.failVal}`}>
            {metrics.totalRequestsFailed}
          </span>
          <span className={styles.statLbl}>Failed</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statVal}>
            {metrics.avgEndToEndLatencyMs > 0 ? `${metrics.avgEndToEndLatencyMs}ms` : '--'}
          </span>
          <span className={styles.statLbl}>Avg Latency</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Metrics Panel Drawer Toggle */}
      <button
        className={`${styles.controlBtn} ${isBottomDrawerOpen ? styles.chaosBtnActive : ''}`}
        onClick={() => setIsBottomDrawerOpen(!isBottomDrawerOpen)}
        title="Toggle Real-Time Metrics & Charts Drawer"
      >
        <BarChart2 size={15} />
      </button>
    </div>
  );
};
