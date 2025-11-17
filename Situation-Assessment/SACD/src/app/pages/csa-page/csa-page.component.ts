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

export interface CSANode {
  ips: string[];
  topology_degree?: number;
  topology_degree_norm: number;
  topology_betweenness?: number;
  topology_betweenness_norm: number;
  final_criticality: number;
  mission_criticality: number;
}

@Component({
  selector: 'csa-page',
  templateUrl: './csa-page.component.html',
  styleUrls: ['./csa-page.component.scss'],
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
    SentinelCardComponent,
    SentinelButtonWithIconComponent,
    MatIcon
  ],
  providers: [
    provideMomentDateAdapter(DATE_FORMAT)
  ],
  standalone: true,
})

export class CSAPageComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<CSANode>();

  displayedColumns: string[] = ['ips', 'topology_degree_norm', 'topology_betweenness_norm', 'mission_criticality', 'final_criticality'];

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

  editOn: boolean = false;
  separatorKeysCodes = [ENTER] as const;

  nodes = signal<CSANode[]>([]);
  totalSortedServices = computed(() => this.dataSource.filteredData.length);

  defaultValue = "All";
  filterDictionary = new Map<string, string>();

  searchTerm: WritableSignal<string> = signal('');

  controls: SentinelControlItem[] = [];

  constructor(
    private data: DataService,
    private changeDetector: ChangeDetectorRef,
  ) {
    this.dataSource = new MatTableDataSource<CSANode>([]);
  }

  private router = inject(Router);

  COLOR_THRESHOLDS = [9, 7, 5, 3, 1];
  getCriticalityColor = ((value: number, isFinalCriticality: boolean = false) => {
    if (value === null || value === undefined) {
      return {bg: '#cacaca', color: '#000000'};
    } else if (value >= this.COLOR_THRESHOLDS[0] * (isFinalCriticality ? 10 : 1)) {
      return {bg: '#1C1D21', color: '#FFFFFF'};
    } else if (value >= this.COLOR_THRESHOLDS[1] * (isFinalCriticality ? 10 : 1)) {
      return {bg: '#9F85FF', color: '#000000'};
    } else if (value >= this.COLOR_THRESHOLDS[2] * (isFinalCriticality ? 10 : 1)) {
      return {bg: '#ed625e', color: '#000000'};
    } else if (value >= this.COLOR_THRESHOLDS[3] * (isFinalCriticality ? 10 : 1)) {
      return {bg: '#ed913b', color: '#000000'};
    } else if (value > this.COLOR_THRESHOLDS[4] * (isFinalCriticality ? 10 : 1)) {
      return {bg: '#f6d55c', color: '#000000'};
    } else {
      return {bg: '#86B46A', color: '#000000'};
    }
  });

  ngOnInit(): void {
    this.dataLoading = true;

    this.data.getCSANodes().subscribe({
      next: (nodes) => {
        this.nodes.set(nodes);

        this.dataSource.data = this.nodes();

        if (this.paginator && this.sort) {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        }

        if (this.nodes().length > 0) {
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
          isMatch = (value === "All") || (value == '') || record.ips.some(ip => ip.toLowerCase().includes(value.trim().toLowerCase()));
          if (!isMatch) return false;
        }
      }

      return isMatch;
    };
  }

  applyNameFilter(): void {
    this.filterDictionary.set('name', this.searchTerm().trim().toLowerCase());
    this.dataSource.filter = JSON.stringify(Array.from(this.filterDictionary.entries()));
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  resetFilters(): void {
    this.filterDictionary.clear();
    this.dataSource.filter = '';
    this.searchTerm.set('');

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  saveData(address: string, tags: string[]): void {
    this.data.changeTag(address, tags)
  }

  
  selected(event: MatAutocompleteSelectedEvent, tags: string[]): void {
    tags.push(event.option.viewValue)
    event.option.deselect();
  }

  navigateToNetworkNodeView(ip: string): void {
    this.router.navigate([NETWORK_NODES_PATH], {
      queryParams: { ip: ip }
    });
  }

  navigateToSubnetDetail(subnetRange: string): void {
      this.router.navigate([SUBNETS_PATH, subnetRange]);
  }
  
}
