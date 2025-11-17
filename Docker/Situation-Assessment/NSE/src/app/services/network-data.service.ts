import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, firstValueFrom } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { SubnetData, DeviceData, NetworkStats } from '../models/network-data';

@Injectable({
  providedIn: 'root'
})
export class NetworkDataService {
  private networkDataSubject = new BehaviorSubject<SubnetData[]>([]);
  private statsSubject = new BehaviorSubject<NetworkStats>({
    totalSubnets: 0,
    totalDevices: 0,
    highRiskSubnets: 0,
    avgRiskScore: 0
  });

  public networkData$ = this.networkDataSubject.asObservable();
  public stats$ = this.statsSubject.asObservable();

  private currentlyExpanding = new Set<string>();
  private lastExpandedData: any[] | null = null;
  private lastExpandedSubnet: string | null = null;
  private lastExpandedTime: number | null = null;

  constructor(private apiService: ApiService) {}
  
  async loadNetworkData(): Promise<SubnetData[]> {
  try {
    console.log('Loading network data...');
    
    const healthCheck = await firstValueFrom(this.apiService.checkApiHealth());
    if (!healthCheck) {
      console.error('Backend API not available');
      return [];
    }

    const existingData = await firstValueFrom(this.apiService.getVirtualNetworkData());
    const hasPopulatedData = this.checkIfDataIsPopulated(existingData || []);

    let networkData: any[] = [];
    
    if (hasPopulatedData) {
      console.log('Found existing populated data');
      networkData = existingData || [];
    } else {
      console.log('Populating JSON with CIDR data...');
      await firstValueFrom(this.apiService.fetchCidrData());
      await this.delay(500);
      networkData = await firstValueFrom(this.apiService.getVirtualNetworkData());
    }

    // Process virtual network data to create subnet objects
    let processedData = this.processVirtualNetworkData(networkData || []);
    
    // Check for existing subnet details and device data from cache
    processedData = await this.loadCachedSubnetData(processedData, networkData);
    
    // Update network data
    this.updateNetworkData(processedData);
    
    return processedData;

  } catch (error) {
    console.error('Error loading network data:', error);
    return [];
  }
}

private async loadCachedSubnetData(subnets: SubnetData[], virtualNetworkData: any[]): Promise<SubnetData[]> {
  try {
    console.log('Loading cached subnet data...');
    
    // Find Organization nodes which contain subnet device data
    const organizationNodes = virtualNetworkData.filter(item => 
      item.data && item.data.type === 'Organization'
    );
    
    // Also check for any nodes that might have subnetDeviceData
    const nodesWithDeviceData = virtualNetworkData.filter(item =>
      item.data && item.data.subnetDeviceData
    );
    
    if (organizationNodes.length === 0 && nodesWithDeviceData.length === 0) {
      console.log('No cached device data found');
      return subnets;
    }
    
    let cachedSubnetData: any = {};
    
    // Extract cached data from nodes that have it
    nodesWithDeviceData.forEach(node => {
      if (node.data.subnetDeviceData) {
        cachedSubnetData = { ...cachedSubnetData, ...node.data.subnetDeviceData };
      }
    });
    
    if (Object.keys(cachedSubnetData).length > 0) {
      console.log('Found cached data for subnets:', Object.keys(cachedSubnetData));
    }
    
    // Extract all IP nodes with device data from the virtual network
    const ipNodesWithDevices = virtualNetworkData.filter(item => 
      item.data && 
      item.data.type === 'IP' && 
      item.data.deviceData
    );
    
    // Group devices by subnet
    const devicesBySubnet: { [subnet: string]: any[] } = {};
    ipNodesWithDevices.forEach(ipNode => {
      const deviceData = ipNode.data.deviceData;
      const ipAddress = deviceData.ip;
      const subnetCidr = this.getSubnetFromIP(ipAddress);
      
      if (!devicesBySubnet[subnetCidr]) {
        devicesBySubnet[subnetCidr] = [];
      }
      devicesBySubnet[subnetCidr].push(deviceData);
    });
    
    // Also check for Subnet nodes with direct risk scores
    const subnetNodes = virtualNetworkData.filter(item => 
      item.data && item.data.type === 'Subnet' && item.data.label
    );

    
    const directSubnetRisks: { [subnet: string]: number } = {};
    subnetNodes.forEach(subnetNode => {
      const subnetCidr = subnetNode.data.label;
      if (subnetNode.data.details && !isNaN(parseFloat(subnetNode.data.details))) {
        directSubnetRisks[subnetCidr] = parseFloat(subnetNode.data.details);
      }
    });
    
    let updatedCount = 0;
    
    // Update subnets with cached data
    subnets.forEach(subnet => {
      const devices = devicesBySubnet[subnet.subnet] || [];
      const directRiskScore = directSubnetRisks[subnet.subnet];
      
      if (devices.length > 0 || directRiskScore !== undefined) {
        // Update device information
        subnet.devices = devices;
        subnet.deviceCount = devices.length;
        subnet.hasDetailedData = devices.length > 0;
        
        // Determine risk score priority: Direct subnet risk > calculated from devices > default
        if (directRiskScore !== undefined) {
          subnet.riskScore = directRiskScore;
          subnet.hasSubnetRiskScore = true;
          subnet.subnetRiskSource = 'cached_subnet_node';
          console.log(`Using cached subnet risk score for ${subnet.subnet}: ${directRiskScore}`);
        } else if (devices.length > 0) {
          const devicesWithRisk = devices.filter(d => d.hasRiskScore && d.riskScore > 0);
          if (devicesWithRisk.length > 0) {
            const avgRisk = devicesWithRisk.reduce((sum, d) => sum + d.riskScore, 0) / devicesWithRisk.length;
            subnet.riskScore = avgRisk;
            subnet.hasSubnetRiskScore = true;
            subnet.subnetRiskSource = 'cached_device_average';
            console.log(`Calculated risk score from cached devices for ${subnet.subnet}: ${avgRisk.toFixed(2)}`);
          }
        }
        
        // Update risk level based on risk score
        subnet.riskLevel = this.determineRiskLevel(subnet.riskScore);
        
        // Calculate additional statistics
        if (devices.length > 0) {
          subnet.vulnerableDeviceCount = devices.filter(d => d.vulnerabilities && d.vulnerabilities.length > 0).length;
          const deviceRiskScores = devices.filter(d => d.hasRiskScore).map(d => d.riskScore);
          if (deviceRiskScores.length > 0) {
            subnet.avgDeviceRiskScore = deviceRiskScores.reduce((sum, score) => sum + score, 0) / deviceRiskScores.length;
            subnet.maxDeviceRiskScore = Math.max(...deviceRiskScores);
          }
        }
        
        console.log(`Loaded cached data for ${subnet.subnet}: ${devices.length} devices, risk ${subnet.riskScore.toFixed(1)} (${subnet.riskLevel}), org: ${subnet.organizationName}`);
        updatedCount++;
      }
    });
    
    console.log(`Updated ${updatedCount} subnets with cached data`);
    return subnets;
    
  } catch (error) {
    console.warn('Error loading cached subnet data:', error);
    return subnets;
  }
}

private getSubnetFromIP(ipAddress: string): string {
  const parts = ipAddress.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  return ipAddress;
}

async getSubnetDetails(subnetCidr: string, progressCallback?: (message: string) => void): Promise<{ devices: DeviceData[], nodes: any[], vulnerabilities: string[] }> {
  const updateProgress = (message: string) => {
    console.log(` ${message}`);
    if (progressCallback) progressCallback(message);
  };

  try {
    // First check if we already have this data cached
    const currentNetworkData = this.getCurrentNetworkData();
    const existingSubnet = currentNetworkData.find(s => s.subnet === subnetCidr);
    
    if (existingSubnet && existingSubnet.hasDetailedData && existingSubnet.devices && existingSubnet.devices.length > 0) {
      updateProgress(`Loading cached data for ${existingSubnet.devices.length} devices...`);
      await this.delay(300); // Brief delay for UX
      
      console.log(`Using cached device data for ${subnetCidr}: ${existingSubnet.devices.length} devices`);
      
      return {
        devices: existingSubnet.devices,
        nodes: [],
        vulnerabilities: existingSubnet.devices.flatMap(d => d.vulnerabilities || [])
      };
    }
    
    // If no cached data, query from Neo4j
    updateProgress('Querying subnet devices from database...');
    
    const result = await firstValueFrom(this.apiService.getSubnetDevicesDirect(subnetCidr));
    
    updateProgress('Processing device data...');
    await this.delay(500);
    
    const devices: DeviceData[] = result.devices.map((device: any) => ({
      id: device.id,
      ip: device.ip,
      hostname: device.hostname,
      deviceType: device.deviceType,
      os: device.os,
      riskScore: device.riskScore || 0,
      vulnerabilities: device.vulnerabilities || [],
      isDevice: true,
      hasRiskScore: device.hasRiskScore,
      sourceData: device,
      openPorts: device.openPorts,
      lastSeen: device.lastSeen,
      status: device.status
    }));
    
    updateProgress(`Found ${devices.length} devices`);
    
    // Update the subnet in current network data
    const subnetToUpdate = currentNetworkData.find(s => s.subnet === subnetCidr);
    if (subnetToUpdate) {
      subnetToUpdate.deviceCount = devices.length;
      subnetToUpdate.devices = devices;
      subnetToUpdate.hasDetailedData = true;
      
      if (result.subnetRiskScore !== undefined && result.subnetRiskScore > 0) {
        subnetToUpdate.riskScore = result.subnetRiskScore;
        subnetToUpdate.hasSubnetRiskScore = true;
        subnetToUpdate.subnetRiskSource = 'neo4j_query';
        subnetToUpdate.riskLevel = this.determineRiskLevel(result.subnetRiskScore);
        console.log(`Updated subnet ${subnetCidr} risk score to ${result.subnetRiskScore} from Neo4j`);
      }
      
      this.updateNetworkData(currentNetworkData);
    }
    
    return {
      devices: devices,
      nodes: [],
      vulnerabilities: result.vulnerabilities || []
    };

  } catch (error) {
    console.error('Error fetching subnet details:', error);
    updateProgress('Error loading data - no devices found');
    
    return {
      devices: [],
      nodes: [],
      vulnerabilities: []
    };
  }
}

private checkIfDeviceDataIsPopulated(apiData: any[], subnetCidr: string): boolean {
  if (!apiData || apiData.length === 0) {
    return false;
  }

  // Check if there are IP nodes for this subnet
  const networkPrefix = subnetCidr.split('/')[0].split('.').slice(0, 3).join('.');
  
  // Look for nodes and edges in the data
  const cytoscapeNodes = apiData.filter(el => el.data && !el.data.source && !el.data.target);
  const ipNodes = cytoscapeNodes.filter((nodeWrapper: any) => {
    const node = nodeWrapper.value || nodeWrapper.data;
    return node.type === 'IP' && node.label && node.label.startsWith(networkPrefix + '.');
  });

  // If we have IP nodes for this subnet, consider it populated
  const hasIpNodes = ipNodes.length > 0;
  
  console.log(`Checking if data is populated for ${subnetCidr}: found ${ipNodes.length} IP nodes`);
  
  return hasIpNodes;
}

