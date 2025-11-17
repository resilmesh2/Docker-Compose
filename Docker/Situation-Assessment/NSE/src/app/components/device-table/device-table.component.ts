import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { DeviceStateService } from '../../services/device-state.service';
import { NetworkDataService } from '../../services/network-data.service';
import { TooltipService } from '../../services/tooltip.service';
import { SubnetData, DeviceData } from '../../models/network-data';

@Component({
  selector: 'app-device-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './device-table.component.html',
  styleUrls: ['./device-table.component.css']
})
export class DeviceTableComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  subnet: SubnetData | null = null;
  devices: DeviceData[] = [];
  filteredDevices: DeviceData[] = [];
  paginatedDevices: DeviceData[] = [];
  
  searchTerm = '';
  filterType = 'all';
  sortField = 'riskScore';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  pageSize = 15;
  totalPages = 1;

  constructor(
    private deviceStateService: DeviceStateService,
    private networkDataService: NetworkDataService,
    private tooltipService: TooltipService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const subnetParam = params['subnet'];
      if (subnetParam) {
        this.loadSubnetData(subnetParam);
      }
    });

    this.deviceStateService.selectedSubnet$
      .pipe(takeUntil(this.destroy$))
      .subscribe(subnet => {
        if (subnet) {
          this.subnet = subnet;
          this.devices = subnet.devices || [];
          this.applyFiltersAndSort();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSubnetData(subnetCidr: string): void {
    const currentData = this.networkDataService.getCurrentNetworkData();
    const subnet = currentData.find(s => s.subnet === subnetCidr);
    
    if (subnet) {
      this.deviceStateService.setSelectedSubnet(subnet);
    } else {
      this.router.navigate(['/']);
    }
  }

  onSortChange(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = field === 'riskScore' ? 'desc' : 'asc';
    }
    this.currentPage = 1;
    this.applyFiltersAndSort();
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

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.calculatePagination();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  showDeviceTooltip(event: MouseEvent, device: DeviceData): void {
    this.tooltipService.showDeviceTooltip(event, device);
  }

  hideTooltip(): void {
    this.tooltipService.hide();
  }

  // Helper methods for the table display
  getDeviceStatus(device: DeviceData): string {
    return (device as any).status || 'Unknown';
  }

  getVulnerabilityCount(device: DeviceData): number {
    return device.vulnerabilities ? device.vulnerabilities.length : 0;
  }

  getVulnerabilityColor(device: DeviceData): string {
    return this.getVulnerabilityCount(device) > 0 ? '#dc3545' : '#28a745';
  }

  hasVulnerabilities(device: DeviceData): boolean {
    return this.getVulnerabilityCount(device) > 0;
  }

  private applyFiltersAndSort(): void {
    let filtered = [...this.devices];

    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(device => 
        device.hostname?.toLowerCase().includes(searchLower) ||
        device.ip?.toLowerCase().includes(searchLower) ||
        device.deviceType?.toLowerCase().includes(searchLower) ||
        device.os?.toLowerCase().includes(searchLower)
      );
    }

    switch (this.filterType) {
      case 'critical': filtered = filtered.filter(d => d.riskScore >= 8.0); break;
      case 'high': filtered = filtered.filter(d => d.riskScore >= 6.0 && d.riskScore < 8.0); break;
      case 'medium': filtered = filtered.filter(d => d.riskScore >= 4.0 && d.riskScore < 6.0); break;
      case 'low': filtered = filtered.filter(d => d.riskScore < 4.0); break;
      case 'vulnerable': filtered = filtered.filter(d => d.vulnerabilities && d.vulnerabilities.length > 0); break;
    }

    filtered.sort((a, b) => {
      let valueA: any = a[this.sortField as keyof DeviceData];
      let valueB: any = b[this.sortField as keyof DeviceData];

      if (this.sortField === 'riskScore') {
        return this.sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
      } else {
        const comparison = String(valueA || '').localeCompare(String(valueB || ''));
        return this.sortDirection === 'desc' ? -comparison : comparison;
      }
    });

    this.filteredDevices = filtered;
    this.calculatePagination();
  }

  private calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDevices.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredDevices.length);
    this.paginatedDevices = this.filteredDevices.slice(startIndex, endIndex);
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  backToSubnets(): void {
    this.deviceStateService.clearAllState();
    this.router.navigate(['/']);
  }

  exportDeviceList(): void {
    if (this.subnet) {
      this.deviceStateService.exportDeviceList(this.filteredDevices, this.subnet.subnet);
    }
  }

  getRiskClass(riskScore: number, hasRiskScore?: boolean): string {
  if (hasRiskScore === false) return 'no-score';
  if (riskScore >= 8.0) return 'critical';
  if (riskScore >= 6.0) return 'high';
  if (riskScore >= 4.0) return 'medium';
  return 'low';
}

  getRiskColor(riskScore: number): string {
    const riskClass = this.getRiskClass(riskScore);
    const colors = { critical: '#dc3545', high: '#fd7e14', medium: '#ffc107', low: '#28a745' };
    return colors[riskClass as keyof typeof colors] || '#28a745';
  }

  get paginationInfo(): string {
    if (this.filteredDevices.length === 0) return 'No devices found';
    const startIndex = (this.currentPage - 1) * this.pageSize + 1;
    const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredDevices.length);
    return `Showing ${startIndex}-${endIndex} of ${this.filteredDevices.length} devices`;
  }
}