export const propertyRows = [
  {
    id: 'p-001',
    name: '测试物业 A',
    address: '192.168.147.0/24 内网',
    status: 'active',
    nvrCount: 1,
    channelCount: 4,
    onlineChannels: 4,
    activeSessions: 3,
    uplink: '20 Mbps',
  },
]

export const cameraRows = [
  {
    id: 'cam-1',
    name: '测试摄像头 1',
    area: '192.168.147.20',
    channel: '102',
    stream: 'H.264 子码流 / H.265 主码流',
    bitrate: '1 Mbps',
    status: 'online',
  },
  {
    id: 'cam-2',
    name: '测试摄像头 2',
    area: '192.168.147.21',
    channel: '202',
    stream: 'H.264 子码流 / H.265 主码流',
    bitrate: '1 Mbps',
    status: 'online',
  },
  {
    id: 'cam-3',
    name: '测试摄像头 3',
    area: '192.168.147.22',
    channel: '302',
    stream: 'H.264 子码流 / H.265 主码流',
    bitrate: '1 Mbps',
    status: 'online',
  },
  {
    id: 'cam-4',
    name: '测试摄像头 4',
    area: '192.168.147.23',
    channel: '402',
    stream: 'H.264 子码流 / H.265 主码流',
    bitrate: '1 Mbps',
    status: 'online',
  },
]

export const nvrRows = [
  {
    id: 'nvr-001',
    name: '测试物业A-海康NVR',
    brand: 'Hikvision',
    model: 'Hikvision NVR',
    ip: '192.168.147.100',
    channels: 4,
    status: 'online',
    lastSeen: '刚刚',
  },
]

export const auditRows = [
  { time: '08:10:22', user: 'admin', action: '预览', target: '测试物业 A / 通道 1', status: 'success' },
  { time: '08:05:41', user: 'operator01', action: '拉流失败', target: '测试物业 A / 通道 8', status: 'failure' },
  { time: '07:58:03', user: 'admin', action: '登录', target: '控制台', status: 'success' },
]
