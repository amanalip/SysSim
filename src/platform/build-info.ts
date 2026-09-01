import { APPLICATION_VERSION } from '../model/architecture-schema';

export const SIMULATION_ENGINE_VERSION = '1.0.0';

export const BUILD_INFO = Object.freeze({
  applicationVersion: APPLICATION_VERSION,
  engineVersion: SIMULATION_ENGINE_VERSION,
  commit: typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : 'development',
  builtAt: typeof __BUILD_TIMESTAMP__ === 'string' ? __BUILD_TIMESTAMP__ : 'unknown',
});
