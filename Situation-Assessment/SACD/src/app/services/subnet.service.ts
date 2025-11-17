// @ts-nocheck

import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, throwError } from 'rxjs';
import gql from 'graphql-tag';
import { Node, Edge } from '@swimlane/ngx-graph';
import _ from 'lodash';
import { map, take, tap } from 'rxjs/operators';
import { GraphInput } from '../../../models/graph.model';
import { entities, EntityStructure } from '../pages/network-page/entities.config';
import { Attributes, AttributeStructure } from '../config/attributes';
import { Mission } from '../../../models/mission.model';
import { MissionStructure } from '../../../models/mission-structure.model';
import { CVE, CVEResponse } from '../../../models/vulnerability.model';
import { VulnerabilityData } from '../../vulnerability-page/vulnerability.component';
import { SubnetExtendedData } from '../../../models/subnet.model';
import { OrgUnitData } from '../models/org-unit.model';
import { ChildIP } from '../models/subnet.model';
import { CSANode } from '../pages/csa-page/csa-page.component';

@Injectable({
  providedIn: 'root',
})
export class SubnetService {
  constructor(private apollo: Apollo) {}

  public getSubnets(): Observable<Subnet[]> {
    return this.apollo
      .query<any>({
        query: gql`
        {
          subnets {
            _id,
            note,
            range,
          org_units {
            name
          },
          contacts {
            name
          },
          parent_subnet {
            _id,
            note,
            range
          }
        },
      }
      `,
      })
      .pipe(
        map((response) => {
          const subnets: SubnetExtendedData[] = response.data.subnets.map((subnet: any) => ({
            _id: subnet._id,
            range: subnet.range,
            note: subnet.note || null,
            organizationUnit: subnet.org_units.length > 0 ? subnet.org_units[0].name : null,
            contacts: subnet.contacts.map((contact: any) => contact.name),
            parentSubnet: subnet.parent_subnet.length > 0 ? subnet.parent_subnet[0].range : ""
          }));
          return subnets;
        })
      );
  }


  public createSubnet(range: string, note: string): Observable<Subnet> {
    return this.apollo.mutate<any>({
      mutation: gql`
        mutation CreateSubnet($range: String!, $note: String) {
            createSubnets(input: [
                {
                    note: $note,
                    range: $range
                }
            ]) {
                subnets {
                    range
                    note
                }
            }
        }
      `,
      variables: {
        range: range,
        note: note,
      },
    })
  }

  public linkSubnetToParent(subnetRange: string, parentSubnetRange: string): void {
    return this.apollo.mutate<any>({
        mutation: gql`
          mutation LinkSubnetToParent($subnetRange: String!, $parentSubnetRange: String!) {
            linkSubnetToParent(subnetRange: $subnetRange, parentSubnetRange: $parentSubnetRange) {
              _id
              range
              note
              parent_subnet {
                range
              }
            }
          }
        `,
        variables: {
          subnetRange: subnetRange,
          parentSubnetRange: parentSubnetRange
        }
      }).subscribe({
        next: (response) => {
          console.log('Subnet linked to parent:', response.data.linkSubnetToParent.parent_subnet[0].range);
          return response.data.linkSubnetToParent;
        },
        error: (error) => {
          console.error('Error linking subnet to parent:', error);
          return throwError(() => new Error('Failed to link subnet to parent'));
        }
      });
  }

  public linkSubnetToOrgUnit(subnetRange: string, orgUnitName: string): void {
    return this.apollo.mutate<any>({
        mutation: gql`
          mutation LinkSubnetToOrgUnit($subnetRange: String!, $orgUnitName: String!) {
            linkSubnetToOrgUnit(subnetRange: $subnetRange, orgUnitName: $orgUnitName) {
              _id
              range
              note
            }
          }
        `,
        variables: {
          subnetRange: subnetRange,
          orgUnitName: orgUnitName
        }
      }).subscribe({
        next: (response) => {
          console.log('Subnet linked to org unit:', response.data.linkSubnetToOrgUnit);
          return response.data.linkSubnetToOrgUnit;
        },
        error: (error) => {
          console.error('Error linking subnet to org unit:', error);
          return throwError(() => new Error('Failed to link subnet to org unit'));
        }
      });
  }

