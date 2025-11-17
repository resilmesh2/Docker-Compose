import { Component, OnInit, ViewChild, AfterViewInit, ElementRef, ChangeDetectorRef, signal, computed, WritableSignal, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Router } from '@angular/router';
import { Observable, zip } from 'rxjs';

import { ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Subnet } from '../../models/vulnerability.model';
import { DataService } from '../../services/data.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { DatePipe } from '@angular/common';
import { MatNativeDateModule } from '@angular/material/core';
import { SentinelCardComponent } from '@sentinel/components/card';
import { SentinelControlItem } from '@sentinel/components/controls';
import { TagComponent } from '../../components/tag-component/tag.component';
import { SentinelButtonWithIconComponent } from '@sentinel/components/button-with-icon';
import { DateRange } from '@sentinel/common';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { DATE_FORMAT } from '../../config/dateFormat';
import { MatIcon } from '@angular/material/icon';
import { NETWORK_NODES_PATH, SUBNETS_PATH } from '../../paths';

export interface Service {
  name: string;
  id: string;
  tag: string[];
  subnet: string[];
  severity: string[];
  last_seen: Date | null;
}

export interface IP {
  _id: string;
  address: string;
  tag: string[];
  subnets: Subnet[];
  __typename: string;
}

interface Filter {
    name: string;
    options: string[];
    defaultValue: string;
}

@Component({
  selector: 'asset-page',
  templateUrl: './asset-page.component.html',
  styleUrls: ['./asset-page.component.scss'],
  imports: [
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    DatePipe,
    SentinelCardComponent,
    TagComponent,
    SentinelButtonWithIconComponent,
    MatIcon
  ],
  providers: [
    provideMomentDateAdapter(DATE_FORMAT)
  ]
})

