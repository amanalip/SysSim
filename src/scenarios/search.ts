import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const SEARCH_SCENARIOS: Scenario[] = [
  {
    id: 34,
    slug: 'web-search-engine',
    title: 'Web Search Engine (Google)',
    category: 'Search & Discovery',
    difficulty: 'Hard',
    problemStatement:
      'Design a web search engine capable of crawling billions of web pages, constructing inverted indexes, and serving ranked search queries in under 50 milliseconds.',
    constraints: {
      targetQps: 80000,
      dataSizeGb: 100000,
      maxP99LatencyMs: 50,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Construct an inverted index mapping terms to posting lists with term frequencies and positions.' },
      { step: 2, hint: 'Partition the search index by document ID across thousands of search index shards.' },
      { step: 3, hint: 'Use a multi-stage ranker: fast BM25 / TF-IDF retrieval on shards followed by heavy ML ranking at the root.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Search User') } },
        { id: 'gw', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'gw', 'Search Root / Aggregator') } },
        { id: 'idx1', type: 'customComponent', position: { x: 520, y: 70 }, data: { config: createDefaultConfig('search_index', 'idx1', 'Inverted Index Shard 1') } },
        { id: 'idx2', type: 'customComponent', position: { x: 520, y: 230 }, data: { config: createDefaultConfig('search_index', 'idx2', 'Inverted Index Shard 2') } },
        { id: 'ranker', type: 'customComponent', position: { x: 780, y: 150 }, data: { config: createDefaultConfig('app_server', 'ranker', 'ML PageRank Model') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'idx1', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'gw', target: 'idx2', data: { protocol: 'gRPC' } },
        { id: 'e4', source: 'gw', target: 'ranker', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why partition the search index by Document ID instead of Term / Keyword?',
        answer: 'Document partitioning allows local single-shard boolean query evaluation without network fanout between multiple keyword shards.',
      },
      {
        question: 'How do you handle tail query latency across thousands of search nodes?',
        answer: 'Google uses tied-request hedging: issue a backup request to a replica shard if no response is received within p95 latency.',
      },
    ],
    sources: [
      {
        title: 'The Anatomy of a Large-Scale Hypertextual Web Search Engine',
        authorOrOrg: 'Brin & Page (Computer Networks and ISDN Systems 1998)',
        url: 'http://infolab.stanford.edu/~backrub/google.html',
      },
      {
        title: 'The Tail at Scale',
        authorOrOrg: 'Jeffrey Dean and Luiz André Barroso (CACM 2013)',
        url: 'https://research.google/pubs/pub40801/',
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
    id: 35,
    slug: 'search-autocomplete',
    title: 'Search Autocomplete (Typeahead)',
    category: 'Search & Discovery',
    difficulty: 'Medium',
    problemStatement:
      'Design a real-time search autocomplete system returning top-5 query suggestions as the user types with sub-20 millisecond latency.',
    constraints: {
      targetQps: 60000,
      dataSizeGb: 500,
      maxP99LatencyMs: 20,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Store prefixes in a Trie (prefix tree) data structure in memory.' },
      { step: 2, hint: 'Pre-calculate and store the top-5 highest frequency search phrases directly at each Trie node.' },
      { step: 3, hint: 'Cache autocomplete results at the browser and edge CDN layers with 1-hour TTLs.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'User Browser') } },
        { id: 'cdn', type: 'customComponent', position: { x: 260, y: 70 }, data: { config: createDefaultConfig('cdn', 'cdn', 'Edge Autocomplete CDN') } },
        { id: 'app', type: 'customComponent', position: { x: 260, y: 220 }, data: { config: createDefaultConfig('app_server', 'app', 'Autocomplete API') } },
        { id: 'trieCache', type: 'customComponent', position: { x: 520, y: 150 }, data: { config: createDefaultConfig('redis_cache', 'trieCache', 'In-Memory Trie Store') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'cdn', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'c1', target: 'app', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'app', target: 'trieCache', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why precompute top suggestions at each Trie node instead of traversing down the subtree on query?',
        answer: 'Traversing the whole subtree has O(K) complexity where K is all descendants; precomputing bounds lookup complexity to O(L) where L is prefix length.',
      },
      {
        question: 'How do you update autocomplete suggestions with trending topics without rebuilding the Trie on every keystroke?',
        answer: 'Log searches asynchronously to Kafka and run a background worker to rebuild or merge updated Trie snapshots every 30-60 minutes.',
      },
    ],
    sources: [
      {
        title: 'System Design Interview: Design Search Autocomplete',
        authorOrOrg: 'Alex Xu (Volume 1, Chapter 13)',
        url: 'https://bytebytego.com',
      },
      {
        title: 'Typeahead Search at Facebook',
        authorOrOrg: 'Facebook Engineering Blog',
        url: 'https://engineering.fb.com',
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
    id: 36,
    slug: 'recommendation-engine',
    title: 'Personalized Recommendation Engine (Netflix/Amazon)',
    category: 'Search & Discovery',
    difficulty: 'Hard',
    problemStatement:
      'Design a two-stage recommendation pipeline (Candidate Generation -> Fine Ranking) delivering real-time personalized recommendations from catalogs of millions of items.',
    constraints: {
      targetQps: 50000,
      dataSizeGb: 8000,
      maxP99LatencyMs: 60,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Use vector embeddings and approximate nearest neighbors (ANN via Faiss / HNSW) for candidate generation.' },
      { step: 2, hint: 'Retrieve top 500 candidates and rank them using deep neural network ranking models.' },
      { step: 3, hint: 'Cache user feature vectors in an in-memory feature store for fast feature retrieval.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'App Client') } },
        { id: 'recGw', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('app_server', 'recGw', 'Rec Coordinator') } },
        { id: 'annIdx', type: 'customComponent', position: { x: 520, y: 70 }, data: { config: createDefaultConfig('search_index', 'annIdx', 'HNSW Vector Index') } },
        { id: 'featureStore', type: 'customComponent', position: { x: 520, y: 220 }, data: { config: createDefaultConfig('redis_cache', 'featureStore', 'Online Feature Store') } },
        { id: 'rankingModel', type: 'customComponent', position: { x: 780, y: 150 }, data: { config: createDefaultConfig('app_server', 'rankingModel', 'Deep Ranking Svc') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'recGw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'recGw', target: 'annIdx', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'recGw', target: 'featureStore', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'recGw', target: 'rankingModel', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is a two-stage recommendation architecture necessary instead of running deep ranking across all items?',
        answer: 'Running complex neural network inference across millions of catalog items is computationally impossible in 50ms; ANN quickly filters down to ~500 candidates.',
      },
      {
        question: 'How do you prevent recommending items the user has already consumed?',
        answer: 'Pass candidate lists through a fast In-Memory Bloom filter or Redis set of user interaction history to filter out seen items.',
      },
    ],
    sources: [
      {
        title: 'Deep Neural Networks for YouTube Recommendations',
        authorOrOrg: 'Covington et al. (RecSys 2016)',
        url: 'https://research.google/pubs/pub45530/',
      },
      {
        title: 'System Architectures for Personalization and Recommendation',
        authorOrOrg: 'Netflix Technology Blog',
        url: 'https://netflixtechblog.com',
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
    id: 37,
    slug: 'nearby-places',
    title: 'Proximity Search / Nearby Places (Yelp/Google Places)',
    category: 'Search & Discovery',
    difficulty: 'Medium',
    problemStatement:
      'Design a location-based proximity search engine allowing users to find businesses within a given radius (e.g. 5km) with category filters and real-time rating sorting.',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Index business coordinates using Geohashes or QuadTrees.' },
      { step: 2, hint: 'Query target geohash prefix and 8 adjacent neighboring geohashes to handle boundary edge cases.' },
      { step: 3, hint: 'Cache static business metadata in Redis and pre-compute high-density city zones.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Mobile App') } },
        { id: 'app', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('app_server', 'app', 'Proximity Search API') } },
        { id: 'geoIdx', type: 'customComponent', position: { x: 520, y: 80 }, data: { config: createDefaultConfig('search_index', 'geoIdx', 'Geohash Spatial Index') } },
        { id: 'bizDb', type: 'customComponent', position: { x: 520, y: 220 }, data: { config: createDefaultConfig('sql_db', 'bizDb', 'Business Details DB') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'app', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'app', target: 'geoIdx', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'app', target: 'bizDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is standard SQL `WHERE latitude BETWEEN x AND y` inefficient for spatial search?',
        answer: 'Two independent 1D B-Tree indexes require expensive intersection scans; 2D space-filling curves (Geohash / QuadTree) colocate nearby coordinates in 1D index space.',
      },
      {
        question: 'How do you handle boundary problems in Geohash partitioning?',
        answer: 'Always query the target geohash plus all 8 surrounding neighbor cells in parallel and filter by precise Haversine distance.',
      },
    ],
    sources: [
      {
        title: 'System Design Interview: Proximity Service',
        authorOrOrg: 'Alex Xu (Volume 2, Chapter 2)',
        url: 'https://bytebytego.com',
      },
      {
        title: 'Geohash: A Spatial Indexing Algorithm',
        authorOrOrg: 'Gustavo Niemeyer',
        url: 'https://geohash.org',
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
    id: 38,
    slug: 'hotel-booking',
    title: 'Hotel & Vacation Booking (Airbnb/Booking)',
    category: 'Search & Discovery',
    difficulty: 'Medium',
    problemStatement:
      'Design a lodging reservation platform supporting dynamic date range search, room inventory availability checks, price calendar queries, and strict double-booking prevention.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 1500,
      maxP99LatencyMs: 40,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Model availability as individual date-room inventory records (room_id, date, status).' },
      { step: 2, hint: 'Use relational database transactions with row-level locks or pessimistic locking during reservation checkout.' },
      { step: 3, hint: 'Cache listing search results and date availability bitmaps in Redis.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Traveler App') } },
        { id: 'gw', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'gw', 'Booking Gateway') } },
        { id: 'searchSvc', type: 'customComponent', position: { x: 500, y: 70 }, data: { config: createDefaultConfig('app_server', 'searchSvc', 'Listing Search Svc') } },
        { id: 'reserveSvc', type: 'customComponent', position: { x: 500, y: 220 }, data: { config: createDefaultConfig('app_server', 'reserveSvc', 'Reservation Svc') } },
        { id: 'hotelDb', type: 'customComponent', position: { x: 740, y: 150 }, data: { config: createDefaultConfig('sql_db', 'hotelDb', 'Transactional Room DB') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'searchSvc', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'gw', target: 'reserveSvc', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'reserveSvc', target: 'hotelDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you prevent race condition double-bookings across the same date range?',
        answer: 'Execute SQL transactional range reservation with unique composite key constraints (room_id, date) or SELECT ... FOR UPDATE pessimistic locks.',
      },
      {
        question: 'How do you scale high search queries for popular tourist destinations without database overload?',
        answer: 'Maintain daily room availability bitmasks in Redis; check if (search_dates & room_availability_mask) === 0 before querying database details.',
      },
    ],
    sources: [
      {
        title: 'System Design Interview: Hotel Reservation System',
        authorOrOrg: 'Alex Xu (Volume 2, Chapter 7)',
        url: 'https://bytebytego.com',
      },
      {
        title: 'How Airbnb Scales Its Search Infrastructure',
        authorOrOrg: 'Airbnb Engineering & Data Science',
        url: 'https://medium.com/airbnb-engineering',
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
    id: 39,
    slug: 'job-board',
    title: 'Job Board & Candidate Search (LinkedIn Jobs)',
    category: 'Search & Discovery',
    difficulty: 'Medium',
    problemStatement:
      'Design a professional job search and matching platform supporting faceted filtering (location, company, salary, experience), instant email alerts on new postings, and applicant tracking.',
    constraints: {
      targetQps: 25000,
      dataSizeGb: 1000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.95,
    },
    hints: [
      { step: 1, hint: 'Index job postings in Elasticsearch with structured facet aggregations.' },
      { step: 2, hint: 'Store saved candidate search alert filters in a percolation index to match newly posted jobs instantly.' },
      { step: 3, hint: 'Emit application events to Kafka to update applicant counts and recruiter dashboards.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Job Seeker') } },
        { id: 'gw', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'gw', 'Jobs Gateway') } },
        { id: 'jobSvc', type: 'customComponent', position: { x: 500, y: 150 }, data: { config: createDefaultConfig('app_server', 'jobSvc', 'Job Posting Service') } },
        { id: 'es', type: 'customComponent', position: { x: 740, y: 80 }, data: { config: createDefaultConfig('search_index', 'es', 'Elasticsearch Cluster') } },
        { id: 'jobDb', type: 'customComponent', position: { x: 740, y: 220 }, data: { config: createDefaultConfig('sql_db', 'jobDb', 'Job Applications DB') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'jobSvc', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'jobSvc', target: 'es', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'jobSvc', target: 'jobDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is Elasticsearch Percolate Query and how does it power job alerts?',
        answer: 'Percolation indexes queries instead of documents; when a new job posting arrives, percolation returns all registered candidate search alerts matching that job in real time.',
      },
      {
        question: 'How do you handle multi-attribute faceted aggregation under high read traffic?',
        answer: 'Utilize Elasticsearch doc_values column-oriented caches combined with edge caching of popular category combinations.',
      },
    ],
    sources: [
      {
        title: 'Building LinkedIn Jobs Search Platform',
        authorOrOrg: 'LinkedIn Engineering Blog',
        url: 'https://engineering.linkedin.com',
      },
      {
        title: 'Elasticsearch: The Definitive Guide',
        authorOrOrg: 'Clinton Gormley, Zachary Tong (O\'Reilly)',
        url: 'https://www.elastic.co/guide/',
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
    id: 40,
    slug: 'ad-serving',
    title: 'Real-Time Ad Serving & Auction Engine (Google Ads)',
    category: 'Search & Discovery',
    difficulty: 'Hard',
    problemStatement:
      'Design an ultra-low-latency real-time ad bidding and selection system. The engine must filter eligible ad campaigns, score CTR/conversion models, and return targeted ad placements within 25 milliseconds.',
    constraints: {
      targetQps: 150000,
      dataSizeGb: 5000,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Colocate all active ad campaigns and budget pacing states in local RAM across ad server nodes.' },
      { step: 2, hint: 'Execute campaign filtering, auction ranking (e.g. eCPM = bid * predicted_CTR), and budget deduction in memory.' },
      { step: 3, hint: 'Log impression, click, and conversion events asynchronously to Kafka for billing aggregation.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Publisher Ad Tag') } },
        { id: 'adServer', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'adServer', 'Ad Selection Engine') } },
        { id: 'budgetStore', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('redis_cache', 'budgetStore', 'Real-time Budget Cache') } },
        { id: 'clickMq', type: 'customComponent', position: { x: 540, y: 220 }, data: { config: createDefaultConfig('message_queue', 'clickMq', 'Billing Event Kafka') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'adServer', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'adServer', target: 'budgetStore', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'adServer', target: 'clickMq', data: { protocol: 'pub/sub' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do ad servers maintain sub-25ms SLA without hitting backend databases?',
        answer: 'Ad metadata and targeted user segment indexes are held 100% in server memory; local machine RAM eliminates network round-trips.',
      },
      {
        question: 'How do you prevent budget overspending when an advertiser sets a $100 daily limit?',
        answer: 'Use probabilistic budget pacing algorithms that gradually throttle impression serving rates as remaining budget approaches zero.',
      },
    ],
    sources: [
      {
        title: 'Real-Time Bidding (RTB) Architecture',
        authorOrOrg: 'IAB OpenRTB Standard',
        url: 'https://iabtechlab.com/standards/openrtb/',
      },
      {
        title: 'System Design Interview: Real-time Gaming / Ad Bidding',
        authorOrOrg: 'Alex Xu',
        url: 'https://bytebytego.com',
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
    id: 41,
    slug: 'content-discovery',
    title: 'Short-Form Video Discovery (TikTok)',
    category: 'Search & Discovery',
    difficulty: 'Hard',
    problemStatement:
      'Design a high-throughput content discovery and recommendation stream serving personalized short-form video sequences with continuous real-time watch-time feedback loops.',
    constraints: {
      targetQps: 90000,
      dataSizeGb: 20000,
      maxP99LatencyMs: 40,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Stream user interaction telemetry (watch duration, loops, skips) in real time to streaming feature extractors.' },
      { step: 2, hint: 'Combine multi-task learning models (predicting like, share, finish rate) to generate ranked video candidate queues.' },
      { step: 3, hint: 'Pre-cache and pre-fetch the next 3 video clips at the mobile player layer.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'TikTok App') } },
        { id: 'feedApi', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('app_server', 'feedApi', 'ForYou Feed API') } },
        { id: 'annVector', type: 'customComponent', position: { x: 500, y: 70 }, data: { config: createDefaultConfig('search_index', 'annVector', 'Video Embedding Index') } },
        { id: 'realtimeFeedback', type: 'customComponent', position: { x: 500, y: 220 }, data: { config: createDefaultConfig('message_queue', 'realtimeFeedback', 'Watch Telemetry Kafka') } },
        { id: 'recModel', type: 'customComponent', position: { x: 740, y: 150 }, data: { config: createDefaultConfig('app_server', 'recModel', 'Multi-Task Ranking GPU Fleet') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'feedApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'c1', target: 'realtimeFeedback', data: { protocol: 'pub/sub' } },
        { id: 'e3', source: 'feedApi', target: 'annVector', data: { protocol: 'gRPC' } },
        { id: 'e4', source: 'feedApi', target: 'recModel', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is watch-time completion rate more predictive than simple likes in short-form video?',
        answer: 'Watch-time captures implicit behavioral signals on every video seamlessly without requiring explicit active user button taps.',
      },
      {
        question: 'How do you prevent the recommendation algorithm from trapping users in narrow filter bubbles?',
        answer: 'Inject exploration exploration bands (epsilon-greedy / bandit algorithms) introducing 5-10% diverse and trending cold-start content.',
      },
    ],
    sources: [
      {
        title: 'Monolith: Real Time Recommendation System with Collisionless Embedding Table',
        authorOrOrg: 'ByteDance AI (arXiv:2209.07663)',
        url: 'https://arxiv.org/abs/2209.07663',
      },
      {
        title: 'Deep Multi-Task Learning for Recommendation Systems',
        authorOrOrg: 'Zhao et al. (KDD 2019)',
        url: 'https://dl.acm.org',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 90000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
];
