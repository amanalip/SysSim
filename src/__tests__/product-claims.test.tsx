import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChaosDrillModal } from '../components/modals/ChaosDrillModal';
import { ScenarioInterviewStepper } from '../components/scenarios/ScenarioInterviewStepper';
import { ARCHITECTURE_BLUEPRINTS } from '../model/blueprints';
import { ALL_SCENARIOS } from '../scenarios';

describe('User-facing product claims', () => {
  it('describes chaos drills as bounded, reversible simulations', () => {
    render(<ChaosDrillModal isOpen onClose={vi.fn()} />);

    expect(
      screen.getByText('Explore simplified failure states; results do not certify fault tolerance'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Exercises internal SQL replica failover or a separately connected database target; fails explicitly when neither exists.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Multiplies base QPS exactly once while preserving the selected traffic pattern for exact restoration.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('High Network Latency (400ms)')).toBeInTheDocument();
    expect(screen.getByText(/request coalescing protection/i)).toBeInTheDocument();
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
      "replication-edge traffic is independent of each SQL node's virtual lag/failover model",
    );
    expect(blueprintCopy).toContain('consumers drain independently');
    expect(blueprintCopy).not.toContain('3 App Server Replicas');
    expect(blueprintCopy).not.toContain('replication links');
  });
});