  // Process virtual network data from API
  private processVirtualNetworkData(virtualNetworkData: any[]): SubnetData[] {
  if (!virtualNetworkData || !Array.isArray(virtualNetworkData) || virtualNetworkData.length === 0) {
    return [];
  }

  const organizationNodes = virtualNetworkData.filter(item => 
    item.data && item.data.type === 'Organization'
  );

  if (organizationNodes.length === 0) {
    console.warn('No Organization nodes found, checking for direct Subnet nodes...');
    
    const subnetNodes = virtualNetworkData.filter(item =>
      item.data && item.data.type === 'Subnet' && item.data.label
    );
    
    if (subnetNodes.length === 0) {
      console.warn('No Subnet nodes found either');
      return [];
    }
    
    console.log(`Processing ${subnetNodes.length} direct Subnet nodes`);
    
    const existingSubnetScores = this.extractSubnetRiskScores(virtualNetworkData);
    
    const subnets = subnetNodes
      .map(node => node.data.label)
      .filter((subnet: string) => {
        if (!subnet || typeof subnet !== 'string' || !subnet.includes('/')) return false;
        const [networkPart, cidrPart] = subnet.split('/');
        const cidr = parseInt(cidrPart);
        
        if (cidr < 8 || cidr > 32) return false;
        
        const octets = networkPart.split('.');
        if (octets.length !== 4) return false;
        
        return octets.every(octet => {
            const num = parseInt(octet);
            return !isNaN(num) && num >= 0 && num <= 255;
        });
      });
    
    console.log(`Filtered to ${subnets.length} valid subnets`);
    
    return subnets.map((subnet: string, index: number) => {
      const isVulnerable = false;
      const [networkPart, cidrPart] = subnet.split('/');
      const cidr = parseInt(cidrPart);
      const maxPossibleDevices = Math.pow(2, 32 - cidr) - 2;

      const neoRiskData = existingSubnetScores[subnet];
      const riskScore = neoRiskData?.riskScore || 0.0;
      const riskLevel = neoRiskData?.riskLevel || this.determineRiskLevel(riskScore);
      const hasSubnetRiskScore = !!neoRiskData;

      console.log(`Processing subnet ${subnet}: ISIM risk score = ${riskScore} (${riskLevel})`);

      return {
        id: `subnet-${index}`,
        subnet,
        deviceCount: 0,
        riskScore,
        riskLevel,
        devices: [],
        isVulnerable,
        networkSize: cidr,
        maxDevices: maxPossibleDevices,
        networkPart,
        hasDetailedData: false,
        hasSubnetRiskScore,
        subnetRiskSource: hasSubnetRiskScore ? 'ISIM' : 'default',
        organizationName: 'Unknown Organization',
        organizationId: undefined
      } as SubnetData;
    });
  }

  let allSubnets: string[] = [];
  const orgContext: { [subnet: string]: { name: string, id: string } } = {};

  organizationNodes.forEach(orgNode => {
    const orgName = orgNode.data.label;
    const orgId = orgNode.data.id;
    const subnets = orgNode.data.details || [];
    
    console.log(`Processing organization: ${orgName} with ${subnets.length} subnets`);
    
    subnets.forEach((subnet: string) => {
      orgContext[subnet] = { name: orgName, id: orgId };
    });
    
    allSubnets.push(...subnets);
  });

  const subnets = allSubnets.filter((subnet: string) => {
    if (!subnet || typeof subnet !== 'string' || !subnet.includes('/')) return false;
    const [networkPart, cidrPart] = subnet.split('/');
    const cidr = parseInt(cidrPart);
    
    if (cidr < 8 || cidr > 32) return false;
    
    const octets = networkPart.split('.');
    if (octets.length !== 4) return false;
    
    return octets.every(octet => {
        const num = parseInt(octet);
        return !isNaN(num) && num >= 0 && num <= 255;
    });
  });

  console.log(`Filtered subnets: ${subnets.length} from ${allSubnets.length} total across ${organizationNodes.length} organizations`);

  const existingSubnetScores = this.extractSubnetRiskScores(virtualNetworkData);

  return subnets.map((subnet: string, index: number) => {
    const isVulnerable = false;
    const [networkPart, cidrPart] = subnet.split('/');
    const cidr = parseInt(cidrPart);
    const maxPossibleDevices = Math.pow(2, 32 - cidr) - 2;

    const neoRiskData = existingSubnetScores[subnet];
    const riskScore = neoRiskData?.riskScore || 0.0;
    const riskLevel = neoRiskData?.riskLevel || this.determineRiskLevel(riskScore);
    const hasSubnetRiskScore = !!neoRiskData;

    const orgInfo = orgContext[subnet];

    console.log(`Processing subnet ${subnet}: ISIM risk score = ${riskScore} (${riskLevel}), org = ${orgInfo?.name || 'Unknown'}`);

    return {
      id: `subnet-${index}`,
      subnet,
      deviceCount: 0,
      riskScore,
      riskLevel,
      devices: [],
      isVulnerable,
      networkSize: cidr,
      maxDevices: maxPossibleDevices,
      networkPart,
      hasDetailedData: false,
      hasSubnetRiskScore,
      subnetRiskSource: hasSubnetRiskScore ? 'ISIM' : 'default',
      organizationName: orgInfo?.name || 'Unknown Organization',
      organizationId: orgInfo?.id
    } as SubnetData;
  });
}

private extractSubnetRiskScores(virtualNetworkData: any[]): { [subnet: string]: { riskScore: number, riskLevel: string } } {
  const scores: { [subnet: string]: { riskScore: number, riskLevel: string } } = {};
  
  // Look for ALL Subnet nodes with risk scores, not just /24
  const subnetNodes = virtualNetworkData.filter(item => 
    item.data && item.data.type === 'Subnet' && item.data.label
  );
  
  console.log(`Found ${subnetNodes.length} subnet nodes in initial data for risk score extraction`);
  
  subnetNodes.forEach(subnetNode => {
    const subnetCidr = subnetNode.data.label;
    
    // Extract risk score from ISIM subnet node details field
    if (subnetNode.data.details && !isNaN(parseFloat(subnetNode.data.details))) {
      const riskScore = parseFloat(subnetNode.data.details);
      const riskLevel = this.determineRiskLevel(riskScore);
      
      scores[subnetCidr] = { riskScore, riskLevel };
      console.log(`Extracted ISIM risk score for ${subnetCidr}: ${riskScore} (${riskLevel})`);
    } else {
      console.log(`No risk score found in details for ${subnetCidr}: ${subnetNode.data.details}`);
    }
  });
  
  console.log(`Total subnet risk scores extracted: ${Object.keys(scores).length}`);
  return scores;
}

