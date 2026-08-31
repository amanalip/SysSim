import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store/use-store';
import { ALL_SCENARIOS } from '../../scenarios';
import { ScenarioPicker } from './ScenarioPicker';
import { ScenarioDetail } from './ScenarioDetail';

export const ScenarioManager: React.FC = () => {
  const { currentScenario, setCurrentScenario } = useStore(
    useShallow((state) => ({
      currentScenario: state.currentScenario,
      setCurrentScenario: state.setCurrentScenario,
    })),
  );

  const handleSelectScenario = (id: number) => {
    const target = ALL_SCENARIOS.find((s) => s.id === id);
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

  return <ScenarioPicker onSelectScenario={handleSelectScenario} />;
};
