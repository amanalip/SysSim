import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const INFRASTRUCTURE_SCENARIOS: Scenario[] = [
  {
    id: 42,
    slug: 'api-rate-limiter',
    title: 'API Rate Limiter Service',
    category: 'Infrastructure & Platform',
    difficulty: 'Easy',
    problemStatement:
      'Design a high-throughput, low-latency API rate limiting middleware to protect backend services from abusive traffic, credential stuffing, and DoS attacks.',
    constraints: {
      targetQps: 100000,
      dataSizeGb: 50,
      maxP99LatencyMs: 3,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Select between Token Bucket, Leaky Bucket, and Sliding Window Counter algorithms.',
      },
      {
        step: 2,
        hint: 'Store per-client token buckets in an In-Memory Redis cluster using Lua scripts for atomic decrement.',
      },
      {
        step: 3,
        hint: 'Return HTTP 429 Too Many Requests with standard Retry-After and X-RateLimit headers upon throttling.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'API Client') },
        },
        {
          id: 'gw',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('api_gateway', 'gw', 'API Gateway') },
        },
        {
          id: 'limiter',
          type: 'customComponent',
          position: { x: 500, y: 150 },
          data: {
            config: createDefaultConfig('rate_limiter', 'limiter', 'Rate Limiter Middleware'),
          },
        },
        {
          id: 'redisLimiter',
          type: 'customComponent',
          position: { x: 740, y: 150 },
          data: {
            config: createDefaultConfig('redis_cache', 'redisLimiter', 'Token Bucket Redis'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'limiter', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'limiter', target: 'redisLimiter', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'What is the key advantage of the Sliding Window Counter algorithm over Fixed Window Counter?',
        answer:
          'Fixed Window Counter allows a traffic spike of 2x the limit at window boundaries; Sliding Window smoothly averages previous window counts to prevent boundary bursting.',
      },
      {
        question: 'How do you handle rate limiter failure (fail-open vs fail-closed)?',
        answer:
          'Most consumer APIs configure fail-open so that rate limiter cache outages do not take down legitimate business traffic, while security auth endpoints fail-closed.',
      },
    ],
    sources: [
      {
        title: 'Scaling Rate Limiting at Figma',
        authorOrOrg: 'Figma Engineering Blog',
        url: 'https://www.figma.com/blog/an-alternative-approach-to-rate-limiting/',
      },
      {
        title: 'System Design Interview: Design a Rate Limiter',
        authorOrOrg: 'Alex Xu (Volume 1, Chapter 4)',
        url: 'https://bytebytego.com',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 100000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 43,
    slug: 'push-notification-service',
    title: 'Distributed Notification System (APNs/FCM)',
    category: 'Infrastructure & Platform',
    difficulty: 'Medium',
    problemStatement:
      'Design an enterprise notification delivery platform sending millions of push notifications, transactional emails, and SMS alerts daily with rate limiting, templates, and delivery status tracking.',
    constraints: {
      targetQps: 40000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 40,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Decouple message submission from delivery dispatch via dedicated message queues per channel (push, email, SMS).',
      },
      {
        step: 2,
        hint: 'Use worker pools to batch requests to third-party providers (Apple APNs, Google FCM, SendGrid, Twilio).',
      },
      {
        step: 3,
        hint: 'Implement user opt-out settings and quiet hours suppression in an In-Memory cache.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'svc',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('app_server', 'svc', 'Internal Services') },
        },
        {
          id: 'notifyApi',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('app_server', 'notifyApi', 'Notification Gateway') },
        },
        {
          id: 'mq',
          type: 'customComponent',
          position: { x: 500, y: 150 },
          data: {
            config: createDefaultConfig('message_queue', 'mq', 'Notification Channel Queues'),
          },
        },
        {
          id: 'workers',
          type: 'customComponent',
          position: { x: 740, y: 150 },
          data: { config: createDefaultConfig('worker', 'workers', 'Provider Dispatch Workers') },
        },
        {
          id: 'db',
          type: 'customComponent',
          position: { x: 500, y: 280 },
          data: { config: createDefaultConfig('sql_db', 'db', 'Delivery Logs & Status DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'svc', target: 'notifyApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'notifyApi', target: 'mq', data: { protocol: 'pub/sub' } },
        { id: 'e3', source: 'mq', target: 'workers', data: { protocol: 'pub/sub' } },
        { id: 'e4', source: 'notifyApi', target: 'db', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you handle invalid device tokens returned by APNs / FCM?',
        answer:
          'Parse asynchronous feedback error responses and mark device tokens as inactive in the user device database to prevent recurring dead payloads.',
      },
      {
        question:
          'How do you prioritize critical security OTP codes over marketing blasts during queue backlogs?',
        answer:
          'Use separate high-priority Kafka topics/queues for transactional security OTP messages so bulk marketing messages never block authentication codes.',
      },
    ],
    sources: [
      {
        title: 'System Design Interview: Design a Notification System',
        authorOrOrg: 'Alex Xu (Volume 1, Chapter 10)',
        url: 'https://bytebytego.com',
      },
      {
        title: 'Building a Reliable Notification Infrastructure',
        authorOrOrg: 'Slack Engineering Blog',
        url: 'https://slack.engineering',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 40000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 44,
    slug: 'distributed-task-scheduler',
    title: 'Distributed Task Scheduler (Cron/Temporal)',
    category: 'Infrastructure & Platform',
    difficulty: 'Medium',
    problemStatement:
      'Design a resilient distributed cron and task scheduling platform capable of executing millions of recurring and delayed background jobs with exactly-once execution guarantees.',
    constraints: {
      targetQps: 25000,
      dataSizeGb: 1000,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Store scheduled task execution timestamps in a Redis Sorted Set or Cassandra time-bucketed partition.',
      },
      {
        step: 2,
        hint: 'Use leader election (Raft / Zookeeper) for timer dispatchers with worker pull pools.',
      },
      { step: 3, hint: 'Protect tasks against duplicate runs using distributed idempotency keys.' },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Job Submitter') },
        },
        {
          id: 'schedApi',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('app_server', 'schedApi', 'Scheduler Coordinator') },
        },
        {
          id: 'timeStore',
          type: 'customComponent',
          position: { x: 500, y: 80 },
          data: {
            config: createDefaultConfig('redis_cache', 'timeStore', 'Scheduled Task Timers (ZSET)'),
          },
        },
        {
          id: 'taskQueue',
          type: 'customComponent',
          position: { x: 500, y: 220 },
          data: { config: createDefaultConfig('task_queue', 'taskQueue', 'Ready Task Queue') },
        },
        {
          id: 'workers',
          type: 'customComponent',
          position: { x: 740, y: 220 },
          data: { config: createDefaultConfig('worker', 'workers', 'Execution Worker Fleet') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'schedApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'schedApi', target: 'timeStore', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'schedApi', target: 'taskQueue', data: { protocol: 'pub/sub' } },
        { id: 'e4', source: 'taskQueue', target: 'workers', data: { protocol: 'pub/sub' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you poll scheduled tasks from Redis ZSET without race conditions between multiple scheduler instances?',
        answer:
          'Use Redis Lua scripts: ZRANGEBYSCORE to find tasks where timestamp <= now, followed immediately by ZREM inside the same atomic Lua script.',
      },
      {
        question: 'How do you handle worker crashes mid-task execution?',
        answer:
          'Workers maintain a heartbeat lock on the active job; if the heartbeat times out, the scheduler moves the task back to the ready queue.',
      },
    ],
    sources: [
      {
        title: 'Temporal: Distributed Orchestration and Scheduling Engine',
        authorOrOrg: 'Maxim Fateev (Temporal.io)',
        url: 'https://temporal.io',
      },
      {
        title: 'Building a Distributed Job Scheduler',
        authorOrOrg: 'Airbnb Engineering (Chronos Paper)',
        url: 'https://medium.com/airbnb-engineering',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 25000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 45,
    slug: 'api-gateway',
    title: 'API Gateway & Reverse Proxy (Kong/Envoy)',
    category: 'Infrastructure & Platform',
    difficulty: 'Medium',
    problemStatement:
      'Design a unified API Gateway providing dynamic SSL termination, JWT authentication verification, circuit breaking, path-based routing, and centralized rate limiting for microservice backends.',
    constraints: {
      targetQps: 80000,
      dataSizeGb: 100,
      maxP99LatencyMs: 10,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Utilize an asynchronous event-driven proxy core (such as Envoy, Nginx, or Netty).',
      },
      {
        step: 2,
        hint: 'Verify cryptographically signed JWT tokens locally in the gateway without calling the central auth database.',
      },
      {
        step: 3,
        hint: 'Synchronize dynamic upstream routing rules via control plane APIs (e.g. Envoy xDS).',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'External Clients') },
        },
        {
          id: 'gw',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('api_gateway', 'gw', 'Envoy API Gateway') },
        },
        {
          id: 'authCache',
          type: 'customComponent',
          position: { x: 500, y: 70 },
          data: {
            config: createDefaultConfig('redis_cache', 'authCache', 'Token Revocation List'),
          },
        },
        {
          id: 'svc1',
          type: 'customComponent',
          position: { x: 500, y: 180 },
          data: { config: createDefaultConfig('app_server', 'svc1', 'User Microservice') },
        },
        {
          id: 'svc2',
          type: 'customComponent',
          position: { x: 500, y: 280 },
          data: { config: createDefaultConfig('app_server', 'svc2', 'Order Microservice') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'authCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'gw', target: 'svc1', data: { protocol: 'gRPC' } },
        { id: 'e4', source: 'gw', target: 'svc2', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'Why verify stateless JWT tokens at the Gateway instead of passing raw tokens to individual backend services?',
        answer:
          'Verifying at the Gateway terminates untrusted requests early, handles token decryption once, and forwards validated user identity headers internally via fast gRPC.',
      },
      {
        question: 'How does dynamic service discovery integrate into the Gateway?',
        answer:
          'The Gateway connects to a Service Registry (Consul, Eureka, or Kubernetes DNS) and automatically routes traffic to newly spun-up healthy backend replicas.',
      },
    ],
    sources: [
      {
        title: 'Envoy Architecture Overview',
        authorOrOrg: 'Matt Klein (Lyft / CNCF)',
        url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/arch_overview',
      },
      {
        title: 'Pattern: API Gateway',
        authorOrOrg: 'Chris Richardson (Microservices.io)',
        url: 'https://microservices.io/patterns/apigateway.html',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 80000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 46,
    slug: 'load-balancer',
    title: 'Software Load Balancer (Maglev/HAProxy)',
    category: 'Infrastructure & Platform',
    difficulty: 'Easy',
    problemStatement:
      'Design a Layer 4 and Layer 7 load balancer distributing network traffic across backend server pools with health probing, connection draining, and zero packet disruption during scaling.',
    constraints: {
      targetQps: 150000,
      dataSizeGb: 50,
      maxP99LatencyMs: 2,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Use Layer 4 (TCP/UDP) Maglev consistent hashing for extreme packet throughput and Layer 7 for HTTP path routing.',
      },
      {
        step: 2,
        hint: 'Send periodic active health checks (HTTP /healthz) to remove failed backend instances from the routing table.',
      },
      {
        step: 3,
        hint: 'Support graceful connection draining (draining active connections for 30s before terminating old pods).',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Internet Traffic') },
        },
        {
          id: 'lb',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('load_balancer', 'lb', 'Maglev L4 / L7 LB') },
        },
        {
          id: 'srv1',
          type: 'customComponent',
          position: { x: 520, y: 70 },
          data: { config: createDefaultConfig('app_server', 'srv1', 'Backend Server 1') },
        },
        {
          id: 'srv2',
          type: 'customComponent',
          position: { x: 520, y: 150 },
          data: { config: createDefaultConfig('app_server', 'srv2', 'Backend Server 2') },
        },
        {
          id: 'srv3',
          type: 'customComponent',
          position: { x: 520, y: 230 },
          data: { config: createDefaultConfig('app_server', 'srv3', 'Backend Server 3') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'lb', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'lb', target: 'srv1', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'lb', target: 'srv2', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'lb', target: 'srv3', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is the key difference between Layer 4 and Layer 7 load balancing?',
        answer:
          'L4 operates at TCP/UDP level forwarding packets without inspecting payload; L7 terminates HTTP connections to inspect headers, cookies, and URI paths for smart routing.',
      },
      {
        question:
          'How does Google Maglev ensure consistent connection affinity without maintaining global shared state?',
        answer:
          'Maglev uses a specialized consistent hashing lookup table populated per backend; packet 5-tuples hash to the exact same backend across all Maglev instances.',
      },
    ],
    sources: [
      {
        title: 'Maglev: A Fast and Reliable Software Network Load Balancer',
        authorOrOrg: 'Eisenbud et al. (Google NSDI 2016)',
        url: 'https://research.google/pubs/pub44824/',
      },
      {
        title: 'Introduction to Modern Network Load Balancing and Proxying',
        authorOrOrg: 'Matt Klein',
        url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/intro/terminology',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 150000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 47,
    slug: 'cdn-system-design',
    title: 'Content Delivery Network Edge Infrastructure',
    category: 'Infrastructure & Platform',
    difficulty: 'Medium',
    problemStatement:
      'Design a geo-distributed CDN edge caching network that minimizes origin egress costs, supports dynamic content acceleration (DSA), and provides automated TLS certificate management.',
    constraints: {
      targetQps: 100000,
      dataSizeGb: 100000,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Deploy Anycast DNS and BGP routing to steer users to the nearest geographical Point of Presence.',
      },
      {
        step: 2,
        hint: 'Maintain connection pooling and TCP route optimization between Edge PoPs and Origin.',
      },
      {
        step: 3,
        hint: 'Support tiered caching with regional cache hubs to prevent origin overload.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Browser') },
        },
        {
          id: 'edge',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('cdn', 'edge', 'Edge PoP Cache') },
        },
        {
          id: 'shield',
          type: 'customComponent',
          position: { x: 500, y: 150 },
          data: { config: createDefaultConfig('reverse_proxy', 'shield', 'Regional Shield Cache') },
        },
        {
          id: 'origin',
          type: 'customComponent',
          position: { x: 740, y: 150 },
          data: { config: createDefaultConfig('object_storage', 'origin', 'Origin S3 Bucket') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'edge', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'edge', target: 'shield', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'shield', target: 'origin', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How does Dynamic Content Acceleration (DSA) speed up non-cacheable API requests?',
        answer:
          'DSA maintains pre-warmed persistent TCP/TLS connection pools between Edge PoPs and Origin, avoiding slow TLS handshakes over long public internet routes.',
      },
      {
        question:
          'How do you handle flash crowd cache stampedes on the edge for a brand new viral video?',
        answer:
          'Implement Request Collapsing (single-flight): the edge proxy lets only the first request fetch from the origin while queuing subsequent requests to serve from the resulting cache fill.',
      },
    ],
    sources: [
      {
        title: 'Akamai: How the Internet Works at Scale',
        authorOrOrg: 'Nygren et al. (ACM SIGOPS 2010)',
        url: 'https://dl.acm.org',
      },
      {
        title: 'Cloudflare Dynamic Acceleration Architecture',
        authorOrOrg: 'Cloudflare Blog',
        url: 'https://blog.cloudflare.com',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 100000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 48,
    slug: 'logging-monitoring-pipeline',
    title: 'Distributed Logging & Monitoring (Datadog)',
    category: 'Infrastructure & Platform',
    difficulty: 'Hard',
    problemStatement:
      'Design a telemetry ingestion pipeline processing millions of log lines, metrics, and distributed traces per second with sub-minute alert evaluation and 30-day retention queries.',
    constraints: {
      targetQps: 80000,
      dataSizeGb: 50000,
      maxP99LatencyMs: 50,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Collect logs and metrics via lightweight local host agents (Vector / OpenTelemetry).',
      },
      {
        step: 2,
        hint: 'Stream telemetry through Kafka into distributed stream processing engines (Flink / ClickHouse).',
      },
      {
        step: 3,
        hint: 'Separate hot time-series storage (ClickHouse / Prometheus) from cold compressed object storage (S3).',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'hosts',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('app_server', 'hosts', 'Application Fleets') },
        },
        {
          id: 'agent',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('app_server', 'agent', 'OTel Collector / Agent') },
        },
        {
          id: 'kafka',
          type: 'customComponent',
          position: { x: 500, y: 150 },
          data: { config: createDefaultConfig('message_queue', 'kafka', 'Telemetry Kafka Bus') },
        },
        {
          id: 'clickhouse',
          type: 'customComponent',
          position: { x: 740, y: 80 },
          data: { config: createDefaultConfig('timeseries_db', 'clickhouse', 'ClickHouse OLAP') },
        },
        {
          id: 's3Archive',
          type: 'customComponent',
          position: { x: 740, y: 220 },
          data: {
            config: createDefaultConfig('object_storage', 's3Archive', 'Cold S3 Compressed Logs'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'hosts', target: 'agent', data: { protocol: 'gRPC' } },
        { id: 'e2', source: 'agent', target: 'kafka', data: { protocol: 'pub/sub' } },
        { id: 'e3', source: 'kafka', target: 'clickhouse', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'kafka', target: 's3Archive', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'Why is ClickHouse preferred over Elasticsearch for modern high-volume log analytics?',
        answer:
          'ClickHouse columnar compression achieves 5x-10x higher compression and orders-of-magnitude faster aggregate queries (count, group by, p99) with lower CPU/RAM costs.',
      },
      {
        question:
          'How do you prevent logging systems from crashing when an application enters an infinite error loop?',
        answer:
          'Enforce local agent token-bucket rate limiting and log deduplication before emitting logs over the network.',
      },
    ],
    sources: [
      {
        title: 'ClickHouse Architecture for High-Volume Telemetry',
        authorOrOrg: 'Uber & Cloudflare Case Studies',
        url: 'https://clickhouse.com/blog',
      },
      {
        title: 'OpenTelemetry Specification and Architecture',
        authorOrOrg: 'CNCF OpenTelemetry Project',
        url: 'https://opentelemetry.io',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 80000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 49,
    slug: 'service-mesh',
    title: 'Service Mesh Architecture (Istio/Linkerd)',
    category: 'Infrastructure & Platform',
    difficulty: 'Hard',
    problemStatement:
      'Design a zero-trust service mesh deploying sidecar proxies alongside microservices to enforce mutual TLS (mTLS), dynamic traffic splitting (Canary / Blue-Green), and distributed telemetry.',
    constraints: {
      targetQps: 60000,
      dataSizeGb: 200,
      maxP99LatencyMs: 8,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Inject Envoy sidecar proxies transparently intercepting all container ingress and egress TCP traffic.',
      },
      {
        step: 2,
        hint: 'Distribute short-lived SPIFFE/SPIRE x509 cryptographic certificates for mTLS identity validation.',
      },
      {
        step: 3,
        hint: 'Push routing rules and canary traffic weights dynamically via a centralized control plane (Istiod).',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'appA',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('app_server', 'appA', 'Service A (Pod)') },
        },
        {
          id: 'sidecarA',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('reverse_proxy', 'sidecarA', 'Envoy Sidecar A') },
        },
        {
          id: 'sidecarB',
          type: 'customComponent',
          position: { x: 500, y: 150 },
          data: { config: createDefaultConfig('reverse_proxy', 'sidecarB', 'Envoy Sidecar B') },
        },
        {
          id: 'appB',
          type: 'customComponent',
          position: { x: 720, y: 150 },
          data: { config: createDefaultConfig('app_server', 'appB', 'Service B (Pod)') },
        },
        {
          id: 'controlPlane',
          type: 'customComponent',
          position: { x: 380, y: 280 },
          data: {
            config: createDefaultConfig('app_server', 'controlPlane', 'Istio Control Plane (xDS)'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'appA', target: 'sidecarA', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'sidecarA', target: 'sidecarB', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'sidecarB', target: 'appB', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'controlPlane', target: 'sidecarA', data: { protocol: 'gRPC' } },
        { id: 'e5', source: 'controlPlane', target: 'sidecarB', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is the CPU and latency overhead of running sidecar proxies?',
        answer:
          'Each sidecar hop adds ~1-2ms latency and 20-50MB RAM per pod; ambient/daemonset mesh models (e.g. Cilium eBPF) mitigate sidecar overhead.',
      },
      {
        question:
          'How is mTLS certificate rotation handled automatically without service downtime?',
        answer:
          'The sidecar requests renewed short-lived certificates (valid for 24h) from the local node agent over SDS (Secret Discovery Service) in the background without restarting connections.',
      },
    ],
    sources: [
      {
        title: 'Istio Architecture and Concepts',
        authorOrOrg: 'Istio / CNCF Community',
        url: 'https://istio.io/latest/docs/concepts/what-is-istio/',
      },
      {
        title: 'eBPF Service Mesh: The Future of Cloud-Native Networking',
        authorOrOrg: 'Thomas Graf (Isovalent / Cilium)',
        url: 'https://cilium.io',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 60000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 50,
    slug: 'feature-flag-system',
    title: 'Feature Flag & Experimentation System (LaunchDarkly)',
    category: 'Infrastructure & Platform',
    difficulty: 'Easy',
    problemStatement:
      'Design a real-time feature flag evaluation service that propagates rule changes to millions of client SDKs in sub-second time without querying a central database on every evaluation.',
    constraints: {
      targetQps: 50000,
      dataSizeGb: 100,
      maxP99LatencyMs: 5,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Push flag rules to client SDK memory via Server-Sent Events (SSE) or WebSockets.',
      },
      {
        step: 2,
        hint: 'Evaluate targeting rules (user IDs, countries, percentages) locally on the client without network calls.',
      },
      {
        step: 3,
        hint: 'Emit evaluation exposure events asynchronously to a stream processor for A/B test analytics.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'App Client SDK') },
        },
        {
          id: 'sseHub',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'sseHub', 'Flag Streaming SSE Hub') },
        },
        {
          id: 'flagStore',
          type: 'customComponent',
          position: { x: 520, y: 80 },
          data: { config: createDefaultConfig('redis_cache', 'flagStore', 'Rule Snapshot Cache') },
        },
        {
          id: 'flagDb',
          type: 'customComponent',
          position: { x: 520, y: 220 },
          data: { config: createDefaultConfig('sql_db', 'flagDb', 'Flag Ruleset DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'sseHub', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'sseHub', target: 'flagStore', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'sseHub', target: 'flagDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'Why evaluate feature flags locally in the SDK instead of sending an HTTP request per evaluation?',
        answer:
          'Local SDK evaluation executes in microseconds and guarantees 100% availability even if the central feature flag backend is unreachable.',
      },
      {
        question:
          'How do percentage rollouts (e.g. 10% of users) guarantee deterministic assignment across sessions?',
        answer:
          'Hash the User ID concatenated with the Flag Key (e.g., SHA1(userId + flagKey) % 100 < 10) for consistent deterministic assignment.',
      },
    ],
    sources: [
      {
        title: 'How LaunchDarkly Delivers Billions of Flag Evaluations Daily',
        authorOrOrg: 'LaunchDarkly Engineering',
        url: 'https://launchdarkly.com/blog/',
      },
      {
        title: 'Trustworthy Online Controlled Experiments',
        authorOrOrg: 'Ron Kohavi, Diane Tang, Ya Xu (Cambridge University Press)',
        url: 'https://experimentguide.com',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 50000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 51,
    slug: 'config-management',
    title: 'Distributed Configuration Management (Spring Cloud Config/ZooKeeper)',
    category: 'Infrastructure & Platform',
    difficulty: 'Easy',
    problemStatement:
      'Design a centralized configuration management system providing version-controlled properties, dynamic hot-reloading across server fleets, and encrypted secrets storage.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 50,
      maxP99LatencyMs: 10,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Store canonical configuration profiles in Git or etcd.' },
      {
        step: 2,
        hint: 'Broadcast change notification events over a lightweight pub/sub bus to notify connected service instances.',
      },
      {
        step: 3,
        hint: 'Cache local configuration copies in application memory for zero-latency lookups.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('app_server', 'c1', 'App Instance') },
        },
        {
          id: 'cfgServer',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'cfgServer', 'Config Server Cluster') },
        },
        {
          id: 'gitBackend',
          type: 'customComponent',
          position: { x: 540, y: 80 },
          data: { config: createDefaultConfig('object_storage', 'gitBackend', 'Config Git Repo') },
        },
        {
          id: 'cfgBus',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: { config: createDefaultConfig('pubsub', 'cfgBus', 'Spring Cloud Bus') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'cfgServer', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'cfgServer', target: 'gitBackend', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'cfgServer', target: 'cfgBus', data: { protocol: 'pub/sub' } },
        { id: 'e4', source: 'cfgBus', target: 'c1', data: { protocol: 'pub/sub' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you avoid crashing application fleets when a malformed configuration value is committed?',
        answer:
          'Implement schema validation gates and Canary configuration rollouts (updating 5% of instances first and checking error rate health).',
      },
      {
        question: 'How do services function during a total config server network partition?',
        answer:
          'Services keep running using their locally cached in-memory configuration snapshot without restart dependency.',
      },
    ],
    sources: [
      {
        title: 'Spring Cloud Config Documentation',
        authorOrOrg: 'VMware Tanzu / Spring Cloud',
        url: 'https://docs.spring.io/spring-cloud-config/docs/current/reference/html/',
      },
      {
        title: 'etcd: Distributed Reliable Key-Value Store for Shared Configuration',
        authorOrOrg: 'CoreOS / CNCF',
        url: 'https://etcd.io',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 20000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 52,
    slug: 'service-discovery',
    title: 'Service Discovery & Registration (Consul/Eureka)',
    category: 'Infrastructure & Platform',
    difficulty: 'Medium',
    problemStatement:
      'Design a service registry allowing microservice instances to dynamically register IP/port endpoints upon boot, maintain health heartbeats, and discover healthy peer nodes.',
    constraints: {
      targetQps: 40000,
      dataSizeGb: 50,
      maxP99LatencyMs: 10,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Utilize a distributed consensus datastore (Consul Raft / Zookeeper) for strong consistency or AP gossip mesh (Eureka).',
      },
      {
        step: 2,
        hint: 'Require services to send periodic TTL heartbeats (every 10s) to keep their registry records active.',
      },
      {
        step: 3,
        hint: 'Cache service address lists on client side with long polling / gRPC watch streams for instant topology updates.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'serviceInstance',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: {
            config: createDefaultConfig('app_server', 'serviceInstance', 'Microservice Pod'),
          },
        },
        {
          id: 'consulAgent',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'consulAgent', 'Local Consul Agent') },
        },
        {
          id: 'consulServer1',
          type: 'customComponent',
          position: { x: 540, y: 70 },
          data: {
            config: createDefaultConfig('app_server', 'consulServer1', 'Consul Leader (Raft)'),
          },
        },
        {
          id: 'consulServer2',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: { config: createDefaultConfig('app_server', 'consulServer2', 'Consul Follower') },
        },
      ],
      edges: [
        { id: 'e1', source: 'serviceInstance', target: 'consulAgent', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'consulAgent', target: 'consulServer1', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'consulServer1', target: 'consulServer2', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'What is the trade-off between Server-Side Discovery (AWS ALB) and Client-Side Discovery (Eureka/Consul)?',
        answer:
          'Client-side discovery eliminates a proxy network hop and supports smart client load balancing algorithms, but couples clients to the registry SDK.',
      },
      {
        question:
          'How does Eureka prevent mass instance unregistration during temporary network partitions?',
        answer:
          'Eureka uses Self-Preservation Mode: if renewal rate drops below 85%, Eureka halts instance evictions until connectivity stabilizes.',
      },
    ],
    sources: [
      {
        title: 'Consul Architecture Overview',
        authorOrOrg: 'HashiCorp Documentation',
        url: 'https://developer.hashicorp.com/consul/docs/architecture',
      },
      {
        title: 'Eureka at a Glance: Netflix Open Source',
        authorOrOrg: 'Netflix Technology Blog',
        url: 'https://netflixtechblog.com',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 40000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 53,
    slug: 'circuit-breaker',
    title: 'Circuit Breaker & Bulkhead Pattern (Resilience4j)',
    category: 'Infrastructure & Platform',
    difficulty: 'Easy',
    problemStatement:
      'Design a circuit breaker pattern middleware that isolates slow or failing downstream dependencies, preventing cascading failure across the entire microservice ecosystem.',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 20,
      maxP99LatencyMs: 5,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Model circuit states: CLOSED (normal), OPEN (tripped / fast failure), and HALF-OPEN (testing recovery).',
      },
      {
        step: 2,
        hint: 'Track downstream failure rates using a sliding ring buffer of the last 100 requests.',
      },
      {
        step: 3,
        hint: 'Provide immediate static fallback responses when the circuit is in OPEN state without network calls.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'caller',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('app_server', 'caller', 'API Caller Service') },
        },
        {
          id: 'cb',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('reverse_proxy', 'cb', 'Circuit Breaker Filter') },
        },
        {
          id: 'targetService',
          type: 'customComponent',
          position: { x: 540, y: 150 },
          data: {
            config: createDefaultConfig('app_server', 'targetService', 'Downstream Service'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'caller', target: 'cb', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'cb', target: 'targetService', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How does the HALF-OPEN state test downstream recovery safely?',
        answer:
          'It permits a small configurable probe batch of requests (e.g. 10 requests); if all succeed, it transitions back to CLOSED, otherwise trips back to OPEN.',
      },
      {
        question: 'What is the Bulkhead pattern and how does it complement Circuit Breakers?',
        answer:
          'Bulkhead isolates thread pools and connection limits per dependency so that an outage in one downstream service cannot exhaust worker threads for healthy services.',
      },
    ],
    sources: [
      {
        title: 'Release It!: Design and Deploy Production-Ready Software',
        authorOrOrg: 'Michael T. Nygard (Pragmatic Bookshelf)',
        url: 'https://pragprog.com/titles/mnee2/release-it-second-edition/',
      },
      {
        title: 'Resilience4j CircuitBreaker Documentation',
        authorOrOrg: 'Resilience4j Community',
        url: 'https://resilience4j.readme.io/docs/circuitbreaker',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 30000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 54,
    slug: 'distributed-tracing',
    title: 'Distributed Tracing (Jaeger/Zipkin)',
    category: 'Infrastructure & Platform',
    difficulty: 'Medium',
    problemStatement:
      'Design a distributed context propagation and request tracing system tracking cross-service calls across microservices, recording span latencies and identifying critical path bottlenecks.',
    constraints: {
      targetQps: 70000,
      dataSizeGb: 10000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Propagate W3C TraceContext headers (traceparent, tracestate) across all HTTP/gRPC boundaries.',
      },
      {
        step: 2,
        hint: 'Apply adaptive tail-based sampling to retain 100% of error and high-latency traces while sampling 1% of normal traces.',
      },
      { step: 3, hint: 'Store span DAG structures in Elasticsearch or ClickHouse.' },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'svcA',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('app_server', 'svcA', 'Frontend Service') },
        },
        {
          id: 'svcB',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('app_server', 'svcB', 'Order Service') },
        },
        {
          id: 'otelCollector',
          type: 'customComponent',
          position: { x: 500, y: 150 },
          data: {
            config: createDefaultConfig('app_server', 'otelCollector', 'OTel Collector (Sampler)'),
          },
        },
        {
          id: 'traceDb',
          type: 'customComponent',
          position: { x: 740, y: 150 },
          data: { config: createDefaultConfig('search_index', 'traceDb', 'Jaeger Elasticsearch') },
        },
      ],
      edges: [
        { id: 'e1', source: 'svcA', target: 'svcB', data: { protocol: 'gRPC' } },
        { id: 'e2', source: 'svcA', target: 'otelCollector', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'svcB', target: 'otelCollector', data: { protocol: 'gRPC' } },
        { id: 'e4', source: 'otelCollector', target: 'traceDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is Tail-Based Sampling superior to Head-Based Sampling for tracing?',
        answer:
          'Head sampling decides to record a trace before knowing whether it will fail; Tail sampling inspects the complete trace outcome before deciding whether to persist it.',
      },
      {
        question: 'How do you measure critical path latency in asynchronous fanout traces?',
        answer:
          'Build a Directed Acyclic Graph (DAG) of parent and child span start/end timestamps and calculate the longest sequential latency path.',
      },
    ],
    sources: [
      {
        title: 'Dapper, a Large-Scale Distributed Systems Tracing Infrastructure',
        authorOrOrg: 'Sigelman et al. (Google Technical Report 2010)',
        url: 'https://research.google/pubs/pub36356/',
      },
      {
        title: 'Mastering Distributed Tracing',
        authorOrOrg: 'Yuri Shkuro (Packt Publishing)',
        url: 'https://www.jaegertracing.io',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 70000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 55,
    slug: 'secrets-management',
    title: 'Secrets Management & Vault (HashiCorp Vault)',
    category: 'Infrastructure & Platform',
    difficulty: 'Medium',
    problemStatement:
      'Design a secure secrets management service supporting encrypted key-value storage, dynamic ephemeral credentials (e.g. database users with 1-hour TTLs), and automatic certificate issuance.',
    constraints: {
      targetQps: 15000,
      dataSizeGb: 200,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: "Encrypt secrets at rest using AES-256-GCM with master keys split via Shamir's Secret Sharing.",
      },
      {
        step: 2,
        hint: 'Generate dynamic short-lived credentials for database and cloud providers with auto-revocation.',
      },
      {
        step: 3,
        hint: 'Integrate with Kubernetes service accounts for workload identity authentication.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'appPod',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('app_server', 'appPod', 'App Workload') },
        },
        {
          id: 'vaultLb',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('load_balancer', 'vaultLb', 'Vault Load Balancer') },
        },
        {
          id: 'vaultLeader',
          type: 'customComponent',
          position: { x: 520, y: 150 },
          data: { config: createDefaultConfig('app_server', 'vaultLeader', 'Vault Leader Node') },
        },
        {
          id: 'vaultStorage',
          type: 'customComponent',
          position: { x: 780, y: 150 },
          data: {
            config: createDefaultConfig('nosql_db', 'vaultStorage', 'Encrypted Raft Storage'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'appPod', target: 'vaultLb', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'vaultLb', target: 'vaultLeader', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'vaultLeader', target: 'vaultStorage', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: "What is Shamir's Secret Sharing in Vault unsealing?",
        answer:
          'The master encryption key is split into N key shares; a threshold of M shares (e.g., 3 of 5) is mathematically required to reconstruct the unseal key.',
      },
      {
        question: 'Why are dynamic ephemeral credentials safer than static database passwords?',
        answer:
          'Dynamic credentials exist only for the duration of a lease (e.g. 1 hour) and are automatically destroyed upon expiration, drastically shrinking attack surface.',
      },
    ],
    sources: [
      {
        title: 'Vault Architecture Overview',
        authorOrOrg: 'HashiCorp Documentation',
        url: 'https://developer.hashicorp.com/vault/docs/internals/architecture',
      },
      {
        title: 'How Shamir’s Secret Sharing Works in Practice',
        authorOrOrg: 'Adi Shamir (Communications of the ACM 1979)',
        url: 'https://cacm.acm.org',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 15000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
];
