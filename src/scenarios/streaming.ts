import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const STREAMING_SCENARIOS: Scenario[] = [
  {
    id: 18,
    slug: 'video-streaming',
    title: 'Video on Demand (YouTube/Netflix)',
    category: 'Streaming & Media',
    difficulty: 'Hard',
    problemStatement:
      'Design a video-on-demand streaming platform serving adaptive bitrate streams (HLS/DASH) to hundreds of millions of users globally with high availability and minimal buffering.',
    constraints: {
      targetQps: 100000,
      dataSizeGb: 500000,
      maxP99LatencyMs: 40,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Store raw video uploads in Object Storage and transcode into multiple resolutions (1080p, 720p, 480p) via worker fleets.' },
      { step: 2, hint: 'Chunk videos into 2-10 second TS/M4S segments described by master manifest files (M3U8 / MPD).' },
      { step: 3, hint: 'Deliver 95%+ of video segment traffic via edge Content Delivery Networks (CDNs) located close to Internet Service Providers.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Video Player') } },
        { id: 'cdn1', type: 'customComponent', position: { x: 280, y: 70 }, data: { config: createDefaultConfig('cdn', 'cdn1', 'Global Video Edge CDN') } },
        { id: 'apiGw', type: 'customComponent', position: { x: 280, y: 230 }, data: { config: createDefaultConfig('api_gateway', 'apiGw', 'Playback API Gateway') } },
        { id: 's3', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('object_storage', 's3', 'Video Chunk S3 Bucket') } },
        { id: 'metaDb', type: 'customComponent', position: { x: 540, y: 230 }, data: { config: createDefaultConfig('nosql_db', 'metaDb', 'Video Metadata & User DB') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'cdn1', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'c1', target: 'apiGw', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'cdn1', target: 's3', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'apiGw', target: 'metaDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How does Adaptive Bitrate Streaming (ABR) prevent video playback stalling?',
        answer: 'The client video player measures current network throughput and device capabilities on every chunk download, automatically switching to higher or lower bitrate stream manifests.',
      },
      {
        question: 'How does Netflix achieve 95%+ cache hit rates on ISP edge appliances (Open Connect)?',
        answer: 'Netflix pre-seeds predicted popular titles and new releases to local Open Connect appliances during overnight off-peak network hours.',
      },
    ],
    sources: [
      {
        title: 'Open Connect Overview: Delivering Netflix Video',
        authorOrOrg: 'Netflix Technology Blog',
        url: 'https://openconnect.netflix.com',
      },
      {
        title: 'System Design Interview: YouTube',
        authorOrOrg: 'Alex Xu (Volume 1, Chapter 14)',
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
    id: 19,
    slug: 'live-streaming',
    title: 'Live Video Streaming (Twitch)',
    category: 'Streaming & Media',
    difficulty: 'Hard',
    problemStatement:
      'Design a low-latency live video streaming platform supporting RTMP/WebRTC ingestion from broadcasters, real-time transcoding, and synchronized multi-viewer distribution with sub-3 second glass-to-glass latency.',
    constraints: {
      targetQps: 80000,
      dataSizeGb: 100000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Ingest broadcaster streams via RTMP / SRT into specialized edge media ingest proxies.' },
      { step: 2, hint: 'Transcode incoming raw video streams in real time into multiple resolutions using GPU clusters.' },
      { step: 3, hint: 'Distribute live segments via Low-Latency HLS (LL-HLS) or WebRTC broadcast clusters.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'streamer', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'streamer', 'Broadcaster (OBS)') } },
        { id: 'ingest', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('app_server', 'ingest', 'Live Ingest Proxy') } },
        { id: 'transcoder', type: 'customComponent', position: { x: 500, y: 150 }, data: { config: createDefaultConfig('worker', 'transcoder', 'Realtime Transcoder Fleet') } },
        { id: 'origin', type: 'customComponent', position: { x: 740, y: 150 }, data: { config: createDefaultConfig('app_server', 'origin', 'Live Origin Server') } },
        { id: 'cdn', type: 'customComponent', position: { x: 980, y: 150 }, data: { config: createDefaultConfig('cdn', 'cdn', 'Low-Latency Live CDN') } },
      ],
      edges: [
        { id: 'e1', source: 'streamer', target: 'ingest', data: { protocol: 'TCP' } },
        { id: 'e2', source: 'ingest', target: 'transcoder', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'transcoder', target: 'origin', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'origin', target: 'cdn', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What causes live streaming latency, and how does LL-HLS reduce it?',
        answer: 'Traditional HLS waits for complete 6-second segments; LL-HLS chunks segments into partial 200ms parts and pushes them via HTTP/2 as soon as encoded.',
      },
      {
        question: 'How do you handle live chat synchronization with the video stream?',
        answer: 'Embed PTS (Presentation Time Stamps) in the video stream and synchronize chat timestamps with the client playback timeline clock.',
      },
    ],
    sources: [
      {
        title: 'Twitch Video Architecture 2022',
        authorOrOrg: 'Twitch Engineering',
        url: 'https://blog.twitch.tv',
      },
      {
        title: 'Low-Latency HLS Specification',
        authorOrOrg: 'Roger Pantos (Apple Inc.)',
        url: 'https://developer.apple.com/streaming/fps/',
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
    id: 20,
    slug: 'music-streaming',
    title: 'Music Streaming Platform (Spotify)',
    category: 'Streaming & Media',
    difficulty: 'Medium',
    problemStatement:
      'Design a personalized music streaming platform supporting instant audio playback, gapless transitions, encrypted DRM audio caching, and offline listening synchronizations.',
    constraints: {
      targetQps: 60000,
      dataSizeGb: 80000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Store audio tracks encoded in Ogg Vorbis / AAC at multiple bitrates (96k, 160k, 320k) in S3.' },
      { step: 2, hint: 'Pre-fetch the first 10 seconds of the next song in the active playlist directly on the client player.' },
      { step: 3, hint: 'Manage user playlists and track catalogue in sharded Cassandra with Redis caching.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Spotify Client') } },
        { id: 'audioCdn', type: 'customComponent', position: { x: 280, y: 70 }, data: { config: createDefaultConfig('cdn', 'audioCdn', 'Audio Delivery CDN') } },
        { id: 'apiGw', type: 'customComponent', position: { x: 280, y: 230 }, data: { config: createDefaultConfig('api_gateway', 'apiGw', 'Playlist & Metadata Gateway') } },
        { id: 'audioS3', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('object_storage', 'audioS3', 'Encrypted Audio Bucket') } },
        { id: 'catDb', type: 'customComponent', position: { x: 540, y: 230 }, data: { config: createDefaultConfig('nosql_db', 'catDb', 'Track Catalogue DB') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'audioCdn', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'c1', target: 'apiGw', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'audioCdn', target: 'audioS3', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'apiGw', target: 'catDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How does Spotify ensure instant audio playback without initial buffering delay?',
        answer: 'Spotify splits audio tracks into smaller sub-chunks, preloading the initial chunk metadata and audio header concurrently with playlist navigation.',
      },
      {
        question: 'Why utilize Cassandra for playlist storage over relational databases?',
        answer: 'Playlists require high-write availability and fast sequential key-value retrieval for millions of users worldwide with multi-region replication.',
      },
    ],
    sources: [
      {
        title: 'How Spotify Handles 500 Million Users',
        authorOrOrg: 'Spotify Engineering Blog',
        url: 'https://engineering.atspotify.com',
      },
      {
        title: 'P2P and Server Assisted Streaming in Spotify',
        authorOrOrg: 'Kreitz & Niemela (Peer-to-Peer Systems)',
        url: 'https://engineering.atspotify.com',
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
    id: 21,
    slug: 'video-conferencing',
    title: 'Video Conferencing Platform (Zoom/Meet)',
    category: 'Streaming & Media',
    difficulty: 'Hard',
    problemStatement:
      'Design a real-time multi-party video conferencing architecture supporting HD video, screen sharing, and dynamic layout switching with sub-150ms round-trip latency across unstable networks.',
    constraints: {
      targetQps: 40000,
      dataSizeGb: 20000,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Utilize Selective Forwarding Units (SFUs) rather than Multipoint Conferencing Units (MCUs) to eliminate server-side video re-encoding overhead.' },
      { step: 2, hint: 'Employ WebRTC with UDP transport and dynamic simulcast (sending high, medium, low streams per participant).' },
      { step: 3, hint: 'Implement Forward Error Correction (FEC) and jitter buffers to handle packet loss.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Conference Client') } },
        { id: 'sigGw', type: 'customComponent', position: { x: 260, y: 70 }, data: { config: createDefaultConfig('app_server', 'sigGw', 'Signaling Server (WebSocket)') } },
        { id: 'sfu1', type: 'customComponent', position: { x: 260, y: 230 }, data: { config: createDefaultConfig('app_server', 'sfu1', 'SFU Media Router') } },
        { id: 'roomStore', type: 'customComponent', position: { x: 520, y: 70 }, data: { config: createDefaultConfig('redis_cache', 'roomStore', 'Room State DB (Redis)') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'sigGw', data: { protocol: 'WebSocket' } },
        { id: 'e2', source: 'c1', target: 'sfu1', data: { protocol: 'UDP' } },
        { id: 'e3', source: 'sigGw', target: 'roomStore', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why choose SFU architecture over Mesh or MCU for meetings with 50+ participants?',
        answer: 'Mesh requires O(N^2) client upload bandwidth; MCU consumes massive CPU re-encoding video; SFU selectively forwards streams with O(N) client bandwidth and minimal server CPU load.',
      },
      {
        question: 'How do video conferencing tools handle high packet loss on Wi-Fi/cellular connections?',
        answer: 'They use packet loss concealment, NACK retransmission for keyframes, forward error correction (FEC), and adaptive bitrate reduction.',
      },
    ],
    sources: [
      {
        title: 'Scalable WebRTC Video Conferencing Architecture',
        authorOrOrg: 'Jitsi Engineering',
        url: 'https://jitsi.github.io/handbook/docs/architecture/',
      },
      {
        title: 'WebRTC Integrator\'s Guide',
        authorOrOrg: 'Alvestrand (IETF RFC 8825)',
        url: 'https://datatracker.ietf.org/doc/html/rfc8825',
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
    id: 22,
    slug: 'podcast-platform',
    title: 'Podcast Ingestion & RSS Platform',
    category: 'Streaming & Media',
    difficulty: 'Easy',
    problemStatement:
      'Design a podcast publishing platform that parses RSS feeds, validates audio enclosures, creates searchable episode transcripts, and serves audio files to podcast directories.',
    constraints: {
      targetQps: 15000,
      dataSizeGb: 10000,
      maxP99LatencyMs: 50,
      availabilitySlaPercent: 99.9,
    },
    hints: [
      { step: 1, hint: 'Store published audio episodes in Object Storage behind a CDN.' },
      { step: 2, hint: 'Run background polling workers to detect RSS feed updates from podcast creators.' },
      { step: 3, hint: 'Generate automated AI audio transcripts asynchronously using message queues.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Podcast Listener') } },
        { id: 'cdn', type: 'customComponent', position: { x: 260, y: 70 }, data: { config: createDefaultConfig('cdn', 'cdn', 'Podcast Audio CDN') } },
        { id: 'app', type: 'customComponent', position: { x: 260, y: 220 }, data: { config: createDefaultConfig('app_server', 'app', 'Podcast Feed API') } },
        { id: 's3', type: 'customComponent', position: { x: 500, y: 70 }, data: { config: createDefaultConfig('object_storage', 's3', 'Podcast MP3 Bucket') } },
        { id: 'db', type: 'customComponent', position: { x: 500, y: 220 }, data: { config: createDefaultConfig('sql_db', 'db', 'Episodes & Shows DB') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'cdn', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'c1', target: 'app', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'cdn', target: 's3', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'app', target: 'db', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you prevent duplicate episode downloads during aggregator syncing?',
        answer: 'Use HTTP ETag and If-None-Match conditional headers so podcast clients only download updated RSS feeds and new audio files.',
      },
      {
        question: 'How do you accurately count podcast listens following IAB guidelines?',
        answer: 'Count an episode play only after at least 60 seconds of cumulative audio data is requested from unique IP and user-agent pairs within a 24-hour window.',
      },
    ],
    sources: [
      {
        title: 'IAB Podcast Measurement Technical Guidelines 2.1',
        authorOrOrg: 'Interactive Advertising Bureau (IAB Tech Lab)',
        url: 'https://iabtechlab.com/standards/podcast-measurement-guidelines/',
      },
      {
        title: 'Building a Podcast Platform',
        authorOrOrg: 'Overcast Architecture Notes (Marco Arment)',
        url: 'https://marco.org',
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
    id: 23,
    slug: 'media-cdn',
    title: 'Image & Video CDN',
    category: 'Streaming & Media',
    difficulty: 'Medium',
    problemStatement:
      'Design a globally distributed Content Delivery Network (CDN) with edge Points of Presence (PoPs), Anycast BGP routing, origin shield caching, and dynamic image transformation at the edge.',
    constraints: {
      targetQps: 120000,
      dataSizeGb: 200000,
      maxP99LatencyMs: 10,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Use BGP Anycast to route client DNS and TCP handshakes to the closest edge Point of Presence.' },
      { step: 2, hint: 'Implement multi-tier hierarchical caching: Edge PoP -> Regional Origin Shield -> Primary Storage.' },
      { step: 3, hint: 'Perform image transformations (WebP conversion, resizing) directly at the edge layer on cache miss.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Global Clients') } },
        { id: 'edgePoP', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('cdn', 'edgePoP', 'Edge PoP Cache') } },
        { id: 'originShield', type: 'customComponent', position: { x: 540, y: 150 }, data: { config: createDefaultConfig('reverse_proxy', 'originShield', 'Origin Shield Cache') } },
        { id: 'originS3', type: 'customComponent', position: { x: 800, y: 150 }, data: { config: createDefaultConfig('object_storage', 'originS3', 'Primary S3 Origin') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'edgePoP', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'edgePoP', target: 'originShield', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'originShield', target: 'originS3', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is an Origin Shield critical for large CDN deployments?',
        answer: 'An Origin Shield consolidates cache misses from thousands of worldwide edge nodes into a single intermediate cache tier, shielding backend origins from thundering herd spikes.',
      },
      {
        question: 'How do you handle cache invalidation across hundreds of edge locations?',
        answer: 'Broadcast instant purge events via an internal pub/sub network using surrogate keys (Cache-Tag header grouping).',
      },
    ],
    sources: [
      {
        title: 'How Cloudflare Built an Edge CDN',
        authorOrOrg: 'Cloudflare Engineering Blog',
        url: 'https://blog.cloudflare.com',
      },
      {
        title: 'Fastly Origin Shielding Architecture',
        authorOrOrg: 'Fastly Documentation',
        url: 'https://docs.fastly.com',
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
    id: 24,
    slug: 'media-upload-pipeline',
    title: 'Resumable Media Upload Pipeline',
    category: 'Streaming & Media',
    difficulty: 'Medium',
    problemStatement:
      'Design a resilient multipart chunked file upload pipeline supporting pause/resume capabilities over unreliable mobile networks, chunk checksum validation, and automated assembly.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 30000,
      maxP99LatencyMs: 40,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Adopt the TUS protocol or S3 Multipart Upload for resumable 5MB - 20MB file chunking.' },
      { step: 2, hint: 'Store uploaded chunk state and checksums in an In-Memory session store (Redis).' },
      { step: 3, hint: 'Trigger an asynchronous file assembly and virus scan task once all chunks are verified.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Upload Client') } },
        { id: 'gw', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'gw', 'Upload Gateway (TUS)') } },
        { id: 'stateStore', type: 'customComponent', position: { x: 500, y: 70 }, data: { config: createDefaultConfig('redis_cache', 'stateStore', 'Chunk Offset & State DB') } },
        { id: 'tempS3', type: 'customComponent', position: { x: 500, y: 220 }, data: { config: createDefaultConfig('object_storage', 'tempS3', 'Chunk Storage S3') } },
        { id: 'mq', type: 'customComponent', position: { x: 740, y: 220 }, data: { config: createDefaultConfig('task_queue', 'mq', 'Assembly Queue') } },
        { id: 'assembler', type: 'customComponent', position: { x: 960, y: 220 }, data: { config: createDefaultConfig('worker', 'assembler', 'File Assembly Worker') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'stateStore', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'gw', target: 'tempS3', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'gw', target: 'mq', data: { protocol: 'pub/sub' } },
        { id: 'e5', source: 'mq', target: 'assembler', data: { protocol: 'pub/sub' } },
        { id: 'e6', source: 'assembler', target: 'tempS3', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you guarantee that corrupted chunks are rejected before assembly?',
        answer: 'Compute MD5 / SHA256 hashes per chunk on the client and verify against server chunk hash before acknowledging each part.',
      },
      {
        question: 'What happens if a client disconnects halfway through a 10GB video upload?',
        answer: 'The client queries the TUS upload endpoint for the last recorded byte offset and resumes uploading strictly from that byte position without retransmitting previous chunks.',
      },
    ],
    sources: [
      {
        title: 'TUS: Open Protocol for Resumable File Uploads',
        authorOrOrg: 'TUS Community Standard',
        url: 'https://tus.io',
      },
      {
        title: 'Amazon S3 Multipart Upload Overview',
        authorOrOrg: 'AWS Documentation',
        url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html',
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