  private processSubnetDetailData(apiData: any[], subnetCidr: string): { devices: DeviceData[], nodes: any[], vulnerabilities: string[] } {
  const networkPrefix = subnetCidr.split('/')[0].split('.').slice(0, 3).join('.');
  console.log(`Processing subnet: ${subnetCidr}, using network prefix: ${networkPrefix}`);
  
  const devices: DeviceData[] = [];
  const nodes: any[] = [];
  const vulnerabilities: string[] = [];

  if (!apiData) {
    return { devices, nodes, vulnerabilities };
  }

  // Process Cytoscape format data
  const cytoscapeNodes = apiData.filter(el => el.data && !el.data.source && !el.data.target);
  const cytoscapeEdges = apiData.filter(el => el.data && el.data.source && el.data.target);

  // Extract subnet risk score from ISIM during expansion
  const subnetNode = cytoscapeNodes.find(el => 
    el.data && el.data.type === 'Subnet' && el.data.label === subnetCidr
  );

  if (subnetNode) {
    const subnetNodeData = subnetNode.data;
    console.log(`Found subnet node during expansion:`, subnetNodeData);
    
    // Extract Risk Score from subnet node if available
    if (subnetNodeData.details && !isNaN(parseFloat(subnetNodeData.details))) {
      const subnetRiskScore = parseFloat(subnetNodeData.details);
      console.log(` Subnet has Risk Score from ISIM during expansion: ${subnetRiskScore}`);
      
      // Find the subnet object in current network data and update it
      const currentNetworkData = this.getCurrentNetworkData();
      const subnetObj = currentNetworkData.find(s => s.subnet === subnetCidr);
      if (subnetObj) {
        subnetObj.riskScore = subnetRiskScore;
        subnetObj.hasSubnetRiskScore = true;
        subnetObj.subnetRiskSource = 'ISIM_expansion';
        subnetObj.riskLevel = this.determineRiskLevel(subnetRiskScore);
        
        console.log(` Updated subnet during expansion with ISIM Risk Score: ${subnetRiskScore} (${subnetObj.riskLevel})`);
        
        // Update the network data to trigger UI updates
        this.updateNetworkData(currentNetworkData);
      }
    } else {
      console.log(` Subnet node found but no Risk Score in details during expansion: ${subnetNodeData.details}`);
    }
  } else {
    console.log(` Subnet node not found in expanded data for: ${subnetCidr}`);
  }

  const nodeIndex = new Map();
  const edgesBySource = new Map();
  const edgesByTarget = new Map();

  cytoscapeNodes.forEach(nodeWrapper => {
    if (nodeWrapper?.value || nodeWrapper?.data) {
      const node = nodeWrapper.value || nodeWrapper.data;
      const nodeId = nodeWrapper.v || nodeWrapper.data.id;
      node.id = nodeId;
      nodeIndex.set(nodeId, node);
      nodes.push(node);
    }
  });

  cytoscapeEdges.forEach(edge => {
    const sourceId = edge.v || edge.data.source;
    const targetId = edge.w || edge.data.target;
    const relationshipType = edge.value?.type || edge.data.label || edge.data.type;

    if (!edgesBySource.has(sourceId)) edgesBySource.set(sourceId, []);
    if (!edgesByTarget.has(targetId)) edgesByTarget.set(targetId, []);

    const edgeData = {
      source: sourceId,
      target: targetId,
      type: relationshipType,
      id: edge.value?.id || edge.data.id
    };

    edgesBySource.get(sourceId).push(edgeData);
    edgesByTarget.get(targetId).push(edgeData);
  });

  // Find IP nodes in the subnet
  const subnetIPs = Array.from(nodeIndex.values()).filter((node: any) =>
    node.type === 'IP' && node.label && node.label.startsWith(networkPrefix + '.')
  );

  console.log(`Found ${subnetIPs.length} IP nodes in subnet ${networkPrefix}.x`);

  // Process each IP to extract device information
  subnetIPs.forEach((ipNode: any) => {
    const device = this.extractDeviceFromIP(ipNode, nodeIndex, edgesBySource, edgesByTarget);
    if (device) {
      devices.push(device);
    }
  });

  // Extract vulnerabilities
  nodeIndex.forEach((node: any) => {
    if (node.type === 'Vulnerability' || node.type === 'CVE') {
      vulnerabilities.push(node.label || node.id);
    }
  });

  console.log(`Processed ${subnetCidr}: Found ${devices.length} devices`);

  // Update the subnet in current network data
  const currentNetworkData = this.getCurrentNetworkData();
  const subnetToUpdate = currentNetworkData.find(s => s.subnet === subnetCidr);
  if (subnetToUpdate) {
    subnetToUpdate.deviceCount = devices.length;
    subnetToUpdate.devices = devices;
    subnetToUpdate.hasDetailedData = true;
    this.updateNetworkData(currentNetworkData);
  }

  return { devices, nodes, vulnerabilities };
}

