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
import { SentinelButtonWithIconComponent } from '@sentinel/components/button-with-icon';
import { SentinelCardComponent } from '@sentinel/components/card';
import { SentinelControlItem } from '@sentinel/components/controls';
import { SubnetExtendedData } from '../../models/subnet.model';
import { CustomLayout, Orientation } from '../../utils/custom-graph-layout';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ORGANIZATION_PATH, SUBNETS_PATH } from '../../paths';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { SubnetService } from '../../services/subnet.service';

@Component({
  selector: 'subnet-graph-page',
  templateUrl: './subnet-graph-page.component.html',
  styleUrls: ['./subnet-graph-page.component.scss'],
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
    MatTooltipModule,
    MatButtonToggleModule
  ]
})

export class SubnetGraphPageComponent implements OnInit {
    errorMessage = '';
    selectedNode: WritableSignal<Node | null> = signal(null);
    subnets: WritableSignal<SubnetExtendedData[]> = signal([]);

    customLayout: Layout = new CustomLayout(Orientation.BOTTOM_TO_TOP);
    center$ = new Subject<any>();

    graphLoading: boolean = false;

    controls: SentinelControlItem[] = [];

    nodes: WritableSignal<Node[]> = signal([]);
    edges: WritableSignal<Edge[]> = signal([]);

    ipVersion = signal<'v4' | 'v6'>('v4');

    private router = inject(Router);

    constructor(private dataService: DataService, private subnetService: SubnetService) {}

    ngOnInit(): void {
        this.getGraphData();
    }

    public getGraphData(): void {
        this.graphLoading = true
        this.getSubnets().subscribe({
            next: (subnets) => {
                this.subnets.set(subnets);
                this.subnets().sort((a, b) => {
                    let cidrA = ~~a.range.split('/')[1];
                    let cidrB = ~~b.range.split('/')[1];
                    return cidrA - cidrB || a.range.localeCompare(b.range);
                });

                this.setEdgesAndNodes();
                this.graphLoading = false;
                this.errorMessage = "";
            },
            error: (error) => {
                this.subnets.set([]);
                this.graphLoading = false;
                this.errorMessage = error.message;
            }
        });
        this.selectedNode.set(null);   
        
    }

    isNotParent(subnetRange: string) {
        return this.subnets().some((subnet) => subnet.parentSubnet === subnetRange);
    }

    hasNoParent(subnet: SubnetExtendedData) {
        return subnet.parentSubnet == undefined || subnet.parentSubnet == null || subnet.parentSubnet == '';
    }

    isRoot(subnetRange: string) {
        // TODO: extend this when needed (e.g. when IPv6 support is added)
        return subnetRange === "0.0.0.0/0";
    }

    isPartOfConstituency() {
        // TODO: TO BE IMPLEMENTED (IN ISIM)
        return Math.random() < 0.5;
    }

    setEdgesAndNodes(): void {
        this.nodes.set(this.subnets().flatMap((subnet) => {
            if (!this.isNotParent(subnet.range) && this.hasNoParent(subnet) && !this.isRoot(subnet.range)) {
                return []
            }
            let isInternal = this.isPartOfConstituency();
            return {
                id: `${subnet.range}`,
                label: subnet.range,
                data: {
                    type: this.isRoot(subnet.range) ? 'root' : isInternal ? 'subnet' : 'external subnet',
                    customColor: this.isRoot(subnet.range) ? '#212951' : isInternal ? '#3a4d81' : '#307351',
                    textColor: '#fff',
                    ... subnet
                }
            };
        }));

        this.edges.set(this.subnets().flatMap((subnet, index) => {
            if (subnet.parentSubnet === undefined || subnet.parentSubnet === null || subnet.parentSubnet === '') {
                return [];
            }

            return {
                id: `edge-${index}`,
                source: subnet.range,
                target: subnet.parentSubnet,
                label: "is part of",
            };
        }));

        console.log("Nodes and edges set", this.nodes(), this.edges());
    }

    onIpVersionChange() {
        // TODO: when IP versions are implemented/added in the schema
    }

    private getSubnets(): Observable<SubnetExtendedData[]> {
        return this.subnetService.getSubnets().pipe(
            tap((subnets: SubnetExtendedData[]) => {
                this.subnets.set(subnets);
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

