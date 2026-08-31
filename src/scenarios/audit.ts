import {
  validateArchitectureState,
  ArchitectureValidationError,
  SUPPORTED_EDGE_PROTOCOLS,
} from '../model/architecture-schema';
import { EDGE_PURPOSES } from '../model/edge-semantics';
import { Scenario } from '../model/types';

export interface ScenarioAuditIssue {
  scenarioId?: number;
  path: string;
  message: string;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVIEW_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function auditScenarioCatalog(scenarios: Scenario[]): ScenarioAuditIssue[] {
  const issues: ScenarioAuditIssue[] = [];
  const ids = new Set<number>();
  const slugs = new Set<string>();
  const add = (scenario: Scenario, path: string, message: string) =>
    issues.push({ scenarioId: scenario.id, path, message });

  for (const scenario of scenarios) {
    if (!Number.isInteger(scenario.id) || scenario.id <= 0)
      add(scenario, 'id', 'must be a positive integer');
    if (ids.has(scenario.id)) add(scenario, 'id', 'must be unique');
    ids.add(scenario.id);
    if (!SLUG.test(scenario.slug)) add(scenario, 'slug', 'must be a lowercase URL-safe slug');
    if (slugs.has(scenario.slug)) add(scenario, 'slug', 'must be unique');
    slugs.add(scenario.slug);
    if (!scenario.title.trim() || !scenario.problemStatement.trim())
      add(scenario, 'content', 'title and problem statement are required');
    if (!scenario.reviewOwner?.trim())
      add(scenario, 'reviewOwner', 'category review ownership is required');
    if (!scenario.contentReviewedOn || !REVIEW_DATE.test(scenario.contentReviewedOn))
      add(scenario, 'contentReviewedOn', 'a YYYY-MM-DD review date is required');
    if (!scenario.approximationNotes?.length)
      add(scenario, 'approximationNotes', 'implemented-behavior limitations must be disclosed');
    if (
      !scenario.hints.length ||
      scenario.hints.some((hint, index) => hint.step !== index + 1 || !hint.hint.trim())
    )
      add(scenario, 'hints', 'steps must be contiguous and non-empty');
    if (
      !scenario.discussionPoints.length ||
      scenario.discussionPoints.some((item) => !item.question.trim() || !item.answer.trim())
    )
      add(scenario, 'discussionPoints', 'questions and answers are required');

    const { targetQps, dataSizeGb, maxP99LatencyMs, availabilitySlaPercent } = scenario.constraints;
    if (!(targetQps > 0 && targetQps <= 100_000_000))
      add(
        scenario,
        'constraints.targetQps',
        'must be in requests/second and within 1..100,000,000',
      );
    if (!(dataSizeGb > 0 && dataSizeGb <= 1_000_000_000))
      add(scenario, 'constraints.dataSizeGb', 'must be decimal GB and within 1..1,000,000,000');
    if (!(maxP99LatencyMs > 0 && maxP99LatencyMs <= 60_000))
      add(scenario, 'constraints.maxP99LatencyMs', 'must be milliseconds and within 1..60,000');
    if (!(availabilitySlaPercent >= 90 && availabilitySlaPercent <= 100))
      add(scenario, 'constraints.availabilitySlaPercent', 'must be a percentage within 90..100');
    if (!(scenario.trafficPreset.baseQps >= 0 && scenario.trafficPreset.baseQps <= 50_000))
      add(
        scenario,
        'trafficPreset.baseQps',
        'must fit the simulator operating range 0..50,000 QPS',
      );

    try {
      validateArchitectureState(scenario.referenceDesign);
    } catch (error) {
      const detail =
        error instanceof ArchitectureValidationError ? error.issues.join('; ') : String(error);
      add(scenario, 'referenceDesign', detail);
    }
    const nodeIds = new Set(scenario.referenceDesign.nodes.map((node) => node.id));
    for (const [index, node] of scenario.referenceDesign.nodes.entries()) {
      if (node.data.config.id !== node.id)
        add(scenario, `referenceDesign.nodes[${index}]`, 'node id and config id must agree');
    }
    for (const [index, edge] of scenario.referenceDesign.edges.entries()) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target))
        add(scenario, `referenceDesign.edges[${index}]`, 'edge endpoints must exist');
      if (!SUPPORTED_EDGE_PROTOCOLS.includes(edge.data.protocol))
        add(scenario, `referenceDesign.edges[${index}].protocol`, 'protocol is unsupported');
      if (!EDGE_PURPOSES.includes(edge.data.purpose || 'request'))
        add(scenario, `referenceDesign.edges[${index}].purpose`, 'edge purpose is unsupported');
    }

    if (!scenario.sources.length) add(scenario, 'sources', 'at least one source is required');
    for (const [index, source] of scenario.sources.entries()) {
      if (!source.title.trim() || !source.authorOrOrg.trim())
        add(scenario, `sources[${index}]`, 'accessible title and organization are required');
      if (!source.supports?.trim())
        add(scenario, `sources[${index}].supports`, 'source-to-claim note is required');
      if (!source.sourceType)
        add(
          scenario,
          `sources[${index}].sourceType`,
          'source provenance classification is required',
        );
      if (!source.lastVerifiedOn || !REVIEW_DATE.test(source.lastVerifiedOn))
        add(scenario, `sources[${index}].lastVerifiedOn`, 'last verified date is required');
      if (source.url) {
        try {
          const url = new URL(source.url);
          if (url.protocol !== 'https:')
            add(scenario, `sources[${index}].url`, 'external source URLs must use HTTPS');
        } catch {
          add(scenario, `sources[${index}].url`, 'must be a valid absolute URL');
        }
      }
    }
  }
  return issues;
}

export function assertScenarioCatalog(scenarios: Scenario[]): void {
  const issues = auditScenarioCatalog(scenarios);
  if (issues.length)
    throw new Error(
      issues
        .map((issue) => `scenario ${issue.scenarioId ?? '?'} ${issue.path}: ${issue.message}`)
        .join('\n'),
    );
}
