import { Scenario, ScenarioCategory } from '../model/types';
import { CORE_SCENARIOS } from './core';
import { SOCIAL_SCENARIOS } from './social';
import { STREAMING_SCENARIOS } from './streaming';
import { ECOMMERCE_SCENARIOS } from './ecommerce';
import { SEARCH_SCENARIOS } from './search';
import { INFRASTRUCTURE_SCENARIOS } from './infrastructure';
import { DATA_SCENARIOS } from './data';
import { AUTH_SCENARIOS } from './auth';
import { IOT_SCENARIOS } from './iot';
import { GAMING_SCENARIOS } from './gaming';
import { ML_SCENARIOS } from './ml';
import { COLLAB_SCENARIOS } from './collab';
import { MAPS_SCENARIOS } from './maps';
import { COMMUNICATION_SCENARIOS } from './communication';
import { CONTENT_SCENARIOS } from './content';

export const ALL_SCENARIOS: Scenario[] = [
  ...CORE_SCENARIOS,
  ...SOCIAL_SCENARIOS,
  ...STREAMING_SCENARIOS,
  ...ECOMMERCE_SCENARIOS,
  ...SEARCH_SCENARIOS,
  ...INFRASTRUCTURE_SCENARIOS,
  ...DATA_SCENARIOS,
  ...AUTH_SCENARIOS,
  ...IOT_SCENARIOS,
  ...GAMING_SCENARIOS,
  ...ML_SCENARIOS,
  ...COLLAB_SCENARIOS,
  ...MAPS_SCENARIOS,
  ...COMMUNICATION_SCENARIOS,
  ...CONTENT_SCENARIOS,
];

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

export function getScenarioById(id: number): Scenario | undefined {
  return ALL_SCENARIOS.find((s) => s.id === id);
}

export function getScenarioBySlug(slug: string): Scenario | undefined {
  return ALL_SCENARIOS.find((s) => s.slug === slug);
}
