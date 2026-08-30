# Illustrative cost estimation

SysSim cost output uses an internal illustrative baseline effective 2026-08-01 for a generic US reference region in USD. It is not connected to live AWS, Google Cloud, or Azure price data and is not a billing quote.

Pricing tables, provider profile mappings, replica accounting, spot eligibility, bandwidth assumptions, and aggregation formulas live in `src/analysis/cost-estimator.ts`, outside React. Every SysSim component type has one explicit mapping for AWS, Google Cloud, and Azure; the table also records a short rationale explaining whether that component is represented as general-purpose compute, a managed service, capacity storage, a request-priced service, or an external client. Provider names identify conceptual profiles, not price-equivalent offerings.

The total is the sum of five independently displayed drivers:

1. Managed-service or primary-instance baseline.
2. Redundancy cost for replicas beyond the primary. SQL read replicas are included.
3. Allocated storage capacity using the profile's documented illustrative GB allowance and rate.
4. Request charges using monthly millions of requests derived from the active workload.
5. Outbound bandwidth using the response-payload assumption and USD 0.08 per decimal GB.

The optional 60% spot reduction applies only to profiles explicitly marked eligible: app servers, background workers, and self-managed reverse proxies. Managed databases, caches, queues, serverless functions, security services, storage, and network services remain undiscounted. SysSim intentionally exposes only USD because it has no live, dated foreign-exchange source; presenting converted currencies would add false precision.

The model still omits provider tiers, IOPS, regional topology, taxes, commitments, free tiers, support plans, and negotiated discounts. It is an educational planning estimate, never a billing quote. Always replace it with current provider calculators and measured usage before making purchasing decisions.
