import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const COMMUNICATION_SCENARIOS: Scenario[] = [
  {
    id: 94,
    slug: 'email-delivery-engine',
    title: 'High-Volume Email Delivery Infrastructure (SendGrid/Mailgun)',
    category: 'Communication',
    difficulty: 'Medium',
    problemStatement:
      'Design a transactional and marketing email delivery infrastructure capable of dispatching 100 million emails daily, managing IP reputation warmup, and processing bounce webhooks.',
    constraints: {
      targetQps: 40000,
      dataSizeGb: 4000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Queue outbound emails into partitioned Kafka topics separated by tenant priority.' },
      { step: 2, hint: 'Distribute sending across dedicated warm outbound IP pools with MX DNS lookups and SMTP connection pooling.' },
      { step: 3, hint: 'Process asynchronous bounce and complaint webhooks to update suppression lists in real time.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'appClient', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('app_server', 'appClient', 'Customer Backend') } },
        { id: 'emailGw', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'emailGw', 'Email Ingestion API') } },
        { id: 'mailMq', type: 'customComponent', position: { x: 500, y: 150 }, data: { config: createDefaultConfig('message_queue', 'mailMq', 'Outbound Mail Queue') } },
        { id: 'smtpPool', type: 'customComponent', position: { x: 740, y: 80 }, data: { config: createDefaultConfig('worker', 'smtpPool', 'MTA SMTP Worker Pool') } },
        { id: 'suppressionStore', type: 'customComponent', position: { x: 740, y: 220 }, data: { config: createDefaultConfig('redis_cache', 'suppressionStore', 'Bounce Suppression DB') } },
      ],
      edges: [
        { id: 'e1', source: 'appClient', target: 'emailGw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'emailGw', target: 'mailMq', data: { protocol: 'pub/sub' } },
        { id: 'e3', source: 'mailMq', target: 'smtpPool', data: { protocol: 'pub/sub' } },
        { id: 'e4', source: 'smtpPool', target: 'suppressionStore', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is IP warmup essential when sending email at scale?',
        answer: 'Major inbox providers (Gmail, Microsoft) block sudden high traffic from new IP addresses as spam; warmup gradually increases daily volume over 30 days to build domain reputation.',
      },
      {
        question: 'How do you handle temporary SMTP greylisting / 4xx soft bounces?',
        answer: 'Place the message into an exponential backoff delayed retry queue, attempting delivery after 5, 15, and 60 minutes before marking as hard bounce.',
      },
    ],
    sources: [
      {
        title: 'Building a High-Volume Email Infrastructure',
        authorOrOrg: 'SendGrid Technology Blog',
        url: 'https://sendgrid.com/blog',
      },
      {
        title: 'Simple Mail Transfer Protocol (SMTP)',
        authorOrOrg: 'Klensin (IETF RFC 5321)',
        url: 'https://datatracker.ietf.org/doc/html/rfc5321',
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
    id: 95,
    slug: 'push-notification-platform',
    title: 'Cross-Platform Push Notification Gateway',
    category: 'Communication',
    difficulty: 'Medium',
    problemStatement:
      'Design a unified push notification distribution service multiplexing alerts across Apple APNs (HTTP/2), Google FCM, and WebPush with connection pooling and token validation.',
    constraints: {
      targetQps: 60000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Maintain persistent HTTP/2 connections to Apple APNs and Google FCM servers.' },
      { step: 2, hint: 'Batch multiple device tokens into single multi-recipient HTTP/2 frames.' },
      { step: 3, hint: 'Cleanse expired device registration tokens automatically from return streams.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'eventSrc', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('app_server', 'eventSrc', 'App Microservices') } },
        { id: 'pushRouter', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'pushRouter', 'Push Router Gateway') } },
        { id: 'apnsWorker', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('worker', 'apnsWorker', 'APNs HTTP/2 Pool') } },
        { id: 'fcmWorker', type: 'customComponent', position: { x: 540, y: 220 }, data: { config: createDefaultConfig('worker', 'fcmWorker', 'FCM Gateway Pool') } },
      ],
      edges: [
        { id: 'e1', source: 'eventSrc', target: 'pushRouter', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'pushRouter', target: 'apnsWorker', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'pushRouter', target: 'fcmWorker', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is persistent HTTP/2 connection pooling critical for APNs throughput?',
        answer: 'APNs uses HTTP/2 multiplexing; opening a new TLS connection per push notification throttles throughput to a few hundred pushes/sec, whereas multiplexing over pooled sockets achieves 50,000+ pushes/sec.',
      },
      {
        question: 'How do you handle user timezones during global push notification campaigns?',
        answer: 'Queue notifications partitioned by UTC offset hour buckets; workers trigger dispatch according to recipient local target time.',
      },
    ],
    sources: [
      {
        title: 'Apple Push Notification service (APNs) Documentation',
        authorOrOrg: 'Apple Developer Documentation',
        url: 'https://developer.apple.com/documentation/usernotifications',
      },
      {
        title: 'Firebase Cloud Messaging Architecture',
        authorOrOrg: 'Google Firebase Documentation',
        url: 'https://firebase.google.com/docs/cloud-messaging',
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
    id: 96,
    slug: 'sms-gateway-system',
    title: 'Global SMS Gateway & Routing (Twilio)',
    category: 'Communication',
    difficulty: 'Medium',
    problemStatement:
      'Design a global SMS routing and telecommunication gateway connecting to international telecom aggregators (SMPP protocol) with least-cost routing and delivery receipts (DLR).',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 1000,
      maxP99LatencyMs: 35,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Maintain persistent Short Message Peer-to-Peer (SMPP) sessions to global telecom operators.' },
      { step: 2, hint: 'Execute dynamic least-cost routing (LCR) with carrier failover on route degradation.' },
      { step: 3, hint: 'Track async delivery receipts (DLR) and charge account balances via idempotency keys.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'API Client') } },
        { id: 'smsApi', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'smsApi', 'SMS API Gateway') } },
        { id: 'router', type: 'customComponent', position: { x: 500, y: 150 }, data: { config: createDefaultConfig('app_server', 'router', 'Least-Cost Route Evaluator') } },
        { id: 'smppWorker', type: 'customComponent', position: { x: 740, y: 150 }, data: { config: createDefaultConfig('worker', 'smppWorker', 'SMPP Telco Connector') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'smsApi', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'smsApi', target: 'router', data: { protocol: 'HTTP' } },
        { id: 'e3', source: 'router', target: 'smppWorker', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is SMPP (Short Message Peer-to-Peer) protocol?',
        answer: 'SMPP is a binary telecommunications protocol operating over TCP designed specifically for high-speed SMS exchange between applications and Short Message Service Centers (SMSC).',
      },
      {
        question: 'How do you prevent SMS toll fraud and pumping attacks?',
        answer: 'Enforce velocity rate limiters per IP, country destination prefix restrictions, and phone number risk scoring before dispatch.',
      },
    ],
    sources: [
      {
        title: 'SMPP Protocol Specification v3.4',
        authorOrOrg: 'SMS Forum',
        url: 'https://smpp.org',
      },
      {
        title: 'How Twilio Routes Billions of Messages Globally',
        authorOrOrg: 'Twilio Engineering Blog',
        url: 'https://www.twilio.com/blog',
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
    id: 97,
    slug: 'voip-voice-call-system',
    title: 'VoIP & Real-Time Voice Infrastructure (SIP/WebRTC)',
    category: 'Communication',
    difficulty: 'Hard',
    problemStatement:
      'Design a carrier-grade Voice over IP (VoIP) telephony and call routing infrastructure supporting SIP signaling, RTP audio streams, Opus codec transcoding, and PSTN gateway handoffs.',
    constraints: {
      targetQps: 25000,
      dataSizeGb: 5000,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Handle SIP call signaling (INVITE, BYE, ACK) via Kamailio / OpenSIPS proxy clusters.' },
      { step: 2, hint: 'Route bidirectional RTP audio streams through edge media relays (FreeSWITCH / Asterisk / RTPProxy).' },
      { step: 3, hint: 'Utilize STUN/TURN servers to traverse Symmetric NAT firewalls.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'caller', type: 'customComponent', position: { x: 50, y: 70 }, data: { config: createDefaultConfig('client', 'caller', 'VoIP Phone / Client') } },
        { id: 'callee', type: 'customComponent', position: { x: 50, y: 230 }, data: { config: createDefaultConfig('client', 'callee', 'Recipient Phone') } },
        { id: 'sipProxy', type: 'customComponent', position: { x: 280, y: 70 }, data: { config: createDefaultConfig('app_server', 'sipProxy', 'Kamailio SIP Proxy') } },
        { id: 'mediaRelay', type: 'customComponent', position: { x: 280, y: 230 }, data: { config: createDefaultConfig('app_server', 'mediaRelay', 'RTP Media Relay (FreeSWITCH)') } },
        { id: 'locStore', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('redis_cache', 'locStore', 'SIP User Location DB') } },
      ],
      edges: [
        { id: 'e1', source: 'caller', target: 'sipProxy', data: { protocol: 'UDP' } },
        { id: 'e2', source: 'sipProxy', target: 'locStore', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'caller', target: 'mediaRelay', data: { protocol: 'UDP' } },
        { id: 'e4', source: 'callee', target: 'mediaRelay', data: { protocol: 'UDP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why separate SIP signaling from RTP media streams?',
        answer: 'SIP handles light control logic (ring, answer, hangup) and can be centrally orchestrated, while heavy RTP media streams route directly over the shortest network path via UDP to minimize latency and jitter.',
      },
      {
        question: 'What is jitter and how does a jitter buffer smooth out audio playback?',
        answer: 'Jitter is variance in packet arrival times; a jitter buffer delays audio packets by 20-50ms to play them out at evenly spaced intervals, eliminating choppy audio.',
      },
    ],
    sources: [
      {
        title: 'SIP: Session Initiation Protocol',
        authorOrOrg: 'Rosenberg et al. (IETF RFC 3261)',
        url: 'https://datatracker.ietf.org/doc/html/rfc3261',
      },
      {
        title: 'Kamailio SIP Server Architecture',
        authorOrOrg: 'Kamailio Open Source Project',
        url: 'https://www.kamailio.org/w/features/',
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
