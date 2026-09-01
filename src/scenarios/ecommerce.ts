import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const ECOMMERCE_SCENARIOS: Scenario[] = [
  {
    id: 25,
    slug: 'ecommerce-platform',
    title: 'E-Commerce Marketplace (Amazon)',
    category: 'E-Commerce & Payments',
    difficulty: 'Hard',
    problemStatement:
      'Design a comprehensive e-commerce marketplace supporting product catalog search, shopping carts, order orchestration with Saga pattern, and inventory decrement guarantees.',
    constraints: {
      targetQps: 45000,
      dataSizeGb: 20000,
      maxP99LatencyMs: 60,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Separate microservices for Product Catalog, Shopping Cart, Order Checkout, and Inventory.',
      },
      { step: 2, hint: 'Use Elasticsearch / OpenSearch for product search and faceted filtering.' },
      {
        step: 3,
        hint: 'Coordinate order checkout across services using the Saga Orchestrator pattern with compensating transactions.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Shopper') },
        },
        {
          id: 'gw',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('api_gateway', 'gw', 'Commerce Gateway') },
        },
        {
          id: 'orderSvc',
          type: 'customComponent',
          position: { x: 500, y: 70 },
          data: { config: createDefaultConfig('app_server', 'orderSvc', 'Order Orchestrator') },
        },
        {
          id: 'catalogSvc',
          type: 'customComponent',
          position: { x: 500, y: 220 },
          data: { config: createDefaultConfig('app_server', 'catalogSvc', 'Catalog Service') },
        },
        {
          id: 'orderDb',
          type: 'customComponent',
          position: { x: 740, y: 70 },
          data: { config: createDefaultConfig('sql_db', 'orderDb', 'Order DB (PostgreSQL)') },
        },
        {
          id: 'searchIdx',
          type: 'customComponent',
          position: { x: 740, y: 220 },
          data: {
            config: createDefaultConfig('search_index', 'searchIdx', 'Elasticsearch Catalog'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'orderSvc', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'gw', target: 'catalogSvc', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'orderSvc', target: 'orderDb', data: { protocol: 'TCP' } },
        { id: 'e5', source: 'catalogSvc', target: 'searchIdx', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why avoid 2-Phase Commit (2PC) in modern distributed microservices?',
        answer:
          '2PC is a blocking protocol that reduces system throughput and availability if any participating node fails or stalls; Saga pattern with compensation transactions is preferred.',
      },
      {
        question:
          'How do you handle flash promotions without locking the whole inventory database?',
        answer:
          'Pre-allocate inventory quotas in Redis and use atomic DECR with Lua scripts to validate stock before persisting orders.',
      },
    ],
    sources: [
      {
        title: 'Microservices Patterns: With Examples in Java',
        authorOrOrg: 'Chris Richardson (Manning Publications)',
        url: 'https://microservices.io',
      },
      {
        title: 'Amazon DynamoDB: A Scalable, Predictably Performant NoSQL Database Service',
        authorOrOrg: 'Elhemali et al. (USENIX ATC 2022)',
        url: 'https://www.usenix.org/conference/atc22/presentation/elhemali',
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
    id: 26,
    slug: 'payment-system',
    title: 'Payment Gateway (Stripe)',
    category: 'E-Commerce & Payments',
    difficulty: 'Hard',
    problemStatement:
      'Design a secure, fault-tolerant payment processing system supporting double-entry bookkeeping, guaranteed idempotency for all charge calls, and automated reconciliations.',
    constraints: {
      targetQps: 10000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 100,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Enforce strict idempotency keys stored in an ACID database or distributed lock before processing charges.',
      },
      {
        step: 2,
        hint: 'Implement double-entry accounting ledgers where every transaction has matching Debit and Credit entries.',
      },
      {
        step: 3,
        hint: 'Run daily background reconciliation jobs against bank settlement statements.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Merchant Client') },
        },
        {
          id: 'gw',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('api_gateway', 'gw', 'Payment API Gateway') },
        },
        {
          id: 'paySvc',
          type: 'customComponent',
          position: { x: 500, y: 150 },
          data: { config: createDefaultConfig('app_server', 'paySvc', 'Payment Processing Svc') },
        },
        {
          id: 'ledgerDb',
          type: 'customComponent',
          position: { x: 740, y: 80 },
          data: { config: createDefaultConfig('sql_db', 'ledgerDb', 'Double-Entry Ledger DB') },
        },
        {
          id: 'bankConn',
          type: 'customComponent',
          position: { x: 740, y: 220 },
          data: { config: createDefaultConfig('app_server', 'bankConn', 'Card Network Connector') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'paySvc', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'paySvc', target: 'ledgerDb', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'paySvc', target: 'bankConn', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you guarantee a customer is never double-charged during network timeout retries?',
        answer:
          'Require client to provide a unique UUID Idempotency-Key; the payment server checks this key in a transactional database table and returns the existing result if already processed.',
      },
      {
        question: 'Why is double-entry ledger bookkeeping mandatory in financial architectures?',
        answer:
          'Double-entry ensures total debits equal total credits across all accounts, guaranteeing mathematical invariance and catching ledger balance discrepancies immediately.',
      },
    ],
    sources: [
      {
        title: 'Designing Robust Payment Systems',
        authorOrOrg: 'Gergely Orosz (The Pragmatic Engineer)',
        url: 'https://newsletter.pragmaticengineer.com',
      },
      {
        title: 'System Design Interview: Payment System',
        authorOrOrg: 'Alex Xu (Volume 2, Chapter 4)',
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
    id: 27,
    slug: 'flash-sale',
    title: 'Flash Sale & Ticket Booking (Ticketmaster)',
    category: 'E-Commerce & Payments',
    difficulty: 'Medium',
    problemStatement:
      'Design a high-concurrency ticket booking engine handling extreme traffic spikes (100,000+ users competing for 5,000 seats). The system must prevent overselling and support 10-minute temporary seat reservations.',
    constraints: {
      targetQps: 80000,
      dataSizeGb: 500,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Place an edge Virtual Waiting Room / Queue before the checkout gateway to throttle concurrency.',
      },
      {
        step: 2,
        hint: 'Store seat inventory in Redis and execute atomic reservation scripts using Redis Lua scripts.',
      },
      {
        step: 3,
        hint: 'Release reserved seats automatically after 10 minutes if payment is not completed.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Shopper') },
        },
        {
          id: 'waitingRoom',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: {
            config: createDefaultConfig('rate_limiter', 'waitingRoom', 'Virtual Waiting Room'),
          },
        },
        {
          id: 'bookSvc',
          type: 'customComponent',
          position: { x: 500, y: 150 },
          data: { config: createDefaultConfig('app_server', 'bookSvc', 'Booking Service') },
        },
        {
          id: 'seatCache',
          type: 'customComponent',
          position: { x: 740, y: 80 },
          data: {
            config: createDefaultConfig('redis_cache', 'seatCache', 'Atomic Seat Inventory'),
          },
        },
        {
          id: 'bookDb',
          type: 'customComponent',
          position: { x: 740, y: 220 },
          data: { config: createDefaultConfig('sql_db', 'bookDb', 'Confirmed Bookings DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'waitingRoom', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'waitingRoom', target: 'bookSvc', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'bookSvc', target: 'seatCache', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'bookSvc', target: 'bookDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do Lua scripts in Redis prevent seat overselling under extreme concurrency?',
        answer:
          'Redis executes Lua scripts single-threadedly and atomically; it checks remaining seat count and decrements it within a single atomic step without race conditions.',
      },
      {
        question: 'How does the Virtual Waiting Room control downstream pressure?',
        answer:
          'Users are assigned a queue position; the waiting room only admits N users per second into checkout according to database processing capacity.',
      },
    ],
    sources: [
      {
        title: 'How Ticketmaster Manages High Demand On-Sales',
        authorOrOrg: 'Ticketmaster Technology',
        url: 'https://tech.ticketmaster.com',
      },
      {
        title: 'System Design Interview: Digital Wallet / Flash Sale',
        authorOrOrg: 'Alex Xu (Volume 2)',
        url: 'https://bytebytego.com',
      },
    ],
    trafficPreset: {
      pattern: 'spike',
      baseQps: 80000,
      burstMultiplier: 5,
      rampDurationSec: 10,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 28,
    slug: 'ride-sharing',
    title: 'Ride Sharing Dispatch (Uber/Lyft)',
    category: 'E-Commerce & Payments',
    difficulty: 'Hard',
    problemStatement:
      'Design a real-time ride dispatch platform processing geospatial driver location pings every 4 seconds, matching riders with nearby available drivers, and calculating dynamic surge pricing.',
    constraints: {
      targetQps: 70000,
      dataSizeGb: 4000,
      maxP99LatencyMs: 40,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Index geospatial coordinates using Uber H3 hexagonal spatial indexes or Google S2 cells.',
      },
      {
        step: 2,
        hint: 'Store live driver locations in In-Memory spatial datastores (Redis GEO / Ringpop) with short TTLs.',
      },
      {
        step: 3,
        hint: 'Calculate surge pricing factors per hexagon cell based on live supply vs demand ratios.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'driver',
          type: 'customComponent',
          position: { x: 50, y: 70 },
          data: { config: createDefaultConfig('client', 'driver', 'Driver GPS App') },
        },
        {
          id: 'rider',
          type: 'customComponent',
          position: { x: 50, y: 220 },
          data: { config: createDefaultConfig('client', 'rider', 'Rider App') },
        },
        {
          id: 'locGw',
          type: 'customComponent',
          position: { x: 280, y: 70 },
          data: { config: createDefaultConfig('app_server', 'locGw', 'Location Ingest Gateway') },
        },
        {
          id: 'dispatchSvc',
          type: 'customComponent',
          position: { x: 280, y: 220 },
          data: {
            config: createDefaultConfig('app_server', 'dispatchSvc', 'Dispatch Matching Engine'),
          },
        },
        {
          id: 'geoStore',
          type: 'customComponent',
          position: { x: 540, y: 150 },
          data: { config: createDefaultConfig('redis_cache', 'geoStore', 'H3 Spatial Hex Store') },
        },
      ],
      edges: [
        { id: 'e1', source: 'driver', target: 'locGw', data: { protocol: 'gRPC' } },
        { id: 'e2', source: 'rider', target: 'dispatchSvc', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'locGw', target: 'geoStore', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'dispatchSvc', target: 'geoStore', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why choose Uber H3 hexagonal cells over square geohash grids?',
        answer:
          'Hexagons have identical distance to all 6 neighboring cells, eliminating edge-distortion anomalies present in rectangular grids.',
      },
      {
        question: 'Why discard driver GPS update history from the hot dispatch path?',
        answer:
          'Dispatch only requires the latest instantaneous location; historical trajectory points can be shipped asynchronously to an analytics data lake via Kafka.',
      },
    ],
    sources: [
      {
        title: 'H3: Uber’s Hexagonal Hierarchical Spatial Index',
        authorOrOrg: 'Isaac Brodsky (Uber Engineering)',
        url: 'https://www.uber.com/ae/en/blog/h3/',
      },
      {
        title: 'How Uber Scales Its Real-Time Marketplace',
        authorOrOrg: 'Uber Engineering Blog',
        url: 'https://eng.uber.com',
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
    id: 29,
    slug: 'food-delivery',
    title: 'Food Delivery Platform (DoorDash)',
    category: 'E-Commerce & Payments',
    difficulty: 'Hard',
    problemStatement:
      'Design a 3-sided marketplace coordinating customers, restaurants, and couriers. The system must estimate accurate food prep & delivery ETAs and route orders dynamically.',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 3000,
      maxP99LatencyMs: 50,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Model order state transitions with an event-driven state machine (Placed, Accepted, Cooking, Picked Up, Delivered).',
      },
      {
        step: 2,
        hint: 'Use asynchronous message queues to orchestrate notifications between merchant and courier fleets.',
      },
      {
        step: 3,
        hint: 'Predict ETAs using machine learning models feeding on historical cooking and travel times.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Consumer App') },
        },
        {
          id: 'gw',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('api_gateway', 'gw', 'Order Gateway') },
        },
        {
          id: 'stateEngine',
          type: 'customComponent',
          position: { x: 500, y: 150 },
          data: { config: createDefaultConfig('app_server', 'stateEngine', 'Order State Machine') },
        },
        {
          id: 'eventBus',
          type: 'customComponent',
          position: { x: 740, y: 150 },
          data: { config: createDefaultConfig('message_queue', 'eventBus', 'Kafka Order Events') },
        },
        {
          id: 'orderDb',
          type: 'customComponent',
          position: { x: 500, y: 280 },
          data: { config: createDefaultConfig('sql_db', 'orderDb', 'Order & Menu DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'stateEngine', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'stateEngine', target: 'orderDb', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'stateEngine', target: 'eventBus', data: { protocol: 'pub/sub' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you prevent courier dispatch before restaurant confirms order preparation?',
        answer:
          'Hold the courier dispatch event in a delayed queue or trigger dispatch conditionally when restaurant marks prep completion or predicted prep threshold is reached.',
      },
      {
        question: 'How do you handle menu updates without breaking in-flight customer carts?',
        answer:
          'Cart items store immutable item snapshots and price versions at checkout time rather than mutating active catalog records.',
      },
    ],
    sources: [
      {
        title: 'Scaling DoorDash’s Dispatch and Logistics Engine',
        authorOrOrg: 'DoorDash Engineering Blog',
        url: 'https://doordash.engineering',
      },
      {
        title: 'Event-Driven Consumer Pattern',
        authorOrOrg: 'Enterprise Integration Patterns',
        url: 'https://www.enterpriseintegrationpatterns.com/patterns/messaging/EventDrivenConsumer.html',
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
    id: 30,
    slug: 'auction-system',
    title: 'Real-Time Bidding & Auction (eBay)',
    category: 'E-Commerce & Payments',
    difficulty: 'Medium',
    problemStatement:
      'Design an online auction platform supporting real-time bid updates, proxy bidding logic, and auction ending snipers with millisecond synchronization.',
    constraints: {
      targetQps: 25000,
      dataSizeGb: 1000,
      maxP99LatencyMs: 20,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Coordinate auction bids for a specific item using a distributed lock or partition bids by item ID.',
      },
      {
        step: 2,
        hint: 'Broadcast updated top bids immediately to all active watchers over WebSockets.',
      },
      {
        step: 3,
        hint: 'Schedule auction closing deadlines using a reliable distributed task scheduler.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'bidder',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'bidder', 'Bidding Client') },
        },
        {
          id: 'wsGw',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('app_server', 'wsGw', 'Bid WebSocket Gateway') },
        },
        {
          id: 'bidSvc',
          type: 'customComponent',
          position: { x: 500, y: 150 },
          data: { config: createDefaultConfig('app_server', 'bidSvc', 'Auction Coordinator') },
        },
        {
          id: 'bidCache',
          type: 'customComponent',
          position: { x: 740, y: 80 },
          data: { config: createDefaultConfig('redis_cache', 'bidCache', 'Current Highest Bid') },
        },
        {
          id: 'bidDb',
          type: 'customComponent',
          position: { x: 740, y: 220 },
          data: { config: createDefaultConfig('sql_db', 'bidDb', 'Bid History Ledger') },
        },
      ],
      edges: [
        { id: 'e1', source: 'bidder', target: 'wsGw', data: { protocol: 'WebSocket' } },
        { id: 'e2', source: 'wsGw', target: 'bidSvc', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'bidSvc', target: 'bidCache', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'bidSvc', target: 'bidDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you handle two identical high bids submitted in the exact same millisecond?',
        answer:
          'Serialize bids per auction through a single partition thread or Redis Lua lock so the first accepted transaction wins and subsequent bids are evaluated against the updated price.',
      },
      {
        question: 'What is proxy bidding and where is it calculated?',
        answer:
          'The system automatically increases the current bid by the minimum increment on behalf of a bidder up to their secret maximum ceiling.',
      },
    ],
    sources: [
      {
        title: 'Building Real-time Bidding Platforms',
        authorOrOrg: 'eBay Tech Blog',
        url: 'https://tech.ebayinc.com',
      },
      {
        title: 'High Performance MySQL: Real-time Bidding Patterns',
        authorOrOrg: "Silvia Botros (O'Reilly)",
        url: 'https://www.oreilly.com',
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
    id: 31,
    slug: 'coupon-system',
    title: 'Coupon & Promotion Engine',
    category: 'E-Commerce & Payments',
    difficulty: 'Medium',
    problemStatement:
      'Design a promotional discount engine that evaluates complex promo eligibility rules, manages global redemption usage limits, and prevents promo code abuse across checkouts.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 500,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Cache active promotion rules and validation logic in fast In-Memory stores.',
      },
      { step: 2, hint: 'Track promo redemption counts atomically in Redis (INCRBY / Lua).' },
      {
        step: 3,
        hint: 'Apply rate limiting per user/device fingerprint to prevent promo code brute-forcing.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Checkout Client') },
        },
        {
          id: 'promoApi',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'promoApi', 'Promo Rule Evaluator') },
        },
        {
          id: 'ruleCache',
          type: 'customComponent',
          position: { x: 540, y: 70 },
          data: { config: createDefaultConfig('redis_cache', 'ruleCache', 'Active Promo Rules') },
        },
        {
          id: 'quotaStore',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: {
            config: createDefaultConfig('redis_cache', 'quotaStore', 'Atomic Redemption Counter'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'promoApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'promoApi', target: 'ruleCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'promoApi', target: 'quotaStore', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you prevent exceeding a 10,000 global coupon limit when 50,000 users click apply at the same second?',
        answer:
          'Execute atomic Redis decrement against initial stock counter; only successful non-negative decrements proceed to checkout application.',
      },
      {
        question: 'What happens if a user applies a coupon but abandons the cart?',
        answer:
          'Hold reservations with short TTLs or only decrement the official quota when order payment confirmation is received.',
      },
    ],
    sources: [
      {
        title: 'Promotion and Coupon Architecture at Scale',
        authorOrOrg: 'Shopify Engineering Blog',
        url: 'https://shopify.engineering',
      },
      {
        title: 'System Design Interview: Coupon & Promotions',
        authorOrOrg: 'Alex Xu',
        url: 'https://bytebytego.com',
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
    id: 32,
    slug: 'inventory-management',
    title: 'Distributed Inventory Management',
    category: 'E-Commerce & Payments',
    difficulty: 'Medium',
    problemStatement:
      'Design a warehouse inventory tracking system managing stock levels across multiple fulfillment centers with real-time stock allocation and backorder prevention.',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 1200,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Partition inventory records by SKU and Warehouse ID in distributed databases.',
      },
      { step: 2, hint: 'Maintain real-time available-to-promise (ATP) inventory levels in Redis.' },
      {
        step: 3,
        hint: 'Publish stock depletion events to an asynchronous bus for warehouse reorder triggers.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Order Svc / Warehouse') },
        },
        {
          id: 'invApi',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'invApi', 'Inventory Service') },
        },
        {
          id: 'invCache',
          type: 'customComponent',
          position: { x: 520, y: 70 },
          data: { config: createDefaultConfig('redis_cache', 'invCache', 'Real-time Stock Cache') },
        },
        {
          id: 'invDb',
          type: 'customComponent',
          position: { x: 520, y: 230 },
          data: { config: createDefaultConfig('sql_db', 'invDb', 'Inventory Relational DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'invApi', data: { protocol: 'gRPC' } },
        { id: 'e2', source: 'invApi', target: 'invCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'invApi', target: 'invDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you handle multi-item orders where items reside in different regional warehouses?',
        answer:
          'The inventory service runs order splitting logic, selecting fulfillment centers that minimize shipment count and total delivery transit time.',
      },
      {
        question:
          'How do you avoid negative stock when multiple threads update inventory simultaneously?',
        answer:
          'Use database conditional updates (UPDATE inventory SET stock = stock - 1 WHERE sku = ? AND stock >= 1) or atomic Redis Lua scripts.',
      },
    ],
    sources: [
      {
        title: 'Building Reliable Inventory Systems',
        authorOrOrg: 'Target Technology Blog',
        url: 'https://tech.target.com',
      },
      {
        title: 'Enterprise Integration Patterns',
        authorOrOrg: 'Gregor Hohpe, Bobby Woolf',
        url: 'https://www.enterpriseintegrationpatterns.com',
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
    id: 33,
    slug: 'shopping-cart',
    title: 'Distributed Shopping Cart',
    category: 'E-Commerce & Payments',
    difficulty: 'Easy',
    problemStatement:
      'Design a resilient shopping cart service for guest and logged-in users that supports cross-device cart merging, low-latency item updates, and persistence across sessions.',
    constraints: {
      targetQps: 40000,
      dataSizeGb: 1000,
      maxP99LatencyMs: 20,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Store active shopping carts in Redis / DynamoDB indexed by Session UUID or User ID.',
      },
      { step: 2, hint: 'Merge guest cart items into user cart upon user login.' },
      { step: 3, hint: 'Set 30-day TTLs on inactive carts with automatic expiration.' },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Shopper') },
        },
        {
          id: 'cartApi',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'cartApi', 'Cart Service') },
        },
        {
          id: 'cartCache',
          type: 'customComponent',
          position: { x: 540, y: 80 },
          data: { config: createDefaultConfig('redis_cache', 'cartCache', 'Cart Redis Cache') },
        },
        {
          id: 'cartDb',
          type: 'customComponent',
          position: { x: 540, y: 230 },
          data: { config: createDefaultConfig('nosql_db', 'cartDb', 'Persistent Cart DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'cartApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'cartApi', target: 'cartCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'cartApi', target: 'cartDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you handle cart merging when a guest user logs into an account with existing items?',
        answer:
          'Combine item quantities for matching SKUs and append unique items, triggering catalog price & stock revalidations.',
      },
      {
        question: 'Why choose NoSQL key-value stores over relational SQL for shopping carts?',
        answer:
          'Shopping carts represent transient document states naturally structured as key-value JSON, eliminating multi-table relational joins.',
      },
    ],
    sources: [
      {
        title: 'Shopping Cart Architecture at Scale',
        authorOrOrg: 'eBay Tech Blog',
        url: 'https://tech.ebayinc.com',
      },
      {
        title: 'Amazon DynamoDB: Data Modeling for Shopping Carts',
        authorOrOrg: 'AWS Architecture Blog',
        url: 'https://aws.amazon.com/blogs/database/',
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
];
