import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronRight, Award, Target, Cpu, ShieldCheck, Play } from 'lucide-react';
import { Scenario } from '../../model/types';
import { useStore } from '../../store/use-store';
import { simBridge } from '../../engine/sim-bridge';
import styles from './ScenarioInterviewStepper.module.css';

interface ScenarioInterviewStepperProps {
  scenario: Scenario;
}

interface StepItem {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tasks: string[];
}

export const ScenarioInterviewStepper: React.FC<ScenarioInterviewStepperProps> = ({ scenario }) => {
  const { setTrafficConfig } = useStore();
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);
  const [activeStep, setActiveStep] = useState(1);

  const steps: StepItem[] = [
    {
      id: 1,
      title: '1. Clarify Scope & SLAs',
      subtitle: 'Identify functional requirements and scale targets',
      icon: <Target size={14} />,
      tasks: [
        `Target Traffic: ${scenario.constraints.targetQps.toLocaleString()} QPS`,
        `Max Latency SLA: ${scenario.constraints.maxP99LatencyMs}ms (p99)`,
        `Target Availability: ${scenario.constraints.availabilitySlaPercent}% uptime`,
      ],
    },
    {
      id: 2,
      title: '2. Capacity & Envelope Estimation',
      subtitle: 'Compute throughput and storage footprint',
      icon: <Cpu size={14} />,
      tasks: [
        `Storage Estimate: ${scenario.constraints.dataSizeGb.toLocaleString()} GB total storage`,
        'Estimate Read/Write ratio (e.g. 10:1 read heavy vs 1:1 write heavy)',
        'Estimate bandwidth requirements and caching capacity',
      ],
    },
    {
      id: 3,
      title: '3. High-Level Architecture',
      subtitle: 'Place and link core tiers on canvas',
      icon: <CheckCircle2 size={14} />,
      tasks: [
        'Place Client and API Gateway / Ingress Load Balancer',
        'Add App Server cluster tier and connect with HTTP/gRPC',
        'Provision primary Database tier for persistent state',
      ],
    },
    {
      id: 4,
      title: '4. Deep Dive & Resilience',
      subtitle: 'Eliminate bottlenecks and single points of failure',
      icon: <ShieldCheck size={14} />,
      tasks: [
        'Add Redis / Memcached caching tier to absorb read load',
        'Configure DB Read Replicas for high availability failover',
        'Introduce Message Queues for asynchronous processing',
      ],
    },
    {
      id: 5,
      title: '5. Load Test & Verify SLA',
      subtitle: 'Run continuous traffic simulation and confirm health',
      icon: <Play size={14} />,
      tasks: [
        'Click Play in the floating dock to start simulation',
        'Inspect live metrics to verify error rate is within SLA',
        'Check 5-Pillar Health Radar for system score above 85',
      ],
    },
  ];

  const toggleStepCompleted = (stepId: number) => {
    if (completedSteps.includes(stepId)) {
      setCompletedSteps((prev) => prev.filter((id) => id !== stepId));
    } else {
      setCompletedSteps((prev) => [...prev, stepId]);
      useStore.getState().addToast(`Completed Step ${stepId}!`, 'success');
    }
  };

  const progressPercent = Math.round((completedSteps.length / steps.length) * 100);

  return (
    <div className={styles.stepperContainer}>
      <div className={styles.stepperHeader}>
        <div className={styles.headerTitle}>
          <Award size={15} color="var(--accent-primary)" />
          <span>FAANG System Design Workflow</span>
        </div>
        <span className={styles.progressBadge}>{progressPercent}% Done</span>
      </div>

      <div className={styles.progressBarTrack}>
        <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
      </div>

      <div className={styles.stepsList}>
        {steps.map((step) => {
          const isDone = completedSteps.includes(step.id);
          const isActive = activeStep === step.id;

          return (
            <div
              key={step.id}
              className={`${styles.stepCard} ${isActive ? styles.stepCardActive : ''} ${
                isDone ? styles.stepCardDone : ''
              }`}
              onClick={() => setActiveStep(step.id)}
            >
              <div className={styles.stepHeaderRow}>
                <button
                  className={styles.checkBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStepCompleted(step.id);
                  }}
                  title={isDone ? 'Mark step as incomplete' : 'Mark step as complete'}
                >
                  {isDone ? (
                    <CheckCircle2 size={16} color="var(--success)" />
                  ) : (
                    <Circle size={16} color="var(--text-muted)" />
                  )}
                </button>

                <div className={styles.stepTitleBox}>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span className={styles.stepSubtitle}>{step.subtitle}</span>
                </div>

                <ChevronRight
                  size={14}
                  color="var(--text-muted)"
                  style={{
                    transform: isActive ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                />
              </div>

              {isActive && (
                <div className={styles.taskList}>
                  {step.tasks.map((task, idx) => (
                    <div key={idx} className={styles.taskItem}>
                      <span className={styles.taskBullet}>•</span>
                      <span>{task}</span>
                    </div>
                  ))}
                  {step.id === 5 && (
                    <button
                      className={styles.runTestBtn}
                      onClick={() => {
                        setTrafficConfig({ baseQps: scenario.constraints.targetQps });
                        simBridge.start();
                        useStore.getState().addToast(`Started load test at ${scenario.constraints.targetQps} QPS!`, 'info');
                      }}
                    >
                      <Play size={12} />
                      <span>Run Scenario Load Test ({scenario.constraints.targetQps} QPS)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
