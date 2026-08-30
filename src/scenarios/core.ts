import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const CORE_SCENARIOS: Scenario[] = [
  {
    id: 1,
    slug: 'url-shortener',
    title: 'URL Shortener (TinyURL)',
    category: 'Core / Classic',
    difficulty: 'Easy',
    problemStatement:
      'Design a high-throughput URL shortening service like TinyURL or Bitly. The system must accept long URLs, generate compact 7-character aliases using Base62 encoding, and redirect users with minimal latency under read-heavy traffic.',
    constraints: {
      targetQps: 10000,
      dataSizeGb: 500,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Identify the read-to-write ratio. URL shorteners are heavily read-skewed (often 100:1 or 50:1).' },
      { step: 2, hint: 'Introduce an In-Memory Cache (Redis) before the database to serve top redirect targets in sub-5ms.' },
      { step: 3, hint: 'Use Base62 encoding (a-z, A-Z, 0-9) on a distributed unique ID generator or auto-increment counter to avoid hash collisions.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'User Browser') } },
        { id: 'lb1', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('load_balancer', 'lb1', 'Global Load Balancer') } },
        { id: 'app1', type: 'customComponent', position: { x: 520, y: 150 }, data: { config: createDefaultConfig('app_server', 'app1', 'URL Redirect Service') } },
        { id: 'cache1', type: 'customComponent', position: { x: 780, y: 80 }, data: { config: createDefaultConfig('redis_cache', 'cache1', 'URL Redis Cache') } },
        { id: 'db1', type: 'customComponent', position: { x: 780, y: 240 }, data: { config: createDefaultConfig('nosql_db', 'db1', 'URL Mapping Store') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'lb1', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'lb1', target: 'app1', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'app1', target: 'cache1', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'cache1', target: 'db1', data: { protocol: 'TCP', purpose: 'fallback' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you prevent Base62 short-code collision across multiple server instances?',
        answer: 'Pre-allocate ID ranges from a central counter or utilize Snowflake IDs, then convert the 64-bit integer to Base62 directly without hashing.',
      },
      {
        question: 'Should you use HTTP 301 Permanent Redirect or 302 Temporary Redirect?',
        answer: 'HTTP 301 reduces server load by letting browser cache redirects, but HTTP 302 allows click tracking and analytics on every visit.',
      },
    ],
    sources: [
      {
        title: 'System Design Interview: URL Shortener',
        authorOrOrg: 'Alex Xu (Volume 1, Chapter 8)',
        url: 'https://bytebytego.com',
      },
      {
        title: 'How Bitly Scales Real-time URL Lookups',
        authorOrOrg: 'Bitly Engineering Blog',
        url: 'https://bitly.com',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 10000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 2,
    slug: 'pastebin',
    title: 'Pastebin Service',
    category: 'Core / Classic',
    difficulty: 'Easy',
    problemStatement:
      'Design a text-sharing paste service where users upload text snippets and receive unique shareable URLs. The system must store raw text blobs reliably and support customizable expiration TTLs.',
    constraints: {
      targetQps: 3000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 40,
      availabilitySlaPercent: 99.9,
    },
    hints: [
      { step: 1, hint: 'Separate metadata (creation date, owner, expiration, size) from the text payload itself.' },
      { step: 2, hint: 'Store text payloads in Object Storage (S3) or blob store, keeping metadata in a NoSQL database.' },
      { step: 3, hint: 'Deploy a CDN in front of public read paths for viral or popular pastes.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Web Client') } },
        { id: 'cdn1', type: 'customComponent', position: { x: 260, y: 80 }, data: { config: createDefaultConfig('cdn', 'cdn1', 'Paste CDN') } },
        { id: 'lb1', type: 'customComponent', position: { x: 480, y: 150 }, data: { config: createDefaultConfig('load_balancer', 'lb1', 'API Gateway / LB') } },
        { id: 'app1', type: 'customComponent', position: { x: 700, y: 150 }, data: { config: createDefaultConfig('app_server', 'app1', 'Paste Handler API') } },
        { id: 'metaDb', type: 'customComponent', position: { x: 940, y: 80 }, data: { config: createDefaultConfig('nosql_db', 'metaDb', 'Metadata Store') } },
        { id: 's3', type: 'customComponent', position: { x: 940, y: 240 }, data: { config: createDefaultConfig('object_storage', 's3', 'Object Store (S3)') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'cdn1', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'c1', target: 'lb1', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'lb1', target: 'app1', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'app1', target: 'metaDb', data: { protocol: 'TCP' } },
        { id: 'e5', source: 'app1', target: 's3', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you clean up expired pastes efficiently without table scans?',
        answer: 'Use lazy deletion during read lookups combined with a background batch cleaner running during low-traffic windows.',
      },
      {
        question: 'Why choose Object Storage over relational tables for text content?',
        answer: 'Object stores offer superior cost-efficiency, built-in durability, and horizontal scale for variable-sized immutable blobs.',
      },
    ],
    sources: [
      {
        title: 'System Design Primer: Pastebin',
        authorOrOrg: 'Donne Martin',
        url: 'https://github.com/donnemartin/system-design-primer',
      },
      {
        title: 'Designing Data-Intensive Applications',
        authorOrOrg: 'Martin Kleppmann (Chapter 3)',
        url: 'https://dataintensive.net',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 3000,
      burstMultiplier: 2,
      rampDurationSec: 20,
      spikeFrequencySec: 15,
    },
  },
  {
    id: 3,
    slug: 'tinyurl-analytics',
    title: 'TinyURL Analytics Pipeline',
    category: 'Core / Classic',
    difficulty: 'Medium',
    problemStatement:
      'Extend a URL shortener with a real-time analytics engine tracking clicks, referrers, geographic locations, and time-series aggregation without slowing down the critical redirect path.',
    constraints: {
      targetQps: 25000,
      dataSizeGb: 1500,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Decouple redirect responses from analytics ingestion using an asynchronous Message Queue.' },
      { step: 2, hint: 'Use a Time-Series Database or ClickHouse for analytical metric queries.' },
      { step: 3, hint: 'Run background stream workers to compute hourly and daily rollups.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Traffic Source') } },
        { id: 'app1', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'app1', 'Redirect Gateway') } },
        { id: 'mq1', type: 'customComponent', position: { x: 520, y: 220 }, data: { config: createDefaultConfig('message_queue', 'mq1', 'Kafka Click Stream') } },
        { id: 'worker1', type: 'customComponent', position: { x: 760, y: 220 }, data: { config: createDefaultConfig('worker', 'worker1', 'Aggregation Worker') } },
        { id: 'tsdb', type: 'customComponent', position: { x: 1000, y: 220 }, data: { config: createDefaultConfig('timeseries_db', 'tsdb', 'Time-Series DB') } },
        { id: 'cache1', type: 'customComponent', position: { x: 520, y: 80 }, data: { config: createDefaultConfig('redis_cache', 'cache1', 'Fast Redirect Cache') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'app1', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'app1', target: 'cache1', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'app1', target: 'mq1', data: { protocol: 'pub/sub' } },
        { id: 'e4', source: 'mq1', target: 'worker1', data: { protocol: 'pub/sub' } },
        { id: 'e5', source: 'worker1', target: 'tsdb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you guarantee that high analytics load never degrades redirect latency?',
        answer: 'Emit click events asynchronously to Kafka non-blockingly, returning HTTP 302 redirects immediately without waiting for ingestion acknowledgment.',
      },
      {
        question: 'How do you handle bot traffic and fraudulent click bursts?',
        answer: 'Implement sliding window rate limiters per IP and filter identified web crawler user agents in the stream processing worker layer.',
      },
    ],
    sources: [
      {
        title: 'Building a Real-Time Analytics Pipeline',
        authorOrOrg: 'Bitly Engineering',
        url: 'https://bitly.com',
      },
      {
        title: 'Kafka: The Definitive Guide',
        authorOrOrg: 'Gwen Shapira, Todd Palino (O\'Reilly)',
        url: 'https://www.oreilly.com',
      },
    ],
    trafficPreset: {
      pattern: 'bursty',
      baseQps: 25000,
      burstMultiplier: 3,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 4,
    slug: 'key-value-store',
    title: 'Distributed Key-Value Store',
    category: 'Core / Classic',
    difficulty: 'Hard',
    problemStatement:
      'Design a highly available distributed Key-Value store following Dynamo principles. The system must support horizontal partitioning, tunable consistency (N, R, W), gossip protocol membership, and hinted handoff under network partitions.',
    constraints: {
      targetQps: 50000,
      dataSizeGb: 10000,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Implement consistent hashing with virtual nodes to evenly partition keys across storage nodes.' },
      { step: 2, hint: 'Use quorum consensus (R + W > N) to configure strong versus eventual consistency per request.' },
      { step: 3, hint: 'Adopt vector clocks or read repair to resolve concurrent write conflicts.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Client SDK') } },
        { id: 'lb1', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('load_balancer', 'lb1', 'Coordinator LB') } },
        { id: 'node1', type: 'customComponent', position: { x: 520, y: 50 }, data: { config: createDefaultConfig('nosql_db', 'node1', 'Storage Node Alpha') } },
        { id: 'node2', type: 'customComponent', position: { x: 520, y: 170 }, data: { config: createDefaultConfig('nosql_db', 'node2', 'Storage Node Beta') } },
        { id: 'node3', type: 'customComponent', position: { x: 520, y: 290 }, data: { config: createDefaultConfig('nosql_db', 'node3', 'Storage Node Gamma') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'lb1', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'lb1', target: 'node1', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'lb1', target: 'node2', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'lb1', target: 'node3', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is the trade-off between R=1, W=N and R=N, W=1?',
        answer: 'R=1, W=N optimizes for ultra-fast reads at the cost of slower writes and lower write availability; R=N, W=1 provides fast writes with slower read quorums.',
      },
      {
        question: 'How do vector clocks handle concurrent divergence?',
        answer: 'Each update increments the node version counter; concurrent branches with non-ancestral vector clocks require application-level reconciliation.',
      },
    ],
    sources: [
      {
        title: 'Dynamo: Amazon\'s Highly Available Key-value Store',
        authorOrOrg: 'DeCandia et al. (SOSP 2007)',
        url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
      },
      {
        title: 'Designing Data-Intensive Applications',
        authorOrOrg: 'Martin Kleppmann (Chapter 5, Replication)',
        url: 'https://dataintensive.net',
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
    id: 5,
    slug: 'distributed-cache',
    title: 'Distributed In-Memory Cache (Memcached/Redis)',
    category: 'Core / Classic',
    difficulty: 'Hard',
    problemStatement:
      'Design a multi-terabyte distributed caching cluster capable of handling millions of reads per second with consistent hashing, LRU eviction, and protection against cache stampedes, thundering herd, and cache penetration.',
    constraints: {
      targetQps: 100000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 5,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Use client-side consistent hashing or Twemproxy/Envoy to route keys to specific cache shards.' },
      { step: 2, hint: 'Protect backend databases from cache stampede using single-flight mutexes or probabilistic early expiration (XFetch).' },
      { step: 3, hint: 'Use bloom filters at the edge to block nonexistent keys and prevent cache penetration.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'App Clients') } },
        { id: 'proxy', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('reverse_proxy', 'proxy', 'Twemproxy / Envoy') } },
        { id: 'cache1', type: 'customComponent', position: { x: 520, y: 50 }, data: { config: createDefaultConfig('redis_cache', 'cache1', 'Cache Shard 1') } },
        { id: 'cache2', type: 'customComponent', position: { x: 520, y: 170 }, data: { config: createDefaultConfig('redis_cache', 'cache2', 'Cache Shard 2') } },
        { id: 'cache3', type: 'customComponent', position: { x: 520, y: 290 }, data: { config: createDefaultConfig('redis_cache', 'cache3', 'Cache Shard 3') } },
        { id: 'db1', type: 'customComponent', position: { x: 780, y: 170 }, data: { config: createDefaultConfig('sql_db', 'db1', 'Primary DB Cluster') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'proxy', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'proxy', target: 'cache1', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'proxy', target: 'cache2', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'proxy', target: 'cache3', data: { protocol: 'TCP' } },
        { id: 'e5', source: 'proxy', target: 'db1', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you mitigate hot-key saturation on a single cache shard?',
        answer: 'Replicate hot keys across all shards with a randomized key suffix (e.g., key#1, key#2) and read from random replicas.',
      },
      {
        question: 'What is the difference between Cache-Aside and Write-Through?',
        answer: 'Cache-aside places cache population in application logic on miss; write-through updates cache and database synchronously in one transaction.',
      },
    ],
    sources: [
      {
        title: 'Scaling Memcache at Facebook',
        authorOrOrg: 'Nishtala et al. (NSDI 2013)',
        url: 'https://research.facebook.com/publications/scaling-memcache-at-facebook/',
      },
      {
        title: 'Redis Cluster Specification',
        authorOrOrg: 'Redis Official Documentation',
        url: 'https://redis.io/docs/reference/cluster-spec/',
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
    id: 6,
    slug: 'distributed-lock',
    title: 'Distributed Lock Service (Chubby/Raft)',
    category: 'Core / Classic',
    difficulty: 'Hard',
    problemStatement:
      'Design a highly reliable distributed lock manager that coordinates concurrent worker access to shared resources. The lock service must ensure mutual exclusion, prevent split-brain under network partitions, and issue monotonically increasing fencing tokens.',
    constraints: {
      targetQps: 5000,
      dataSizeGb: 50,
      maxP99LatencyMs: 10,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Utilize a consensus protocol (Raft or Paxos) across an odd number of quorum nodes (3 or 5 nodes).' },
      { step: 2, hint: 'Enforce short lease TTLs with proactive heartbeats to prevent deadlocks if lock holders crash.' },
      { step: 3, hint: 'Attach fencing tokens to lock grants so downstream storage layers reject out-of-order writes.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'w1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('worker', 'w1', 'Worker Cluster') } },
        { id: 'lb1', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('load_balancer', 'lb1', 'Leader Gateway') } },
        { id: 'leader', type: 'customComponent', position: { x: 520, y: 150 }, data: { config: createDefaultConfig('app_server', 'leader', 'Raft Leader Node') } },
        { id: 'f1', type: 'customComponent', position: { x: 760, y: 80 }, data: { config: createDefaultConfig('app_server', 'f1', 'Raft Follower 1') } },
        { id: 'f2', type: 'customComponent', position: { x: 760, y: 220 }, data: { config: createDefaultConfig('app_server', 'f2', 'Raft Follower 2') } },
      ],
      edges: [
        { id: 'e1', source: 'w1', target: 'lb1', data: { protocol: 'gRPC' } },
        { id: 'e2', source: 'lb1', target: 'leader', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'leader', target: 'f1', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'leader', target: 'f2', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is simple Redis TTL lock (Redlock) insufficient for critical banking transactions?',
        answer: 'Clock skew and garbage collection pauses can cause lock lease expiration while the client is still writing; fencing tokens at the storage tier are required.',
      },
      {
        question: 'How do fencing tokens protect shared resources?',
        answer: 'Each lock acquisition increments a numeric counter; the storage resource checks and rejects any incoming write with a token lower than the latest committed token.',
      },
    ],
    sources: [
      {
        title: 'How to do distributed locking',
        authorOrOrg: 'Martin Kleppmann',
        url: 'https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html',
      },
      {
        title: 'The Chubby Lock Service for Loosely-Coupled Distributed Systems',
        authorOrOrg: 'Mike Burrows (Google OSDI 2006)',
        url: 'https://research.google.com/archive/chubby-osdi06.pdf',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 5000,
      burstMultiplier: 2,
      rampDurationSec: 20,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 7,
    slug: 'id-generator',
    title: 'Unique ID Generator (Snowflake)',
    category: 'Core / Classic',
    difficulty: 'Medium',
    problemStatement:
      'Design a globally distributed 64-bit unique ID generation service modeled after Twitter Snowflake. IDs must be roughly time-ordered, numerical, unique across thousands of servers, and generate over 100,000 IDs per second without coordinating locks.',
    constraints: {
      targetQps: 100000,
      dataSizeGb: 10,
      maxP99LatencyMs: 3,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Allocate 64 bits: 1 sign bit + 41 timestamp bits + 10 datacenter/worker ID bits + 12 sequence bits.' },
      { step: 2, hint: 'Allow local sequence numbers to roll over up to 4096 IDs per millisecond per machine.' },
      { step: 3, hint: 'Guard against NTP clock skew by rejecting requests or sleeping until the clock catches up.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Microservice Clients') } },
        { id: 'lb1', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('load_balancer', 'lb1', 'Internal LB') } },
        { id: 'gen1', type: 'customComponent', position: { x: 520, y: 80 }, data: { config: createDefaultConfig('app_server', 'gen1', 'Snowflake Node A (DC1)') } },
        { id: 'gen2', type: 'customComponent', position: { x: 520, y: 220 }, data: { config: createDefaultConfig('app_server', 'gen2', 'Snowflake Node B (DC2)') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'lb1', data: { protocol: 'gRPC' } },
        { id: 'e2', source: 'lb1', target: 'gen1', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'lb1', target: 'gen2', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why 41 bits for timestamp instead of full 64 bits?',
        answer: '41 bits covers ~69 years with millisecond precision, leaving 23 bits for datacenter IDs, machine IDs, and sequence counter.',
      },
      {
        question: 'How do you handle clock moving backwards due to NTP synchronization?',
        answer: 'The worker pauses generation and waits until true wall clock exceeds last generated timestamp, or raises an alert if drift exceeds a safety threshold.',
      },
    ],
    sources: [
      {
        title: 'Announcing Snowflake',
        authorOrOrg: 'Twitter Engineering Blog (2010)',
        url: 'https://blog.x.com/engineering/en_us/a/2010/announcing-snowflake',
      },
      {
        title: 'System Design Interview: Unique ID Generator',
        authorOrOrg: 'Alex Xu (Volume 1, Chapter 7)',
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
];
