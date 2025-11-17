import { Component, OnInit, ViewChild, AfterViewInit, ElementRef, ChangeDetectorRef, inject, ChangeDetectionStrategy, Signal, computed, signal, WritableSignal, output, input, model } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SubnetExtendedData } from '../../models/subnet.model';
import { InsertSubnetDialog } from './insert-subnet-dialog/insert.subnet.component';
import { DataService } from '../../services/data.service';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { SentinelButtonWithIconComponent } from '@sentinel/components/button-with-icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ORGANIZATION_PATH, SUBNETS_PATH } from '../../paths';
import { SubnetService } from '../../services/subnet.service';
//import { SentinelControlsComponent, SentinelControlItem, SentinelControlItemSignal } from '@sentinel/components/controls';
//import { defer, Observable, of, take } from 'rxjs';


@Component({
  selector: 'subnet-page',
  templateUrl: './subnet-page.component.html',
  styleUrls: ['./subnet-page.component.scss'],
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatIcon,
    MatProgressSpinner,
    FormsModule,
    SentinelButtonWithIconComponent,
  ],
})
export class SubnetPageComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['note', 'range', 'org_units', 'contacts', 'parent_subnet', 'actions'];
  dataSource: MatTableDataSource<SubnetExtendedData>;
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator | null = null;
  @ViewChild(MatSort, { static: false }) sort: MatSort | null = null;
  
  
  dataLoaded = false;
  dataLoading = true;
  emptyResponse = false;
  errorResponse = '';
  

  // constructor(id: string, label: string | Signal<string>, isSortColumn: boolean, sortName?: string, headerStyle?: NgStyleArg)

  // sentinelTableData = new SentinelTable([
  //   // constructor(element: T, actions?: RowAction[] | RowActionSignal[], clickable?: boolean, rowStyles?: NgStyleArg, cellStyles?: Map<string, NgStyleArg>, selectionDisabled?: Signal<boolean>)
  //   new Row("145"),
  // ], ["test", "ip"].map(col => {
  //   return { id: col, label: col.replace('_', ' ').toUpperCase(), isSortColumn: col === 'range', 
  //     labelSig: computed(() => col.replace('_', ' ').toUpperCase()),
  //     sortName: col
  //   }}
  // ));

  constructor(private data: SubnetService, private changeDetector: ChangeDetectorRef) {
    this.dataSource = new MatTableDataSource<SubnetExtendedData>([]);
    this.getAllSubnets();
  }

  private _snackBar = inject(MatSnackBar);
  private router = inject(Router);

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action);
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {}

  getAllSubnets() {
    this.emptyResponse = false;
    this.errorResponse = '';
    this.dataLoading = true;

    this.data.getSubnets().subscribe({
      next: (subnets: SubnetExtendedData[]) => {
        this.dataSource = new MatTableDataSource<SubnetExtendedData>(subnets.map(subnet => ({
          _id: subnet._id,
          range: subnet.range, // Can't be null or undefined, so no need for a fallback
          note: subnet.note ?? "---",
          organizationUnit: subnet.organizationUnit ?? "---",
          parentSubnet: subnet.parentSubnet ?? "---",
          contacts: subnet.contacts.length == 0 ? [] : subnet.contacts,
        })));

        this.dataLoading = false;
        this.dataLoaded = true;
        this.changeDetector.detectChanges();

        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
        if (this.sort) {
          this.dataSource.sort = this.sort;
        }
      },
      error: (error) => {
        this.errorResponse = error;
        this.dataLoading = false;
      },
    });
  }

  readonly dialog = inject(MatDialog);

  openDialog(enterAnimationDuration: string, exitAnimationDuration: string, subnet: Partial<SubnetExtendedData>, mode: 'insert' | 'edit'): void {
    let dialogRef = this.dialog.open(InsertSubnetDialog, {
      width: '24em',
      enterAnimationDuration,
      exitAnimationDuration,
      data: {
        allSubnets: this.dataSource.data,
        subnet: {
          range: subnet.range,
          note: subnet.note,
          organizationUnit: subnet.organizationUnit,
          parentSubnet: subnet.parentSubnet,
          contacts: subnet.contacts,
        },
        mode: mode 
      },
    });

    // Listen for subnet updates from the dialog (e.g., after insert or edit)
    dialogRef.componentInstance.updateSubnetDataSource.subscribe(({ oldRange, subnet }) => {
      // Refreshes the data source with the updated subnet
      // Either updates the existing subnet or adds a new one if it doesn't exist
      const index = this.dataSource.data.findIndex(item => item.range === oldRange);
        if (index !== -1) {
          this.dataSource.data[index] = subnet;

          // Update parent subnet references
          this.dataSource.data.forEach(item => {
            if (item.parentSubnet === oldRange) {
              item.parentSubnet = subnet.range; 
            }
          });

          this.dataSource._updateChangeSubscription(); // Refresh the data source
          this.openSnackBar(`Subnet ${subnet.range} updated successfully.`, 'Close');
        } else {
          this.dataSource.data = [subnet, ...this.dataSource.data]; // Add new subnet if it doesn't exist
          this.openSnackBar(`Subnet ${subnet.range} [${subnet.note}] added successfully.`, 'Close');
        }
    });
  }

  deleteSubnet(subnet: SubnetExtendedData): void {
    if (this.data.deleteSubnet(subnet.range)) {
      // Handle successful deletion (e.g., show a message, refresh the list)
      this.dataSource.data = this.dataSource.data.filter(item => item.range !== subnet.range);
      this.openSnackBar(`Subnet ${subnet.range} deleted successfully.`, 'Close');
    } else {
      // Handle deletion failure (e.g., show an error message)
      this.openSnackBar(`Failed to delete subnet ${subnet.range}.`, 'Close');
    }
  }

  reorganiseDatabase(): void {
    alert('TODO: Reorganize database when API is ready');
  }

  navigateToSubnetDetail(subnetRange: string): void {
    this.router.navigate([SUBNETS_PATH, subnetRange]);
  }

  navigateToOrgUnitDetail(orgName: string): void {
    this.router.navigate([ORGANIZATION_PATH, orgName]);
  }
}