  public mergeSubnetWithContacts(subnetRange: string, contactNames: string[]): void {
    return this.apollo.mutate<any>({
      mutation: gql`
          mutation MergeSubnetWithContacts($subnetRange: String!, $contactNames: [String!]!) {
            mergeSubnetWithContacts(subnetRange: $subnetRange, contactNames: $contactNames) {
              _id
              range
              note
            }
          }
        `,
        variables: {
          subnetRange: subnetRange,
          contactNames: contactNames
        }
      }).subscribe({
        next: (response) => {
          console.log('Subnet merged with contacts:', response.data.mergeSubnetWithContacts);
          return response.data.mergeSubnetWithContacts;
        },
        error: (error) => {
          console.error('Error merging subnet with contacts:', error);
          return throwError(() => new Error('Failed to merge subnet with contacts'));
        }
      });
    }


  public insertSubnet(subnet: Omit<SubnetExtendedData, "_id">): void {
    console.log('Inserting subnet with data:', subnet);

    // First create the subnet and if successful, link it to parent, org unit, and contacts
    this.createSubnet(subnet.range, subnet.note).subscribe({
      next: (response) => {
        console.log('Subnet created:', response.data.createSubnets.subnets[0]);
        if (subnet.parentSubnet) {
          this.linkSubnetToParent(subnet.range, subnet.parentSubnet);
        }

        if (subnet.organizationUnit) {
          this.linkSubnetToOrgUnit(subnet.range, subnet.organizationUnit);
        }

        if (subnet.contacts && subnet.contacts.length > 0) {
          this.mergeSubnetWithContacts(subnet.range, subnet.contacts);
        }
      },
      error: (error) => {
        console.error('Error creating subnet:', error);
        return throwError(() => new Error('Failed to create subnet'));
      }
    });
  }

  public deleteSubnet(range: string): boolean {
    console.log('Deleting subnet with range:', range);
    return this.apollo.mutate<any>({
      mutation: gql`
        mutation DeleteSubnet($range: String!) {
            deleteSubnets(where: {
                range: $range
            }) {
                nodesDeleted
                relationshipsDeleted
            }
        }
      `,
      variables: {
        range: range,
      },
    }).pipe(take(1)).subscribe({
        next: (response) => {
          console.log('Subnet deleted:', response.data.deleteSubnets.nodesDeleted);
          return response.data.deleteSubnets.nodesDeleted > 0;
        },
        error: (error) => { 
          console.error('Error deleting subnet:', error);
          return throwError(() => new Error('Failed to delete subnet'));
        }
    });
  }

  public updateSubnet(oldRange: string, newRange: string, note: string): Observable<Subnet> {
    return this.apollo.mutate<any>({
      mutation: gql`
        mutation UpdateSubnet($oldRange: String!, $newRange: String!, $note: String) {
          updateSubnets(
            where: { 
              range: $oldRange 
            }
            update: { 
              range: $newRange
              note: $note 
            }
          ) {
            subnets {_id, note, range}
          }
        }
      `,
      variables: {
        oldRange: oldRange,
        newRange: newRange,
        note: note,
      },
    });
  }

public unlinkSubnetFromParent(subnetRange: string, parentRange: string): void {
    return this.apollo.mutate<any>({
      mutation: gql`
        mutation UnlinkSubnetFromParent($subnetRange: String!, $parentRange: String!) {
          unlinkSubnetFromParent(subnetRange: $subnetRange, parentRange: $parentRange) {
            _id
            range
            note
          }
        }
      `,
      variables: {
        subnetRange: subnetRange,
        parentRange: parentRange
      }
    })
  }

  public unlinkSubnetFromOrgUnit(subnetRange: string, orgUnitName: string): void {
    return this.apollo.mutate<any>({
      mutation: gql`
        mutation UnlinkSubnetFromOrgUnit($subnetRange: String!, $orgUnitName: String!) {
          unlinkSubnetFromOrgUnit(subnetRange: $subnetRange, orgUnitName: $orgUnitName) {
            _id
            range
            note
          }
        }
      `,
      variables: {
        subnetRange: subnetRange,
        orgUnitName: orgUnitName
      }
    });
  }

  public unlinkSubnetFromContacts(subnetRange: string, contactNames: string[]): void {
    return this.apollo.mutate<any>({
      mutation: gql`
        mutation UnlinkSubnetFromContacts($subnetRange: String!, $contactNames: [String!]!) {
          unlinkSubnetFromContacts(subnetRange: $subnetRange, contactNames: $contactNames) {
            _id
            range
            note
          }
        }
      `,
      variables: {
        subnetRange: subnetRange,
        contactNames: contactNames
      }
    });
  }

