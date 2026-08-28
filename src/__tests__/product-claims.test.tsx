import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChaosDrillModal } from '../components/modals/ChaosDrillModal';
import { ScenarioInterviewStepper } from '../components/scenarios/ScenarioInterviewStepper';
import { ARCHITECTURE_BLUEPRINTS } from '../model/blueprints';
import { ALL_SCENARIOS } from '../scenarios';

describe('User-facing product claims', () => {
  it('describes chaos drills as simplified state changes', () => {
    render(<ChaosDrillModal isOpen onClose={vi.fn()} />);

    expect(
      screen.getByText('Explore simplified failure states; results do not certify fault tolerance'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Marks one database node down. Automatic read-replica failover is not currently modeled.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Multiplies configured traffic by 5. Automatic scaling is not currently modeled.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Application Server Degradation')).toBeInTheDocument();
    expect(screen.queryByText(/test automated read replica failover/i)).not.toBeInTheDocument();
  });

  it('frames the scenario runner as illustrative review rather than SLA verification', () => {
    render(<ScenarioInterviewStepper scenario={ALL_SCENARIOS[0]} />);

    fireEvent.click(screen.getByText('5. Simulate Target Load & Review'));

    expect(
      screen.getByText(
        'Compare the simulated error rate with the target; this does not prove SLA compliance',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: `Run Scenario Simulation (${ALL_SCENARIOS[0].constraints.targetQps} QPS)`,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('5. Load Test & Verify SLA')).not.toBeInTheDocument();
  });

  it('describes blueprint topology without claiming unmodeled semantics', () => {
    const blueprintCopy = ARCHITECTURE_BLUEPRINTS.map(
      ({ name, description }) => `${name}: ${description}`,
    ).join('\n');

    expect(blueprintCopy).toContain('Load Balancer + 2 App Server nodes + Redis Cache');
    expect(blueprintCopy).toContain(
      'replication traffic is independent, lag/failover are not modeled',
    );
    expect(blueprintCopy).toContain('consumers drain independently');
    expect(blueprintCopy).not.toContain('3 App Server Replicas');
    expect(blueprintCopy).not.toContain('replication links');
  });
});
