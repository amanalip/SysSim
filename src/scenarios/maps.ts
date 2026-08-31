import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const MAPS_SCENARIOS: Scenario[] = [
  {
    id: 90,
    slug: 'maps-navigation-engine',
    title: 'Maps & Navigation Engine (Google Maps/OSRM)',
    category: 'Maps & Geolocation',
    difficulty: 'Hard',
    problemStatement:
      'Design a global turn-by-turn navigation and routing platform serving vector map tiles and computing shortest driving paths across billions of road intersections in sub-50ms.',
    constraints: {
      targetQps: 60000,
      dataSizeGb: 20000,
      maxP99LatencyMs: 50,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Serve pre-rendered Vector Map Tiles (Protobuf / Mapbox MVT) from a global edge CDN.',
      },
      {
        step: 2,
        hint: 'Preprocess road network graphs using Contraction Hierarchies (CH) or Customisable Contraction Hierarchies (CCH) for instant Dijkstra/A* routing.',
      },
      {
        step: 3,
        hint: 'Incorporate live traffic speeds onto road graph edge weights dynamically.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'driver',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'driver', 'Navigation App') },
        },
        {
          id: 'tileCdn',
          type: 'customComponent',
          position: { x: 280, y: 70 },
          data: { config: createDefaultConfig('cdn', 'tileCdn', 'Vector Map Tile CDN') },
        },
        {
          id: 'routeApi',
          type: 'customComponent',
          position: { x: 280, y: 230 },
          data: {
            config: createDefaultConfig(
              'app_server',
              'routeApi',
              'Routing Engine (Contraction Hierarchies)',
            ),
          },
        },
        {
          id: 'tileS3',
          type: 'customComponent',
          position: { x: 540, y: 70 },
          data: { config: createDefaultConfig('object_storage', 'tileS3', 'Vector Tiles S3') },
        },
        {
          id: 'trafficFeed',
          type: 'customComponent',
          position: { x: 540, y: 230 },
          data: {
            config: createDefaultConfig('redis_cache', 'trafficFeed', 'Live Traffic Speed Graph'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'driver', target: 'tileCdn', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'driver', target: 'routeApi', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'tileCdn', target: 'tileS3', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'routeApi', target: 'trafficFeed', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is raw Dijkstra algorithm too slow for global road network routing?',
        answer:
          'Raw Dijkstra visits millions of road nodes on a continental route (takes several seconds); Contraction Hierarchies precompute shortcut edges, reducing query search space by 99.9% to sub-10ms.',
      },
      {
        question: 'How do vector tiles differ from legacy raster image tiles?',
        answer:
          'Vector tiles contain raw geographic geometry and layer metadata, allowing client GPUs to style, tilt, rotate, and zoom smoothly without downloading new images for every zoom level.',
      },
    ],
    sources: [
      {
        title: 'Contraction Hierarchies: Faster and Simpler Hierarchical Routing in Road Networks',
        authorOrOrg: 'Geisberger et al. (Karlsruhe Institute of Technology / WEA 2008)',
        url: 'https://publikationen.bibliothek.kit.edu/1000015090',
      },
      {
        title: 'OSRM: Open Source Routing Machine Architecture',
        authorOrOrg: 'Project OSRM',
        url: 'http://project-osrm.org',
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
    id: 91,
    slug: 'location-sharing-service',
    title: 'Real-Time Location Sharing (Find My/Life360)',
    category: 'Maps & Geolocation',
    difficulty: 'Medium',
    problemStatement:
      'Design a real-time peer-to-peer and family location sharing service updating map markers continuously with battery optimization and geofence arrival alerts.',
    constraints: {
      targetQps: 50000,
      dataSizeGb: 3000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Store instantaneous user location coordinates in an In-Memory spatial store (Redis GEO).',
      },
      {
        step: 2,
        hint: 'Push live location movements to authorized circle members over persistent WebSockets.',
      },
      { step: 3, hint: 'Evaluate home/school geofence entry triggers on location updates.' },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'userA',
          type: 'customComponent',
          position: { x: 50, y: 70 },
          data: { config: createDefaultConfig('client', 'userA', 'Mobile Client A') },
        },
        {
          id: 'userB',
          type: 'customComponent',
          position: { x: 50, y: 230 },
          data: { config: createDefaultConfig('client', 'userB', 'Family Member B') },
        },
        {
          id: 'locGw',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: {
            config: createDefaultConfig('app_server', 'locGw', 'Location WebSocket Gateway'),
          },
        },
        {
          id: 'geoStore',
          type: 'customComponent',
          position: { x: 540, y: 150 },
          data: {
            config: createDefaultConfig('redis_cache', 'geoStore', 'Live Coordinates Redis GEO'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'userA', target: 'locGw', data: { protocol: 'WebSocket' } },
        { id: 'e2', source: 'userB', target: 'locGw', data: { protocol: 'WebSocket' } },
        { id: 'e3', source: 'locGw', target: 'geoStore', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do mobile apps optimize device battery while maintaining continuous location sharing?',
        answer:
          'Apps utilize native OS Geofencing and Significant Motion APIs (cellular tower / Wi-Fi changes), activating high-accuracy GPS only when actual physical motion is detected.',
      },
      {
        question: 'How is location privacy enforced between family members?',
        answer:
          'Access control evaluates active sharing permissions in cache before broadcasting location coordinate packets to requesting WebSocket clients.',
      },
    ],
    sources: [
      {
        title: 'Scaling Real-Time Location Sharing',
        authorOrOrg: 'Life360 Engineering Blog',
        url: 'https://www.life360.com',
      },
      {
        title: 'Apple CoreLocation: Significant-Change Location Service Documentation',
        authorOrOrg: 'Apple Developer',
        url: 'https://developer.apple.com/documentation/corelocation',
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
    id: 92,
    slug: 'geofencing-service',
    title: 'High-Throughput Geofencing Engine',
    category: 'Maps & Geolocation',
    difficulty: 'Medium',
    problemStatement:
      'Design a geofencing trigger service monitoring millions of polygon boundaries, evaluating spatial intersections against moving entity streams, and firing webhooks upon boundary crossings.',
    constraints: {
      targetQps: 45000,
      dataSizeGb: 1000,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Index polygonal geofences using Spatial R-Trees or Uber H3 cells in memory.',
      },
      {
        step: 2,
        hint: 'Quickly filter bounding box overlaps before executing precise ray-casting point-in-polygon checks.',
      },
      {
        step: 3,
        hint: 'Emit geofence transition events to Kafka for downstream webhook dispatch.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'movingAsset',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'movingAsset', 'GPS Ping Stream') },
        },
        {
          id: 'fenceEngine',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: {
            config: createDefaultConfig('app_server', 'fenceEngine', 'R-Tree Geofence Evaluator'),
          },
        },
        {
          id: 'polygonStore',
          type: 'customComponent',
          position: { x: 540, y: 70 },
          data: {
            config: createDefaultConfig('redis_cache', 'polygonStore', 'Active Polygon Index'),
          },
        },
        {
          id: 'webhookMq',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: {
            config: createDefaultConfig('message_queue', 'webhookMq', 'Triggered Event Kafka'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'movingAsset', target: 'fenceEngine', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'fenceEngine', target: 'polygonStore', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'fenceEngine', target: 'webhookMq', data: { protocol: 'pub/sub' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why use R-Tree index rather than checking all polygons on every GPS ping?',
        answer:
          'An R-Tree groups spatial bounding boxes hierarchically; checking intersection reduces candidate polygons from 1,000,000 to ~2-3 in O(log N) time.',
      },
      {
        question:
          'How do you prevent duplicate trigger events when a device lingers on a fence boundary?',
        answer:
          'Implement stateful hysteresis thresholds: require the asset to move at least 20 meters outside the boundary before resetting the exit trigger.',
      },
    ],
    sources: [
      {
        title: 'R-Trees: A Dynamic Index Structure for Spatial Searching',
        authorOrOrg: 'Antonin Guttman (ACM SIGMOD 1984)',
        url: 'https://doi.org/10.1145/602259.602266',
      },
      {
        title: 'Spatial Indexing with R-Trees and QuadTrees',
        authorOrOrg: 'PostGIS Documentation',
        url: 'https://postgis.net/documentation/',
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
    id: 93,
    slug: 'store-locator',
    title: 'Retail Store & ATM Locator',
    category: 'Maps & Geolocation',
    difficulty: 'Easy',
    problemStatement:
      'Design a fast store locator API returning nearest physical branch locations, opening hours, inventory status, and driving distance estimates.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 200,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Store branch locations with spatial coordinates in PostgreSQL with PostGIS extensions.',
      },
      { step: 2, hint: 'Cache nearest store lists for popular postal codes in Redis.' },
      { step: 3, hint: 'Precompute driving distances from common city center centroids.' },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'shopper',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'shopper', 'Shopper App') },
        },
        {
          id: 'storeApi',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'storeApi', 'Store Locator API') },
        },
        {
          id: 'geoCache',
          type: 'customComponent',
          position: { x: 540, y: 70 },
          data: { config: createDefaultConfig('redis_cache', 'geoCache', 'Postal Code Cache') },
        },
        {
          id: 'postgisDb',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: { config: createDefaultConfig('sql_db', 'postgisDb', 'PostGIS Spatial DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'shopper', target: 'storeApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'storeApi', target: 'geoCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'storeApi', target: 'postgisDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'What is the advantage of PostGIS ST_DWithin query over calculating Haversine formulas in application code?',
        answer:
          'ST_DWithin leverages spatial GIST indexes in PostgreSQL, scanning only matching spatial index blocks directly in the database engine.',
      },
      {
        question: 'How do you handle store temporary holiday hours updates efficiently?',
        answer:
          'Maintain date-override records in the relational schema and invalidate the postal code cache key on update.',
      },
    ],
    sources: [
      {
        title: 'PostGIS Spatial Database Manual',
        authorOrOrg: 'PostGIS Project Steering Committee',
        url: 'https://postgis.net/documentation/',
      },
      {
        title: 'Building High-Performance Proximity Services',
        authorOrOrg: 'AWS Architecture Center',
        url: 'https://aws.amazon.com/architecture/',
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
