export interface DeviceDetailData {
  id: string;
  ip: string;
  hostname: string;
  deviceType: string;
  os: string;
  riskScore: number;
  vulnerabilities: string[];
  isDevice: boolean;
  sourceData?: any;
}

export interface VulnerabilityData {
  id: string;
  cveId?: string;
  description: string;
  severity: number;
  cvssScore?: number;
}