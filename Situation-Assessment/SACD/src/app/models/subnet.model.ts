export interface SubnetExtendedData {
  _id: string;
  note: string;
  range: string;
  organizationUnit: string | null;
  contacts: string[];
  parentSubnet: string | null;
}

export interface ChildIP {
    address: string;
    version?: string;
    affectedBy?: string[];
    softwareVersion?: string[];
}