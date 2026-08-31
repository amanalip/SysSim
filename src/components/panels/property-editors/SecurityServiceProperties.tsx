import type {
  AuthServiceConfig,
  ComponentConfigPatch,
  EncryptionServiceConfig,
} from '../../../model/types';
import styles from '../PropertiesPanel.module.css';

interface Props {
  config: AuthServiceConfig | EncryptionServiceConfig;
  update: (id: string, patch: ComponentConfigPatch) => void;
}

export function SecurityServiceProperties({ config, update }: Props) {
  if (config.type === 'auth_service') {
    return (
      <>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Token Type</label>
          <select
            className={styles.select}
            value={config.tokenType}
            onChange={(event) =>
              update(config.id, { tokenType: event.target.value as AuthServiceConfig['tokenType'] })
            }
          >
            <option value="JWT">JWT (JSON Web Token)</option>
            <option value="Paseto">Paseto (Platform-Agnostic Security Tokens)</option>
            <option value="Session">Opaque Session ID</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Validation Latency (ms)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            className={styles.input}
            value={config.validationLatencyMs}
            onChange={(event) =>
              update(config.id, {
                validationLatencyMs: Math.max(0, Number(event.target.value) || 0),
              })
            }
          />
        </div>
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabel}>
            <span>Token TTL (Minutes)</span>
            <span className={styles.fieldValueBadge}>{config.ttlMinutes}m</span>
          </div>
          <input
            type="number"
            className={styles.input}
            value={config.ttlMinutes}
            onChange={(event) =>
              update(config.id, { ttlMinutes: parseInt(event.target.value, 10) || 60 })
            }
          />
          <p className={styles.fieldHint}>
            TTL is retained as diagram metadata; request token age and expiry are not modeled.
          </p>
        </div>
        {config.tokenType === 'Session' && (
          <>
            <div className={styles.fieldGroup}>
              <button
                type="button"
                className={`${styles.actionBtn} ${config.sessionCacheEnabled ? styles.coalescingActive : ''}`}
                aria-pressed={config.sessionCacheEnabled}
                onClick={() =>
                  update(config.id, { sessionCacheEnabled: !config.sessionCacheEnabled })
                }
              >
                Session cache {config.sessionCacheEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {config.sessionCacheEnabled && (
              <>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Session Cache Hit Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={styles.input}
                    value={config.sessionCacheHitRatePercent}
                    onChange={(event) =>
                      update(config.id, {
                        sessionCacheHitRatePercent: Math.min(
                          100,
                          Math.max(0, Number(event.target.value) || 0),
                        ),
                      })
                    }
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Session Cache Latency (ms)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={styles.input}
                    value={config.sessionCacheLatencyMs}
                    onChange={(event) =>
                      update(config.id, {
                        sessionCacheLatencyMs: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                  />
                </div>
              </>
            )}
          </>
        )}
      </>
    );
  }

  return (
    <>
      <p className={styles.fieldHint}>
        This component estimates processing latency only. It does not perform encryption, inspect
        key material, or validate cryptographic security.
      </p>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Cipher Algorithm</label>
        <select
          className={styles.select}
          value={config.algorithm}
          onChange={(event) =>
            update(config.id, {
              algorithm: event.target.value as EncryptionServiceConfig['algorithm'],
            })
          }
        >
          <option value="AES-256-GCM">AES-256-GCM (Authenticated)</option>
          <option value="ChaCha20-Poly1305">ChaCha20-Poly1305 (Fast Stream)</option>
          <option value="RSA-4096">RSA-4096 (Asymmetric PKI)</option>
        </select>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>AES Baseline Overhead (ms)</label>
        <input
          type="number"
          min="0"
          step="0.1"
          className={styles.input}
          value={config.overheadLatencyMs}
          onChange={(event) =>
            update(config.id, { overheadLatencyMs: Math.max(0, Number(event.target.value) || 0) })
          }
        />
      </div>
      <div className={styles.fieldGroup}>
        <div className={styles.fieldLabel}>
          <span>Key Rotation (Days)</span>
          <span className={styles.fieldValueBadge}>{config.keyRotationDays}d</span>
        </div>
        <input
          type="number"
          className={styles.input}
          value={config.keyRotationDays}
          onChange={(event) =>
            update(config.id, { keyRotationDays: parseInt(event.target.value, 10) || 90 })
          }
        />
        <p className={styles.fieldHint}>
          Rotation is diagram metadata; no scheduled rotation event or security guarantee is
          simulated.
        </p>
      </div>
    </>
  );
}
