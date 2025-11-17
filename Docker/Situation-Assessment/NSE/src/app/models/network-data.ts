export interface SubnetData {
  id: string;
  subnet: string;
  deviceCount: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  devices: DeviceData[];
  isVulnerable: boolean;
  networkSize: number;
  maxDevices: number;
  networkPart: string;
  hasDetailedData: boolean;
  detailedNodes?: any[];
  vulnerabilities?: string[];
  hasSubnetRiskScore?: boolean;
  subnetRiskSource?: string;
  avgDeviceRiskScore?: number;
  maxDeviceRiskScore?: number;
  vulnerableDeviceCount?: number;
  statsRecalculated?: boolean;
  organizationName?: string;
  organizationId?: string;
}

export interface DeviceData {
  id: string;
  ip: string;
  hostname: string;
  deviceType: string;
  os: string;
  riskScore: number;
  vulnerabilities: string[];
  isDevice: boolean;
  sourceData?: any;
  openPorts?: number[];
  lastSeen?: string;
  status?: string;
  hasRiskScore?: boolean;
}

export interface NetworkStats {
  totalSubnets: number;
  totalDevices: number;
  highRiskSubnets: number;
  avgRiskScore: number;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export interface CytoscapeElement {
  data: {
    id: string;
    label?: string;
    source?: string;
    target?: string;
    type?: string;
    deviceCount?: number;
    riskScore?: number;
    riskLevel?: string;
    isVulnerable?: boolean;
    subnet?: string;
  };
}