  // Extract device information from IP node
  private extractDeviceFromIP(ipNode: any, nodeIndex: Map<string, any>, edgesBySource: Map<string, any[]>, edgesByTarget: Map<string, any[]>): DeviceData | null {
  const deviceInfo: DeviceData = {
  id: `device-${ipNode.id}`,
  ip: String(ipNode.label || ''), // Convert to string
  hostname: '',
  deviceType: 'Network Device',
  os: 'Unknown',
  riskScore: 0.0,
  vulnerabilities: [],
  isDevice: true,
  sourceData: ipNode
};

  const ipId = ipNode.id;
  const outgoingEdges = edgesBySource.get(ipId) || [];
  const incomingEdges = edgesByTarget.get(ipId) || [];

  // Find hostname via RESOLVES_TO relationship
const resolvesToEdge = outgoingEdges.find((edge: any) => edge.type === 'RESOLVES_TO');
if (resolvesToEdge) {
  const domainNode = nodeIndex.get(resolvesToEdge.target);
  if (domainNode && domainNode.type === 'DomainName') {
    deviceInfo.hostname = String(domainNode.label || ''); // Convert to string
  }
}

  // Find the node that HAS_ASSIGNED this IP
  const hasAssignedEdge = incomingEdges.find((edge: any) => edge.type === 'HAS_ASSIGNED');
  
  if (hasAssignedEdge) {
    const assigningNode = nodeIndex.get(hasAssignedEdge.source);
    
    if (assigningNode) {
      // Extract risk score from the assigning node
      if (assigningNode.label && !isNaN(parseFloat(assigningNode.label))) {
        deviceInfo.riskScore = parseFloat(assigningNode.label);
        console.log(`Got device risk score from node label: ${deviceInfo.riskScore}`);
      } else if (assigningNode.details && !isNaN(parseFloat(assigningNode.details))) {
        deviceInfo.riskScore = parseFloat(assigningNode.details);
        console.log(`Got device risk score from node details: ${deviceInfo.riskScore}`);
      }

      // Find Host node via IS_A relationship from the assigning node
      const assigningNodeEdges = edgesBySource.get(hasAssignedEdge.source) || [];
      const isAEdge = assigningNodeEdges.find((edge: any) => edge.type === 'IS_A');

      if (isAEdge) {
        const hostNode = nodeIndex.get(isAEdge.target);
        if (hostNode && hostNode.type === 'Host') {
          // Find SoftwareVersion via ON relationship (Software -> Host)
          const softwareOnHostEdges = edgesByTarget.get(isAEdge.target) || [];
          const onEdges = softwareOnHostEdges.filter((edge: any) => edge.type === 'ON');

          onEdges.forEach((onEdge: any) => {
            const softwareNode = nodeIndex.get(onEdge.source);
            if (softwareNode && softwareNode.type === 'SoftwareVersion') {
              deviceInfo.os = this.extractOSFromSoftware(softwareNode.label);
              
              const softwareIncomingEdges = edgesByTarget.get(onEdge.source) || [];
              const inEdges = softwareIncomingEdges.filter((edge: any) => edge.type === 'IN');

              inEdges.forEach((inEdge: any) => {
                const vulnNode = nodeIndex.get(inEdge.source);
                if (vulnNode && vulnNode.type === 'Vulnerability') {
                  // Find CVE via REFERS_TO
                  const vulnOutgoingEdges = edgesBySource.get(inEdge.source) || [];
                  const refersToEdge = vulnOutgoingEdges.find((edge: any) => edge.type === 'REFERS_TO');

                  if (refersToEdge) {
                    const cveNode = nodeIndex.get(refersToEdge.target);
                    if (cveNode && cveNode.type === 'CVE') {
                      const cveId = this.extractCVEIdentifier(cveNode, vulnNode);
                      if (cveId) {
                        deviceInfo.vulnerabilities.push(cveId);
                      }
                    }
                  } else {
                    deviceInfo.vulnerabilities.push(vulnNode.label || 'Unknown Vulnerability');
                  }
                }
              });
            }
          });
        }
      }
    }
  }

  // Set device type based on OS and hostname
  deviceInfo.deviceType = this.determineDeviceType(deviceInfo.os, deviceInfo.hostname);

  // Use fallback hostname if none found
if (!deviceInfo.hostname) {
  const lastOctet = String(deviceInfo.ip || '').split('.').pop();
  deviceInfo.hostname = `host-${lastOctet}`;
}

if (deviceInfo.riskScore === 0.0) {
  deviceInfo.hasRiskScore = false;
  console.log(`No risk score found for ${deviceInfo.ip}, keeping at 0.0`);
} else {
  deviceInfo.hasRiskScore = true;
  console.log(`Found ISIM risk score for ${deviceInfo.ip}: ${deviceInfo.riskScore.toFixed(1)}`);
}

  // Add fake data for ports, last seen, and status
  (deviceInfo as any).openPorts = this.generatePortsForDevice(deviceInfo.deviceType, deviceInfo.os);
  (deviceInfo as any).lastSeen = this.getRandomRecentDate();
  (deviceInfo as any).status = this.getRandomStatus();

  return deviceInfo;
}

