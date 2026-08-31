import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const CONTENT_SCENARIOS: Scenario[] = [
  {
    id: 98,
    slug: 'cms-publishing-platform',
    title: 'Headless CMS & Publishing (Medium/Substack)',
    category: 'Content & Publishing',
    difficulty: 'Medium',
    problemStatement:
      'Design a headless content management system (CMS) with rich-text block editing, static site generation (SSG) edge caching, and scheduled article publishing.',
    constraints: {
      targetQps: 35000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Store structured block-based article documents in a document store (MongoDB / PostgreSQL JSONB).',
      },
      {
        step: 2,
        hint: 'Generate static pre-rendered HTML pages upon publish and cache them globally at CDN edge PoPs.',
      },
      { step: 3, hint: 'Purge CDN cache tags instantly when authors publish revisions.' },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'reader',
          type: 'customComponent',
          position: { x: 50, y: 70 },
          data: { config: createDefaultConfig('client', 'reader', 'Blog Reader') },
        },
        {
          id: 'author',
          type: 'customComponent',
          position: { x: 50, y: 230 },
          data: { config: createDefaultConfig('client', 'author', 'Author Dashboard') },
        },
        {
          id: 'edgeCdn',
          type: 'customComponent',
          position: { x: 280, y: 70 },
          data: { config: createDefaultConfig('cdn', 'edgeCdn', 'Static Article Edge CDN') },
        },
        {
          id: 'cmsApi',
          type: 'customComponent',
          position: { x: 280, y: 230 },
          data: { config: createDefaultConfig('app_server', 'cmsApi', 'Headless CMS API') },
        },
        {
          id: 'articleDb',
          type: 'customComponent',
          position: { x: 540, y: 230 },
          data: { config: createDefaultConfig('nosql_db', 'articleDb', 'Document JSON Store') },
        },
      ],
      edges: [
        { id: 'e1', source: 'reader', target: 'edgeCdn', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'author', target: 'cmsApi', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'cmsApi', target: 'articleDb', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'cmsApi', target: 'edgeCdn', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'Why is Incremental Static Regeneration (ISR) superior to full static site generation for million-page sites?',
        answer:
          'Full SSG requires hours to rebuild all pages; ISR regenerates individual pages on-demand in the background upon the first request after an invalidation event.',
      },
      {
        question:
          'How do you handle draft preview links securely without caching draft content on public CDNs?',
        answer:
          'Draft requests pass a signed ephemeral JWT token that bypasses the CDN cache and queries the origin draft database directly.',
      },
    ],
    sources: [
      {
        title: 'Building Medium’s Architecture',
        authorOrOrg: 'Medium Engineering',
        url: 'https://medium.com/medium-eng',
      },
      {
        title: 'Incremental Static Regeneration (ISR) Architecture',
        authorOrOrg: 'Vercel Documentation',
        url: 'https://vercel.com/docs/incremental-static-regeneration',
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
    id: 99,
    slug: 'wiki-knowledge-system',
    title: 'Collaborative Knowledge Base (Wikipedia)',
    category: 'Content & Publishing',
    difficulty: 'Medium',
    problemStatement:
      'Design a global open-collaboration wiki platform supporting high read volumes (99.9% read-to-write ratio), complete revision history tracking, and rollback capabilities.',
    constraints: {
      targetQps: 100000,
      dataSizeGb: 10000,
      maxP99LatencyMs: 20,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Deploy multi-layer caching with Varnish / CDN edge caches serving 98%+ of page hits.',
      },
      {
        step: 2,
        hint: 'Store page revision diffs (compressed forward deltas) rather than full page copies for every edit.',
      },
      {
        step: 3,
        hint: 'Index article revisions in Elasticsearch for multi-language full-text search.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'reader',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'reader', 'Global Readers') },
        },
        {
          id: 'varnishCache',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: {
            config: createDefaultConfig('cdn', 'varnishCache', 'Varnish Edge Cache (98% Hit)'),
          },
        },
        {
          id: 'appServer',
          type: 'customComponent',
          position: { x: 540, y: 150 },
          data: { config: createDefaultConfig('app_server', 'appServer', 'MediaWiki App Cluster') },
        },
        {
          id: 'dbCluster',
          type: 'customComponent',
          position: { x: 800, y: 150 },
          data: { config: createDefaultConfig('sql_db', 'dbCluster', 'MariaDB Revision DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'reader', target: 'varnishCache', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'varnishCache', target: 'appServer', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'appServer', target: 'dbCluster', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How does Wikipedia maintain high availability with limited hardware budget?',
        answer:
          'By leveraging aggressive Varnish HTTP edge caching where almost all anonymous read requests are served directly from RAM without executing application PHP code.',
      },
      {
        question: 'How are revision diffs stored efficiently over decades of edits?',
        answer:
          'MediaWiki stores text chunks in an append-only compressed blob cluster, storing diffs relative to master text revisions using gzip/zstd compression.',
      },
    ],
    sources: [
      {
        title: 'Wikimedia Infrastructure Architecture',
        authorOrOrg: 'Wikimedia Operations Team',
        url: 'https://wikitech.wikimedia.org',
      },
      {
        title: 'The Architecture of Open Source Applications: MediaWiki',
        authorOrOrg: 'Sumana Harihareswara & Guillaume Paumier',
        url: 'http://aosabook.org/en/mediawiki.html',
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
    id: 100,
    slug: 'url-preview-service',
    title: 'URL Link Preview & Unfurling (Slack/Twitter Cards)',
    category: 'Content & Publishing',
    difficulty: 'Easy',
    problemStatement:
      'Design a link preview scraper extracting OpenGraph meta tags, titles, and preview thumbnail images when users paste URLs into chat or social posts.',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 500,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Cache parsed OpenGraph metadata (og:title, og:image, og:description) in Redis with 7-day TTLs.',
      },
      {
        step: 2,
        hint: 'Run headless HTML parsers with strict 2-second HTTP timeouts and SSRF security proxies.',
      },
      { step: 3, hint: 'Cache and resize thumbnail images in Object Storage behind a CDN.' },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'chatClient',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'chatClient', 'Chat App') },
        },
        {
          id: 'unfurlApi',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'unfurlApi', 'Unfurl Gateway') },
        },
        {
          id: 'previewCache',
          type: 'customComponent',
          position: { x: 540, y: 70 },
          data: {
            config: createDefaultConfig('redis_cache', 'previewCache', 'Preview Cache (Redis)'),
          },
        },
        {
          id: 'scraperWorker',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: {
            config: createDefaultConfig('worker', 'scraperWorker', 'SSRF-Safe Scraper Pool'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'chatClient', target: 'unfurlApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'unfurlApi', target: 'previewCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'unfurlApi', target: 'scraperWorker', data: { protocol: 'pub/sub' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'What is SSRF (Server-Side Request Forgery) in link unfurling and how is it prevented?',
        answer:
          'SSRF occurs when an attacker inputs a URL pointing to internal AWS metadata (169.254.169.254) or internal IP ranges (10.0.0.0/8); scrapers must resolve DNS first and block private RFC 1918 IPs.',
      },
      {
        question:
          'How do you prevent malicious servers from hanging scrapers with slow HTTP responses (Slowloris)?',
        answer:
          'Enforce strict 2-second connection timeouts, 5MB response body download limits, and stream termination after reading HTML head tags.',
      },
    ],
    sources: [
      {
        title: 'Building Slack’s Link Unfurling System',
        authorOrOrg: 'Slack Engineering Blog',
        url: 'https://slack.engineering',
      },
      {
        title: 'The Open Graph Protocol Specification',
        authorOrOrg: 'Open Graph Protocol',
        url: 'https://ogp.me',
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
    id: 101,
    slug: 'digital-asset-management',
    title: 'Digital Asset Management & Brand Hub (DAM)',
    category: 'Content & Publishing',
    difficulty: 'Medium',
    problemStatement:
      'Design an enterprise digital asset management system (DAM) providing AI tagging, multi-format media conversions, access control watermarking, and global distribution for marketing assets.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 40000,
      maxP99LatencyMs: 40,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Store master raw high-resolution media in tier-managed Object Storage.' },
      {
        step: 2,
        hint: 'Trigger automated AI vision tagging and video transcoding tasks asynchronously via task queues.',
      },
      {
        step: 3,
        hint: 'Deliver optimized dynamic assets via a global CDN with signed access tokens.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'creator',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'creator', 'Marketing Portal') },
        },
        {
          id: 'damApi',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'damApi', 'Asset Management API') },
        },
        {
          id: 'damDb',
          type: 'customComponent',
          position: { x: 540, y: 70 },
          data: { config: createDefaultConfig('sql_db', 'damDb', 'Asset Metadata & RBAC DB') },
        },
        {
          id: 'damStorage',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: {
            config: createDefaultConfig('object_storage', 'damStorage', 'Master Asset Storage S3'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'creator', target: 'damApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'damApi', target: 'damDb', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'damApi', target: 'damStorage', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you handle multi-terabyte raw video asset uploads without server timeouts?',
        answer:
          'Use S3 Multipart Direct Upload with client pre-signed URLs, uploading 50MB parts in parallel directly to cloud storage.',
      },
      {
        question: 'How does dynamic on-the-fly image manipulation reduce storage requirements?',
        answer:
          'Instead of storing thousands of resized combinations, store only the original master asset and generate requested dimensions on-demand at the CDN edge cache.',
      },
    ],
    sources: [
      {
        title: 'Building Modern Digital Asset Management Systems',
        authorOrOrg: 'Adobe Experience Manager Architecture',
        url: 'https://experienceleague.adobe.com',
      },
      {
        title: 'Cloudinary Image & Video Management Architecture',
        authorOrOrg: 'Cloudinary Documentation',
        url: 'https://cloudinary.com/documentation',
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
