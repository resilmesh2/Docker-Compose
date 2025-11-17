import { Component, Input, OnInit, OnChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubnetData } from '../../models/network-data';
import { TooltipService } from '../../services/tooltip.service';
import { Router } from '@angular/router';
import { DeviceStateService } from '../../services/device-state.service';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent implements OnInit, OnChanges {
  @Input() networkData: SubnetData[] = [];
  @Output() subnetClick = new EventEmitter<SubnetData>();

  filteredData: any[] = [];
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  searchTerm = '';
  filterType = 'all';
  sortField = 'riskScore';
  sortDirection: 'asc' | 'desc' = 'desc';
  viewMode: 'subnets' | 'organizations' = 'subnets';
  private isHoveringTable = false;

  constructor(
    private tooltipService: TooltipService,
    private router: Router,
    private deviceStateService: DeviceStateService
  ) {}

  ngOnInit() {
    this.loadSubnetTableData();
  }

  ngOnChanges() {
    if (this.viewMode === 'organizations') {
      this.loadOrganizationTableData();
    } else {
      this.loadSubnetTableData();
    }
  }

  onFilterChange(): void {
    if (this.filterType === 'organizations') {
      this.viewMode = 'organizations';
      this.loadOrganizationTableData();
    } else {
      this.viewMode = 'subnets';
      this.loadSubnetTableData();
    }
    this.currentPage = 1;
  }

  private loadOrganizationTableData(): void {
    if (!this.networkData || this.networkData.length === 0) {
      this.filteredData = [];
      this.updatePagination();
      return;
    }
    
    const orgGroups = this.networkData.reduce((groups: any, item: any) => {
      const orgName = item.organizationName || 'Unknown Organization';
      if (!groups[orgName]) {
        groups[orgName] = {
          name: orgName,
          subnets: [],
          totalDevices: 0,
          totalSubnets: 0,
          avgRiskScore: 0,
          highRiskSubnets: 0,
          organizationId: item.organizationId
        };
      }
      groups[orgName].subnets.push(item);
      groups[orgName].totalDevices += item.deviceCount;
      groups[orgName].totalSubnets++;
      return groups;
    }, {});
    
    this.filteredData = Object.values(orgGroups).map((org: any) => {
      org.avgRiskScore = org.subnets.reduce((sum: number, subnet: any) => 
        sum + subnet.riskScore, 0) / org.subnets.length;
      org.highRiskSubnets = org.subnets.filter((subnet: any) => 
        subnet.riskScore >= 6.5).length;
      return org;
    });
    
    this.applySearch();
    this.sortData();
    this.updatePagination();
  }

  private loadSubnetTableData(): void {
    let data = [...this.networkData];
    
    if (this.filterType === 'high-risk') {
      data = data.filter(item => item.riskScore >= 6.5);
    } else if (this.filterType === 'large') {
      data = data.filter(item => item.deviceCount > 500);
    }
    
    this.filteredData = data;
    this.applySearch();
    this.sortData();
    this.updatePagination();
  }

  private applySearch(): void {
    if (this.viewMode === 'organizations') {
      if (this.searchTerm) {
        this.filteredData = this.filteredData.filter((org: any) => 
          org.name.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
      }
    } else {
      if (this.searchTerm) {
        this.filteredData = this.filteredData.filter((item: any) => 
          item.subnet.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          item.riskLevel.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
      }
    }
  }

  onSearchChange() {
    this.currentPage = 1;
    if (this.viewMode === 'organizations') {
      this.loadOrganizationTableData();
    } else {
      this.loadSubnetTableData();
    }
  }

  sort(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = ['subnet', 'riskLevel', 'name'].includes(field) ? 'asc' : 'desc';
    }
    this.currentPage = 1;
    this.sortData();
    this.updatePagination();
  }

  private sortData(): void {
    this.filteredData.sort((a: any, b: any) => {
      let valueA: any, valueB: any;

      if (this.viewMode === 'organizations') {
        switch(this.sortField) {
          case 'name':
            valueA = a.name.toLowerCase();
            valueB = b.name.toLowerCase();
            break;
          case 'totalDevices':
            valueA = a.totalDevices;
            valueB = b.totalDevices;
            break;
          case 'avgRiskScore':
            valueA = a.avgRiskScore;
            valueB = b.avgRiskScore;
            break;
          case 'totalSubnets':
            valueA = a.totalSubnets;
            valueB = b.totalSubnets;
            break;
          default:
            return 0;
        }
      } else {
        switch(this.sortField) {
          case 'subnet':
            valueA = a.subnet.toLowerCase();
            valueB = b.subnet.toLowerCase();
            break;
          case 'deviceCount':
            valueA = a.deviceCount;
            valueB = b.deviceCount;
            break;
          case 'riskScore':
            valueA = a.riskScore;
            valueB = b.riskScore;
            break;
          case 'riskLevel':
            const riskOrder = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
            valueA = riskOrder[a.riskLevel as keyof typeof riskOrder];
            valueB = riskOrder[b.riskLevel as keyof typeof riskOrder];
            break;
          default:
            return 0;
        }
      }

      if (this.sortDirection === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    } else if (this.totalPages === 0) {
      this.currentPage = 1;
    }
  }

  showSubnetDetails(item: SubnetData) {
    this.hideTooltip();
    console.log('Table row clicked:', item.subnet);
    this.subnetClick.emit(item);
  }

  onOrganizationRowClick(organization: any): void {
  this.hideTooltip();
  
  // Store the selected organization
  this.deviceStateService.setSelectedOrganization(organization);
  
  // Navigate to treemap with organization filter
  this.router.navigate(['/'], { 
    queryParams: { 
      view: 'treemap',
      organization: organization.name,
      groupBy: 'organization'
    }
  });
}

  getRiskLevel(riskScore: number): string {
    if (riskScore >= 8.0) return 'critical';
    if (riskScore >= 6.0) return 'high';
    if (riskScore >= 4.0) return 'medium';
    return 'low';
  }

  get paginatedData(): any[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredData.length);
    return this.filteredData.slice(startIndex, endIndex);
  }

  get paginationInfo(): string {
    if (this.filteredData.length === 0) return 'No data available';
    const startIndex = (this.currentPage - 1) * this.pageSize + 1;
    const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredData.length);
    const itemType = this.viewMode === 'organizations' ? 'organizations' : 'entries';
    return `Showing ${startIndex}-${endIndex} of ${this.filteredData.length} ${itemType}`;
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getRiskClass(riskLevel: string): string {
    return `risk-${riskLevel}`;
  }

  getPageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  showTooltip(event: MouseEvent, item: SubnetData): void {
    this.tooltipService.showSubnetTooltip(event, item);
  }

  hideTooltip(): void {
    this.tooltipService.hide();
  }

  onRowClick(item: SubnetData): void {
    this.tooltipService.hide();
    this.showSubnetDetails(item);
  }

  showOrganizationTooltip(event: MouseEvent, organization: any): void {
  // Create a custom tooltip for organizations
  const tooltipContent = {
    name: organization.name,
    totalSubnets: organization.totalSubnets,
    totalDevices: organization.totalDevices,
    avgRiskScore: organization.avgRiskScore,
    highRiskSubnets: organization.highRiskSubnets,
    message: 'Click to view in treemap'
  };
  
  this.tooltipService.showOrganizationTooltip(event, tooltipContent);
}
}