  private async expandAllSubnetNodes(currentData: any[], progressCallback?: (message: string) => void): Promise<void> {
  const subnetNodes = currentData.filter(el => 
    el.data && el.data.type === 'Subnet' && el.data.label && el.data.label.includes('/32')
  );

  console.log(`Expanding ${subnetNodes.length} /32 subnet nodes`);
  
  if (progressCallback) {
    progressCallback(`Found ${subnetNodes.length} /32 subnets to expand...`);
  }

  if (subnetNodes.length === 0) {
    console.log('No /32 subnet nodes found to expand');
    return;
  }

  const subnetBatchSize = 5;
  const totalBatches = Math.ceil(subnetNodes.length / subnetBatchSize);
  
  for (let i = 0; i < subnetNodes.length; i += subnetBatchSize) {
    const batch = subnetNodes.slice(i, i + subnetBatchSize);
    const currentBatch = Math.floor(i / subnetBatchSize) + 1;
    
    console.log(`Processing /32 subnet batch ${currentBatch}/${totalBatches} (${batch.length} subnets)`);
    
    if (progressCallback) {
      progressCallback(`Expanding /32 subnet batch ${currentBatch}/${totalBatches}`);
    }
    
    for (const subnetNode of batch) {
      console.log(`  Expanding /32 subnet: ${subnetNode.data.label}`);
      
      try {
        await firstValueFrom(this.apiService.expandVirtualNetwork(subnetNode.data.id, 'Subnet'));
        await this.delay(500);
      } catch (error) {
        console.log(`  Error expanding subnet ${subnetNode.data.label}:`, error);
      }
    }
    
    await this.delay(1000);
  }
  
  console.log(`Completed expansion of all ${subnetNodes.length} /32 subnet nodes`);
  if (progressCallback) {
    progressCallback(`Completed /32 subnet expansion`);
  }
}

