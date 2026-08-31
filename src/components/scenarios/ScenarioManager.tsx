import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store/use-store';
import { loadScenarioCatalog, SCENARIO_CATEGORIES } from '../../scenarios/registry';
import type { Scenario } from '../../model/types';
import { ScenarioPicker } from './ScenarioPicker';
import { ScenarioDetail } from './ScenarioDetail';

export const ScenarioManager: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [catalogError, setCatalogError] = useState(false);
  const { currentScenario, setCurrentScenario } = useStore(
    useShallow((state) => ({
      currentScenario: state.currentScenario,
      setCurrentScenario: state.setCurrentScenario,
    })),
  );

  useEffect(() => {
    let active = true;
    loadScenarioCatalog()
      .then((loaded) => {
        if (active) setScenarios(loaded);
      })
      .catch(() => {
        if (active) setCatalogError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectScenario = (id: number) => {
    const target = scenarios.find((scenario) => scenario.id === id);
    if (target) {
      setCurrentScenario(target);
    }
  };

  const handleBack = () => {
    setCurrentScenario(null);
  };

  if (currentScenario) {
    return <ScenarioDetail scenario={currentScenario} onBack={handleBack} />;
  }

  if (catalogError)
    return <p role="alert">Scenario catalog could not be loaded. Reload to retry.</p>;
  if (scenarios.length === 0) return <p role="status">Loading scenario catalog…</p>;

  return (
    <ScenarioPicker
      scenarios={scenarios}
      categories={SCENARIO_CATEGORIES}
      onSelectScenario={handleSelectScenario}
    />
  );
};
