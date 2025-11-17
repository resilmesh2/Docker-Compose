export interface OrgUnitData {
    name: string;
    parentOrgUnit: string | null;
    subnets: string[];
    contacts: string[];
}