  private async expandAllIpNodes(currentData: any[], subnetCidr: string, progressCallback?: (message: string) => void): Promise<void> {
  const networkPrefix = subnetCidr.split('/')[0].split('.').slice(0, 3).join('.');
  const ipNodes = currentData.filter(el => 
    el.data && el.data.type === 'IP' && el.data.label && el.data.label.startsWith(networkPrefix + '.')
  );

  console.log(`Found ${ipNodes.length} IP nodes in subnet ${networkPrefix}.x - expanding ALL of them`);
  
  if (progressCallback) {
    progressCallback(`Found ${ipNodes.length} IP nodes to expand...`);
  }

  if (ipNodes.length === 0) {
    console.log('No IP nodes found to expand');
    if (progressCallback) {
      progressCallback('No IP nodes found to expand');
    }
    return;
  }

  const ipBatchSize = 10;
  const totalBatches = Math.ceil(ipNodes.length / ipBatchSize);
  
  console.log(`Will process ${totalBatches} batches of up to ${ipBatchSize} IPs each`);
  
  for (let i = 0; i < ipNodes.length; i += ipBatchSize) {
    const batch = ipNodes.slice(i, i + ipBatchSize);
    const currentBatch = Math.floor(i / ipBatchSize) + 1;
    
    console.log(`Processing IP batch ${currentBatch}/${totalBatches} (${batch.length} IPs)`);
    
    // Update both console and popup with batch progress
    const batchMessage = `Expanding IP batch ${currentBatch}/${totalBatches} (${batch.length} IPs)`;
    if (progressCallback) {
      progressCallback(batchMessage);
    }
    
    for (const ipNode of batch) {
      console.log(`  Expanding IP node: ${ipNode.data.label}`);
      
      try {
        const expandIpResponse = await firstValueFrom(
          this.apiService.expandVirtualNetwork(ipNode.data.id, 'IP')
        );
        
        if (expandIpResponse) {
          await this.delay(300);
        }
      } catch (err) {
        console.log(`  Error expanding IP ${ipNode.data.label}:`, err);
      }
    }
    
    // Brief pause between batches
    await this.delay(800);
    
    // Update progress with completion of current batch
    if (progressCallback && currentBatch < totalBatches) {
      progressCallback(`Completed batch ${currentBatch}/${totalBatches}, continuing...`);
    }
  }
  
  console.log(`Completed expansion of all ${ipNodes.length} IP nodes`);
  if (progressCallback) {
    progressCallback(`Completed expansion of all ${ipNodes.length} IP nodes`);
  }
}