  public editSubnet(oldSubnet: SubnetExtendedData, newSubnet: SubnetExtendedData): void {
    this.updateSubnet(oldSubnet.range, newSubnet.range, newSubnet.note).subscribe({
      next: (response) => { 
        console.log('Subnet updated:', response.data.updateSubnets.subnets[0]);

        this.unlinkSubnetFromParent(oldSubnet.range, oldSubnet.parentSubnet).subscribe({
          next: () => {
            console.log('Subnet unlinked from parent:', oldSubnet.parentSubnet);
            if (newSubnet.parentSubnet && newSubnet.range !== newSubnet.parentSubnet) {
              this.linkSubnetToParent(newSubnet.range, newSubnet.parentSubnet);
            }
          },
          error: (error) => {
            console.error('Error unlinking subnet from parent:', error);
          }
        });

        this.unlinkSubnetFromOrgUnit(oldSubnet.range, oldSubnet.organizationUnit).subscribe({
          next: () => {
            console.log('Subnet unlinked from org unit:', oldSubnet.organizationUnit);
            if (newSubnet.organizationUnit && newSubnet.organizationUnit !== oldSubnet.organizationUnit) {
              this.linkSubnetToOrgUnit(newSubnet.range, newSubnet.organizationUnit);
            }
          },
          error: (error) => {
            console.error('Error unlinking subnet from org unit:', error);
          }
        });

        this.unlinkSubnetFromContacts(oldSubnet.range, oldSubnet.contacts).subscribe({
          next: () => {
            console.log('Subnet unlinked from contacts:', oldSubnet.contacts);
            if (newSubnet.contacts && newSubnet.contacts.length > 0) {
              console.log('Merging subnet with contacts:', newSubnet.contacts);
              this.mergeSubnetWithContacts(newSubnet.range, newSubnet.contacts);
            }
          },
          error: (error) => {
            console.error('Error unlinking subnet from contacts:', error);
          }
        });
      },
      error: (error) => {
        console.error('Error updating subnet:', error);
        return throwError(() => new Error('Failed to update subnet'));
      }
    });
  }

  /**
   * Gets subnet details based on its range
   * @param range range of the subnet
   */
  public getSubnet(range: String): Observable<SubnetExtendedData> {
    if (!range) {
      return throwError(() => new Error('Range is required to fetch subnet details'));
    }
    return this.apollo // Assuming 'this' has an Apollo instance
    .query<any>({
      query: gql`
        {
          subnets(where: { range: "${range}" }) {
            _id
            note
            range
            org_units {
              name
            }
            contacts {
              name
            }
            parent_subnet {
              _id
              note
              range
            }
          }
        }
      `,
    })
    .pipe(
      map((response) => {
        const subnet: SubnetExtendedData = response.data.subnets[0] || {};
        return {
            range: subnet.range,
            note: subnet.note || null,
            organizationUnit: subnet.org_units.length > 0 ? subnet.org_units[0].name : null,
            contacts: subnet.contacts.map((contact: any) => contact.name),
            parentSubnet: subnet.parent_subnet.length > 0 ? subnet.parent_subnet[0].range : ""
        };
      })
    );
  }

  /**
   * Gets all child IPs of a subnet based on its range
   * @param range range of the subnet
   */
  public getChildIPs(range: String): Observable<ChildIP[]> {
    console.log('Fetching child IPs for subnet range:', range);
    return this.apollo
    .query<any>({
      query: gql`
        {
          ips(where: { subnetsConnection_SINGLE: { node: { range: "${range}" } } }) {
            address
            version
            subnets {
              range
            }
            nodes {
              host {
                software_versions {
                  vulnerabilities {
                    cve {
                      cve_id
                    }
                  }
                  version
                }
              }
            }
          }
        }
      `,
    })
    .pipe(
      map((response) => {
        const childIPs: any[] = response.data.ips.map((ip: any) => ({
          address: ip.address,
          version: ip.version,
          subnet: ip.subnets.length > 0 ? ip.subnets[0].range : "",
          affectedBy: ip.nodes.map((node: any) => node.host.software_versions.map((sv: any) => sv.vulnerabilities.map((v: any) => v.cve.cve_id))).flat(2),
          softwareVersion: ip.nodes.map((node: any) => node.host.software_versions.map((sv: any) => sv.version)).flat(2)
        }));
        return childIPs;
      })
    );
  }

  public getChildSubnets(range: String): Observable<{range: string}[]> {
      return this.apollo
    .query<any>({
      query: gql`
        {
          subnets(where: { parent_subnet: { range: "${range}" } }) {
            range
          }
        }
      `,
    })
    .pipe(
      map((response) => {
        const childSubnets: any[] = response.data.subnets.map((subnet: any) => ({
          range: subnet.range,
        }));
        return childSubnets;
      })
    );
  }

}