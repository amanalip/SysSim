import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const COLLAB_SCENARIOS: Scenario[] = [
  {
    id: 85,
    slug: 'collaborative-editor',
    title: 'Real-Time Collaborative Document Editor (Google Docs/Figma)',
    category: 'Collaboration',
    difficulty: 'Hard',
    problemStatement:
      'Design a real-time collaborative document editing architecture supporting concurrent character edits from hundreds of users without merge conflicts using CRDTs or Operational Transformation (OT).',
    constraints: {
      targetQps: 40000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Select between Conflict-Free Replicated Data Types (CRDTs like Yjs / Automerge) and Operational Transformation (OT).',
      },
      {
        step: 2,
        hint: 'Maintain active document edit sessions in memory on dedicated WebSocket server instances.',
      },
      {
        step: 3,
        hint: 'Take periodic document state snapshots (every 100 operations) to append-only object storage.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 70 },
          data: { config: createDefaultConfig('client', 'c1', 'Editor Client 1') },
        },
        {
          id: 'c2',
          type: 'customComponent',
          position: { x: 50, y: 230 },
          data: { config: createDefaultConfig('client', 'c2', 'Editor Client 2') },
        },
        {
          id: 'otServer',
          type: 'customComponent',
          position: { x: 300, y: 150 },
          data: {
            config: createDefaultConfig(
              'app_server',
              'otServer',
              'Document Room Session (OT/CRDT)',
            ),
          },
        },
        {
          id: 'docSnapshots',
          type: 'customComponent',
          position: { x: 560, y: 150 },
          data: {
            config: createDefaultConfig('object_storage', 'docSnapshots', 'Snapshot Store (S3)'),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'otServer', data: { protocol: 'WebSocket' } },
        { id: 'e2', source: 'c2', target: 'otServer', data: { protocol: 'WebSocket' } },
        { id: 'e3', source: 'otServer', target: 'docSnapshots', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is the key difference between Operational Transformation (OT) and CRDTs?',
        answer:
          'OT requires a central server to sequence and transform concurrent operations; CRDTs are mathematically commutative and converge automatically in peer-to-peer or decentralized networks without central coordination.',
      },
      {
        question:
          'How do you handle client network disconnections during multi-hour offline editing?',
        answer:
          'CRDT state vectors allow the reconnecting client to merge local offline edit graphs seamlessly into the shared document state without loss of history.',
      },
    ],
    sources: [
      {
        title: 'How Google Docs Enables Real-Time Collaboration (Operational Transformation)',
        authorOrOrg: 'Google Wave / Docs Engineering',
        url: 'https://drive.google.com',
      },
      {
        title: 'Conflict-Free Replicated Data Types (CRDTs)',
        authorOrOrg: 'Shapiro et al. (INRIA Research Report 2011)',
        url: 'https://inria.hal.science/inria-00555588',
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
    id: 86,
    slug: 'cloud-file-sync',
    title: 'Cloud File Storage & Sync (Dropbox/Google Drive)',
    category: 'Collaboration',
    difficulty: 'Hard',
    problemStatement:
      'Design a multi-device desktop and mobile cloud file synchronization client and backend capable of chunked differential sync (rsync), deduplication, and conflict resolution.',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 50000,
      maxP99LatencyMs: 40,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Split files into 4MB content-addressed blocks identified by SHA-256 block hashes.',
      },
      {
        step: 2,
        hint: 'Only upload modified chunk blocks (delta sync), skipping blocks already present in global object storage.',
      },
      {
        step: 3,
        hint: 'Maintain file metadata and hierarchical directory trees in a strongly consistent relational database with ACID transactions.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'desktopClient',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'desktopClient', 'Desktop Sync Client') },
        },
        {
          id: 'syncGw',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('api_gateway', 'syncGw', 'Block Sync Gateway') },
        },
        {
          id: 'metaDb',
          type: 'customComponent',
          position: { x: 540, y: 70 },
          data: { config: createDefaultConfig('sql_db', 'metaDb', 'File Metadata DB') },
        },
        {
          id: 'blockStore',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: {
            config: createDefaultConfig(
              'object_storage',
              'blockStore',
              'Content-Addressed S3 Blocks',
            ),
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'desktopClient', target: 'syncGw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'syncGw', target: 'metaDb', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'syncGw', target: 'blockStore', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How does content-addressed chunk deduplication save bandwidth and storage?',
        answer:
          'If two different users upload identical files or minor edits, duplicate 4MB chunks produce identical SHA-256 hashes and are stored only once in the global block store.',
      },
      {
        question:
          'How are concurrent edits to the same file on two different offline devices handled upon reconnecting?',
        answer:
          'The server accepts the first synced commit as the canonical file version and saves the concurrent version as a separate conflict copy (e.g. "Doc (Conflicted Copy).pdf").',
      },
    ],
    sources: [
      {
        title: 'How Dropbox Scaled Storage with Magic Pocket',
        authorOrOrg: 'Dropbox Technology Blog',
        url: 'https://dropbox.tech/infrastructure/magic-pocket-infrastructure',
      },
      {
        title: 'System Design Interview: Design Google Drive',
        authorOrOrg: 'Alex Xu (Volume 1, Chapter 15)',
        url: 'https://bytebytego.com',
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
    id: 87,
    slug: 'email-service-backend',
    title: 'Scalable Webmail Backend (Gmail)',
    category: 'Collaboration',
    difficulty: 'Medium',
    problemStatement:
      'Design a webmail backend managing inbox threads, attachment storage, real-time message indexing, and SMTP/IMAP protocol synchronization for billions of mailboxes.',
    constraints: {
      targetQps: 50000,
      dataSizeGb: 30000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      {
        step: 1,
        hint: 'Store raw MIME message bodies in Object Storage, keeping thread metadata in a distributed NoSQL datastore.',
      },
      {
        step: 2,
        hint: 'Update full-text search indexes asynchronously using Kafka message pipelines.',
      },
      {
        step: 3,
        hint: 'Deliver incoming mail notifications to open browser sessions over Server-Sent Events / WebSockets.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'webmail',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'webmail', 'Webmail UI') },
        },
        {
          id: 'mailApi',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('app_server', 'mailApi', 'Mail API Gateway') },
        },
        {
          id: 'threadDb',
          type: 'customComponent',
          position: { x: 520, y: 70 },
          data: { config: createDefaultConfig('nosql_db', 'threadDb', 'Conversation Thread DB') },
        },
        {
          id: 'mimeStore',
          type: 'customComponent',
          position: { x: 520, y: 220 },
          data: {
            config: createDefaultConfig('object_storage', 'mimeStore', 'Raw MIME & Attachments S3'),
          },
        },
        {
          id: 'searchIdx',
          type: 'customComponent',
          position: { x: 780, y: 150 },
          data: { config: createDefaultConfig('search_index', 'searchIdx', 'Mail Search Index') },
        },
      ],
      edges: [
        { id: 'e1', source: 'webmail', target: 'mailApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'mailApi', target: 'threadDb', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'mailApi', target: 'mimeStore', data: { protocol: 'HTTP' } },
        { id: 'e4', source: 'mailApi', target: 'searchIdx', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you group individual incoming messages into conversations/threads accurately?',
        answer:
          'Parse RFC 5322 In-Reply-To and References email header hashes, threading related message IDs into unified conversation documents.',
      },
      {
        question: 'How do you handle spam filtering on high incoming email volume?',
        answer:
          'Run multi-stage spam scoring: IP reputation / SPF / DKIM checks at SMTP edge gateways followed by deep ML content classifiers.',
      },
    ],
    sources: [
      {
        title: 'Building Scalable Webmail Backends',
        authorOrOrg: 'Fastmail Engineering Blog',
        url: 'https://fastmail.blog',
      },
      {
        title: 'JMAP: JSON Meta Application Protocol for Mail',
        authorOrOrg: 'IETF RFC 8620',
        url: 'https://datatracker.ietf.org/doc/html/rfc8620',
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
    id: 88,
    slug: 'calendar-scheduling-system',
    title: 'Enterprise Calendar & Scheduling (Google Calendar)',
    category: 'Collaboration',
    difficulty: 'Medium',
    problemStatement:
      'Design a calendar platform supporting recurring RRULE events, timezone conversions, multi-attendee availability matching (Free/Busy queries), and calendar invites.',
    constraints: {
      targetQps: 25000,
      dataSizeGb: 1000,
      maxP99LatencyMs: 35,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      {
        step: 1,
        hint: 'Store recurring events as compact iCalendar RFC 5545 RRULE strings, expanding instances on-the-fly during viewport queries.',
      },
      {
        step: 2,
        hint: 'Maintain Free/Busy availability intervals in memory or Redis bitmaps for instant meeting scheduling lookups.',
      },
      {
        step: 3,
        hint: 'Emit change notification webhooks asynchronously to external sync clients.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Calendar Client') },
        },
        {
          id: 'calApi',
          type: 'customComponent',
          position: { x: 280, y: 150 },
          data: { config: createDefaultConfig('app_server', 'calApi', 'Calendar API Server') },
        },
        {
          id: 'freeBusyCache',
          type: 'customComponent',
          position: { x: 540, y: 70 },
          data: {
            config: createDefaultConfig('redis_cache', 'freeBusyCache', 'Free/Busy Interval Cache'),
          },
        },
        {
          id: 'eventDb',
          type: 'customComponent',
          position: { x: 540, y: 220 },
          data: { config: createDefaultConfig('sql_db', 'eventDb', 'Event & RRULE Relational DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'calApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'calApi', target: 'freeBusyCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'calApi', target: 'eventDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why avoid expanding recurring RRULE events indefinitely in database rows?',
        answer:
          'An event repeating daily for 10 years would create 3,650 redundant database rows; storing one compact RRULE rule and expanding bounded date ranges dynamically saves 99% database storage.',
      },
      {
        question: 'How do you handle daylight saving time (DST) shifts across global attendees?',
        answer:
          'Store event times in UTC along with the original IANA Timezone ID (e.g. America/New_York); client renderers convert to local time factoring in DST rules.',
      },
    ],
    sources: [
      {
        title: 'iCalendar Internet Calendaring and Scheduling Protocol (iCalendar)',
        authorOrOrg: 'IETF RFC 5545',
        url: 'https://datatracker.ietf.org/doc/html/rfc5545',
      },
      {
        title: 'Building Scalable Calendar Scheduling Systems',
        authorOrOrg: 'Calendly Engineering Blog',
        url: 'https://calendly.com/blog',
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
    id: 89,
    slug: 'project-management-system',
    title: 'Issue Tracker & Kanban Platform (Jira/Linear)',
    category: 'Collaboration',
    difficulty: 'Medium',
    problemStatement:
      'Design an issue tracking and sprint management platform with custom workflow state transitions, sub-50ms issue search, and instant board synchronization.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 1000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.95,
    },
    hints: [
      {
        step: 1,
        hint: 'Store flexible custom issue schemas and state transitions in PostgreSQL with JSONB columns.',
      },
      {
        step: 2,
        hint: 'Index issue text, assignees, and sprint tags in Elasticsearch for fast JQL filtering.',
      },
      {
        step: 3,
        hint: 'Broadcast card drag-and-drop state changes over WebSockets to all team members viewing the board.',
      },
    ],
    referenceDesign: {
      nodes: [
        {
          id: 'c1',
          type: 'customComponent',
          position: { x: 50, y: 150 },
          data: { config: createDefaultConfig('client', 'c1', 'Kanban Board Client') },
        },
        {
          id: 'app',
          type: 'customComponent',
          position: { x: 260, y: 150 },
          data: { config: createDefaultConfig('app_server', 'app', 'Issue Tracker API') },
        },
        {
          id: 'es',
          type: 'customComponent',
          position: { x: 500, y: 70 },
          data: { config: createDefaultConfig('search_index', 'es', 'Issue Search Elasticsearch') },
        },
        {
          id: 'db',
          type: 'customComponent',
          position: { x: 500, y: 220 },
          data: { config: createDefaultConfig('sql_db', 'db', 'PostgreSQL Issue DB') },
        },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'app', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'app', target: 'es', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'app', target: 'db', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question:
          'How do you prevent race conditions when two engineers re-order cards on a Kanban board simultaneously?',
        answer:
          'Use fractional ranking / lexorank indexing where card positions are stored as floating point strings (e.g. between "a" and "b" insert "an"), avoiding updating all subsequent rows.',
      },
      {
        question: 'How do you optimize sync performance for desktop clients like Linear?',
        answer:
          'Use local SQLite databases on client machines; clients write locally instantly and synchronize delta logs bidirectionally with the server in background.',
      },
    ],
    sources: [
      {
        title: 'Scaling Linear: Real-Time Sync Architecture',
        authorOrOrg: 'Linear Engineering',
        url: 'https://linear.app/blog',
      },
      {
        title: 'Jira Software Architecture Overview',
        authorOrOrg: 'Atlassian Engineering',
        url: 'https://www.atlassian.com/engineering',
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
