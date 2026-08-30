# Capacity calculator contract

The capacity worksheet executes pure deterministic formulas. It is a planning aid, not a production sizing guarantee. All storage uses decimal SI units: 1 KB is 1,000 bytes, 1 GB is 1,000,000,000 bytes, 1 TB is 1,000 GB. Bandwidth uses decimal Mbps.

Total QPS means reads plus writes. For a read/write ratio `R:1`, write QPS is `total QPS ÷ (R + 1)` and read QPS is the remainder. The stored payload is the write request body. Read requests, read responses, and write responses have independent inputs.

## Formulas

- Daily new data GB = `write QPS × stored payload KB × 86,400 ÷ 1,000,000`.
- Retained storage TB = daily GB × retention days ÷ 1,000, then multiplied by indexing and metadata overhead, storage compression ratio, annual growth reserve, and replication factor.
- Inbound Mbps = `(write QPS × write request KB + read QPS × read request KB) × 8 ÷ 1,000`.
- Outbound Mbps = `(read QPS × read response KB + write QPS × write response KB) × 8 ÷ 1,000`.
- Required server QPS = total QPS × `(1 + headroom + failover reserve)`.
- Usable capacity per server = rated server QPS × target utilization. Server count is the ceiling of required divided by usable capacity.
- DB connections use Little's Law: `QPS × average service time seconds ÷ target utilization`.
- Cache RAM = daily new data GB × working-set days × hot-set percentage × cache compression ratio.

Storage, servers, cache, and connection outputs include low/expected/high sensitivity ranges. These are deliberately broad fixed bands where assumptions dominate; they are not probabilistic confidence intervals. “Assumptions JSON” downloads inputs, normalized assumptions, units, formulas, and ranges for review or version control.