  private extractOSFromSoftware(softwareLabel: string): string {
  const labelStr = String(softwareLabel || ''); // Convert to string first
  if (!labelStr) return 'Unknown';
  
  const lower = labelStr.toLowerCase();
  
  if (lower.includes('microsoft:windows_10')) return 'Windows 10';
  if (lower.includes('microsoft:windows_server_2019')) return 'Windows Server 2019';
  if (lower.includes('microsoft:windows_server_2016')) return 'Windows Server 2016';
  if (lower.includes('microsoft:windows_server')) return 'Windows Server';
  if (lower.includes('microsoft:windows')) return 'Windows';
  if (lower.includes('ubuntu')) return 'Ubuntu Linux';
  if (lower.includes('centos')) return 'CentOS Linux';
  if (lower.includes('redhat')) return 'Red Hat Linux';
  if (lower.includes('linux')) return 'Linux';
  if (lower.includes('macos')) return 'macOS';
  
  return 'Unknown';
}

  private determineDeviceType(os: string, hostname: string): string {
  const osLower = String(os || '').toLowerCase();
  const hostLower = String(hostname || '').toLowerCase();  // Convert to string first
  
  if (hostLower.includes('server') || hostLower.includes('srv')) return 'Server';
  if (hostLower.includes('router') || hostLower.includes('gw')) return 'Router';
  if (hostLower.includes('switch') || hostLower.includes('sw')) return 'Switch';
  if (hostLower.includes('printer')) return 'Printer';
  if (hostLower.includes('firewall') || hostLower.includes('fw')) return 'Firewall';
  
  if (osLower.includes('server')) return 'Server';
  if (osLower.includes('windows') && !osLower.includes('server')) return 'Workstation';
  if (osLower.includes('linux') || osLower.includes('ubuntu') || osLower.includes('centos')) return 'Server';
  
  return 'Network Device';
}

