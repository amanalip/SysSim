import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const SOCIAL_SCENARIOS: Scenario[] = [
  {
    id: 8,
    slug: 'news-feed',
    title: 'News Feed (Facebook/X)',
    category: 'Social & Messaging',
    difficulty: 'Medium',
    problemStatement:
      'Design a scalable News Feed system. Users can publish posts and view an aggregated, ranked feed composed of updates from their friends and followed accounts with sub-second page load times.',
    constraints: {
      targetQps: 50000,
      dataSizeGb: 5000,
      maxP99LatencyMs: 80,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Evaluate Fan-out-on-Write (Push) versus Fan-out-on-Read (Pull).' },
      {
        step: 2,
        hint: 'Adopt a hybrid approach: push posts to follower feed caches for regular users; pull on-demand for celebrities with millions of followers.',
      },
      {
        step: 3,
        hint: 'Store post content in NoSQL databases and cache pre-materialized user feed ID lists in Redis.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Mobile App') },
        },
        {
          id: 'gw',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('api_gateway', 'gw', 'API Gateway') },
        },
        {
          id: 'feedSvc',
          type: 'customComponent',
          position: { x: 500, y: 80 },
          data: { config: createDefaultConfig('app_server', 'feedSvc', 'Newsfeed Service') },
        },
        {
          id: 'postSvc',
          type: 'customComponent',
          position: { x: 500, y: 240 },
          data: { config: createDefaultConfig('app_server', 'postSvc', 'Post Ingestion Svc') },
        },
        {
          id: 'feedCache',
          type: 'customComponent',
          position: { x: 750, y: 80 },
          data: { config: createDefaultConfig('redis_cache', 'feedCache', 'User Feed Cache') },
        },
        {
          id: 'mq',
          type: 'customComponent',
          position: { x: 750, y: 240 },
          data: { config: createDefaultConfig('message_queue', 'mq', 'Fanout Task Queue') },
        },
        {
          id: 'fanoutWorker',
          type: 'customComponent',
          position: { x: 980, y: 240 },
          data: { config: createDefaultConfig('worker', 'fanoutWorker', 'Fanout Worker') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'feedSvc', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'gw', target: 'postSvc', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'feedSvc', target: 'feedCache', data: { protocol: 'TCP' } },
        { id: 'e5', source: 'postSvc', target: 'mq', data: { protocol: 'pub/sub' } },
        { id: 'e6', source: 'mq', target: 'fanoutWorker', data: { protocol: 'pub/sub' } },
        { id: 'e7', source: 'fanoutWorker', target: 'feedCache', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why does a pure fan-out-on-write model fail for celebrity accounts?',
        answer:
          'Writing a single post from an account with 80 million followers causes 80 million write operations into follower cache lists simultaneously, creating severe resource starvation.',
      },
      {
        question: 'How is feed pagination implemented cleanly?',
        answer:
          'Use cursor-based pagination (e.g. timestamp or post ID) instead of offset-based pagination to prevent duplicated or missing items during infinite scroll.',
      },
    ],
    sources: [
      {
        title: 'Serving Facebook Multifeed at Scale',
        authorOrOrg: 'Facebook Engineering (Scale 2014)',
        url: 'https://engineering.fb.com',
      },
      {
        title: 'System Design Interview: News Feed System',
        authorOrOrg: 'Alex Xu (Volume 1, Chapter 11)',
        url: 'https://bytebytego.com',
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
    id: 9,
    slug: 'chat-application',
    title: 'Chat Application (WhatsApp)',
    category: 'Social & Messaging',
    difficulty: 'Medium',
    problemStatement:
      'Design a real-time 1-on-1 messaging platform supporting bidirectional messaging over persistent WebSockets, message delivery acknowledgments (sent, delivered, read), and offline message queues.',
    constraints: {
      targetQps: 60000,
      dataSizeGb: 4000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Maintain persistent WebSocket connections through an edge connection cluster.',
      },
      {
        step: 2,
        hint: 'Track active user connections in an In-Memory Presence & Session store (Redis).',
      },
      {
        step: 3,
        hint: 'Buffer offline messages in a message queue or append-only log until the recipient reconnects.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Chat Client A') },
        },
        {
          id: 'ws1',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'ws1', 'WebSocket Gateway') },
        },
        {
          id: 'sessionStore',
          type: 'customComponent',
          position: { x: 520, y: 70 },
          data: {
            config: createDefaultConfig('redis_cache', 'sessionStore', 'Presence & Session DB'),
          },
        },
        {
          id: 'msgStore',
          type: 'customComponent',
          position: { x: 520, y: 230 },
          data: { config: createDefaultConfig('nosql_db', 'msgStore', 'HBase / Cassandra DB') },
        },
        {
          id: 'mq',
          type: 'customComponent',
          position: { x: 760, y: 150 },
          data: { config: createDefaultConfig('message_queue', 'mq', 'Offline Message Queue') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'ws1', data: { protocol: 'WebSocket' } },
        { id: 'e2', source: 'ws1', target: 'sessionStore', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'ws1', target: 'msgStore', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'ws1', target: 'mq', data: { protocol: 'pub/sub' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you route an incoming message when the recipient is connected to a different WebSocket server?',
        answer:
          'Query the central Redis session store to find the recipient server ID, then publish the message to that specific server topic via an internal message fabric.',
      },
      {
        question: 'How do you guarantee strict message ordering per conversation?',
        answer:
          'Assign sequential sequence numbers generated by Snowflake or conversation-scoped incrementing counters.',
      },
    ],
    sources: [
      {
        title: '1 Million WebSockets on a Single Machine',
        authorOrOrg: 'Rick Reed (WhatsApp / Erlang Factory)',
        url: 'https://www.erlang-factory.com',
      },
      {
        title: 'Designing a Chat System',
        authorOrOrg: 'Alex Xu (Volume 1, Chapter 12)',
        url: 'https://bytebytego.com',
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
    id: 10,
    slug: 'photo-sharing',
    title: 'Photo Sharing Platform (Instagram)',
    category: 'Social & Messaging',
    difficulty: 'Medium',
    problemStatement:
      'Design an image-sharing platform capable of handling millions of image uploads daily, generating thumbnails in various aspect ratios asynchronously, and delivering image assets globally with low latency.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 25000,
      maxP99LatencyMs: 50,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Store raw image files and processed variants in Object Storage (S3), not in SQL databases.',
      },
      {
        step: 2,
        hint: 'Distribute image reads through a global Content Delivery Network (CDN) with edge caching.',
      },
      {
        step: 3,
        hint: 'Offload image compression, resizing, and watermarking to background Workers via a Task Queue.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Mobile App') },
        },
        {
          id: 'cdn1',
          type: 'customComponent',
          position: { x: 260, y: 70 },
          data: { config: createDefaultConfig('cdn', 'cdn1', 'Image Edge CDN') },
        },
        {
          id: 'lb1',
          type: 'customComponent',
          position: { x: 260, y: 220 },
          data: { config: createDefaultConfig('load_balancer', 'lb1', 'Upload Gateway LB') },
        },
        {
          id: 'app1',
          type: 'customComponent',
          position: { x: 500, y: 220 },
          data: { config: createDefaultConfig('app_server', 'app1', 'Media API Server') },
        },
        {
          id: 's3',
          type: 'customComponent',
          position: { x: 740, y: 70 },
          data: { config: createDefaultConfig('object_storage', 's3', 'S3 Photo Bucket') },
        },
        {
          id: 'tq',
          type: 'customComponent',
          position: { x: 740, y: 220 },
          data: { config: createDefaultConfig('task_queue', 'tq', 'Transcode Task Queue') },
        },
        {
          id: 'worker1',
          type: 'customComponent',
          position: { x: 960, y: 220 },
          data: { config: createDefaultConfig('worker', 'worker1', 'Image Resizer Worker') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'cdn1', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'c1', target: 'lb1', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'lb1', target: 'app1', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'app1', target: 's3', data: { protocol: 'HTTP' } },
        { id: 'e5', source: 'app1', target: 'tq', data: { protocol: 'pub/sub' } },
        { id: 'e6', source: 'tq', target: 'worker1', data: { protocol: 'pub/sub' } },
        { id: 'e7', source: 'worker1', target: 's3', data: { protocol: 'HTTP' } },
        { id: 'e8', source: 'cdn1', target: 's3', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why utilize pre-signed S3 URLs for photo uploads?',
        answer:
          'Pre-signed URLs allow mobile clients to stream high-resolution media directly to object storage, bypassing application servers and reducing bandwidth bottlenecks.',
      },
      {
        question: 'How do you handle rapid CDN cache eviction when a user deletes a photo?',
        answer:
          'Send an asynchronous purge command to the CDN edge API or append content-hash version tags to the image URLs.',
      },
    ],
    sources: [
      {
        title: 'Finding a needle in Haystack: Facebook’s photo storage',
        authorOrOrg: 'Beaver et al. (OSDI 2010)',
        url: 'https://www.usenix.org/legacy/event/osdi10/tech/full_papers/Beaver.pdf',
      },
      {
        title: 'Storing Hundreds of Millions of Photos',
        authorOrOrg: 'Facebook Engineering (Haystack Paper)',
        url: 'https://engineering.fb.com',
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
    id: 11,
    slug: 'twitter-search',
    title: 'Real-Time Tweet Search (Earlybird)',
    category: 'Social & Messaging',
    difficulty: 'Hard',
    problemStatement:
      'Design a real-time search engine for tweets. Queries must return newly posted tweets within seconds of publication, supporting keywords, hashtags, boolean filters, and engagement ranking.',
    constraints: {
      targetQps: 40000,
      dataSizeGb: 6000,
      maxP99LatencyMs: 40,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Construct an inverted index partitioned by time and document ID in memory.',
      },
      {
        step: 2,
        hint: 'Split indexing into real-time in-memory segments and immutable historical segments.',
      },
      {
        step: 3,
        hint: 'Fan-out search queries across index roots and merge results with a scatter-gather aggregator.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Search User') },
        },
        {
          id: 'gw',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('api_gateway', 'gw', 'Search Aggregator') },
        },
        {
          id: 'idx1',
          type: 'customComponent',
          position: { x: 520, y: 50 },
          data: { config: createDefaultConfig('search_index', 'idx1', 'Real-Time Index Segment') },
        },
        {
          id: 'idx2',
          type: 'customComponent',
          position: { x: 520, y: 170 },
          data: { config: createDefaultConfig('search_index', 'idx2', 'Archive Index Shard 1') },
        },
        {
          id: 'idx3',
          type: 'customComponent',
          position: { x: 520, y: 290 },
          data: { config: createDefaultConfig('search_index', 'idx3', 'Archive Index Shard 2') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'idx1', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'gw', target: 'idx2', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'gw', target: 'idx3', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How is Twitter real-time search different from traditional batch web indexing?',
        answer:
          'Tweets must be searchable in sub-5 seconds with high write rates; traditional search optimizes for document quality over freshness with heavy batch indexing.',
      },
      {
        question: 'How do you bound scatter-gather latency across hundreds of search shards?',
        answer:
          'Set strict request timeouts on leaf shard queries and return partial results if a small percentage of shards fail to respond within SLA.',
      },
    ],
    sources: [
      {
        title: 'Earlybird: Real-Time Search at Twitter',
        authorOrOrg: 'Busch et al. (IEEE ICDE 2012)',
        url: 'https://cs.uwaterloo.ca/~jimmylin/publications/Busch_etal_ICDE2012.pdf',
      },
      {
        title: 'Information Retrieval: Inverted Indices at Scale',
        authorOrOrg: 'Manning, Raghavan, Schütze',
        url: 'https://nlp.stanford.edu/IR-book/',
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
    id: 12,
    slug: 'social-graph',
    title: 'Social Graph Service (Facebook TAO)',
    category: 'Social & Messaging',
    difficulty: 'Medium',
    problemStatement:
      'Design a geographically distributed graph datastore managing relationships (friends, likes, follows, comments). The service must process billions of edge queries per second with graph caching and consistency.',
    constraints: {
      targetQps: 80000,
      dataSizeGb: 12000,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Model data as Objects (nodes) and Associations (directed typed edges with timestamps).',
      },
      {
        step: 2,
        hint: 'Deploy a two-tier caching layer: follower tier caching hot associations and leader tier coordinating writes.',
      },
      {
        step: 3,
        hint: 'Persist canonical graph associations in sharded MySQL or distributed storage.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Graph Client') },
        },
        {
          id: 'followerCache',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: {
            config: createDefaultConfig('redis_cache', 'followerCache', 'TAO Follower Cache'),
          },
        },
        {
          id: 'leaderCache',
          type: 'customComponent',
          position: { x: 540, y: 150 },
          data: { config: createDefaultConfig('redis_cache', 'leaderCache', 'TAO Leader Cache') },
        },
        {
          id: 'db1',
          type: 'customComponent',
          position: { x: 800, y: 150 },
          data: { config: createDefaultConfig('graph_db', 'db1', 'Graph Shard Primary') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'followerCache', data: { protocol: 'TCP' } },
        { id: 'e2', source: 'followerCache', target: 'leaderCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'leaderCache', target: 'db1', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is bidirectional friendship stored as two separate directional edges?',
        answer:
          'Storing userA -> userB and userB -> userA independently allows colocating association lists with the source object on the same shard for single-lookup fetching.',
      },
      {
        question: 'How does TAO maintain cache consistency across follower tiers?',
        answer:
          'Writes pass through the leader cache down to the DB, which sends asynchronous invalidation messages to follower caches via a pub/sub pipeline.',
      },
    ],
    sources: [
      {
        title: "TAO: Facebook's Distributed Data Store for the Social Graph",
        authorOrOrg: 'Bronson et al. (USENIX ATC 2013)',
        url: 'https://research.facebook.com/publications/tao-facebooks-distributed-data-store-for-the-social-graph/',
      },
      {
        title: 'Graph Databases in Practice',
        authorOrOrg: "Ian Robinson, Jim Webber (O'Reilly)",
        url: 'https://www.oreilly.com',
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
    id: 13,
    slug: 'comment-system',
    title: 'Threaded Comment System (Reddit)',
    category: 'Social & Messaging',
    difficulty: 'Medium',
    problemStatement:
      'Design a nested threaded comment and voting engine for discussions. The system must render deep reply trees, compute upvote/downvote scores, and apply ranking algorithms (Hot, Top, New) in real time.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 1500,
      maxP99LatencyMs: 35,
      availabilitySlaPercent: 99.95,
    },
    hints: [
      {
        step: 1,
        hint: 'Store comment hierarchy using Materialized Path (e.g. 001.004.002) or Closure Tables for efficient subtree queries.',
      },
      {
        step: 2,
        hint: 'Maintain vote counts in Redis sorted sets and write asynchronously to DB to handle vote bursts.',
      },
      {
        step: 3,
        hint: 'Cache top-level comment trees and lazily fetch nested children upon expansion.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Web / App') },
        },
        {
          id: 'app1',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'app1', 'Comment Service') },
        },
        {
          id: 'voteCache',
          type: 'customComponent',
          position: { x: 520, y: 70 },
          data: {
            config: createDefaultConfig('redis_cache', 'voteCache', 'Vote Score Cache (ZSET)'),
          },
        },
        {
          id: 'commentDb',
          type: 'customComponent',
          position: { x: 520, y: 230 },
          data: { config: createDefaultConfig('sql_db', 'commentDb', 'Comment Hierarchy DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'app1', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'app1', target: 'voteCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'app1', target: 'commentDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: "How does Reddit's Hot ranking algorithm balance score against recency?",
        answer:
          'It uses a logarithmic score base plus a time factor: log10(max(1, abs(score))) + sign(score) * timestamp / 45000.',
      },
      {
        question: 'How do you prevent race conditions during concurrent upvotes?',
        answer:
          'Use Redis INCRBY or atomic SQL updates rather than read-modify-write patterns in application memory.',
      },
    ],
    sources: [
      {
        title: 'How Reddit Built Its Nested Comment Architecture',
        authorOrOrg: 'Reddit Engineering Blog',
        url: 'https://reddit.com/r/redditdev',
      },
      {
        title: 'SQL Antipatterns: Naive Trees and Materialized Paths',
        authorOrOrg: 'Bill Karwin (Pragmatic Bookshelf)',
        url: 'https://pragprog.com/titles/bksap1/sql-antipatterns-volume-1/',
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
    id: 14,
    slug: 'ephemeral-stories',
    title: 'Ephemeral Content (Instagram Stories)',
    category: 'Social & Messaging',
    difficulty: 'Easy',
    problemStatement:
      'Design an ephemeral story sharing system where media automatically disappears 24 hours after publication. The system must support fast sequential media viewing and seen-state tracking.',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 8000,
      maxP99LatencyMs: 40,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Store story metadata with a strict 24-hour TTL in cache and key-value store.',
      },
      {
        step: 2,
        hint: 'Pre-warm CDN edge locations for mutual connections when a new story is published.',
      },
      {
        step: 3,
        hint: 'Use Redis bitfields or bloom filters to track which stories a user has already watched.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Mobile App') },
        },
        {
          id: 'cdn1',
          type: 'customComponent',
          position: { x: 260, y: 70 },
          data: { config: createDefaultConfig('cdn', 'cdn1', 'Story Video CDN') },
        },
        {
          id: 'app1',
          type: 'customComponent',
          position: { x: 260, y: 220 },
          data: { config: createDefaultConfig('app_server', 'app1', 'Story API Service') },
        },
        {
          id: 'redisStory',
          type: 'customComponent',
          position: { x: 520, y: 150 },
          data: {
            config: createDefaultConfig('redis_cache', 'redisStory', 'Active 24h Story Store'),
          },
        },
        {
          id: 's3',
          type: 'customComponent',
          position: { x: 780, y: 150 },
          data: { config: createDefaultConfig('object_storage', 's3', 'Story Video S3') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'cdn1', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'c1', target: 'app1', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'app1', target: 'redisStory', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'app1', target: 's3', data: { protocol: 'HTTP' } },
        { id: 'e5', source: 'cdn1', target: 's3', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you handle story expiration cleanup without expensive cron table scans?',
        answer:
          'Rely on database engine TTL expirations (e.g., Redis and DynamoDB TTL) combined with object lifecycle policies on S3 buckets.',
      },
      {
        question: 'How is seamless next-story playback achieved on client devices?',
        answer:
          'The client pre-fetches the first video segment of the next 2 stories in background while the current story is playing.',
      },
    ],
    sources: [
      {
        title: 'Meta Engineering: Systems and Infrastructure',
        authorOrOrg: 'Meta Engineering',
        url: 'https://engineering.fb.com',
      },
      {
        title: 'High Performance Browser Networking',
        authorOrOrg: "Ilya Grigorik (O'Reilly)",
        url: 'https://hpbn.co',
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
    id: 15,
    slug: 'group-chat',
    title: 'Group Chat Service (Discord)',
    category: 'Social & Messaging',
    difficulty: 'Medium',
    problemStatement:
      'Design a high-concurrency group chat architecture supporting channels with up to 100,000 members. Messages must be broadcast in real time to online members with low latency, delivery receipts, and pagination.',
    constraints: {
      targetQps: 45000,
      dataSizeGb: 3000,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Use a Pub/Sub message broker or Elixir/Erlang process rings for fanout within channels.',
      },
      {
        step: 2,
        hint: 'Partition messages by channel ID in ScyllaDB/Cassandra for high-throughput writes.',
      },
      {
        step: 3,
        hint: 'Only push live messages to active channel viewers; send push notifications lazily to idle group members.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Discord Client') },
        },
        {
          id: 'gateway',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('app_server', 'gateway', 'Gateway Guild Master') },
        },
        {
          id: 'pubsub',
          type: 'customComponent',
          position: { x: 520, y: 80 },
          data: { config: createDefaultConfig('pubsub', 'pubsub', 'Channel Pub/Sub Broker') },
        },
        {
          id: 'scylla',
          type: 'customComponent',
          position: { x: 520, y: 220 },
          data: { config: createDefaultConfig('nosql_db', 'scylla', 'ScyllaDB Message Store') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gateway', data: { protocol: 'WebSocket' } },
        { id: 'e2', source: 'gateway', target: 'pubsub', data: { protocol: 'pub/sub' } },
        { id: 'e3', source: 'gateway', target: 'scylla', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How does Discord handle fanout when a message is sent in a 100,000-member server?',
        answer:
          'Discord organizes users into active voice/text session rings and skips broadcasting to offline/invisible members, reducing fanout volume by orders of magnitude.',
      },
      {
        question: 'Why migrate chat storage from MongoDB to Cassandra/ScyllaDB?',
        answer:
          'Cassandra and ScyllaDB provide linear write scalability and predictable low read latency for time-ordered immutable message logs.',
      },
    ],
    sources: [
      {
        title: 'How Discord Stores Trillions of Messages',
        authorOrOrg: 'Bo Ingram (Discord Engineering)',
        url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages',
      },
      {
        title: 'How Discord Scaled Elixir to 5,000,000 Concurrent Users',
        authorOrOrg: 'Discord Engineering Blog',
        url: 'https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 45000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 16,
    slug: 'social-notifications',
    title: 'Social Notification Engine (LinkedIn)',
    category: 'Social & Messaging',
    difficulty: 'Medium',
    problemStatement:
      'Design a multi-channel notification engine (in-app badges, mobile push, email, SMS). The system must support priority queuing, rate limiting per user, event deduplication, and batching digests.',
    constraints: {
      targetQps: 35000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 50,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Use Kafka priority topics for immediate alerts (direct mentions) versus batch digests.',
      },
      { step: 2, hint: 'Maintain user notification settings and suppression windows in Redis.' },
      {
        step: 3,
        hint: 'Aggregate similar notifications (e.g., "Alice and 5 others liked your post") in stream processing windows.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'eventSrc',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('app_server', 'eventSrc', 'Upstream Services') },
        },
        {
          id: 'mq',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('message_queue', 'mq', 'Notification Queue') },
        },
        {
          id: 'dedupSvc',
          type: 'customComponent',
          position: { x: 520, y: 150 },
          data: { config: createDefaultConfig('worker', 'dedupSvc', 'Dedup & Aggregator') },
        },
        {
          id: 'prefStore',
          type: 'customComponent',
          position: { x: 520, y: 280 },
          data: {
            config: createDefaultConfig('redis_cache', 'prefStore', 'User Preferences Cache'),
          },
        },
        {
          id: 'pushGateway',
          type: 'customComponent',
          position: { x: 760, y: 150 },
          data: { config: createDefaultConfig('app_server', 'pushGateway', 'APNs / FCM Gateway') },
        },
      ],
      edges: [
        { id: 'e1', source: 'eventSrc', target: 'mq', data: { protocol: 'pub/sub' } },
        { id: 'e2', source: 'mq', target: 'dedupSvc', data: { protocol: 'pub/sub' } },
        { id: 'e3', source: 'dedupSvc', target: 'prefStore', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'dedupSvc', target: 'pushGateway', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you prevent notification spam when a post goes viral?',
        answer:
          'Implement collapsing window thresholds (e.g. max 1 push notification per 15 minutes per thread) and transition individual likes into aggregated counters.',
      },
      {
        question:
          'How do you ensure at-least-once delivery without sending duplicate push messages?',
        answer:
          'Use idempotency tokens for third-party push gateway calls (APNs/FCM) and record delivery state in a distributed cache.',
      },
    ],
    sources: [
      {
        title: 'Real-Time Notification System at LinkedIn',
        authorOrOrg: 'LinkedIn Engineering Blog',
        url: 'https://firebase.google.com/docs/cloud-messaging',
      },
      {
        title: 'Designing Data-Intensive Applications',
        authorOrOrg: 'Martin Kleppmann (Chapter 11, Stream Processing)',
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
    id: 17,
    slug: 'activity-feed',
    title: 'Activity Feed / Timeline (Etsy/Pinterest)',
    category: 'Social & Messaging',
    difficulty: 'Medium',
    problemStatement:
      'Design an activity feed aggregator generating personalized chronological event logs (e.g. pins, purchases, reviews) across user follow networks with denormalized fast reads.',
    constraints: {
      targetQps: 25000,
      dataSizeGb: 3000,
      maxP99LatencyMs: 35,
      availabilitySlaPercent: 99.95,
    },
    hints: [
      { step: 1, hint: 'Store user timeline pointers in Redis Lists / Sorted Sets.' },
      {
        step: 2,
        hint: 'Denormalize feed item previews to avoid multi-table JOIN queries on feed load.',
      },
      { step: 3, hint: 'Trim feed lists to top 800 items per user to bound memory consumption.' },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Web Client') },
        },
        {
          id: 'lb',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('load_balancer', 'lb', 'Feed Gateway LB') },
        },
        {
          id: 'timelineSvc',
          type: 'customComponent',
          position: { x: 500, y: 150 },
          data: { config: createDefaultConfig('app_server', 'timelineSvc', 'Timeline Service') },
        },
        {
          id: 'redisTimeline',
          type: 'customComponent',
          position: { x: 740, y: 80 },
          data: {
            config: createDefaultConfig('redis_cache', 'redisTimeline', 'Timeline Redis Cluster'),
          },
        },
        {
          id: 'db1',
          type: 'customComponent',
          position: { x: 740, y: 220 },
          data: { config: createDefaultConfig('nosql_db', 'db1', 'Activity Archive DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'lb', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'lb', target: 'timelineSvc', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'timelineSvc', target: 'redisTimeline', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'timelineSvc', target: 'db1', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why trim user timeline Redis lists to 800 items?',
        answer:
          '99% of user feed visits never scroll beyond 800 items; older historical timeline items can be queried from disk on demand, saving massive RAM costs.',
      },
      {
        question: 'How do you support unfollowing a user without rebuilding the whole feed?',
        answer:
          'Filter out unfollowed user items on-the-fly during read aggregation, or remove their item IDs via a background worker.',
      },
    ],
    sources: [
      {
        title: 'Activity Feeds at Scale',
        authorOrOrg: 'Etsy Engineering Blog',
        url: 'https://www.etsy.com/codeascraft',
      },
      {
        title: 'Building a Distributed Feed Architecture',
        authorOrOrg: 'Stream Engineering Blog',
        url: 'https://getstream.io/blog/',
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
];
