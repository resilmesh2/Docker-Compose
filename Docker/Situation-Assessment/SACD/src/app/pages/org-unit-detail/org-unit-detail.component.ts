import { ChangeDetectorRef, Component, inject, signal, ViewChild, WritableSignal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { SentinelButtonWithIconComponent } from "@sentinel/components/button-with-icon";
import { DataService } from "../../services/data.service";
import { ChildIP } from "../../models/subnet.model";
import { ActivatedRoute, Router } from "@angular/router";
import { NgxChartsModule } from "@swimlane/ngx-charts";
import { ORGANIZATION_PATH, SUBNETS_PATH } from "../../paths";
import { OrgUnitData } from "../../models/org-unit.model";
import { customOccupancyColors } from "../../config/customPieChartColors";
import { SubnetService } from "../../services/subnet.service";


@Component({
  selector: 'org-unit-detail',
  templateUrl: './org-unit-detail.component.html',
  styleUrls: ['./org-unit-detail.component.scss'],
  imports: [
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinner,
    SentinelButtonWithIconComponent,
    NgxChartsModule
  ]
})
export class OrgUnitDetailComponent {
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

    orgUnitDetail: WritableSignal<OrgUnitData | null> = signal(null);
    orgName: string = '';
    pieChartData: WritableSignal<{ name: string; value: number }[]> = signal([]);
    customColors = customOccupancyColors;

    private router = inject(Router);

    dataLoading = false;
    dataLoaded = false;
    emptyResponse = false;
    errorResponse = '';

    constructor(
        private route: ActivatedRoute,
        private subnetService: SubnetService,
        private data: DataService,
        private changeDetectorRefs: ChangeDetectorRef
    ) {
        this.dataSource = new MatTableDataSource<ChildIP>([]);
    }

    ngOnInit(): void {
        this.dataLoading = true;    
        this.getRouteParameters();
        this.getOrgUnitDetail();
    }

    ngAfterViewInit(): void {
        if (this.dataSource && this.paginator && this.dataLoaded) {
            this.dataSource.paginator = this.paginator;
        }
    }

    getOrgUnitDetail(): void {
        this.data.getOrgUnit(this.orgName).subscribe({
            next: (orgUnitDetail: OrgUnitData) => {
                this.orgUnitDetail.set(orgUnitDetail);
                this.dataLoading = false;
                this.dataLoaded = true;
                this.getChildIPs();
            },
            error: (error) => {
                console.error('Error fetching subnet details:', error);
                this.dataLoading = false;
            }
        });
    }

    getChildIPs(): void {
        this.orgUnitDetail()?.subnets.map((subnet) => {
            this.subnetService.getChildIPs(subnet).subscribe({
                next: (childIPs: ChildIP[]) => {
                    this.dataSource.data = this.dataSource.data.concat(childIPs);
                    this.pieChartData.set(this.calculateOccupancyData());
                },
                error: (error) => {
                    console.error('Error fetching child IPs:', error);
                }
            });
        });
    }

    getSaneAffectedBy(affectedBy: string[]): string {
        if (!affectedBy || affectedBy.length === 0) {
            return 'No vulnerabilities';
        }
        return affectedBy.slice(0, 5).join(', ') + (affectedBy.length > 5 ? `, ... (${affectedBy.length - 5} more)` : '');
    }

    calcSubnetSize(range: string): number {
        let cidr = range.split('/')[1];
        if (!cidr || parseInt(cidr) < 0 || parseInt(cidr) > 32) {
            return 0;
        }
        return cidr ? Math.pow(2, 32 - parseInt(cidr)) - 2 : 0;
    }

    calculateOccupancyData(): { name: string; value: number }[] {
        const total = this.orgUnitDetail()?.subnets.reduce((acc, subnet) => acc + this.calcSubnetSize(subnet), 0) || 0;
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
        this.router.navigate([ORGANIZATION_PATH]);
    }


    getRouteParameters(): void {

        this.route.paramMap.subscribe(params => {
            this.orgName = params.get('orgName') || '';
        });
    }

    navigateToOrgUnitDetail(orgName: string): void {
        this.router.navigate([ORGANIZATION_PATH, orgName]).then(() => {
            // Reset the org unit detail and data source when navigating to a new org unit
            this.orgUnitDetail.set(null);
            this.dataSource.data = [];
            this.dataLoading = true; // Reset loading state
            this.getOrgUnitDetail(); // Fetch new org unit details & child IPs

            this.changeDetectorRefs.detectChanges(); // Ensure the view updates
        });
    }

    navigateToSubnetDetail(subnetRange: string): void {
        this.router.navigate([SUBNETS_PATH, subnetRange]);
    }
}