  private extractCVEIdentifier(cveNode: any, fallbackNode?: any): string | null {
    if (cveNode?.cve_id) {
      return `CVE-2023-${cveNode.cve_id}`;
    }
    
    const fieldsToCheck = ['label', 'name', 'identifier', 'id'];
    for (const field of fieldsToCheck) {
      if (cveNode[field]) {
        const cveMatch = this.extractCVEFromText(cveNode[field]);
        if (cveMatch) return cveMatch;
      }
    }
    
    if (fallbackNode?.cve_id) {
      return `CVE-2023-${fallbackNode.cve_id}`;
    }
    
    return cveNode?.id ? `CVE-2023-${cveNode.id}` : null;
  }

  private extractCVEFromText(text: string): string | null {
    if (!text) return null;
    
    const cvePattern = /CVE-\d{4}-\d{4,}/i;
    const match = text.match(cvePattern);
    return match ? match[0].toUpperCase() : null;
  }

  private checkIfDataIsPopulated(data: any[]): boolean {
    if (!data || !Array.isArray(data) || data.length === 0) return false;
    
    const cidrValuesNode = data.find(item => 
      item.data && item.data.type === 'CIDR_Values'
    );
    
    if (!cidrValuesNode) return false;
    
    const hasDetails = cidrValuesNode.data.details && 
                      Array.isArray(cidrValuesNode.data.details) && 
                      cidrValuesNode.data.details.length > 0;
                      
    const hasVulns = cidrValuesNode.data.vulns && 
                    Array.isArray(cidrValuesNode.data.vulns);
    
    return hasDetails && hasVulns;
  }

 // FAKE DATA GENERATORS (only for ports, last seen, status)
private generatePortsForDevice(deviceType: string, os: string): number[] {
  const basePortsByType: { [key: string]: number[] } = {
    'Server': [22, 80, 443, 3389, 21, 25, 993, 995, 143, 110],
    'Web Server': [80, 443, 8080, 8443, 22],
    'Mail Server': [25, 143, 993, 995, 587, 110, 22],
    'Database Server': [3306, 5432, 1433, 1521, 27017, 22],
    'Workstation': [22, 3389, 5985, 135, 139, 445],
    'Router': [22, 23, 80, 443, 161, 162],
    'Switch': [22, 23, 80, 443, 161, 162],
    'Firewall': [22, 443, 161, 162],
    'Printer': [80, 443, 515, 631, 9100],
    'Mobile Device': [80, 443],
    'Network Device': [22, 80, 443, 161]
  };
  
  let basePorts = basePortsByType[deviceType] || basePortsByType['Network Device'];
  
  // Add OS-specific ports
  const osLower = os.toLowerCase();
  if (osLower.includes('windows')) {
    basePorts = [...basePorts, 135, 139, 445, 3389, 5985];
  } else if (osLower.includes('linux') || osLower.includes('ubuntu') || osLower.includes('centos')) {
    basePorts = [...basePorts, 22, 80, 443];
  }
  
  // Return 3-7 unique ports
  const uniquePorts = [...new Set(basePorts)];
  const numPorts = Math.min(Math.max(3, Math.floor(Math.random() * 5) + 3), uniquePorts.length);
  return uniquePorts.slice(0, numPorts).sort((a, b) => a - b);
}

private getRandomRecentDate(): string {
  const now = new Date();
  const hoursAgo = Math.floor(Math.random() * 168);
  
  if (hoursAgo < 1) return 'Just now';
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo}d ago`;
}

private getRandomStatus(): string {
  const statuses = ['Online', 'Online', 'Online', 'Offline'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

  private determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore >= 8.0) return 'critical';
  if (riskScore >= 6.0) return 'high';
  if (riskScore >= 4.0) return 'medium';
  return 'low';
}

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateNetworkData(data: SubnetData[]): void {
    this.networkDataSubject.next(data);
    this.updateStats(data);
  }

  private updateStats(data: SubnetData[]): void {
    const stats: NetworkStats = {
      totalSubnets: data.length,
      totalDevices: data.reduce((sum, subnet) => sum + subnet.deviceCount, 0),
      highRiskSubnets: data.filter(subnet => subnet.riskLevel === 'high' || subnet.riskLevel === 'critical').length,
      avgRiskScore: data.length > 0 ? data.reduce((sum, subnet) => sum + subnet.riskScore, 0) / data.length : 0
    };
    this.statsSubject.next(stats);
  }

  // Public getters
  getCurrentNetworkData(): SubnetData[] {
    return this.networkDataSubject.value;
  }

  getCurrentStats(): NetworkStats {
    return this.statsSubject.value;
  }

updateSubnetDeviceCount(subnetCidr: string, deviceCount: number): void {
  const currentData = this.getCurrentNetworkData();
  const subnet = currentData.find(s => s.subnet === subnetCidr);
  if (subnet) {
    subnet.deviceCount = deviceCount;
    subnet.hasDetailedData = true;
    this.updateNetworkData(currentData);
    console.log(`Updated ${subnetCidr}: ${deviceCount} devices`);
  }
}
}