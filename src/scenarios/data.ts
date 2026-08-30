import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const DATA_SCENARIOS: Scenario[] = [
  {
    id: 56,
    slug: 'distributed-web-crawler',
    title: 'Distributed Web Crawler',
    category: 'Data & Analytics',
    difficulty: 'Medium',
    problemStatement:
      'Design a web crawler capable of downloading billions of web pages per month while respecting robots.txt politeness rules, deduplicating URLs, and detecting cyclic redirect loops.',
    constraints: {
      targetQps: 10000,
      dataSizeGb: 40000,
      maxP99LatencyMs: 200,
      availabilitySlaPercent: 99.9,
    },
    hints: [
      { step: 1, hint: 'Manage URL frontier queues with two-stage queueing: Priority queues for importance and Politeness queues per host.' },
      { step: 2, hint: 'Use Bloom filters or Fingerprint hashes (SimHash) to eliminate duplicate URLs and near-duplicate content.' },
      { step: 3, hint: 'Persist raw HTML pages into Object Storage / Bigtable for indexing.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'crawler', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('worker', 'crawler', 'Crawler Fleet') } },
        { id: 'frontier', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('message_queue', 'frontier', 'URL Frontier Queue') } },
        { id: 'bloom', type: 'customComponent', position: { x: 520, y: 70 }, data: { config: createDefaultConfig('redis_cache', 'bloom', 'Seen URL Bloom Filter') } },
        { id: 'storage', type: 'customComponent', position: { x: 520, y: 220 }, data: { config: createDefaultConfig('object_storage', 'storage', 'Page Storage (S3)') } },
      ],
      edges: [
        { id: 'e1', source: 'frontier', target: 'crawler', data: { protocol: 'pub/sub' } },
        { id: 'e2', source: 'crawler', target: 'bloom', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'crawler', target: 'storage', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you guarantee politeness without slowing down total crawler throughput?',
        answer: 'Route URLs to separate per-host queues; worker threads pick from round-robin host queues with a mandatory delay between requests to the same hostname.',
      },
      {
        question: 'How do you detect spider traps and infinite calendar loops?',
        answer: 'Enforce maximum URL depth limits, path segment length limits, and content similarity checks via SimHash.',
      },
    ],
    sources: [
      {
        title: 'Mercator: A Scalable, Extensible Web Crawler',
        authorOrOrg: 'Heydon & Najork (World Wide Web 1999)',
        url: 'https://link.springer.com',
      },
      {
        title: 'System Design Interview: Web Crawler',
        authorOrOrg: 'Alex Xu (Volume 1, Chapter 9)',
        url: 'https://bytebytego.com',
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
    id: 57,
    slug: 'analytics-pipeline',
    title: 'Product Analytics Platform (Mixpanel/Amplitude)',
    category: 'Data & Analytics',
    difficulty: 'Hard',
    problemStatement:
      'Design a real-time event analytics platform ingesting hundreds of thousands of arbitrary JSON event payloads per second, supporting interactive cohort segmentation, funnels, and retention curves.',
    constraints: {
      targetQps: 100000,
      dataSizeGb: 30000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Ingest events through a scalable edge Gateway directly into Kafka.' },
      { step: 2, hint: 'Use a columnar database (ClickHouse / Apache Pinot / Snowflake) for sub-second OLAP queries across billions of rows.' },
      { step: 3, hint: 'Maintain pre-aggregated user identity resolution maps in Redis.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Web & Mobile SDK') } },
        { id: 'gw', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'gw', 'Event Ingestion API') } },
        { id: 'kafka', type: 'customComponent', position: { x: 500, y: 150 }, data: { config: createDefaultConfig('message_queue', 'kafka', 'Raw Event Kafka') } },
        { id: 'olap', type: 'customComponent', position: { x: 740, y: 150 }, data: { config: createDefaultConfig('timeseries_db', 'olap', 'ClickHouse OLAP') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'kafka', data: { protocol: 'pub/sub' } },
        { id: 'e3', source: 'kafka', target: 'olap', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why are Columnar databases dramatically faster than Row-oriented databases for analytics funnels?',
        answer: 'Funnels typically filter on only 3-5 columns across billions of rows; columnar storage reads only the requested columns from disk into memory, skipping 95% of irrelevant payload data.',
      },
      {
        question: 'How do you handle anonymous-to-identified user event merging (Identity Stitching)?',
        answer: 'Maintain an alias lookup table in memory or key-value store, rewriting historical anonymous event IDs asynchronously during batch processing.',
      },
    ],
    sources: [
      {
        title: 'Building Real-time Analytics at Scale',
        authorOrOrg: 'Mixpanel Engineering Blog',
        url: 'https://mixpanel.com/blog',
      },
      {
        title: 'ClickHouse Column-Oriented Storage Architecture',
        authorOrOrg: 'ClickHouse Docs',
        url: 'https://clickhouse.com/docs',
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
    id: 58,
    slug: 'gaming-leaderboard',
    title: 'Real-Time Global Leaderboard (Top-K)',
    category: 'Data & Analytics',
    difficulty: 'Easy',
    problemStatement:
      'Design a real-time gaming leaderboard capable of handling millions of score updates per minute, ranking users globally, and returning top-100 player ranks instantly.',
    constraints: {
      targetQps: 40000,
      dataSizeGb: 100,
      maxP99LatencyMs: 10,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Use Redis Sorted Sets (ZSET) powered by SkipLists and Hash maps.' },
      { step: 2, hint: 'Execute atomic ZADD score updates and ZREVRANGE top-K queries in O(log N).' },
      { step: 3, hint: 'For extreme scales (100M+ users), partition users into tiered score buckets.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Game Client') } },
        { id: 'lbSvc', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'lbSvc', 'Leaderboard Service') } },
        { id: 'zset', type: 'customComponent', position: { x: 540, y: 150 }, data: { config: createDefaultConfig('redis_cache', 'zset', 'Redis Sorted Set (ZSET)') } },
        { id: 'persistDb', type: 'customComponent', position: { x: 540, y: 280 }, data: { config: createDefaultConfig('sql_db', 'persistDb', 'Score Archive DB') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'lbSvc', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'lbSvc', target: 'zset', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'lbSvc', target: 'persistDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why does Redis Sorted Set use a SkipList instead of a balanced AVL or Red-Black tree?',
        answer: 'SkipLists have similar O(log N) search and insert complexity but are much easier to implement concurrently, and range operations (ZRANGE) require simple pointer traversal.',
      },
      {
        question: 'How do you handle millions of users on a single leaderboard without running out of RAM?',
        answer: 'Partition users into score range buckets (e.g. 0-1000, 1000-2000), or store only the top 10,000 active players in Redis and approximate lower percentiles.',
      },
    ],
    sources: [
      {
        title: 'Redis Sorted Sets Under the Hood: Skip Lists',
        authorOrOrg: 'Antirez (Salvatore Sanfilippo)',
        url: 'http://antirez.com',
      },
      {
        title: 'System Design Interview: Real-Time Gaming Leaderboard',
        authorOrOrg: 'Alex Xu (Volume 2, Chapter 6)',
        url: 'https://bytebytego.com',
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
    id: 59,
    slug: 'unique-visitor-counter',
    title: 'Unique Visitor Counter (HyperLogLog)',
    category: 'Data & Analytics',
    difficulty: 'Medium',
    problemStatement:
      'Design a web analytics cardinality counter tracking unique daily and monthly visitors across hundreds of thousands of websites with minimal memory overhead.',
    constraints: {
      targetQps: 70000,
      dataSizeGb: 50,
      maxP99LatencyMs: 5,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Utilize the HyperLogLog (HLL) probabilistic cardinality estimation algorithm.' },
      { step: 2, hint: 'Store 12KB HLL registers in Redis (PFADD / PFCOUNT) capable of estimating billions of unique users with ~0.81% error rate.' },
      { step: 3, hint: 'Merge daily HLL registers using PFMERGE for monthly unique rollups.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Web Page Tag') } },
        { id: 'counterApi', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'counterApi', 'Cardinality Service') } },
        { id: 'hllStore', type: 'customComponent', position: { x: 540, y: 150 }, data: { config: createDefaultConfig('redis_cache', 'hllStore', 'Redis HyperLogLog (12KB/day)') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'counterApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'counterApi', target: 'hllStore', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How does HyperLogLog count billions of items in only 12 kilobytes of memory?',
        answer: 'HLL hashes items and records the maximum count of leading zeroes in binary hash representations across thousands of register buckets, inferring cardinality from mathematical probability.',
      },
      {
        question: 'Can HyperLogLog return the list of actual user IDs?',
        answer: 'No, HyperLogLog is strictly a cardinality counter; recovering original elements requires exact Hash Sets or Bloom filters with higher memory footprints.',
      },
    ],
    sources: [
      {
        title: 'HyperLogLog: The Analysis of a Near-Optimal Cardinality Estimation Algorithm',
        authorOrOrg: 'Flajolet et al. (AOFA 2007)',
        url: 'https://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf',
      },
      {
        title: 'Redis HyperLogLog Explained',
        authorOrOrg: 'Redis Official Documentation',
        url: 'https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/',
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
    id: 60,
    slug: 'distributed-message-queue',
    title: 'Distributed Message Broker (Kafka/Pulsar)',
    category: 'Data & Analytics',
    difficulty: 'Hard',
    problemStatement:
      'Design a high-throughput distributed commit log message broker supporting partitioned topics, consumer groups with offset commits, and zero-copy disk writes.',
    constraints: {
      targetQps: 150000,
      dataSizeGb: 20000,
      maxP99LatencyMs: 10,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Organize topics into append-only segmented commit logs partitioned across broker nodes.' },
      { step: 2, hint: 'Utilize Linux OS page cache and OS sendfile() zero-copy system calls for network transfer.' },
      { step: 3, hint: 'Replicate partition replicas using in-sync replica (ISR) quorum consensus.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'producer', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('app_server', 'producer', 'Producer Apps') } },
        { id: 'broker1', type: 'customComponent', position: { x: 280, y: 70 }, data: { config: createDefaultConfig('message_queue', 'broker1', 'Kafka Broker 1 (Leader)') } },
        { id: 'broker2', type: 'customComponent', position: { x: 280, y: 220 }, data: { config: createDefaultConfig('message_queue', 'broker2', 'Kafka Broker 2 (Follower)') } },
        { id: 'consumer', type: 'customComponent', position: { x: 540, y: 150 }, data: { config: createDefaultConfig('worker', 'consumer', 'Consumer Group') } },
      ],
      edges: [
        { id: 'e1', source: 'producer', target: 'broker1', data: { protocol: 'TCP' } },
        { id: 'e2', source: 'broker1', target: 'broker2', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'broker1', target: 'consumer', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is sequential disk I/O in Kafka as fast as random RAM access?',
        answer: 'Modern operating systems prefetch sequential blocks heavily; linear disk append eliminates disk head seek latency, achieving saturation speeds of modern SSDs.',
      },
      {
        question: 'How do Consumer Groups achieve parallel stream processing with ordered guarantees?',
        answer: 'Each partition within a topic is consumed by exactly one consumer member within the consumer group, guaranteeing per-partition ordering with horizontal parallelism.',
      },
    ],
    sources: [
      {
        title: 'Kafka: A Distributed Messaging System for Log Processing',
        authorOrOrg: 'Kreps, Narkhede, Rao (NetDB 2011)',
        url: 'https://kafka.apache.org/community/books_and_papers/',
      },
      {
        title: 'Designing Data-Intensive Applications',
        authorOrOrg: 'Martin Kleppmann (Chapter 11)',
        url: 'https://dataintensive.net',
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
    id: 61,
    slug: 'cloud-data-warehouse',
    title: 'Cloud Data Warehouse (Snowflake/BigQuery)',
    category: 'Data & Analytics',
    difficulty: 'Hard',
    problemStatement:
      'Design a cloud-native analytical data warehouse separating compute clusters from shared object storage, supporting multi-tenant isolation, automatic micro-partitioning, and ACID transactions.',
    constraints: {
      targetQps: 5000,
      dataSizeGb: 200000,
      maxP99LatencyMs: 150,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Decouple compute worker clusters from immutable columnar storage (e.g. Parquet / ORC on S3/GCS).' },
      { step: 2, hint: 'Implement a centralized cloud services layer managing query optimization, access control, and metadata transactions.' },
      { step: 3, hint: 'Organize data into automatic micro-partitions with columnar min/max statistics for partition pruning.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'biUser', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'biUser', 'SQL / BI Analyst') } },
        { id: 'queryPlanner', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'queryPlanner', 'Coordinator & Optimizer') } },
        { id: 'computeFleet', type: 'customComponent', position: { x: 540, y: 150 }, data: { config: createDefaultConfig('worker', 'computeFleet', 'Virtual Warehouse Fleet') } },
        { id: 'storageLayer', type: 'customComponent', position: { x: 800, y: 150 }, data: { config: createDefaultConfig('object_storage', 'storageLayer', 'Columnar Object Storage (S3)') } },
      ],
      edges: [
        { id: 'e1', source: 'biUser', target: 'queryPlanner', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'queryPlanner', target: 'computeFleet', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'computeFleet', target: 'storageLayer', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is the architectural benefit of separating compute from storage in data warehousing?',
        answer: 'Compute clusters can be scaled up or down instantaneously or paused when idle without moving multi-petabyte datasets.',
      },
      {
        question: 'How does micro-partition pruning accelerate analytical queries without explicit indexing?',
        answer: 'Metadata tracks min and max values for every column in each micro-partition; queries skip scanning partitions whose ranges do not overlap query WHERE clauses.',
      },
    ],
    sources: [
      {
        title: 'The Snowflake Elastic Data Warehouse',
        authorOrOrg: 'Dageville et al. (ACM SIGMOD 2016)',
        url: 'https://doi.org/10.1145/2882903.2903741',
      },
      {
        title: 'BigQuery Architecture and Dremel Engine',
        authorOrOrg: 'Melnik et al. (Google Research / VLDB 2010)',
        url: 'https://research.google/pubs/pub36632/',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 5000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 62,
    slug: 'batch-etl-pipeline',
    title: 'Batch & Stream ETL Pipeline (Airflow/Spark)',
    category: 'Data & Analytics',
    difficulty: 'Medium',
    problemStatement:
      'Design an end-to-end Extract, Transform, Load (ETL) data pipeline ingesting raw database dumps and clickstreams, executing transformations with Apache Spark, and loading into data marts.',
    constraints: {
      targetQps: 15000,
      dataSizeGb: 50000,
      maxP99LatencyMs: 100,
      availabilitySlaPercent: 99.95,
    },
    hints: [
      { step: 1, hint: 'Orchestrate pipeline DAG workflows using Apache Airflow with retries and SLA monitoring.' },
      { step: 2, hint: 'Execute distributed batch transformations with Apache Spark on Kubernetes.' },
      { step: 3, hint: 'Stage raw data in bronze/silver/gold data lake lakehouse tiers.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'rawSrc', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('nosql_db', 'rawSrc', 'Source Systems') } },
        { id: 'airflow', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('app_server', 'airflow', 'Airflow Orchestrator') } },
        { id: 'sparkCluster', type: 'customComponent', position: { x: 500, y: 150 }, data: { config: createDefaultConfig('worker', 'sparkCluster', 'Spark Compute Engine') } },
        { id: 'dataLake', type: 'customComponent', position: { x: 740, y: 150 }, data: { config: createDefaultConfig('object_storage', 'dataLake', 'Delta Lake Storage') } },
      ],
      edges: [
        { id: 'e1', source: 'rawSrc', target: 'airflow', data: { protocol: 'TCP' } },
        { id: 'e2', source: 'airflow', target: 'sparkCluster', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'sparkCluster', target: 'dataLake', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is the difference between ETL and ELT in modern cloud architectures?',
        answer: 'ETL transforms data before loading into storage; ELT loads raw data into cloud object storage first and uses distributed cloud compute to transform in-place.',
      },
      {
        question: 'How do you handle schema evolution in Delta Lake tables without corrupting downstream pipelines?',
        answer: 'Delta Lake enforces schema validation during append/merge and supports explicit schema migration rules.',
      },
    ],
    sources: [
      {
        title: 'Delta Lake: High-Performance ACID Table Storage over Cloud Object Stores',
        authorOrOrg: 'Armbrust et al. (VLDB 2020)',
        url: 'https://www.vldb.org/pvldb/vol13/p3411-armbrust.pdf',
      },
      {
        title: 'Apache Airflow Architecture Documentation',
        authorOrOrg: 'Apache Software Foundation',
        url: 'https://airflow.apache.org/docs/',
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
  {
    id: 63,
    slug: 'change-data-capture',
    title: 'Change Data Capture Engine (Debezium)',
    category: 'Data & Analytics',
    difficulty: 'Medium',
    problemStatement:
      'Design a real-time Change Data Capture (CDC) system that tails database write-ahead transaction logs (PostgreSQL WAL / MySQL Binlog) and streams change events with exactly-once delivery.',
    constraints: {
      targetQps: 35000,
      dataSizeGb: 5000,
      maxP99LatencyMs: 20,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Read raw binary transaction logs directly instead of running polling queries against production tables.' },
      { step: 2, hint: 'Convert row changes into structured JSON/Avro change events with schema metadata.' },
      { step: 3, hint: 'Stream change events into Kafka partitioned by primary key for downstream search index and cache invalidation.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'masterDb', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('sql_db', 'masterDb', 'Primary MySQL / Postgres') } },
        { id: 'debezium', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('worker', 'debezium', 'Debezium CDC Connector') } },
        { id: 'kafka', type: 'customComponent', position: { x: 540, y: 150 }, data: { config: createDefaultConfig('message_queue', 'kafka', 'CDC Event Kafka Topic') } },
        { id: 'searchSync', type: 'customComponent', position: { x: 800, y: 150 }, data: { config: createDefaultConfig('search_index', 'searchSync', 'Elasticsearch Sync Target') } },
      ],
      edges: [
        { id: 'e1', source: 'masterDb', target: 'debezium', data: { protocol: 'TCP' } },
        { id: 'e2', source: 'debezium', target: 'kafka', data: { protocol: 'pub/sub' } },
        { id: 'e3', source: 'kafka', target: 'searchSync', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is log-based CDC far superior to timestamp-polling CDC?',
        answer: 'Log-based CDC captures every intermediate insert, update, and hard delete with zero CPU overhead on query engines and true transaction commit order.',
      },
      {
        question: 'How do you handle initial table snapshot bootstrapping before stream tailing?',
        answer: 'Debezium takes a consistent read lock snapshot of existing rows while recording the starting log offset position, then seamlessly transitions to live log tailing.',
      },
    ],
    sources: [
      {
        title: 'Debezium: Architecture and Log-Based Change Data Capture',
        authorOrOrg: 'Gunnar Morling (Debezium Community)',
        url: 'https://debezium.io/documentation/reference/architecture.html',
      },
      {
        title: 'Designing Data-Intensive Applications: The Log as Stream of Changes',
        authorOrOrg: 'Martin Kleppmann',
        url: 'https://dataintensive.net',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 35000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 64,
    slug: 'data-lakehouse',
    title: 'Data Lakehouse Architecture (Apache Iceberg)',
    category: 'Data & Analytics',
    difficulty: 'Medium',
    problemStatement:
      'Design a modern cloud Data Lakehouse utilizing open table formats (Apache Iceberg) providing ACID transactions, time travel queries, and schema evolution across object stores.',
    constraints: {
      targetQps: 8000,
      dataSizeGb: 100000,
      maxP99LatencyMs: 80,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Store raw data in Apache Parquet files on Cloud Object Storage.' },
      { step: 2, hint: 'Track table state through hierarchical Iceberg metadata tree snapshots (Manifest Lists -> Manifest Files -> Data Files).' },
      { step: 3, hint: 'Commit updates via atomic catalog CAS (Compare-And-Swap) operations.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'queryEngine', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('app_server', 'queryEngine', 'Trino / Spark Query Engine') } },
        { id: 'catalog', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'catalog', 'Iceberg REST Catalog') } },
        { id: 'metaStore', type: 'customComponent', position: { x: 540, y: 80 }, data: { config: createDefaultConfig('sql_db', 'metaStore', 'Catalog Metadata DB') } },
        { id: 's3Parquet', type: 'customComponent', position: { x: 540, y: 220 }, data: { config: createDefaultConfig('object_storage', 's3Parquet', 'Parquet Lake Storage') } },
      ],
      edges: [
        { id: 'e1', source: 'queryEngine', target: 'catalog', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'catalog', target: 'metaStore', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'queryEngine', target: 's3Parquet', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How does Apache Iceberg support ACID transactions on top of eventually consistent object storage?',
        answer: 'Writers create new immutable data files and manifest snapshots, committing the updated snapshot pointer atomically to the catalog via Compare-And-Swap (CAS).',
      },
      {
        question: 'How do time-travel queries operate in Iceberg?',
        answer: 'Queries specify a snapshot ID or timestamp; the query engine traverses that exact historical manifest tree, ignoring subsequent snapshot additions.',
      },
    ],
    sources: [
      {
        title: 'Apache Iceberg: An Open Table Format for Huge Analytic Datasets',
        authorOrOrg: 'Ryan Blue, Daniel Weeks (Apache Software Foundation)',
        url: 'https://iceberg.apache.org',
      },
      {
        title: 'Lakehouse: A New Generation of Open Platforms that Unify Data Warehousing and Advanced Analytics',
        authorOrOrg: 'Armbrust et al. (CIDR 2021)',
        url: 'https://www.cidrdb.org',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 8000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 65,
    slug: 'real-time-dashboard',
    title: 'Live Operational Dashboard (Grafana)',
    category: 'Data & Analytics',
    difficulty: 'Medium',
    problemStatement:
      'Design a live monitoring and visualization dashboard platform querying multiple heterogeneous time-series data sources with sub-second dashboard refreshes and alerting.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 500,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Query time-series databases with downsampled rollups (5-minute, 1-hour) for wide time ranges.' },
      { step: 2, hint: 'Push live metric updates to open browser dashboards via WebSockets / Server-Sent Events.' },
      { step: 3, hint: 'Cache identical panel query results in Redis for 10-30 seconds.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'browser', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'browser', 'Grafana Dashboard') } },
        { id: 'grafanaBackend', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'grafanaBackend', 'Dashboard Backend') } },
        { id: 'queryCache', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('redis_cache', 'queryCache', 'Query Result Cache') } },
        { id: 'promDb', type: 'customComponent', position: { x: 540, y: 220 }, data: { config: createDefaultConfig('timeseries_db', 'promDb', 'Prometheus / Mimir') } },
      ],
      edges: [
        { id: 'e1', source: 'browser', target: 'grafanaBackend', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'grafanaBackend', target: 'queryCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'grafanaBackend', target: 'promDb', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you avoid overloading the time-series database when 100 engineers open the same dashboard simultaneously?',
        answer: 'Cache backend query responses keyed by query fingerprint and rounded time windows in Redis, collapsing duplicate queries.',
      },
      {
        question: 'Why is downsampling mandatory for year-long metric visualisations?',
        answer: 'Rendering 1 year of 1-second raw metrics requires sending 31 million data points to the browser; downsampling into 1-hour p50/p95/max averages reduces payload size to 8,760 points.',
      },
    ],
    sources: [
      {
        title: 'Grafana Architecture Documentation',
        authorOrOrg: 'Grafana Labs',
        url: 'https://grafana.com/docs/grafana/latest/fundamentals/',
      },
      {
        title: 'Prometheus High-Availability and Long-Term Storage (Mimir)',
        authorOrOrg: 'Prometheus Community',
        url: 'https://prometheus.io/docs/introduction/overview/',
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
];
