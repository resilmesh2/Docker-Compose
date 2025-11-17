import { ChangeDetectionStrategy, Component, computed, inject, model, OnInit, output, signal, WritableSignal } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { DataService } from "../../../services/data.service";
import { ChipsContacts } from "../../../components/chips-contacts/chips-contacts.component";
import { MatLabel, MatOption, MatSelectModule } from "@angular/material/select";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButton } from "@angular/material/button";
import { SentinelButtonWithIconComponent } from "@sentinel/components/button-with-icon";
import { OrgUnitData } from "../../../models/org-unit.model";

@Component({
  selector: 'org-unit-crud-dialog',
  templateUrl: 'org-unit-crud.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatDialogModule,
    ChipsContacts,
    MatOption,
    MatSelectModule,
    MatLabel,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButton,
    SentinelButtonWithIconComponent
  ],
})

export class OrgUnitCrudDialog implements OnInit {
  readonly dialogRef = inject(MatDialogRef<OrgUnitCrudDialog>);

  data = inject(MAT_DIALOG_DATA) as { allOrgUnits: OrgUnitData[], orgUnit: OrgUnitData, mode: 'insert' | 'edit' };

  title = computed(() => this.data.mode === 'insert' ? 'Create Organization Unit' : 'Edit Organization Unit');
  
  allOrgUnits: WritableSignal<OrgUnitData[]> = model(this.data.allOrgUnits || []);

  updateOrgUnitDataSource = output<{ oldName: string; orgUnit: OrgUnitData }>();
  remove = output<string>();

  name = signal(this.data.orgUnit.name || '');
  parentOrgUnit = signal(this.data.orgUnit.parentOrgUnit || null);
  contacts = signal(this.data.orgUnit.contacts || []);
  subnets = signal(this.data.orgUnit.subnets || []);

  constructor(private dataService: DataService) {}

  ngOnInit(): void {}

  updatedOrgUnit = computed(() => ({
    ...this.data.orgUnit,
    name: this.name(),
    parentOrgUnit: this.parentOrgUnit(),
    contacts: this.contacts(),
    subnets: this.subnets(),
  }));

  insertOrgUnit() {
    if (!this.name()) {
      console.error('Name is required for inserting an organization unit');
      return;
    }
    this.dataService.insertOrgUnit(this.updatedOrgUnit());

    this.updateOrgUnitDataSource.emit({
      oldName: this.data.orgUnit.name,
      orgUnit: this.updatedOrgUnit()
    });

    this.dialogRef.close();
  }

  editOrgUnit() {
    console.log(`Updating organization unit ${this.data.orgUnit.name} -> ${this.name()} | ${this.data.orgUnit.parentOrgUnit}`);
    this.dataService.editOrgUnit(this.data.orgUnit, this.updatedOrgUnit());

    this.updateOrgUnitDataSource.emit({
      oldName: this.data.orgUnit.name,
      orgUnit: this.updatedOrgUnit()
    });
  }
  
}