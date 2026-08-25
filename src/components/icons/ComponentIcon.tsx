import React from 'react';
import {
  Smartphone,
  Server,
  Cpu,
  Zap,
  GitFork,
  DoorOpen,
  Globe,
  Network,
  Shield,
  ArrowLeftRight,
  Database,
  Boxes,
  HardDrive,
  Search,
  Share2,
  Activity,
  Layers,
  Disc,
  Cloud,
  Monitor,
  ListOrdered,
  Radio,
  Shuffle,
  CheckSquare,
  Gauge,
  Key,
  Lock,
  LucideProps,
} from 'lucide-react';
import { ComponentType } from '../../model/types';

interface ComponentIconProps extends LucideProps {
  type: ComponentType;
}

const ICON_MAP: Record<ComponentType, React.ComponentType<LucideProps>> = {
  client: Smartphone,
  app_server: Server,
  worker: Cpu,
  serverless: Zap,
  load_balancer: GitFork,
  api_gateway: DoorOpen,
  cdn: Globe,
  dns: Network,
  firewall: Shield,
  reverse_proxy: ArrowLeftRight,
  sql_db: Database,
  nosql_db: Boxes,
  object_storage: HardDrive,
  search_index: Search,
  graph_db: Share2,
  timeseries_db: Activity,
  redis_cache: Layers,
  local_cache: Disc,
  cdn_cache: Cloud,
  browser_cache: Monitor,
  message_queue: ListOrdered,
  pubsub: Radio,
  event_bus: Shuffle,
  task_queue: CheckSquare,
  rate_limiter: Gauge,
  auth_service: Key,
  encryption_service: Lock,
};

export const ComponentIcon: React.FC<ComponentIconProps> = ({ type, ...props }) => {
  const IconComponent = ICON_MAP[type] || Server;
  return <IconComponent {...props} />;
};
