import { Scenario } from '../model/types';
import { createDefaultConfig } from '../model/component-defaults';

export const ML_SCENARIOS: Scenario[] = [
  {
    id: 80,
    slug: 'ml-feature-store',
    title: 'ML Feature Store (Feast/Tecton)',
    category: 'ML / AI Infrastructure',
    difficulty: 'Hard',
    problemStatement:
      'Design a unified Machine Learning Feature Store providing low-latency feature vector retrieval for online real-time inference and point-in-time correct historical offline training datasets.',
    constraints: {
      targetQps: 50000,
      dataSizeGb: 10000,
      maxP99LatencyMs: 10,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Dual-store architecture: Redis / DynamoDB for low-latency online key-value lookups; BigQuery / Snowflake / Parquet on S3 for offline training.' },
      { step: 2, hint: 'Stream live feature transformations into the online store via Kafka and Spark/Flink streaming.' },
      { step: 3, hint: 'Enforce point-in-time correctness to prevent data leakage from the future into historical training sets.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'inferenceSvc', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('app_server', 'inferenceSvc', 'Model Serving Worker') } },
        { id: 'featureRouter', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'featureRouter', 'Feast Feature Store API') } },
        { id: 'onlineStore', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('redis_cache', 'onlineStore', 'Online Store (Redis <5ms)') } },
        { id: 'offlineStore', type: 'customComponent', position: { x: 540, y: 220 }, data: { config: createDefaultConfig('object_storage', 'offlineStore', 'Offline Parquet Lake') } },
      ],
      edges: [
        { id: 'e1', source: 'inferenceSvc', target: 'featureRouter', data: { protocol: 'gRPC' } },
        { id: 'e2', source: 'featureRouter', target: 'onlineStore', data: { protocol: 'TCP' } },
        { id: 'e3', source: 'featureRouter', target: 'offlineStore', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is Train-Serve Skew in Machine Learning and how does a Feature Store prevent it?',
        answer: 'Train-serve skew occurs when feature transformation logic differs between offline training code (Python/SQL) and online serving code (C++/Java); a Feature Store defines transformations once and shares identical definitions across both.',
      },
      {
        question: 'How does point-in-time correctness work during historical training generation?',
        answer: 'The feature store joins event labels with the latest feature values known strictly prior to the label timestamp, eliminating future data leakage.',
      },
    ],
    sources: [
      {
        title: 'Feast: An Open Source Feature Store for Machine Learning',
        authorOrOrg: 'Linux Foundation AI & Data / Feast Community',
        url: 'https://feast.dev',
      },
      {
        title: 'Tecton: A Real-Time Feature Platform for Machine Learning',
        authorOrOrg: 'Mike Del Balso et al. (Tecton.ai)',
        url: 'https://www.tecton.ai',
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
    id: 81,
    slug: 'model-serving-platform',
    title: 'Real-Time Model Serving Platform (Triton/KServe)',
    category: 'ML / AI Infrastructure',
    difficulty: 'Hard',
    problemStatement:
      'Design a scalable deep learning model serving platform supporting GPU dynamic batching, multi-model concurrency, A/B canary routing, and sub-20ms inference latency.',
    constraints: {
      targetQps: 30000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 20,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Deploy Triton Inference Server on Kubernetes with GPU autoscaling.' },
      { step: 2, hint: 'Enable dynamic batching: buffer incoming inference requests for 1-5ms to maximize GPU tensor parallel throughput.' },
      { step: 3, hint: 'Use model registries (MLflow / S3) with zero-downtime hot model reloading.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'client', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'client', 'Inference Caller') } },
        { id: 'gw', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'gw', 'Model Gateway (KServe)') } },
        { id: 'tritonFleet', type: 'customComponent', position: { x: 500, y: 150 }, data: { config: createDefaultConfig('worker', 'tritonFleet', 'Triton GPU Worker Fleet') } },
        { id: 'modelBucket', type: 'customComponent', position: { x: 740, y: 150 }, data: { config: createDefaultConfig('object_storage', 'modelBucket', 'Model Registry (S3/ONNX)') } },
      ],
      edges: [
        { id: 'e1', source: 'client', target: 'gw', data: { protocol: 'gRPC' } },
        { id: 'e2', source: 'gw', target: 'tritonFleet', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'tritonFleet', target: 'modelBucket', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'How does dynamic batching dramatically increase GPU throughput without blowing latency SLAs?',
        answer: 'GPUs are massively parallel and process a batch of 16 requests almost as fast as a single request; dynamic batching groups requests arriving within a microsecond window.',
      },
      {
        question: 'Why utilize TensorRT or ONNX Runtime compilation over raw PyTorch in production?',
        answer: 'TensorRT applies layer fusion, precision calibration (FP16 / INT8 quantization), and kernel auto-tuning, speeding up inference by 3x-6x.',
      },
    ],
    sources: [
      {
        title: 'NVIDIA Triton Inference Server Architecture',
        authorOrOrg: 'NVIDIA Developer Documentation',
        url: 'https://github.com/triton-inference-server/server',
      },
      {
        title: 'KServe: Cloud Native Model Serving on Kubernetes',
        authorOrOrg: 'KServe / CNCF Community',
        url: 'https://kserve.github.io/kserve/',
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
    id: 82,
    slug: 'distributed-training-pipeline',
    title: 'Distributed ML Training Pipeline (Kubeflow/Ray)',
    category: 'ML / AI Infrastructure',
    difficulty: 'Hard',
    problemStatement:
      'Design a multi-node distributed deep learning training cluster orchestrating data parallelism (PyTorch DDP), gradient all-reduce synchronization, and checkpoint fault tolerance.',
    constraints: {
      targetQps: 5000,
      dataSizeGb: 50000,
      maxP99LatencyMs: 100,
      availabilitySlaPercent: 99.9,
    },
    hints: [
      { step: 1, hint: 'Utilize high-bandwidth InfiniBand / RoCE networking with Ring All-Reduce (NCCL) for gradient synchronization.' },
      { step: 2, hint: 'Orchestrate training jobs via Kubeflow Training Operator / Ray Train on GPU clusters.' },
      { step: 3, hint: 'Save periodic model state checkpoints (every N epochs) to distributed object storage for spot instance failure recovery.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'engineer', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'engineer', 'ML Researcher / CI') } },
        { id: 'orchestrator', type: 'customComponent', position: { x: 280, y: 150 }, data: { config: createDefaultConfig('app_server', 'orchestrator', 'Kubeflow / Ray Master') } },
        { id: 'gpuNode1', type: 'customComponent', position: { x: 540, y: 70 }, data: { config: createDefaultConfig('worker', 'gpuNode1', 'GPU Worker Node Alpha') } },
        { id: 'gpuNode2', type: 'customComponent', position: { x: 540, y: 220 }, data: { config: createDefaultConfig('worker', 'gpuNode2', 'GPU Worker Node Beta') } },
        { id: 'checkpointS3', type: 'customComponent', position: { x: 800, y: 150 }, data: { config: createDefaultConfig('object_storage', 'checkpointS3', 'Checkpoint & Dataset S3') } },
      ],
      edges: [
        { id: 'e1', source: 'engineer', target: 'orchestrator', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'orchestrator', target: 'gpuNode1', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'orchestrator', target: 'gpuNode2', data: { protocol: 'gRPC' } },
        { id: 'e4', source: 'gpuNode1', target: 'gpuNode2', data: { protocol: 'TCP' } },
        { id: 'e5', source: 'gpuNode1', target: 'checkpointS3', data: { protocol: 'HTTP' } },
      ],
    },
    discussionPoints: [
      {
        question: 'What is the difference between Data Parallelism and Tensor / Model Parallelism?',
        answer: 'Data parallelism splits training batches across GPUs with identical model copies; Model parallelism splits model layer weights across multiple GPUs when a single model exceeds GPU memory (VRAM).',
      },
      {
        question: 'How does Ring All-Reduce avoid network bottlenecks at the master node?',
        answer: 'Nodes form a logical ring and exchange gradient chunks with neighboring nodes; communication volume is independent of node count O(N).',
      },
    ],
    sources: [
      {
        title: 'PyTorch Distributed: Overview of Distributed Data Parallel',
        authorOrOrg: 'Li et al. (PyTorch Core Team / VLDB 2020)',
        url: 'https://pytorch.org/docs/stable/distributed.html',
      },
      {
        title: 'Ray: A Distributed Framework for Emerging AI Applications',
        authorOrOrg: 'Moritz et al. (UC Berkeley RISELab / OSDI 2018)',
        url: 'https://www.usenix.org/conference/osdi18/presentation/moritz',
      },
    ],
    trafficPreset: {
      pattern: 'steady',
      baseQps: 5000,
      burstMultiplier: 2,
      rampDurationSec: 30,
      spikeFrequencySec: 10,
    },
  },
  {
    id: 83,
    slug: 'vector-embedding-search',
    title: 'Vector Database & Embedding Search (Milvus/Pinecone/Qdrant)',
    category: 'ML / AI Infrastructure',
    difficulty: 'Medium',
    problemStatement:
      'Design a high-dimensional vector search engine indexing hundreds of millions of 1536-dimensional embeddings with approximate nearest neighbors (HNSW / IVF-PQ) and metadata filtering.',
    constraints: {
      targetQps: 40000,
      dataSizeGb: 10000,
      maxP99LatencyMs: 25,
      availabilitySlaPercent: 99.999,
    },
    hints: [
      { step: 1, hint: 'Construct Hierarchical Navigable Small World (HNSW) graphs in memory for high-recall nearest neighbor search.' },
      { step: 2, hint: 'Partition vectors across shards using consistent hashing on vector IDs or cluster centroids.' },
      { step: 3, hint: 'Support single-stage filtered vector search by executing scalar metadata filtering concurrently with graph traversal.' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'client', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'client', 'RAG / Semantic Client') } },
        { id: 'coord', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'coord', 'Vector Coordinator') } },
        { id: 'vNode1', type: 'customComponent', position: { x: 520, y: 70 }, data: { config: createDefaultConfig('search_index', 'vNode1', 'HNSW Vector Shard 1') } },
        { id: 'vNode2', type: 'customComponent', position: { x: 520, y: 220 }, data: { config: createDefaultConfig('search_index', 'vNode2', 'HNSW Vector Shard 2') } },
      ],
      edges: [
        { id: 'e1', source: 'client', target: 'coord', data: { protocol: 'gRPC' } },
        { id: 'e2', source: 'coord', target: 'vNode1', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'coord', target: 'vNode2', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why is HNSW graph search preferred over Product Quantization (IVF-PQ) when recall is critical?',
        answer: 'HNSW achieves 95%+ recall with lower latency by traversing multi-layer proximity graphs; IVF-PQ achieves higher compression at the cost of lower recall precision.',
      },
      {
        question: 'What is the difference between Pre-Filtering and Single-Stage Iterative Filtering in Vector Search?',
        answer: 'Pre-filtering filters metadata first and runs vector search on the tiny remaining subset (often breaking graph connectivity); single-stage filtering evaluates metadata during graph traversal.',
      },
    ],
    sources: [
      {
        title: 'Efficient and Robust Approximate Nearest Neighbor Search Using HNSW Graphs',
        authorOrOrg: 'Malkov & Yashunin (IEEE TPAMI 2018)',
        url: 'https://arxiv.org/abs/1603.09320',
      },
      {
        title: 'Milvus: A Purpose-Built Vector Data Management System',
        authorOrOrg: 'Wang et al. (ACM SIGMOD 2021)',
        url: 'https://doi.org/10.1145/3448016.3457550',
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
    id: 84,
    slug: 'llm-serving-infrastructure',
    title: 'LLM Serving & Inference Engine (vLLM/TGI)',
    category: 'ML / AI Infrastructure',
    difficulty: 'Hard',
    problemStatement:
      'Design a large language model (LLM) serving architecture maximizing generation throughput with continuous batching, PagedAttention KV-cache memory management, and streaming tokens.',
    constraints: {
      targetQps: 15000,
      dataSizeGb: 2000,
      maxP99LatencyMs: 30,
      availabilitySlaPercent: 99.99,
    },
    hints: [
      { step: 1, hint: 'Implement PagedAttention (vLLM) to eliminate KV-cache memory fragmentation, allocating memory like OS virtual memory pages.' },
      { step: 2, hint: 'Adopt Continuous Iteration Batching to insert new prompt requests as soon as earlier requests complete generation tokens.' },
      { step: 3, hint: 'Stream output tokens back to clients via Server-Sent Events (SSE) / WebSockets for sub-100ms time-to-first-token (TTFT).' },
    ],
    referenceDesign: {
      nodes: [
        { id: 'chatUser', type: 'customComponent', position: { x: 50, y: 150 }, data: { config: createDefaultConfig('client', 'chatUser', 'Chat Client (SSE)') } },
        { id: 'llmGateway', type: 'customComponent', position: { x: 260, y: 150 }, data: { config: createDefaultConfig('api_gateway', 'llmGateway', 'LLM Router Gateway') } },
        { id: 'vllmMaster', type: 'customComponent', position: { x: 500, y: 150 }, data: { config: createDefaultConfig('app_server', 'vllmMaster', 'vLLM Continuous Batch Engine') } },
        { id: 'gpuCluster', type: 'customComponent', position: { x: 740, y: 150 }, data: { config: createDefaultConfig('worker', 'gpuCluster', 'PagedAttention GPU Cluster') } },
      ],
      edges: [
        { id: 'e1', source: 'chatUser', target: 'llmGateway', data: { protocol: 'HTTP' } },
        { id: 'e2', source: 'llmGateway', target: 'vllmMaster', data: { protocol: 'gRPC' } },
        { id: 'e3', source: 'vllmMaster', target: 'gpuCluster', data: { protocol: 'gRPC' } },
      ],
    },
    discussionPoints: [
      {
        question: 'Why was static batching inefficient for LLM generation?',
        answer: 'Static batching forced the GPU to wait until the longest response finished generation before starting new requests, wasting up to 70% of GPU compute on padding tokens.',
      },
      {
        question: 'How does PagedAttention solve KV-Cache memory waste?',
        answer: 'Traditional KV caches allocate contiguous VRAM up to max context length; PagedAttention allocates non-contiguous physical memory blocks dynamically on-demand.',
      },
    ],
    sources: [
      {
        title: 'Efficient Memory Management for Large Language Model Serving with PagedAttention (vLLM)',
        authorOrOrg: 'Kwon et al. (UC Berkeley / SOSP 2023)',
        url: 'https://arxiv.org/abs/2309.06180',
      },
      {
        title: 'Orca: A Distributed Serving System for Transformer-Based Generative Models',
        authorOrOrg: 'Yu et al. (OSDI 2022)',
        url: 'https://www.usenix.org/conference/osdi22/presentation/yu',
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
];
