# Illustrative cost estimation

SysSim cost output uses an internal illustrative baseline effective 2026-08-01 for a generic US reference region in USD. It is not connected to live AWS, Google Cloud, or Azure price data and is not a billing quote.

Pricing tables, provider profile mappings, replica accounting, spot eligibility, bandwidth assumptions, and aggregation formulas live in `src/analysis/cost-estimator.ts`, outside React. Provider names identify conceptual profiles, not price-equivalent offerings. Database host count includes configured read replicas. The optional 60% spot reduction applies only to profiles explicitly marked eligible, currently app servers and background workers; managed databases, caches, networking, messaging, and other services remain undiscounted.

The model combines fixed illustrative monthly component units with outbound workload volume at an illustrative USD 0.08 per decimal GB. It omits tiering, storage capacity, IOPS, requests, regional transfer, taxes, commitments, free tiers, support, managed-service details, and negotiated discounts. Always replace it with current dated provider estimates before making purchasing decisions.
