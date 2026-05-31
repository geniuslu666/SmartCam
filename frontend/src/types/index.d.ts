// Global types for the SmartCam frontend application

export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  name: string;
  description?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  uplinkBandwidthMbps?: number;
  maxConcurrentStreams: number;
  status: 'active' | 'inactive' | 'maintenance';
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
  // Extended fields from v_property_overview or API
  nvrCount?: number;
  channelCount?: number;
  offlineChannels?: number;
  activeSessions?: number;
}

export interface NVR {
  id: string;
  propertyId: string;
  name: string;
  brand: string;
  model?: string;
  firmwareVersion?: string;
  ipAddress: string;
  rtspPort: number;
  httpPort: number;
  username: string;
  // passwordEncrypted: string; // Should not be exposed to frontend
  maxBandwidthMbps?: number;
  channelCount: number;
  supportH264: boolean;
  supportH265: boolean;
  isOnline: boolean;
  lastHeartbeat?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  nvrId: string;
  propertyId: string;
  channelNumber: number;
  name: string;
  location?: string;
  rtspMainUrlTemplate?: string;
  rtspSubUrlTemplate?: string;
  mainStreamEncoding?: string;
  subStreamEncoding?: string;
  mainStreamResolution?: string;
  mainStreamFps?: number;
  mainStreamBitrateKbps?: number;
  subStreamResolution?: string;
  subStreamFps?: number;
  subStreamBitrateKbps?: number;
  isOnline: boolean;
  lastHeartbeat?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PlaySession {
  id: string;
  userId: string;
  channelId: string;
  propertyId: string;
  streamType: 'main' | 'sub';
  protocol: 'rtsp' | 'http-flv' | 'webrtc' | 'hls';
  zlmStreamId?: string;
  token?: string;
  tokenExpiresAt?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  isActive: boolean;
  status: 'playing' | 'ended' | 'error';
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  propertyId?: string;
  channelId?: string;
  details?: Record<string, any>; // JSONB details
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  createdAt: string;
}

export interface HealthCheck {
  id: string;
  nvrId?: string;
  channelId?: string;
  propertyId: string;
  checkType: 'ping' | 'rtsp_probe' | 'http_probe' | 'stream_test';
  result: 'success' | 'failure' | 'timeout';
  latencyMs?: number;
  errorMessage?: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  propertyId: string;
  nvrId?: string;
  channelId?: string;
  alertType: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description?: string;
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
