import { lazy, Suspense, useState } from 'react';
import { useStore } from '../../store/use-store';
import { useRunHistory } from '../../store/run-history';
import { simulationRuntime } from '../../engine/simulation-runtime';
import styles from './ExperimentGuide.module.css';

const RunHistoryModal = lazy(() =>
  import('../modals/RunHistoryModal').then((module) => ({ default: module.RunHistoryModal })),
);

const GUIDE_KEY = 'syssim_experiment_guide_dismissed';
const steps = [
  {
    title: '1. Run your first experiment',
    text: 'Use the starter architecture or your own connected design. Run traffic and watch completed QPS and latency. Let it collect a few seconds of results.',
    action: 'Run experiment',
  },
  {
    title: '2. Inspect the result',
    text: 'Stop to save a baseline. Inspect the design checks and select a component to explore its settings. Note the modeled duration so you can match it on the next run.',
    action: 'Stop & inspect',
  },
  {
    title: '3. Change one setting',
    text: 'Try increasing an application server’s instance count in Properties. Keep the workload and seed unchanged. The checks are prompts: a change may help, hurt, or make no difference.',
    action: 'Run changed design',
  },
  {
    title: '4. Compare the outcome',
    text: 'Stop near the baseline’s modeled duration and compare completed QPS, drops, and successful p95. Read the comparison caveats before attributing differences to your change.',
    action: 'Stop & compare',
  },
];

export function ExperimentGuide() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_KEY) !== 'yes' && window.innerWidth > 640;
    } catch {
      return true;
    }
  });
  const [step, setStep] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const hasNodes = useStore((state) => state.nodes.length > 0);
  const simState = useStore((state) => state.simState);
  const isFinishing = useRunHistory((state) => state.isFinishing);
  const runCount = useRunHistory((state) => state.runs.length);
  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(GUIDE_KEY, 'yes');
    } catch {
      /* Session dismissal still works. */
    }
  };
  const advance = () => {
    if (step === 0) {
      if (simState === 'paused') simulationRuntime.resume();
      else if (simState !== 'running') simulationRuntime.start();
    } else if (step === 1) {
      simulationRuntime.stop();
      useStore.getState().setActiveBottomTab('bottlenecks');
      useStore.getState().setIsBottomDrawerOpen(true);
    } else if (step === 2) {
      const latest = useRunHistory.getState().runs[0];
      if (latest) useRunHistory.getState().pinBaseline(latest.id);
      useStore.getState().setIsBottomDrawerOpen(false);
      simulationRuntime.start();
    } else {
      simulationRuntime.stop();
      setHistoryOpen(true);
      dismiss();
    }
    setStep((value) => Math.min(3, value + 1));
  };
  return (
    <div className={styles.guide}>
      {open ? (
        <section aria-label="Guided experiment">
          <div className={styles.copy}>
            <strong>{steps[step].title}</strong>
            <p>{steps[step].text}</p>
          </div>
          <button
            onClick={advance}
            disabled={!hasNodes || isFinishing || (step === 2 && runCount === 0)}
          >
            {steps[step].action}
          </button>
          <button onClick={dismiss}>Dismiss guide</button>
        </section>
      ) : (
        <button
          className={styles.replay}
          onClick={() => {
            setStep(0);
            setOpen(true);
          }}
        >
          Guided experiment
        </button>
      )}
      {historyOpen && (
        <Suspense fallback={<span role="status">Loading run history…</span>}>
          <RunHistoryModal onClose={() => setHistoryOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
