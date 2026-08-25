import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const AUTH_SCENARIOS: Scenario[] = [
  {
    id: 66,
    slug: 'oauth-sso-system',
    title: 'OAuth 2.0 & SSO Identity Provider (Auth0/Okta)',
    category: 'Auth & Security',
    difficulty: 'Medium',
    problemStatement:
      'Design an enterprise Single Sign-On (SSO) and OAuth 2.0 / OpenID Connect authorization server supporting PKCE, multi-factor authentication (MFA), and session token lifecycle.',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 500,
      maxP99LatencyMs: 20,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Implement standard OAuth 2.0 Authorization Code Flow with PKCE for secure client credential exchange.' },
      { step: 2, hint: 'Issue asymmetric RSA/ECDSA-signed JWT access tokens with RS256 and JSON Web Key Sets (JWKS).' },
      { step: 3, hint: 'Maintain token revocation lists and active sessions in Redis.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'clientApp', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'clientApp', 'Mobile / Web App') } },
        { id: 'authSvr', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'authSvr', 'OAuth Identity Server') } },
        { id: 'sessionCache', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('redis_cache', 'sessionCache', 'Session & Revocation Cache') } },
        { id: 'userDb', type: 'customComponent', position: { x: 540, y: 220 }, data: { config: createDefaultConfig('sql_db', 'userDb', 'User Credentials DB') } },
      ],
      edges: [
        { id: 'e1', source: 'clientApp', target: 'authSvr', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'authSvr', target: 'sessionCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'authSvr', target: 'userDb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is PKCE (Proof Key for Code Exchange) mandatory even for confidential clients now?',
        answer: 'PKCE binds the authorization code request to the token exchange via code_verifier and code_challenge, preventing authorization code interception attacks.',
      },
      {
        question: 'How do downstream microservices verify JWT signatures without calling the auth server?',
        answer: 'Microservices cache the identity server\'s public keys fetched from /.well-known/jwks.json and verify JWT signatures locally in nanoseconds.',
      },
    ],
    sources: [
      {
        title: 'The OAuth 2.0 Authorization Framework',
        authorOrOrg: 'Hardt (IETF RFC 6749)',
        url: 'https://datatracker.ietf.org/doc/html/rfc6749',
      },
      {
        title: 'OpenID Connect Core 1.0 Specification',
        authorOrOrg: 'OpenID Foundation',
        url: 'https://openid.net/specs/openid-connect-core-1_0.html',
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
    id: 67,
    slug: 'rbac-permission-system',
    title: 'Fine-Grained Permission System (Google Zanzibar)',
    category: 'Auth & Security',
    difficulty: 'Medium',
    problemStatement:
      'Design a globally distributed authorization system modeled on Google Zanzibar, evaluating relationship-based access control (ReBAC) tuples across billions of objects in sub-10 milliseconds.',
    constraints: {
      targetQps: 60000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 10,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Model permissions as relation tuples: object#relation@user (e.g., doc:123#viewer@user:bob).' },
      { step: 2, hint: 'Deploy multi-level in-memory graph caches with Zookies (consistency tokens) to prevent stale ACL reads.' },
      { step: 3, hint: 'Store canonical relation tuples in distributed Spanner / CockroachDB.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'clientSvc', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('app_server', 'clientSvc', 'Caller Microservice') } },
        { id: 'aclEngine', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'aclEngine', 'Zanzibar ACL Evaluator') } },
        { id: 'tupleCache', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('redis_cache', 'tupleCache', 'Relation Tuple Cache') } },
        { id: 'spanner', type: 'customComponent', position: { x: 540, y: 220 }, data: { config: createDefaultConfig('nosql_db', 'spanner', 'Spanner Distributed DB') } },
      ],
      edges: [
        { id: 'e1', source: 'clientSvc', target: 'aclEngine', data: { protocol: 'gRPC' } },
        { id: 'e2', source: 'aclEngine', target: 'tupleCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'aclEngine', target: 'spanner', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is the "New Enemy Problem" in distributed authorization systems?',
        answer: 'When a user removes permissions on a shared resource, a concurrent read with stale cache might grant access to the revoked user; Zanzibar uses Zookies with snapshot read timestamps to solve this.',
      },
      {
        question: 'How does Zanzibar evaluate nested group memberships efficiently?',
        answer: 'It parallelizes relation graph traversal, caching intermediate sub-graph expansion results across concurrent check requests.',
      },
    ],
    sources: [
      {
        title: 'Zanzibar: Google’s Consistent, Global Authorization System',
        authorOrOrg: 'Pang et al. (USENIX ATC 2019)',
        url: 'https://research.google/pubs/pub48190/',
      },
      {
        title: 'OpenFGA: Relationship-Based Access Control Architecture',
        authorOrOrg: 'Auth0 / CNCF OpenFGA',
        url: 'https://openfga.dev',
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
    id: 68,
    slug: 'api-key-management',
    title: 'API Key Management & Metering',
    category: 'Auth & Security',
    difficulty: 'Easy',
    problemStatement:
      'Design an API key authentication, secret rotation, and quota metering service verifying millions of incoming API requests per minute.',
    constraints: {
      targetQps: 50000,
      dataSizeGb: 100,
      maxP99LatencyMs: 5,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Store salted SHA-256 hashes of API keys rather than plaintext keys.' },
      { step: 2, hint: 'Cache active API key metadata, scopes, and tier quotas in local memory / Redis.' },
      { step: 3, hint: 'Stream usage metering metrics asynchronously to Kafka for monthly billing calculations.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'c1', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'c1', 'Developer API Client') } },
        { id: 'gw', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'gw', 'API Gateway Auth Hook') } },
        { id: 'keyCache', type: 'customComponent', position: { x: 500, y: 70 }, data: { config: createDefaultConfig('redis_cache', 'keyCache', 'Hashed Key RAM Cache') } },
        { id: 'meteringMq', type: 'customComponent', position: { x: 500, y: 220 }, data: { config: createDefaultConfig('message_queue', 'meteringMq', 'Metering Events Kafka') } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'gw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'gw', target: 'keyCache', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'gw', target: 'meteringMq', data: { protocol: 'pub/sub' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why should API keys use human-readable prefixes (e.g. sk_live_...)?',
        answer: 'Prefixes allow automated secret scanning bots (GitHub Secret Scanning) to detect leaked keys instantly and allow gateways to identify environment/account routing before hashing.',
      },
      {
        question: 'How do you support zero-downtime key rotation?',
        answer: 'Support dual-key verification where both old and new keys remain valid simultaneously during a configurable 30-day grace period.',
      },
    ],
    sources: [
      {
        title: 'API Key Best Practices',
        authorOrOrg: 'Stripe Documentation',
        url: 'https://stripe.com/docs/keys',
      },
      {
        title: 'Building a Fast API Key Authentication Layer',
        authorOrOrg: 'Cloudflare Workers Blog',
        url: 'https://blog.cloudflare.com',
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
    id: 69,
    slug: 'ddos-mitigation',
    title: 'DDoS Protection & Edge Scrubbing (Cloudflare Magic Transit)',
    category: 'Auth & Security',
    difficulty: 'Medium',
    problemStatement:
      'Design an automated DDoS mitigation architecture capable of absorbing and filtering multi-terabit volumetric SYN floods, UDP amplification attacks, and Layer 7 HTTP floods.',
    constraints: {
      targetQps: 200000,
      dataSizeGb: 500,
      maxP99LatencyMs: 5,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Use BGP Anycast to announce IP prefixes across hundreds of globally distributed edge data centers, dispersing attack volume.' },
      { step: 2, hint: 'Employ eBPF / XDP (eXpress Data Path) kernel packet filters to drop malicious packets at wire speed before kernel socket allocation.' },
      { step: 3, hint: 'Deploy SYN cookies to handle TCP SYN floods without consuming server connection memory.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'botnet', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'botnet', 'Attack Traffic / Users') } },
        { id: 'anycastEdge', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('load_balancer', 'anycastEdge', 'Anycast Edge BGP Router') } },
        { id: 'xdpFilter', type: 'customComponent', position: { x: 540, y: 150 }, data: { config: createDefaultConfig('firewall', 'xdpFilter', 'XDP / eBPF Packet Filter') } },
        { id: 'cleanOrigin', type: 'customComponent', position: { x: 800, y: 150 }, data: { config: createDefaultConfig('app_server', 'cleanOrigin', 'Protected Customer Origin') } },
      ],
      edges: [
        { id: 'e1', source: 'botnet', target: 'anycastEdge', data: { protocol: 'TCP' } },
        { id: 'e2', source: 'anycastEdge', target: 'xdpFilter', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'xdpFilter', target: 'cleanOrigin', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is XDP (eXpress Data Path) exponentially faster than iptables for DDoS mitigation?',
        answer: 'XDP runs eBPF bytecode directly inside the network interface card driver before the Linux network stack allocates an sk_buff data structure, dropping packets in nanoseconds.',
      },
      {
        question: 'How do SYN cookies mitigate SYN flood attacks?',
        answer: 'The server encodes connection state into the initial TCP sequence number without allocating memory for half-open connections; memory is allocated only when final ACK is returned.',
      },
    ],
    sources: [
      {
        title: 'How Cloudflare Mitigates Terabit DDoS Attacks with XDP',
        authorOrOrg: 'Cloudflare Engineering Blog',
        url: 'https://blog.cloudflare.com/l4drop-xdp-ebpf-based-ddos-mitigation/',
      },
      {
        title: 'The TCP SYN Flooding Attack and Common Mitigations',
        authorOrOrg: 'Eddy (IETF RFC 4987)',
        url: 'https://datatracker.ietf.org/doc/html/rfc4987',
      },
    ],
    trafficPreset: {
      pattern: 'spike',
      baseQps: 200000,
      burstMultiplier: 5,
      rampDurationSec: 10,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 70,
    slug: 'zero-trust-architecture',
    title: 'Zero Trust Network Architecture (Google BeyondCorp)',
    category: 'Auth & Security',
    difficulty: 'Hard',
    problemStatement:
      'Design an enterprise Zero Trust remote access architecture replacing legacy corporate VPNs with context-aware access proxies evaluating device health, user identity, and continuous authentication.',
    constraints: {
      targetQps: 25000,
      dataSizeGb: 500,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Deploy an Identity-Aware Proxy (IAP) terminating external traffic before reaching private enterprise networks.' },
      { step: 2, hint: 'Enforce mutual TLS (mTLS) with client certificates bound to managed device hardware chips (TPM / Secure Enclave).' },
      { step: 3, hint: 'Evaluate dynamic policy rules (device patch level, location, user role) on every single request.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'employee', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'employee', 'Employee Laptop / Device') } },
        { id: 'iap', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'iap', 'Identity-Aware Proxy (IAP)') } },
        { id: 'contextEngine', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('app_server', 'contextEngine', 'Context Engine & Device DB') } },
        { id: 'internalApp', type: 'customComponent', position: { x: 540, y: 220 }, data: { config: createDefaultConfig('app_server', 'internalApp', 'Internal Enterprise App') } },
      ],
      edges: [
        { id: 'e1', source: 'employee', target: 'iap', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'iap', target: 'contextEngine', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'iap', target: 'internalApp', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is the fundamental paradigm shift of BeyondCorp versus perimeter-based security?',
        answer: 'Perimeter security assumes anything inside the corporate network is trusted; Zero Trust assumes the internal network is hostile and verifies every single request explicitly regardless of network location.',
      },
      {
        question: 'How is device identity validated tamper-proofly?',
        answer: 'Cryptographic client certificates are generated inside hardware Trusted Platform Modules (TPM) and validated via mTLS handshake at the proxy.',
      },
    ],
    sources: [
      {
        title: 'BeyondCorp: A New Approach to Enterprise Security',
        authorOrOrg: 'Ward & Beyer (Google Research / IEEE Security & Privacy 2014)',
        url: 'https://research.google/pubs/pub43231/',
      },
      {
        title: 'Zero Trust Architecture',
        authorOrOrg: 'Rose et al. (NIST Special Publication 800-207)',
        url: 'https://csrc.nist.gov/publications/detail/sp/800-207/final',
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
