import { ChangeDetectorRef, Component, inject, signal, ViewChild, WritableSignal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { SentinelButtonWithIconComponent } from "@sentinel/components/button-with-icon";
import { DataService } from "../../services/data.service";
import { Subnet } from "../../models/vulnerability.model";
import { ChildIP, SubnetExtendedData } from "../../models/subnet.model";
import { ActivatedRoute, Router } from "@angular/router";
import { Location } from '@angular/common';
import { CvssChipComponent } from "../../components/cvss-color-chip/cvss-chip.component";
import { NgxChartsModule } from "@swimlane/ngx-charts";
import { ORGANIZATION_PATH, SUBNETS_PATH } from "../../paths";
import { customOccupancyColors } from "../../config/customPieChartColors";
import { SubnetService } from "../../services/subnet.service";


@Component({
  selector: 'subnet-detail',
  templateUrl: './subnet-detail.component.html',
  styleUrls: ['./subnet-detail.component.scss'],
  imports: [
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinner,
    SentinelButtonWithIconComponent,
    NgxChartsModule
  ]
})
export class SubnetDetailComponent {
    dataSource = new MatTableDataSource<ChildIP>();
    displayedColumns: string[] = ['ip', 'subnet', 'softwareVersion', 'affectedBy'];
    paginator: MatPaginator | null = null;

    @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
        this.paginator = mp;
        this.setDataSourceAttributes();
    }

    setDataSourceAttributes() {
        this.dataSource.paginator = this.paginator;
    }

    subnetDetail: WritableSignal<SubnetExtendedData | null> = signal(null);
    range: string = '';
    pieChartData: WritableSignal<{ name: string; value: number }[]> = signal([]);
    customColors = customOccupancyColors;

    private router = inject(Router);

    dataLoading = false;
    dataLoaded = false;
    emptyResponse = false;
    errorResponse = '';

    constructor(
        private route: ActivatedRoute,
        private data: SubnetService,
        private changeDetectorRefs: ChangeDetectorRef
    ) {
        this.dataSource = new MatTableDataSource<ChildIP>([]);
    }

    ngOnInit(): void {
        this.dataLoading = true;    
        this.getRouteParameters();
        this.getSubnetDetail();
        this.getChildIPs();
    }

    ngAfterViewInit(): void {
        if (this.dataSource && this.paginator && this.dataLoaded) {
            this.dataSource.paginator = this.paginator;
        }
    }

    getSubnetDetail(): void {
        this.data.getSubnet(this.range).subscribe({
            next: (subnetDetail: SubnetExtendedData) => {
                this.subnetDetail.set(subnetDetail);
                this.dataLoading = false;
                this.dataLoaded = true;
                console.log('Subnet detail fetched:', subnetDetail);
            },
            error: (error) => {
                console.error('Error fetching subnet details:', error);
                this.dataLoading = false;
            }
        });
    }

    getChildIPs(): ChildIP[] {
        // First get all child subnets for the current subnet (1 layer deep)
        this.data.getChildSubnets(this.range).subscribe({
            next: (childSubnets: { range: string }[]) => {
                // Fetch child IPs for parent subnet and each child subnet
                [{ range: this.range }, ...childSubnets].map((subnet) => {
                    console.log('Fetching child IPs for subnet:', subnet.range);
                    this.data.getChildIPs(subnet.range).subscribe({
                        next: (childIPs: ChildIP[]) => {
                            this.dataSource.data = this.dataSource.data.concat(childIPs);
                            this.pieChartData.set(this.calculateOccupancyData());
                        },
                        error: (error) => {
                            console.error('Error fetching child IPs:', error);
                        }
                    });
                }
                );
            },
            error: (error) => {
                console.error('Error fetching child subnets:', error);
            }
        });
        
        return [];        
    }

    getSaneAffectedBy(affectedBy: string[]): string {
        if (!affectedBy || affectedBy.length === 0) {
            return 'No vulnerabilities';
        }
        return affectedBy.slice(0, 5).join(', ') + (affectedBy.length > 5 ? `, ... (${affectedBy.length - 5} more)` : '');
    }

    calcSubnetSize(): number {
        let cidr = this.range.split('/')[1];
        if (!cidr || parseInt(cidr) < 0 || parseInt(cidr) > 32) {
            return 0;
        }
        return cidr ? Math.pow(2, 32 - parseInt(cidr)) - 2 : 0;
    }

    calculateOccupancyData(): { name: string; value: number }[] {
        const total = this.calcSubnetSize();
        const occupied = this.dataSource.data.length;
        const unoccupied = total - occupied;
        const affectedCount = this.dataSource.data.filter(ip => ip.affectedBy && ip.affectedBy.length > 0).length;

        return [
            { name: 'Unoccupied', value: unoccupied },
            { name: 'Occupied', value: occupied - affectedCount },
            { name: 'Affected', value: affectedCount },
        ];
    }

    goBack(): void {
        this.router.navigate([SUBNETS_PATH]);
    }


    getRouteParameters(): void {

        this.route.paramMap.subscribe(params => {
            this.range = params.get('range') || '';
        });

        // this.route.queryParams.subscribe(params => {
        //     this.issueSeverity = params['severity'] || '';
        //     this.issueStatus = params['status'] || '';
        //     this.issueDescription = params['description'] || '';
        //     this.issueImpact = params['impact'] || '';
        // });
    }

    navigateToSubnetDetail(subnetRange: string): void {
        console.log('Navigating to subnet detail:', subnetRange);
        this.router.navigate([SUBNETS_PATH, subnetRange]).then(() => {
            // Reset the subnet detail and data source when navigating to a new subnet
            this.subnetDetail.set(null);
            this.dataSource.data = [];
            this.dataLoading = true; // Reset loading state
            this.getSubnetDetail(); // Fetch new subnet details
            this.getChildIPs(); // Fetch child IPs for the new subnet

            this.changeDetectorRefs.detectChanges(); // Ensure the view updates
        });  
    }

    navigateToOrgUnitDetail(orgName: string): void {
        this.router.navigate([ORGANIZATION_PATH, orgName]);
    }
}