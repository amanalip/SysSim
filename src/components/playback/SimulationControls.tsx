import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Flame,
  BarChart2,
  TrendingUp,
  Waves,
  Zap,
  Activity,
  Square,
} from 'lucide-react';
import { useStore } from '../../store/use-store';
import { simulationRuntime as simBridge } from '../../engine/simulation-runtime';
import { RequestKeyDistribution, TrafficPattern } from '../../model/types';
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
    addToast,
    simulationRuntimeMode,
  } = useStore(
    useShallow((state) => ({
      simState: state.simState,
      speedMultiplier: state.speedMultiplier,
      setSpeedMultiplier: state.setSpeedMultiplier,
      trafficConfig: state.trafficConfig,
      setTrafficConfig: state.setTrafficConfig,
      metrics: state.metrics,
      nodes: state.nodes,
      isChaosMode: state.isChaosMode,
      setChaosMode: state.setChaosMode,
      isBottomDrawerOpen: state.isBottomDrawerOpen,
      setIsBottomDrawerOpen: state.setIsBottomDrawerOpen,
      addToast: state.addToast,
      simulationRuntimeMode: state.simulationRuntimeMode,
    })),
  );

  const [qpsText, setQpsText] = React.useState(String(trafficConfig.baseQps));
  const [seedText, setSeedText] = React.useState(String(trafficConfig.seed ?? 1));
  const [customKeysText, setCustomKeysText] = React.useState(() =>
    (trafficConfig.customRequestKeys || [])
      .map((entry) => `${entry.key}:${entry.weight}`)
      .join(','),
  );

  React.useEffect(() => {
    setQpsText(String(trafficConfig.baseQps));
  }, [trafficConfig.baseQps]);

  React.useEffect(() => setSeedText(String(trafficConfig.seed ?? 1)), [trafficConfig.seed]);

  const applySeed = () => {
    const value = Number(seedText);
    if (!Number.isFinite(value)) return setSeedText(String(trafficConfig.seed ?? 1));
    const seed = Math.floor(value) >>> 0 || 1;
    setSeedText(String(seed));
    setTrafficConfig({ seed });
  };

  const copySeed = async () => {
    await navigator.clipboard.writeText(String(trafficConfig.seed ?? 1));
    addToast(`Copied simulation seed ${trafficConfig.seed ?? 1}`, 'success');
  };

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

  const handleStop = () => {
    simBridge.stop();
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
  };

  const handleKeyDistributionChange = (requestKeyDistribution: RequestKeyDistribution) => {
    setTrafficConfig({ requestKeyDistribution });
  };

  const handleCustomKeysBlur = () => {
    const customRequestKeys = customKeysText
      .split(',')
      .map((token) => {
        const separator = token.lastIndexOf(':');
        return {
          key: token.slice(0, separator).trim(),
          weight: Number(token.slice(separator + 1)),
        };
      })
      .filter((entry) => entry.key && Number.isFinite(entry.weight) && entry.weight > 0);
    setTrafficConfig({ customRequestKeys });
  };

  const handleQpsChange = (raw: string) => {
    setQpsText(raw);
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val > 0) {
      const safeVal = Math.max(1, Math.min(100000, val));
      setTrafficConfig({ baseQps: safeVal });
    }
  };

  const handleQpsBlur = () => {
    const val = parseInt(qpsText, 10);
    if (isNaN(val) || val <= 0) {
      setQpsText(String(trafficConfig.baseQps));
    }
  };

  const toggleChaos = () => {
    setChaosMode(!isChaosMode);
  };

  const speeds = [0.5, 1, 2, 5, 10];
  const patterns: Array<{ key: TrafficPattern; label: string; icon: React.ReactNode }> = [
    { key: 'steady', label: 'Steady', icon: <Activity size={10} /> },
    { key: 'bursty', label: 'Bursty', icon: <Waves size={10} /> },
    { key: 'ramp', label: 'Ramp', icon: <TrendingUp size={10} /> },
    { key: 'spike', label: 'Spike', icon: <Zap size={10} /> },
  ];

  return (
    <div className={styles.controlsBar}>
      {/* Active Status Indicator */}
      <div
        className={`${styles.statusDot} ${isRunning ? styles.statusRunning : simState === 'paused' ? styles.statusPaused : styles.statusIdle}`}
        title={`Engine status: ${simState}; runtime: ${simulationRuntimeMode === 'worker' ? 'background worker' : 'compatibility mode'}`}
      />

      {/* Primary Play/Pause/Step/Reset */}
      <div className={styles.buttonGroup}>
        <button
          className={`${styles.playBtn} ${isRunning ? styles.playBtnRunning : ''}`}
          onClick={handlePlayPause}
          disabled={!hasNodes}
          title={isRunning ? 'Pause Simulation (Space)' : 'Start Simulation (Space)'}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
          <span>{isRunning ? 'Pause' : 'Simulate'}</span>
        </button>

        <button
          className={styles.controlBtn}
          onClick={handleStop}
          disabled={!hasNodes || simState === 'idle'}
          title="Stop simulation"
          aria-label="Stop simulation"
        >
          <Square size={13} />
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

      {/* Traffic Pattern Segmented Switcher */}
      <div className={styles.configGroup}>
        <span className={styles.label}>Pattern</span>
        <div className={styles.segmentedGroup}>
          {patterns.map((p) => (
            <button
              key={p.key}
              className={`${styles.segmentedBtn} ${trafficConfig.pattern === p.key ? styles.segmentedBtnActive : ''}`}
              onClick={() => handlePatternChange(p.key)}
              title={`${p.label} Traffic Pattern`}
            >
              {p.icon}
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.configGroup}>
        <label className={styles.label} htmlFor="request-key-distribution">
          Keys
        </label>
        <select
          id="request-key-distribution"
          className={styles.compactSelect}
          value={trafficConfig.requestKeyDistribution || 'uniform'}
          onChange={(event) =>
            handleKeyDistributionChange(event.target.value as RequestKeyDistribution)
          }
          title="Request-key popularity distribution"
        >
          <option value="uniform">Uniform</option>
          <option value="zipfian">Hot-key (Zipf)</option>
          <option value="custom">Custom</option>
        </select>
        {trafficConfig.requestKeyDistribution === 'custom' ? (
          <input
            className={styles.customKeysInput}
            value={customKeysText}
            onChange={(event) => setCustomKeysText(event.target.value)}
            onBlur={handleCustomKeysBlur}
            aria-label="Custom request keys and weights"
            placeholder="home:5,search:2"
            title="Comma-separated key:weight pairs"
          />
        ) : null}
      </div>

      <div className={styles.configGroup}>
        <label className={styles.label} htmlFor="simulation-qps">
          QPS
        </label>
        <input
          id="simulation-qps"
          type="number"
          className={styles.qpsInput}
          value={qpsText}
          onChange={(e) => handleQpsChange(e.target.value)}
          onBlur={handleQpsBlur}
          min="10"
          max="50000"
          step="50"
        />
      </div>

      <div className={styles.configGroup}>
        <label className={styles.label} htmlFor="simulation-seed">
          Seed
        </label>
        <input
          id="simulation-seed"
          aria-label="Simulation seed"
          type="number"
          className={styles.qpsInput}
          value={seedText}
          onChange={(event) => setSeedText(event.target.value)}
          onBlur={applySeed}
          min="1"
          step="1"
        />
        <button className={styles.controlBtn} onClick={copySeed} title="Copy simulation seed">
          Copy
        </button>
      </div>

      {/* Segmented Speed Selector */}
      <div className={styles.speedSegmentedGroup}>
        {speeds.map((spd) => (
          <button
            key={spd}
            className={`${styles.speedPill} ${speedMultiplier === spd ? styles.speedPillActive : ''}`}
            onClick={() => handleSpeedChange(spd)}
            title={`Set simulation clock speed to ${spd}x; UI refresh cadence stays constant`}
          >
            {spd}x
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      {/* Chaos Mode Toggle */}
      <button
        className={`${styles.chaosBtn} ${isChaosMode ? styles.chaosBtnActive : ''}`}
        onClick={toggleChaos}
        title="Toggle Chaos Monkey failure injection (C)"
      >
        <Flame size={12} />
        <span>Chaos {isChaosMode ? 'ON' : 'OFF'}</span>
      </button>

      {/* Telemetry Stats */}
      <div className={styles.statsCluster}>
        <div className={styles.statItem}>
          <span className={styles.statVal}>
            {(metrics.totalRequestsOffered ?? metrics.totalRequestsSent).toLocaleString()}
          </span>
          <span className={styles.statLbl}>Offered</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statVal} ${styles.successVal}`}>
            {metrics.totalRequestsSuccess.toLocaleString()}
          </span>
          <span className={styles.statLbl}>Succeeded</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statVal} ${styles.failVal}`}>
            {metrics.totalRequestsFailed.toLocaleString()}
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
        className={`${styles.controlBtn} ${isBottomDrawerOpen ? styles.drawerBtnActive : ''}`}
        onClick={() => setIsBottomDrawerOpen(!isBottomDrawerOpen)}
        title="Toggle Real-Time Metrics & Charts Drawer (M)"
      >
        <BarChart2 size={15} />
      </button>
    </div>
  );
};
