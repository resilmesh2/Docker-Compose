import { Component, OnInit, ViewChild, AfterViewInit, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { OrgUnitCrudDialog } from './org-unit-crud-dialog/org-unit-crud.component';
import { DataService } from '../../services/data.service';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { SentinelButtonWithIconComponent } from '@sentinel/components/button-with-icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrgUnitData } from '../../models/org-unit.model';
import { ORGANIZATION_PATH } from '../../paths';
//import { SentinelControlsComponent, SentinelControlItem, SentinelControlItemSignal } from '@sentinel/components/controls';
//import { defer, Observable, of, take } from 'rxjs';


@Component({
  selector: 'org-units-page',
  templateUrl: './org-units.component.html',
  styleUrls: ['./org-units.component.scss'],
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

export class OrgUnitsComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['name', 'subnets', 'contacts', 'parent_org_unit', 'actions'];
  dataSource: MatTableDataSource<OrgUnitData>;
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator | null = null;
  @ViewChild(MatSort, { static: false }) sort: MatSort | null = null;
  dataLoaded = false;
  dataLoading = true;

  constructor(private data: DataService, private changeDetector: ChangeDetectorRef, private route: ActivatedRoute) {
    this.dataSource = new MatTableDataSource<OrgUnitData>([]);
    this.getAllOrgUnits();
  }

  emptyResponse = false;
  errorResponse = '';

  dialogRef: MatDialogRef<OrgUnitCrudDialog, unknown> | null = null;
  private _snackBar = inject(MatSnackBar);
  private router = inject(Router);

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action);
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {}

  getAllOrgUnits() {
    this.emptyResponse = false;
    this.errorResponse = '';
    this.dataLoading = true;

    this.data.getOrgUnits().subscribe({
      next: (orgUnits: OrgUnitData[]) => {
        this.dataSource = new MatTableDataSource<OrgUnitData>(orgUnits.map(orgUnit => ({
          name: orgUnit.name, // Can't be null or undefined, so no need for a fallback,
          parentOrgUnit: orgUnit.parentOrgUnit ?? "---",
          subnets: orgUnit.subnets.length == 0 ? ["---"] : orgUnit.subnets,
          contacts: orgUnit.contacts.length == 0 ? [] : orgUnit.contacts,
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
    console.log('Org Units loaded:', this.dataSource.data);
  }

  readonly dialog = inject(MatDialog);

  openDialog(enterAnimationDuration: string, exitAnimationDuration: string, orgUnit: Partial<OrgUnitData>, mode: 'insert' | 'edit'): void {
    this.dialogRef = this.dialog.open(OrgUnitCrudDialog, {
      width: '24em',
      enterAnimationDuration,
      exitAnimationDuration,
      data: {
        allOrgUnits: this.dataSource.data,
        orgUnit: orgUnit,
        mode: mode 
      },
    });

    // Listen for org unit updates from the dialog (e.g., after insert or edit)
    this.dialogRef.componentInstance.updateOrgUnitDataSource.subscribe(({ oldName, orgUnit }) => {
      // Refreshes the data source with the updated org unit
      // Either updates the existing org unit or adds a new one if it doesn't exist
      const index = this.dataSource.data.findIndex(item => item.name === oldName);
      if (index !== -1) {
        this.dataSource.data[index] = orgUnit;

          // Update parent org unit references
          this.dataSource.data.forEach(item => {
            if (item.parentOrgUnit === oldName) {
              item.parentOrgUnit = orgUnit.name;
            }
          });

          this.dataSource._updateChangeSubscription(); // Refresh the data source
          this.openSnackBar(`Org Unit ${orgUnit.name} updated successfully.`, 'Close');
        } else {
          this.dataSource.data = [orgUnit, ...this.dataSource.data]; // Add new org unit if it doesn't exist
          this.openSnackBar(`Org Unit ${orgUnit.name} added successfully.`, 'Close');
        }
    });
  }

  deleteOrgUnit(orgUnit: OrgUnitData): void {
    if (this.data.deleteOrgUnit(orgUnit.name)) {
      // Handle successful deletion (e.g., show a message, refresh the list)
      this.dataSource.data = this.dataSource.data.filter(item => item.name !== orgUnit.name);
      this.openSnackBar(`Org Unit ${orgUnit.name} deleted successfully.`, 'Close');
    } else {
      // Handle deletion failure (e.g., show an error message)
      this.openSnackBar(`Failed to delete Org Unit ${orgUnit.name}.`, 'Close');
    }
  }

  reorganiseDatabase(): void {
    alert('TODO: Reorganize database when API is ready');
  }

  navigateToOrgUnitDetail(org: OrgUnitData): void {
    this.router.navigate([ORGANIZATION_PATH, org.name]);
  }
}
