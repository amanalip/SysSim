import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const IOT_SCENARIOS: Scenario[] = [
  {
    id: 71,
    slug: 'iot-telemetry-platform',
    title: 'IoT Telemetry Ingestion Platform (AWS IoT Core)',
    category: 'IoT & Edge',
    difficulty: 'Medium',
    problemStatement:
      'Design an IoT ingestion platform maintaining millions of persistent MQTT connections from smart devices, processing high-frequency sensor telemetry, and routing alerts in real time.',
    constraints: {
      targetQps: 100000,
      dataSizeGb: 15000,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Deploy an MQTT broker cluster (EMQX / HiveMQ) supporting TLS client certificate authentication.' },
      { step: 2, hint: 'Bridge incoming MQTT message payloads into Kafka for scalable parallel consumption.' },
      { step: 3, hint: 'Store raw telemetry in Time-Series databases (InfluxDB / TimescaleDB) and device shadows in Redis.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'sensors', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'sensors', 'IoT Smart Devices') } },
        { id: 'mqttBroker', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'mqttBroker', 'MQTT Broker Gateway') } },
        { id: 'deviceShadow', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('redis_cache', 'deviceShadow', 'Device Shadow Cache') } },
        { id: 'kafka', type: 'customComponent', position: { x: 540, y: 220 }, data: { config: createDefaultConfig('message_queue', 'kafka', 'Telemetry Kafka') } },
        { id: 'tsdb', type: 'customComponent', position: { x: 800, y: 220 }, data: { config: createDefaultConfig('timeseries_db', 'tsdb', 'TimescaleDB Cluster') } },
      ],
      edges: [
        { id: 'e1', source: 'sensors', target: 'mqttBroker', data: { protocol: 'MQTT' as any } },
        { id: 'e2', source: 'mqttBroker', target: 'deviceShadow', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'mqttBroker', target: 'kafka', data: { protocol: 'pub/sub' } },
        { id: 'e4', source: 'kafka', target: 'tsdb', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is MQTT preferred over HTTP for low-power IoT devices?',
        answer: 'MQTT has an extremely lightweight binary packet header (2 bytes), low battery overhead, and built-in Quality of Service (QoS 0, 1, 2) delivery guarantees.',
      },
      {
        question: 'What is a Device Shadow and why is it useful?',
        answer: 'A Device Shadow is a JSON document representing the device\'s desired and reported state stored in the cloud, allowing mobile apps to inspect or update device settings even when the physical device is currently offline.',
      },
    ],
    sources: [
      {
        title: 'MQTT Version 5.0 Standard Specification',
        authorOrOrg: 'OASIS Standard',
        url: 'https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html',
      },
      {
        title: 'AWS IoT Core Architectural Overview',
        authorOrOrg: 'Amazon Web Services',
        url: 'https://docs.aws.amazon.com/iot/latest/developerguide/what-is-aws-iot.html',
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
    id: 72,
    slug: 'smart-home-hub',
    title: 'Smart Home Hub & Automation Engine',
    category: 'IoT & Edge',
    difficulty: 'Medium',
    problemStatement:
      'Design a smart home device automation engine executing complex event-condition-action (ECA) routines with local offline resilience and cloud remote access.',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 200,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Execute core automations locally on the home hub gateway to ensure lights and sensors function without active internet.' },
      { step: 2, hint: 'Maintain an encrypted bidirectional WebSocket tunnel between hub and cloud for remote control.' },
      { step: 3, hint: 'Use an In-Memory state machine to coordinate device groups and scenes.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'mobileUser', type: 'customComponent', position: { x: 50, y: 70 }, data: { config: createDefaultConfig('client', 'mobileUser', 'Homeowner Mobile App') } },
        { id: 'cloudRelay', type: 'customComponent', position: { x: 260, y: 70 }, data: { config: createDefaultConfig('app_server', 'cloudRelay', 'Cloud Remote Relay') } },
        { id: 'homeHub', type: 'customComponent', position: { x: 520, y: 150 }, data: { config: createDefaultConfig('app_server', 'homeHub', 'Local Home Hub (Edge)') } },
        { id: 'devices', type: 'customComponent', position: { x: 780, y: 150 }, data: { config: createDefaultConfig('client', 'devices', 'Zigbee / Matter Devices') } },
      ],
      edges: [
        { id: 'e1', source: 'mobileUser', target: 'cloudRelay', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'cloudRelay', target: 'homeHub', data: { protocol: 'WebSocket' } },
        { id: 'e3', source: 'homeHub', target: 'devices', data: { protocol: 'TCP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is Matter / Thread replacing proprietary smart home protocols?',
        answer: 'Matter provides an open IPv6-based standard enabling local cross-vendor device interoperability without needing third-party cloud bridges.',
      },
      {
        question: 'How do you handle firmware updates (OTA) across thousands of smart hubs safely?',
        answer: 'Use A/B dual-bank flash memory partitions with cryptographic signature verification and automated fallback to the previous partition on boot failure.',
      },
    ],
    sources: [
      {
        title: 'Matter: The Foundation for Connected Things',
        authorOrOrg: 'Connectivity Standards Alliance (CSA)',
        url: 'https://csa-iot.org/all-solutions/matter/',
      },
      {
        title: 'Home Assistant Core Architecture',
        authorOrOrg: 'Home Assistant Community',
        url: 'https://developers.home-assistant.io/docs/architecture_index',
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
    id: 73,
    slug: 'fleet-tracking',
    title: 'Fleet Vehicle Tracking & Telematics (Samsara)',
    category: 'IoT & Edge',
    difficulty: 'Medium',
    problemStatement:
      'Design a commercial vehicle fleet tracking platform ingesting real-time GPS coordinates, engine OBD-II diagnostics, and driver safety alerts from hundreds of thousands of commercial trucks.',
    constraints: {
      targetQps: 50000,
      dataSizeGb: 8000,
      maxP99LatencyMs: 35,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Compress and batch GPS pings on the vehicle gateway during cellular blind spots, syncing upon reconnection.' },
      { step: 2, hint: 'Stream GPS traces into Apache Flink for real-time geofence violation and harsh braking detection.' },
      { step: 3, hint: 'Store historical route breadcrumbs in partitioned Parquet files on object storage.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'trucks', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'trucks', 'Vehicle Telematics Unit') } },
        { id: 'ingestGw', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'ingestGw', 'Telematics Ingestion Gateway') } },
        { id: 'flinkStream', type: 'customComponent', position: { x: 500, y: 150 }, data: { config: createDefaultConfig('worker', 'flinkStream', 'Flink Real-Time Rules') } },
        { id: 'geoDb', type: 'customComponent', position: { x: 740, y: 80 }, data: { config: createDefaultConfig('nosql_db', 'geoDb', 'Live Vehicle State DB') } },
        { id: 'routeArchive', type: 'customComponent', position: { x: 740, y: 220 }, data: { config: createDefaultConfig('object_storage', 'routeArchive', 'Historical Route Parquet') } },
      ],
      edges: [
        { id: 'e1', source: 'trucks', target: 'ingestGw', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'ingestGw', target: 'flinkStream', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'flinkStream', target: 'geoDb', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'flinkStream', target: 'routeArchive', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How do you detect geofence entry and exit events in streaming time-series data?',
        answer: 'Flink maintains previous coordinate state per vehicle and computes point-in-polygon tests on each new GPS coordinate; boundary crossings trigger instant webhooks.',
      },
      {
        question: 'How do you optimize cellular data consumption for 500,000 trucks?',
        answer: 'Use Protocol Buffers binary encoding over TLS, delta encoding on GPS coordinates, and adaptive ping frequencies based on vehicle velocity.',
      },
    ],
    sources: [
      {
        title: 'Building Real-time IoT Infrastructure for Connected Fleets',
        authorOrOrg: 'Samsara Engineering Blog',
        url: 'https://www.samsara.com/blog',
      },
      {
        title: 'Stream Processing with Apache Flink: Fundamentals and Patterns',
        authorOrOrg: 'Fabian Hueske, Vasiliki Kalavri (O\'Reilly)',
        url: 'https://www.oreilly.com',
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
    id: 74,
    slug: 'edge-computing-gateway',
    title: 'Edge Computing Gateway & Local Inference',
    category: 'IoT & Edge',
    difficulty: 'Hard',
    problemStatement:
      'Design an edge computing platform orchestrating containerized micro-apps on factory floor edge appliances, executing local computer vision defect detection with cloud synchronization.',
    constraints: {
      targetQps: 20000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 10,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Deploy lightweight Kubernetes (K3s) or container runtimes on local industrial edge hardware.' },
      { step: 2, hint: 'Execute camera image inference locally via TensorRT / ONNX Runtime on edge GPUs with sub-10ms response.' },
      { step: 3, hint: 'Filter and upload only anomalous defect frames to cloud storage to conserve WAN bandwidth.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'camera', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'camera', 'Factory Vision Sensor') } },
        { id: 'edgeApp', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'edgeApp', 'Edge AI Gateway (TensorRT)') } },
        { id: 'localDb', type: 'customComponent', position: { x: 540, y: 80 }, data: { config: createDefaultConfig('nosql_db', 'localDb', 'Local Edge SQLite/RocksDB') } },
        { id: 'cloudSync', type: 'customComponent', position: { x: 540, y: 220 }, data: { config: createDefaultConfig('object_storage', 'cloudSync', 'Cloud Anomaly S3 Bucket') } },
      ],
      edges: [
        { id: 'e1', source: 'camera', target: 'edgeApp', data: { protocol: 'gRPC' } },
        { id: 'e2', source: 'edgeApp', target: 'localDb', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'edgeApp', target: 'cloudSync', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is local edge inference mandatory for industrial robotics and manufacturing lines?',
        answer: 'Cloud latency (50-200ms) is too slow for real-time assembly line sorting (requires sub-10ms), and factory lines must operate uninterrupted during internet outages.',
      },
      {
        question: 'How do you deploy updated machine learning models to 10,000 edge gateways reliably?',
        answer: 'Use containerized model registries with progressive canary rollouts and automated rollback if local validation accuracy degrades.',
      },
    ],
    sources: [
      {
        title: 'Edge Computing: Vision and Challenges',
        authorOrOrg: 'Weisong Shi et al. (IEEE Internet of Things Journal 2016)',
        url: 'https://ieeexplore.ieee.org/document/7488250',
      },
      {
        title: 'K3s: Lightweight Kubernetes for Edge Computing',
        authorOrOrg: 'CNCF Sandbox Project / Rancher Labs',
        url: 'https://k3s.io',
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
    id: 75,
    slug: 'sensor-data-pipeline',
    title: 'Industrial Sensor Pipeline & Anomaly Detector',
    category: 'IoT & Edge',
    difficulty: 'Medium',
    problemStatement:
      'Design a predictive maintenance data pipeline ingesting vibration and thermal sensor streams from industrial turbines, executing anomaly detection models and triggering emergency shutdowns.',
    constraints: {
      targetQps: 60000,
      dataSizeGb: 6000,
      maxP99LatencyMs: 15,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Ingest high-frequency sensor readings through Apache Pulsar / Kafka.' },
      { step: 2, hint: 'Run streaming statistical anomaly detection algorithms (Z-score / Isolation Forest) in real time.' },
      { step: 3, hint: 'Store raw high-resolution sensor metrics for 7 days, downsampling to hourly averages for long-term historical retention.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'turbines', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'turbines', 'Turbine Sensors') } },
        { id: 'pulsar', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('message_queue', 'pulsar', 'Apache Pulsar Ingest') } },
        { id: 'anomalyWorker', type: 'customComponent', position: { x: 500, y: 150 }, data: { config: createDefaultConfig('worker', 'anomalyWorker', 'Anomaly Detection Model') } },
        { id: 'alertDb', type: 'customComponent', position: { x: 740, y: 80 }, data: { config: createDefaultConfig('timeseries_db', 'alertDb', 'Sensor TimeSeries DB') } },
        { id: 'actuator', type: 'customComponent', position: { x: 740, y: 220 }, data: { config: createDefaultConfig('app_server', 'actuator', 'Emergency Actuator Svc') } },
      ],
      edges: [
        { id: 'e1', source: 'turbines', target: 'pulsar', data: { protocol: 'TCP' } },
        { id: 'e2', source: 'pulsar', target: 'anomalyWorker', data: { protocol: 'pub/sub' } },
        { id: 'e3', source: 'anomalyWorker', target: 'alertDb', data: { protocol: 'TCP' } },
        { id: 'e4', source: 'anomalyWorker', target: 'actuator', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why choose Apache Pulsar over Kafka for multi-tenant industrial telemetry?',
        answer: 'Pulsar natively decouples compute (brokers) from storage (Apache BookKeeper) and supports millions of independent sensor topics with built-in multi-tenancy.',
      },
      {
        question: 'How do you prevent false-positive alarms from triggering emergency shutdowns?',
        answer: 'Require anomalies to persist across multiple consecutive sliding windows (e.g. 5 consecutive seconds) and cross-validate across paired temperature and vibration sensors.',
      },
    ],
    sources: [
      {
        title: 'Apache Pulsar Architecture Overview',
        authorOrOrg: 'Apache Software Foundation',
        url: 'https://pulsar.apache.org/docs/en/concepts-architecture-overview/',
      },
      {
        title: 'Predictive Maintenance Using IoT Sensor Data',
        authorOrOrg: 'Siemens Industrial Automation Whitepaper',
        url: 'https://www.siemens.com',
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
];