export class AssetPageComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<Service>();

  displayedColumns: string[] = ['name', 'tag', 'subnet', 'last_seen'];
  
  private paginator: MatPaginator | null = null;
  private sort: MatSort | null = null;

  @ViewChild(MatSort) set matSort(ms: MatSort) {
    this.sort = ms;
    this.setDataSourceAttributes();
  }

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    this.setDataSourceAttributes();
  }

  setDataSourceAttributes() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  dataLoaded = false;
  dataLoading = false;
  emptyResponse = false;
  errorResponse = '';

  //services: Service[] = [];
  ips: IP[] = []

  editOn: boolean = false;
  separatorKeysCodes = [ENTER] as const;

  services = signal<Service[]>([]);
  totalSortedServices = computed(() => this.dataSource.filteredData.length);

  filters: Filter[] = []; // Filters for severity and status (+ potentially other selects in the future)
  defaultValue = "All";
  filterDictionary = new Map<string, string>();

  searchTerm: WritableSignal<string> = signal('');

  selectedTag: WritableSignal<string> = signal(this.defaultValue);
  selectedSubnet: WritableSignal<string> = signal(this.defaultValue);

  tags = computed(() => Array.from(new Set(this.services().flatMap(service => service.tag))));
  subnets = computed(() => Array.from(new Set(this.services().flatMap(service => service.subnet))));

  startDate: WritableSignal<Date | null> = signal(null);
  endDate: WritableSignal<Date | null> = signal(null);
  isDateRangeValid = computed(() => this.startDate() !== null && this.endDate() !== null);

  controls: SentinelControlItem[] = [];

  constructor(
    private data: DataService,
    private changeDetector: ChangeDetectorRef,
  ) {
    this.dataSource = new MatTableDataSource<Service>([]);
  }

  private router = inject(Router);

  ngOnInit(): void {
    this.dataLoading = true;

    console.log('Data Loading');
    this.data.getIPs().subscribe({
      next: (ips) => {
        this.ips = ips;

        console.log('Combined Data Loaded:', this.ips, this.tags());

        this.processServices();

        console.log('Processed Services:', this.services());

        if (this.ips.length > 0) {
          this.dataLoaded = true;
        } else {
          this.emptyResponse = true;
        }
        this.dataLoading = false;

        this.changeDetector.detectChanges();
      },
      error: (error) => {
        console.error('Error:', error);
        this.errorResponse = error;
        this.dataLoading = false;
        this.changeDetector.detectChanges();
      }
    });
    this.filters.push({name: 'tag', options: this.tags(), defaultValue: this.defaultValue});
    this.filters.push({name: 'subnet', options: this.subnets(), defaultValue: this.defaultValue});
  }

  ngAfterViewInit() {

    if (this.dataLoaded && this.dataSource) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
    
    /**
     * Custom filter predicate for the data source.
     */
    this.dataSource.filterPredicate = function (record, filter) {
      var map: Map<string, any> = new Map(JSON.parse(filter));
      let isMatch = false;
      for(let [key,value] of map){
        // Name filter (CVE ID)
        if (key === 'name') {
          isMatch = (value === "All") || (value == '') || record.name.toLowerCase().includes(value.trim().toLowerCase());
          if (!isMatch) return false;
        } else if (key === 'dateRange') {
          // If no date range is specified, match all records
          if (!value || value === '') {
            isMatch = true;
            continue;
          }

          const dateRange = JSON.parse(value);
          const startDate = new Date(dateRange.start);
          const endDate = new Date(dateRange.end);
          const lastSeenDate = record.last_seen ? new Date(record.last_seen) : null;
          isMatch = (!lastSeenDate || (lastSeenDate >= startDate && lastSeenDate <= endDate));

          if (!isMatch) return false;
        } else if (key === 'tag') {
          isMatch = (value === "All") || (value == '') || record.tag.includes(value.trim().toLowerCase());
          if (!isMatch) return false;
        } else {
          // For any other filters, check if the value matches the record's property
          isMatch = (value=="All") || (record[key as keyof Service] == value); 
          if(!isMatch) return false;
        }
      }

      return isMatch;
    };
  }

  /**
   * Used for applying filters from the select dropdowns.
   * @param event MatSelectChange event containing the selected value.
   */
  applySelectFilter(event: MatSelectChange, filter: Filter) {
    this.filterDictionary.set(filter.name, event.value);

    var jsonString = JSON.stringify(Array.from(this.filterDictionary.entries()));
    
    this.dataSource.filter = jsonString;
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

    console.log('Applied Filter:', event.value, filter.name, this.dataSource.filter);
  }

  applyNameFilter(): void {
    this.filterDictionary.set('name', this.searchTerm().trim().toLowerCase());
    this.dataSource.filter = JSON.stringify(Array.from(this.filterDictionary.entries()));
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  applyDateFilter(): void {
    console.log('Applying date filter:', this.startDate(), this.endDate());
    if (this.isDateRangeValid()) {
      this.filterDictionary.set('dateRange', JSON.stringify({
        start: this.startDate()?.toISOString(),
        end: this.endDate()?.toISOString()
      }));
      this.dataSource.filter = JSON.stringify(Array.from(this.filterDictionary.entries()));
    }
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearDateFilter(): void {
    this.filterDictionary.set('dateRange', '');
    this.dataSource.filter = JSON.stringify(Array.from(this.filterDictionary.entries()));
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  resetFilters(): void {
    this.filterDictionary.clear();
    this.dataSource.filter = '';
    this.selectedTag.set(this.defaultValue);
    this.selectedSubnet.set(this.defaultValue);
    this.startDate.set(null);
    this.endDate.set(null);
    this.searchTerm.set('');

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  saveData(address: string, tags: string[]): void {
    this.data.changeTag(address, tags)
  }

  private processServices(): void {
    this.services.set(this.ips.map((ip, _) => ({
      name: ip.address,
      id: ip._id,
      tag: [...(ip.tag ?? [])],
      subnet: (ip.subnets ?? []).map(item => item.range),
      severity: ip.tag,
      last_seen: null, // TODO: When last_seen is available in the IP model, set it here
    })));

    this.dataSource.data = this.services();

    
    if (this.paginator && this.sort) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
    
    this.changeDetector.detectChanges();
  }

  add(event: MatChipInputEvent, tags: string[]): void {
    const value = event.value;

    if (value) {
      tags.push(value)
    }

    event.chipInput!.clear();
  }

  remove(tag: string, tags: string[]): void {
      const index = tags.indexOf(tag);
      if (index >= 0) {
        tags.splice(index, 1);
      }
  }

  selected(event: MatAutocompleteSelectedEvent, tags: string[]): void {
    tags.push(event.option.viewValue)
    event.option.deselect();
  }

  navigateToNetworkNodeView(asset: Service): void {
    this.router.navigate([NETWORK_NODES_PATH], {
      queryParams: { ip: asset.name }
    });
  }

  navigateToSubnetDetail(subnetRange: string): void {
      this.router.navigate([SUBNETS_PATH, subnetRange]);
  }
  
}
