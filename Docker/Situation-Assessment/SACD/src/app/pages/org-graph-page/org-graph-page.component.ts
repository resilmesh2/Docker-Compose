import { ChangeDetectionStrategy, Component, inject, OnInit, signal, SimpleChanges, WritableSignal } from '@angular/core';

import { tap } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { Edge, Layout, NgxGraphModule, Node } from '@swimlane/ngx-graph';
import { Mission, MissionStructure } from '../../models/mission-structure.model';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SentinelCardComponent } from '@sentinel/components/card';
import { SentinelControlItem } from '@sentinel/components/controls';
import { CustomLayout, Orientation } from '../../utils/custom-graph-layout';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ORGANIZATION_PATH, SUBNETS_PATH } from '../../paths';
import { OrgUnitData } from '../../models/org-unit.model';

@Component({
  selector: 'org-graph-page',
  templateUrl: './org-graph-page.component.html',
  styleUrls: ['./org-graph-page.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgxGraphModule,
    SentinelCardComponent,
    MatTooltipModule
  ]
})

export class OrgGraphPageComponent implements OnInit {
    errorMessage = '';
    selectedNode: WritableSignal<Node | null> = signal(null);
    orgUnits: WritableSignal<OrgUnitData[]> = signal([]);

    customLayout: Layout = new CustomLayout(Orientation.BOTTOM_TO_TOP);
    center$ = new Subject<any>();

    graphLoading: boolean = false;

    controls: SentinelControlItem[] = [];

    nodes: WritableSignal<Node[]> = signal([]);
    edges: WritableSignal<Edge[]> = signal([]);

    private router = inject(Router);

    constructor(private dataService: DataService) {}

    ngOnInit(): void {
        this.getGraphData();
    }

    public getGraphData(): void {
        this.graphLoading = true
        this.getOrgUnits().subscribe({
            next: (orgUnits) => {
                this.orgUnits.set(orgUnits);
                console.log(this.dataService.converToGraph(this.orgUnits()));
                this.orgUnits().sort((a, b) => {
                    return a.name.localeCompare(b.name)
                });

                this.setEdgesAndNodes();
                this.graphLoading = false;
                this.errorMessage = "";
            },
            error: (error) => {
                this.orgUnits.set([]);
                this.graphLoading = false;
                this.errorMessage = error.message;
            }
        });
        this.selectedNode.set(null);   
        
    }

    setEdgesAndNodes(): void {
        this.nodes.set(this.orgUnits().map((orgUnit) => {
            return {
                id: `${orgUnit.name}`,
                label: orgUnit.name,
                data: {
                    type: 'org unit',
                    customColor: '#C1292E',
                    textColor: '#fff',
                    ... orgUnit
                }
            };
        }));

        this.edges.set(this.orgUnits().flatMap((orgUnit, index) => {
            if (orgUnit.parentOrgUnit === undefined || orgUnit.parentOrgUnit === null || orgUnit.parentOrgUnit === '' || orgUnit.parentOrgUnit === "---") {
                return [];
            }

            return {
                id: `edge-${index}`,
                source: orgUnit.name,
                target: orgUnit.parentOrgUnit,
                label: "is part of",
            };
        }));

        console.log("Nodes and edges set", this.nodes(), this.edges());
        //this.addSubnetsNodes();
    }

    // addSubnetsNodes() {
    //     this.nodes.update(value => [...value, ...this.orgUnits().flatMap(orgUnit => orgUnit.subnets.map(subnet => {
    //         return {
    //             id: `node-${subnet}`,
    //             label: subnet,
    //             data: {
    //                 type: 'subnet',
    //                 customColor: '#3a4d81',
    //                 textColor: '#fff',
    //             }
    //         };
    //     }))]);

    //     this.edges.update(value => [...value, ...this.orgUnits().flatMap(orgUnit => orgUnit.subnets.map(subnet => {
    //         return {
    //             id: `edge-${subnet}`,
    //             source: orgUnit.name,
    //             target: `node-${subnet}`,
    //             label: "is part of",
    //         };
    //     }))]);
    // }

    private getOrgUnits(): Observable<OrgUnitData[]> {
        return this.dataService.getOrgUnits().pipe(
            tap((orgUnits: OrgUnitData[]) => {
                this.orgUnits.set(orgUnits);
            })
        );
    }

    public getLabel(node: Node) {
        console.log("Getting label for node", node);
        return this.dataService.getLabelOfGraphNode(node);
    }

    navigateToSubnetDetail(subnetRange: string): void {
        if (!subnetRange || subnetRange == "---") { return; }
        this.router.navigate([SUBNETS_PATH, subnetRange]);
    }

    navigateToOrgUnitDetail(orgName: string): void {
        if (!orgName || orgName == "---") { return; }
        this.router.navigate([ORGANIZATION_PATH, orgName]);
    }

    selectNode(node: Node) {
        this.selectedNode.set(node);
    }
}

