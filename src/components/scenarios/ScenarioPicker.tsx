import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, X } from 'lucide-react';
import { ALL_SCENARIOS, SCENARIO_CATEGORIES } from '../../scenarios';
import { useStore } from '../../store/use-store';
import { ScenarioCategory, ScenarioDifficulty } from '../../model/types';
import styles from './ScenarioPicker.module.css';

interface ScenarioPickerProps {
  onSelectScenario: (id: number) => void;
}

export const ScenarioPicker: React.FC<ScenarioPickerProps> = ({ onSelectScenario }) => {
  const { currentScenario, completedScenarioIds } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredScenarios = useMemo(() => {
    return ALL_SCENARIOS.filter((s) => {
      const matchesCategory =
        selectedCategory === 'All' || s.category === selectedCategory;
      const matchesDifficulty =
        selectedDifficulty === 'All' || s.difficulty === selectedDifficulty;
      const matchesSearch =
        normalizedQuery === '' ||
        s.title.toLowerCase().includes(normalizedQuery) ||
        s.problemStatement.toLowerCase().includes(normalizedQuery) ||
        s.category.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesDifficulty && matchesSearch;
    });
  }, [normalizedQuery, selectedCategory, selectedDifficulty]);

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
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSearchTerm('');
          }}
        />
        {searchTerm && (
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            onClick={() => setSearchTerm('')}
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <select
          className={styles.categorySelect}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {SCENARIO_CATEGORIES.map((cat: ScenarioCategory) => {
            const count = ALL_SCENARIOS.filter(
              (s) =>
                s.category === cat &&
                (selectedDifficulty === 'All' || s.difficulty === selectedDifficulty) &&
                (normalizedQuery === '' ||
                  s.title.toLowerCase().includes(normalizedQuery) ||
                  s.problemStatement.toLowerCase().includes(normalizedQuery))
            ).length;
            return (
              <option key={cat} value={cat}>
                {cat} ({count})
              </option>
            );
          })}
        </select>

        <select
          className={styles.categorySelect}
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
        >
          <option value="All">All Difficulties</option>
          {(['Easy', 'Medium', 'Hard'] as ScenarioDifficulty[]).map((diff) => {
            const count = ALL_SCENARIOS.filter(
              (s) =>
                s.difficulty === diff &&
                (selectedCategory === 'All' || s.category === selectedCategory) &&
                (normalizedQuery === '' ||
                  s.title.toLowerCase().includes(normalizedQuery) ||
                  s.problemStatement.toLowerCase().includes(normalizedQuery))
            ).length;
            return (
              <option key={diff} value={diff}>
                {diff} ({count})
              </option>
            );
          })}
        </select>
      </div>

      <div className={styles.scenarioList}>
        {filteredScenarios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
            No scenarios found matching your filter criteria
          </div>
        ) : (
          filteredScenarios.map((s) => {
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
          })
        )}
      </div>
    </div>
  );
};
