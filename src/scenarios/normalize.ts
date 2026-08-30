import { Scenario, ScenarioCategory } from '../model/types';

export const SCENARIO_REVIEW_OWNERS: Record<ScenarioCategory, string> = {
  'Core / Classic': 'Core Systems',
  'Social & Messaging': 'Social Systems',
  'Streaming & Media': 'Media Systems',
  'E-Commerce & Payments': 'Commerce Systems',
  'Search & Discovery': 'Search Systems',
  'Infrastructure & Platform': 'Platform Systems',
  'Data & Analytics': 'Data Systems',
  'Auth & Security': 'Security Systems',
  'IoT & Edge': 'Edge Systems',
  Gaming: 'Realtime Systems',
  'ML / AI Infrastructure': 'ML Systems',
  Collaboration: 'Collaboration Systems',
  'Maps & Geolocation': 'Geo Systems',
  Communication: 'Communication Systems',
  'Content & Publishing': 'Content Systems',
};

function inferSourceType(title: string, organization: string): NonNullable<Scenario['sources'][number]['sourceType']> {
  const value = `${title} ${organization}`.toLowerCase();
  if (/rfc|standard|specification|w3c|ietf|oasis/.test(value)) return 'standard';
  if (/paper|sosp|sigcomm|vldb|usenix|arxiv|proceedings/.test(value)) return 'paper';
  if (/engineering|documentation|docs|developer|architecture|aws|google|microsoft|cloudflare|netflix|uber|meta|discord|slack/.test(value)) return 'official';
  return 'secondary';
}

export function normalizeScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    reviewOwner: SCENARIO_REVIEW_OWNERS[scenario.category],
    contentReviewedOn: '2026-08-30',
    approximationNotes: scenario.approximationNotes || [
      'The reference graph is one educational answer. SysSim models component-level latency, capacity, routing, cache, queue, and failure behavior; it does not reproduce every vendor feature or distributed protocol named in the prompt.',
      ...(scenario.trafficPreset.baseQps > 50_000
        ? [`The ${scenario.constraints.targetQps.toLocaleString()} QPS design target is scaled to the simulator's 50,000 QPS operating ceiling for experiments.`]
        : []),
    ],
    trafficPreset: { ...scenario.trafficPreset, baseQps: Math.min(50_000, scenario.trafficPreset.baseQps) },
    sources: scenario.sources.map((source) => ({
      ...source,
      url: source.url?.replace(/^http:\/\//, 'https://'),
      sourceType: source.sourceType || inferSourceType(source.title, source.authorOrOrg),
      supports: source.supports || `Background evidence for the terminology, trade-offs, or architecture discussion in “${scenario.title}”.`,
      lastVerifiedOn: source.lastVerifiedOn || '2026-08-30',
    })),
  };
}
