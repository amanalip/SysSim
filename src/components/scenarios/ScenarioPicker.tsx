import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { ALL_SCENARIOS, SCENARIO_CATEGORIES } from '../../scenarios';
import { useStore } from '../../store/use-store';
import { ScenarioCategory } from '../../model/types';
import styles from './ScenarioPicker.module.css';

interface ScenarioPickerProps {
  onSelectScenario: (id: number) => void;
}

export const ScenarioPicker: React.FC<ScenarioPickerProps> = ({ onSelectScenario }) => {
  const { currentScenario, completedScenarioIds } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredScenarios = useMemo(() => {
    return ALL_SCENARIOS.filter((s) => {
      const matchesCategory =
        selectedCategory === 'All' || s.category === selectedCategory;
      const matchesSearch =
        searchTerm.trim() === '' ||
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.problemStatement.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className={styles.pickerContainer}>
      <div className={styles.searchBox}>
        <Search size={14} color="var(--text-muted)" />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search 101 scenarios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <select
        className={styles.categorySelect}
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        <option value="All">All Categories ({ALL_SCENARIOS.length})</option>
        {SCENARIO_CATEGORIES.map((cat: ScenarioCategory) => {
          const count = ALL_SCENARIOS.filter((s) => s.category === cat).length;
          return (
            <option key={cat} value={cat}>
              {cat} ({count})
            </option>
          );
        })}
      </select>

      <div className={styles.scenarioList}>
        {filteredScenarios.map((s) => {
          const isCompleted = completedScenarioIds.includes(s.id);
          const isSelected = currentScenario?.id === s.id;

          return (
            <div
              key={s.id}
              className={`${styles.scenarioCard} ${
                isSelected ? styles.scenarioCardActive : ''
              }`}
              onClick={() => onSelectScenario(s.id)}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardTitleArea}>
                  <span className={styles.scenarioNumber}>#{s.id}</span>
                  <span className={styles.scenarioTitle}>{s.title}</span>
                </div>
                <span
                  className={`${styles.diffBadge} ${
                    s.difficulty === 'Easy'
                      ? styles.diffEasy
                      : s.difficulty === 'Medium'
                      ? styles.diffMedium
                      : styles.diffHard
                  }`}
                >
                  {s.difficulty}
                </span>
              </div>

              <div className={styles.cardMeta}>
                <span className={styles.categoryTag}>{s.category}</span>
                {isCompleted && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--success)', fontWeight: 600 }}>
                    <CheckCircle2 size={11} /> Solved
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
