import type { Scenario, ScenarioCategory } from '../model/types';
import { normalizeScenario } from './normalize';

export const SCENARIO_CATEGORIES: ScenarioCategory[] = [
  'Core / Classic',
  'Social & Messaging',
  'Streaming & Media',
  'E-Commerce & Payments',
  'Search & Discovery',
  'Infrastructure & Platform',
  'Data & Analytics',
  'Auth & Security',
  'IoT & Edge',
  'Gaming',
  'ML / AI Infrastructure',
  'Collaboration',
  'Maps & Geolocation',
  'Communication',
  'Content & Publishing',
];

const categoryLoaders: Array<() => Promise<Scenario[]>> = [
  () => import('./core').then((module) => module.CORE_SCENARIOS),
  () => import('./social').then((module) => module.SOCIAL_SCENARIOS),
  () => import('./streaming').then((module) => module.STREAMING_SCENARIOS),
  () => import('./ecommerce').then((module) => module.ECOMMERCE_SCENARIOS),
  () => import('./search').then((module) => module.SEARCH_SCENARIOS),
  () => import('./infrastructure').then((module) => module.INFRASTRUCTURE_SCENARIOS),
  () => import('./data').then((module) => module.DATA_SCENARIOS),
  () => import('./auth').then((module) => module.AUTH_SCENARIOS),
  () => import('./iot').then((module) => module.IOT_SCENARIOS),
  () => import('./gaming').then((module) => module.GAMING_SCENARIOS),
  () => import('./ml').then((module) => module.ML_SCENARIOS),
  () => import('./collab').then((module) => module.COLLAB_SCENARIOS),
  () => import('./maps').then((module) => module.MAPS_SCENARIOS),
  () => import('./communication').then((module) => module.COMMUNICATION_SCENARIOS),
  () => import('./content').then((module) => module.CONTENT_SCENARIOS),
];

let catalogPromise: Promise<Scenario[]> | undefined;

/** Loads scenario content only when the scenario workspace is opened. */
export function loadScenarioCatalog(): Promise<Scenario[]> {
  catalogPromise ??= Promise.all(categoryLoaders.map((load) => load())).then((groups) =>
    groups.flat().map(normalizeScenario),
  );
  return catalogPromise;
}
