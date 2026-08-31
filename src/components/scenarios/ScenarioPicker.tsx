import React, { useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Search, CheckCircle2, X, Trophy } from 'lucide-react';
import { useStore } from '../../store/use-store';
import { Scenario, ScenarioCategory, ScenarioDifficulty } from '../../model/types';
import styles from './ScenarioPicker.module.css';

interface ScenarioPickerProps {
  scenarios: Scenario[];
  categories: ScenarioCategory[];
  onSelectScenario: (id: number) => void;
}

type StatusFilter = 'All' | 'Solved' | 'Unsolved';

export const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  scenarios,
  categories,
  onSelectScenario,
}) => {
  const { currentScenario, completedScenarioIds } = useStore(
    useShallow((state) => ({
      currentScenario: state.currentScenario,
      completedScenarioIds: state.completedScenarioIds,
    })),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const totalScenarios = scenarios.length;
  const solvedCount = completedScenarioIds.length;
  const progressPercent = Math.round((solvedCount / totalScenarios) * 100);

  const filteredScenarios = useMemo(() => {
    return scenarios.filter((s) => {
      const isCompleted = completedScenarioIds.includes(s.id);
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Solved' && isCompleted) ||
        (statusFilter === 'Unsolved' && !isCompleted);
      const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'All' || s.difficulty === selectedDifficulty;
      const matchesSearch =
        normalizedQuery === '' ||
        s.title.toLowerCase().includes(normalizedQuery) ||
        s.problemStatement.toLowerCase().includes(normalizedQuery) ||
        s.category.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesCategory && matchesDifficulty && matchesSearch;
    });
  }, [
    scenarios,
    normalizedQuery,
    selectedCategory,
    selectedDifficulty,
    statusFilter,
    completedScenarioIds,
  ]);

  return (
    <div className={styles.pickerContainer}>
      {/* Scenario progress summary */}
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <div className={styles.progressTitle}>
            <Trophy size={13} color="var(--warning)" />
            <span>Mastery Progress</span>
          </div>
          <span className={styles.progressScore}>
            {solvedCount} / {totalScenarios} ({progressPercent}%)
          </span>
        </div>
        <div className={styles.progressBarTrack}>
          <progress
            className={styles.progressBarFill}
            max={100}
            value={progressPercent}
            aria-label="Scenario mastery progress"
          />
        </div>
      </div>

      {/* Search Input */}
      <div className={styles.searchBox}>
        <Search size={14} color="var(--text-muted)" />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search 101 scenarios..."
          aria-label="Search scenarios"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSearchTerm('');
          }}
        />
        {searchTerm && (
          <button
            className={styles.clearSearchButton}
            onClick={() => setSearchTerm('')}
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Status Filter Pills */}
      <div className={styles.statusFilterRow}>
        {(['All', 'Solved', 'Unsolved'] as StatusFilter[]).map((st) => (
          <button
            key={st}
            className={`${styles.statusFilterBtn} ${statusFilter === st ? styles.statusFilterBtnActive : ''}`}
            onClick={() => setStatusFilter(st)}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Category & Difficulty Selectors */}
      <div className={styles.filterGrid}>
        <select
          aria-label="Filter scenarios by category"
          className={styles.categorySelect}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {categories.map((cat: ScenarioCategory) => {
            const count = scenarios.filter(
              (s) =>
                s.category === cat &&
                (selectedDifficulty === 'All' || s.difficulty === selectedDifficulty) &&
                (statusFilter === 'All' ||
                  (statusFilter === 'Solved' && completedScenarioIds.includes(s.id)) ||
                  (statusFilter === 'Unsolved' && !completedScenarioIds.includes(s.id))) &&
                (normalizedQuery === '' ||
                  s.title.toLowerCase().includes(normalizedQuery) ||
                  s.problemStatement.toLowerCase().includes(normalizedQuery)),
            ).length;
            return (
              <option key={cat} value={cat}>
                {cat} ({count})
              </option>
            );
          })}
        </select>

        <select
          aria-label="Filter scenarios by difficulty"
          className={styles.categorySelect}
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
        >
          <option value="All">All Difficulties</option>
          {(['Easy', 'Medium', 'Hard'] as ScenarioDifficulty[]).map((diff) => {
            const count = scenarios.filter(
              (s) =>
                s.difficulty === diff &&
                (selectedCategory === 'All' || s.category === selectedCategory) &&
                (statusFilter === 'All' ||
                  (statusFilter === 'Solved' && completedScenarioIds.includes(s.id)) ||
                  (statusFilter === 'Unsolved' && !completedScenarioIds.includes(s.id))) &&
                (normalizedQuery === '' ||
                  s.title.toLowerCase().includes(normalizedQuery) ||
                  s.problemStatement.toLowerCase().includes(normalizedQuery)),
            ).length;
            return (
              <option key={diff} value={diff}>
                {diff} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* Scenario List */}
      <div className={styles.scenarioList}>
        {filteredScenarios.length === 0 ? (
          <div className={styles.emptyState}>No scenarios found matching your filter criteria</div>
        ) : (
          filteredScenarios.map((s) => {
            const isCompleted = completedScenarioIds.includes(s.id);
            const isSelected = currentScenario?.id === s.id;

            return (
              <div
                key={s.id}
                className={`${styles.scenarioCard} ${isSelected ? styles.scenarioCardActive : ''}`}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectScenario(s.id);
                  }
                }}
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
                    <span className={styles.solvedStatus}>
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
