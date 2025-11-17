type EntityKey = {
  bgColor: string,
  textColor?: string,
  showProperty: string[]
}

export type EntityStructure = {
  IP: EntityKey,
  DomainName: EntityKey,
  Subnet: EntityKey,
  Node: EntityKey,
  SecurityEvent: EntityKey,
  CVE: EntityKey,
  Vulnerability: EntityKey,
  SoftwareVersion: EntityKey
}

export const entities: EntityStructure = {
  IP: {
    bgColor: '#FF9800',
    textColor: '#000',
    showProperty: ['address'],
  },
  DomainName: {
    bgColor: '#19AADE',
    textColor: '#000',
    showProperty: ['domain_name'],
  },
  Subnet: {
    bgColor: '#6877CA',
    textColor: '#fff',
    showProperty: ['range'],
  },
  Node: {
    bgColor: '#DC4141',
    textColor: '#fff',
    showProperty: ['topology_betweenness'],
  },
  SecurityEvent: {
    bgColor: '#009688',
    textColor: '#fff',
    showProperty: ['type'],
  },
  CVE: {
    bgColor: '#9C27B0',
    textColor: '#fff',
    showProperty: ['CVE_id'],
  },
  Vulnerability: {
    bgColor: '#FF5722',
    textColor: '#fff',
    showProperty: ['name'],
  },
  SoftwareVersion: {
    bgColor: '#8BC34A',
    textColor: '#fff',
    showProperty: ['version'],
  },
};
