import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const GAMING_SCENARIOS: Scenario[] = [
  {
    id: 76,
    slug: 'multiplayer-game-server',
    title: 'Multiplayer Game Server Architecture (Fortnite/Valorant)',
    category: 'Gaming',
    difficulty: 'Hard',
    problemStatement:
      'Design a dedicated authoritative game server orchestration platform running physics simulations at 60-128 Hz tick rates, synchronizing player state over UDP with lag compensation.',
    constraints: {
      targetQps: 120000,
      dataSizeGb: 1000,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Run dedicated game server instances (Unreal Engine / Unity) on Kubernetes using Agones.',
      },
      { step: 2, hint: 'Send fast delta-compressed binary game state packets over raw UDP.' },
      {
        step: 3,
        hint: 'Implement server-authoritative rewind lag compensation to validate hit registration.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'player1',
          type: 'customComponent',
          position: { x: 50, y: 70 },
          data: { config: createDefaultConfig('client', 'player1', 'Game Client 1') },
        },
        {
          id: 'player2',
          type: 'customComponent',
          position: { x: 50, y: 230 },
          data: { config: createDefaultConfig('client', 'player2', 'Game Client 2') },
        },
        {
          id: 'agonesDGS',
          type: 'customComponent',
          position: { x: 300, y: 150 },
          data: {
            config: createDefaultConfig(
              'app_server',
              'agonesDGS',
              'Agones Dedicated Game Server (UDP 60Hz)',
            ),
          },
        },
        {
          id: 'matchState',
          type: 'customComponent',
          position: { x: 580, y: 150 },
          data: { config: createDefaultConfig('redis_cache', 'matchState', 'Match Redis State') },
        },
      ],
      edges: [
        { id: 'e1', source: 'player1', target: 'agonesDGS', data: { protocol: 'UDP' } },
        { id: 'e2', source: 'player2', target: 'agonesDGS', data: { protocol: 'UDP' } },
        { id: 'e3', source: 'agonesDGS', target: 'matchState', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'Why must dedicated game servers be authoritative rather than peer-to-peer (P2P)?',
        answer:
          'Authoritative servers simulate all physics and collisions centrally, preventing client-side cheating (speed hacks, teleporting, wall-shots) and desync discrepancies.',
      },
      {
        question:
          'How does client-side prediction and server reconciliation eliminate perceived lag?',
        answer:
          'The client applies local input immediately without waiting for server confirmation; when server state arrives, the client replays unacknowledged inputs from the verified server state.',
      },
    ],
    sources: [
      {
        title: 'Agones: Dedicated Game Server Hosting on Kubernetes',
        authorOrOrg: 'Google Cloud & Ubisoft',
        url: 'https://agones.dev',
      },
      {
        title: 'Fast-Paced Multiplayer: Client-Side Prediction and Server Reconciliation',
        authorOrOrg: 'Gabriel Gambetta',
        url: 'https://gabrielgambetta.com/client-side-prediction-server-reconciliation.html',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 120000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 77,
    slug: 'matchmaking-system',
    title: 'Matchmaking System (Open Match)',
    category: 'Gaming',
    difficulty: 'Medium',
    problemStatement:
      'Design a skill-based matchmaking (SBMM) engine grouping queued players into fair, balanced matches based on MMR rating, latency ping, and party size with sub-30 second queue times.',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 200,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Store queued matchmaking tickets in an In-Memory cache (Redis).' },
      {
        step: 2,
        hint: 'Run concurrent match function workers (Open Match) pulling compatible tickets and expanding MMR tolerance over time.',
      },
      {
        step: 3,
        hint: 'Allocate dedicated game servers via director services upon match creation.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'players',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'players', 'Queued Players') },
        },
        {
          id: 'matchFrontend',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: {
            config: createDefaultConfig('api_gateway', 'matchFrontend', 'Matchmaking Frontend'),
          },
        },
        {
          id: 'ticketStore',
          type: 'customComponent',
          position: { x: 540, y: 80 },
          data: {
            config: createDefaultConfig('redis_cache', 'ticketStore', 'Queue Ticket Store (Redis)'),
          },
        },
        {
          id: 'matchEvaluator',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: { config: createDefaultConfig('worker', 'matchEvaluator', 'Open Match Evaluator') },
        },
        {
          id: 'director',
          type: 'customComponent',
          position: { x: 800, y: 150 },
          data: { config: createDefaultConfig('app_server', 'director', 'Agones Director') },
        },
      ],
      edges: [
        { id: 'e1', source: 'players', target: 'matchFrontend', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'matchFrontend', target: 'ticketStore', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'matchEvaluator', target: 'ticketStore', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'matchEvaluator', target: 'director', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you prevent players from waiting indefinitely in high-skill brackets?',
        answer:
          'Apply dynamic expansion windows: start with a tight +/- 50 MMR window, expanding by 25 MMR every 5 seconds until a match candidate is found.',
      },
      {
        question:
          'How do you prevent match ticket collision when multiple match functions run concurrently?',
        answer:
          'The match evaluator holds atomic reservation locks on tickets in Redis and releases unselected tickets if assignment fails.',
      },
    ],
    sources: [
      {
        title: 'Open Match: Flexible Matchmaking Framework for Games',
        authorOrOrg: 'Google Cloud & Unity Technologies',
        url: 'https://open-match.dev',
      },
      {
        title: 'Matchmaking in Halo 3: The TrueSkill Ranking System',
        authorOrOrg: 'Microsoft Research (NIPS 2006)',
        url: 'https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/',
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
    id: 78,
    slug: 'in-game-economy',
    title: 'In-Game Economy & Microtransactions',
    category: 'Gaming',
    difficulty: 'Medium',
    problemStatement:
      'Design an in-game virtual currency, marketplace, and inventory system guaranteeing ACID transaction safety against duplicate item duping and balance corruption.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 1000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Store user inventory and virtual currency balances in a strongly consistent relational database with row-level locks.',
      },
      {
        step: 2,
        hint: 'Use double-entry bookkeeping ledgers for all virtual currency additions and item trades.',
      },
      { step: 3, hint: 'Enforce strict idempotency tokens on all client store purchase requests.' },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Game Client') },
        },
        {
          id: 'storeApi',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'storeApi', 'Economy Service') },
        },
        {
          id: 'inventoryDb',
          type: 'customComponent',
          position: { x: 540, y: 80 },
          data: { config: createDefaultConfig('sql_db', 'inventoryDb', 'Item Inventory DB') },
        },
        {
          id: 'ledgerDb',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: { config: createDefaultConfig('sql_db', 'ledgerDb', 'Currency Ledger DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'storeApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'storeApi', target: 'inventoryDb', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'storeApi', target: 'ledgerDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do malicious players attempt item duping exploits, and how do you prevent them?',
        answer:
          'Duping exploits trade items across two sessions during asynchronous database writes or server crash windows; strict ACID serializable transactions on item ownership prevent duping.',
      },
      {
        question: 'How do you handle real-money app store in-app purchase validation?',
        answer:
          'The game server verifies Apple/Google receipt cryptographic signatures server-to-server before minting virtual currency.',
      },
    ],
    sources: [
      {
        title: 'Building Resilient In-Game Economy Architectures',
        authorOrOrg: 'Riot Games Technology Blog',
        url: 'https://technology.riotgames.com',
      },
      {
        title: 'Enterprise Integration Patterns for Virtual Currency',
        authorOrOrg: 'Gregor Hohpe',
        url: 'https://www.enterpriseintegrationpatterns.com',
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
    id: 79,
    slug: 'global-game-leaderboard',
    title: 'Global Gaming Seasonal Leaderboard',
    category: 'Gaming',
    difficulty: 'Easy',
    problemStatement:
      'Design a global seasonal game leaderboard tracking top ranks across regional shards, calculating percentile ranks, and executing season reset snapshots.',
    constraints: {
      targetQps: 50000,
      dataSizeGb: 100,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Store live player ranks in Redis Sorted Sets per region.' },
      {
        step: 2,
        hint: 'Merge top-1000 regional player scores into a global leaderboard via periodic workers.',
      },
      {
        step: 3,
        hint: 'Archive completed seasonal snapshots to object storage and reset Redis keys atomically.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Game Client') },
        },
        {
          id: 'lbApi',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'lbApi', 'Leaderboard API') },
        },
        {
          id: 'redisZset',
          type: 'customComponent',
          position: { x: 540, y: 80 },
          data: { config: createDefaultConfig('redis_cache', 'redisZset', 'Seasonal Redis ZSET') },
        },
        {
          id: 'seasonArchive',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: {
            config: createDefaultConfig('object_storage', 'seasonArchive', 'Historical Seasons S3'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'lbApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'lbApi', target: 'redisZset', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'lbApi', target: 'seasonArchive', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          "How do you query a user's exact rank and relative neighborhood (3 above, 3 below)?",
        answer:
          'Use Redis ZREVRANK to get the player rank index, followed by ZREVRANGE with an offset window [rank-3, rank+3].',
      },
      {
        question: 'How do you perform a season reset without dropping incoming score submissions?',
        answer:
          'Switch application writes to a newly versioned Redis key (e.g. season:14), then dump and archive the completed season:13 key in the background.',
      },
    ],
    sources: [
      {
        title: 'Redis Leaderboard Architecture Best Practices',
        authorOrOrg: 'Redis University',
        url: 'https://university.redis.com',
      },
      {
        title: 'How Supercell Scales Game Backend Infrastructure',
        authorOrOrg: 'Supercell Tech Blog',
        url: 'https://supercell.com',
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
];
