import { SIMULATION_ENGINE_VERSION } from '../platform/build-info';

export interface EngineCompatibility {
  status: 'compatible' | 'warning' | 'rejected';
  message: string;
}

function major(version: string): number | null {
  const value = Number.parseInt(version.split('.')[0] || '', 10);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

export function compareSimulationEngineVersions(
  leftVersion: string | undefined,
  rightVersion: string | undefined = SIMULATION_ENGINE_VERSION,
): EngineCompatibility {
  if (!leftVersion || !rightVersion)
    return {
      status: 'warning',
      message: 'One result has no engine version; compare trends only.',
    };
  const leftMajor = major(leftVersion);
  const rightMajor = major(rightVersion);
  if (leftMajor === null || rightMajor === null)
    return { status: 'rejected', message: 'An engine version is malformed.' };
  if (leftMajor !== rightMajor)
    return {
      status: 'rejected',
      message: `Engine ${leftVersion} and ${rightVersion} use incompatible major models.`,
    };
  if (leftVersion !== rightVersion)
    return {
      status: 'warning',
      message: `Engine versions differ (${leftVersion} vs ${rightVersion}); numerical behavior may have changed.`,
    };
  return { status: 'compatible', message: `Both results use engine ${leftVersion}.` };
}
