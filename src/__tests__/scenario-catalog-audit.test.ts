import { describe, expect, it } from 'vitest';
import { ALL_SCENARIOS, SCENARIO_CATEGORIES, SCENARIO_REVIEW_OWNERS } from '../scenarios';
import { auditScenarioCatalog } from '../scenarios/audit';

describe('scenario catalog audit', () => {
  it('validates all 101 scenarios as one catalog', () => {
    expect(ALL_SCENARIOS).toHaveLength(101);
    expect(auditScenarioCatalog(ALL_SCENARIOS)).toEqual([]);
  });

  it('assigns an owner to every scenario category', () => {
    expect(Object.keys(SCENARIO_REVIEW_OWNERS).sort()).toEqual([...SCENARIO_CATEGORIES].sort());
  });

  it('detects duplicates, invalid URLs, unsupported protocols, and missing content', () => {
    const broken = structuredClone(ALL_SCENARIOS.slice(0, 2));
    broken[1].id = broken[0].id;
    broken[1].slug = broken[0].slug;
    broken[1].sources[0].url = 'javascript:alert(1)';
    broken[1].sources[0].supports = '';
    broken[1].referenceDesign.edges[0].data.protocol = 'SMTP' as never;
    const paths = auditScenarioCatalog(broken).map((issue) => issue.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'id',
        'slug',
        'sources[0].url',
        'sources[0].supports',
        'referenceDesign.edges[0].protocol',
      ]),
    );
  });
});
