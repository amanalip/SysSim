import { ReverseProxyConfig } from '../../model/types';

interface Reservation {
  id: number;
  endAtMs: number;
}

export class ReverseProxyModel {
  private reservations: Reservation[] = [];
  private sequence = 0;
  private rejected = 0;
  private compressedKbSaved = 0;
  private backpressureMs = 0;

  constructor(private config: ReverseProxyConfig) {}

  public updateConfig(config: ReverseProxyConfig): void {
    this.config = config;
  }

  public begin(
    nowMs: number,
    payloadKb: number,
  ): {
    accepted: boolean;
    reservationId?: number;
    latencyMs: number;
    outputPayloadKb: number;
    backpressureMs: number;
  } {
    this.reservations = this.reservations.filter((item) => item.endAtMs > nowMs);
    if (this.reservations.length >= Math.max(1, this.config.maxConnections)) {
      this.rejected++;
      return { accepted: false, latencyMs: 1, outputPayloadKb: payloadKb, backpressureMs: 0 };
    }
    const reservationId = ++this.sequence;
    const compressionLatency = this.config.enableCompression ? Math.max(0, payloadKb) * 0.02 : 0;
    const outputPayloadKb = this.config.enableCompression ? payloadKb * 0.6 : payloadKb;
    this.compressedKbSaved += Math.max(0, payloadKb - outputPayloadKb);
    const overflowKb = this.config.bufferingEnabled
      ? Math.max(0, outputPayloadKb - this.config.bufferSizeKb)
      : outputPayloadKb;
    const bandwidthKbPerMs = Math.max(0.001, (this.config.upstreamBandwidthMbps * 125) / 1000);
    const backpressureMs = overflowKb / bandwidthKbPerMs;
    this.backpressureMs += backpressureMs;
    const latencyMs = 1 + compressionLatency + backpressureMs;
    this.reservations.push({ id: reservationId, endAtMs: nowMs + Math.max(1, latencyMs) });
    return { accepted: true, reservationId, latencyMs, outputPayloadKb, backpressureMs };
  }

  public finish(
    reservationId: number | undefined,
    nowMs: number,
    downstreamLatencyMs: number,
  ): void {
    const reservation = this.reservations.find((item) => item.id === reservationId);
    if (reservation) reservation.endAtMs = nowMs + Math.max(1, downstreamLatencyMs);
  }

  public getMetrics(nowMs: number) {
    this.reservations = this.reservations.filter((item) => item.endAtMs > nowMs);
    return {
      activeConnections: this.reservations.length,
      rejected: this.rejected,
      compressedKbSaved: this.compressedKbSaved,
      backpressureMs: this.backpressureMs,
    };
  }

  public reset(): void {
    this.reservations = [];
    this.sequence = 0;
    this.rejected = 0;
    this.compressedKbSaved = 0;
    this.backpressureMs = 0;
  }
}
