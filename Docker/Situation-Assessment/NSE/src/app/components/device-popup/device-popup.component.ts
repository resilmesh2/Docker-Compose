import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DeviceStateService } from '../../services/device-state.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubnetData, DeviceData } from '../../models/network-data';
import { TooltipService } from '../../services/tooltip.service';

@Component({
  selector: 'app-device-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './device-popup.component.html',
  styleUrls: ['./device-popup.component.css']
})
export class DevicePopupComponent implements OnInit {
  isVisible = false;
  currentSubnet: SubnetData | null = null;
  isLoading = false;        
  loadingMessage = '';
  filteredDevices: DeviceData[] = [];
  searchTerm = '';
  filterType = 'all';
  sortType = 'threat-desc';
  currentPage = 1;
  pageSize = 50;
  totalPages = 1;

constructor(
  private cdr: ChangeDetectorRef, 
  private tooltipService: TooltipService,            
  private deviceStateService: DeviceStateService,
  private router: Router
) {}

  get hasDevices(): boolean {
    return !!(this.currentSubnet?.devices && this.currentSubnet.devices.length > 0);
  }

  get hasNoDevices(): boolean {
    return !this.isLoading && this.currentSubnet !== null && (!this.currentSubnet.devices || this.currentSubnet.devices.length === 0);
  }

  get showDeviceGrid(): boolean {
    return !this.isLoading && this.hasDevices;
  }

  ngOnInit() {}

showDeviceTable(): void {
  console.log(' Navigating to device table for:', this.currentSubnet?.subnet);
  console.log(' Device count:', this.currentSubnet?.devices?.length || 0);
  
  if (this.currentSubnet) {
    this.deviceStateService.setSelectedSubnet(this.currentSubnet);
    this.router.navigate(['/devices', this.currentSubnet.subnet]);
    this.closePopup();
  } else {
    console.error('No current subnet available for table view');
  }
}

  showPopup(subnetData: SubnetData) {
    console.log('Showing popup for subnet:', subnetData.subnet);
    this.currentSubnet = subnetData;
    this.isVisible = true;
    this.isLoading = false;         
    this.loadingMessage = '';       
    this.resetFilters();
    this.filterDevices();
    this.cdr.detectChanges();
  }

  closePopup() {
    this.isVisible = false;
    this.currentSubnet = null;
    this.isLoading = false;         
    this.loadingMessage = '';       
    this.cdr.detectChanges();
  }

  private resetFilters() {
    this.searchTerm = '';
    this.filterType = 'all';
    this.sortType = 'threat-desc';
    this.currentPage = 1;
  }

  filterDevices() {
  if (!this.currentSubnet?.devices) {
    this.filteredDevices = [];
    return;
  }

  let devices = [...this.currentSubnet.devices];

  // Apply search filter
  if (this.searchTerm) {
    devices = devices.filter(device => 
      device.hostname?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      device.ip?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      device.deviceType?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      device.os?.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Apply category filter
  if (this.filterType !== 'all') {
    devices = this.applyDeviceFilter(devices, this.filterType);
  }

  // Apply sorting
  devices = this.sortDevices(devices);

  this.filteredDevices = devices;
  this.totalPages = Math.ceil(this.filteredDevices.length / this.pageSize);
  
  if (this.currentPage > this.totalPages && this.totalPages > 0) {
    this.currentPage = this.totalPages;
  }
}

  private applyDeviceFilter(devices: DeviceData[], filterType: string): DeviceData[] {
    switch(filterType) {
      case 'critical':
        return devices.filter(d => (d.riskScore || 0) >= 8.0);
      case 'high':
        return devices.filter(d => (d.riskScore || 0) >= 6.0 && (d.riskScore || 0) < 8.0);
      case 'medium':
        return devices.filter(d => (d.riskScore || 0) >= 4.0 && (d.riskScore || 0) < 6.0);
      case 'low':
        return devices.filter(d => (d.riskScore || 0) < 4.0);
      case 'vulnerable':
        return devices.filter(d => d.vulnerabilities && d.vulnerabilities.length > 0);
      case 'servers':
        return devices.filter(d => d.deviceType?.toLowerCase().includes('server'));
      case 'workstations':
        return devices.filter(d => d.deviceType?.toLowerCase().includes('workstation'));
      default:
        return devices;
    }
  }

  private sortDevices(devices: DeviceData[]): DeviceData[] {
    return devices.sort((a, b) => {
      switch(this.sortType) {
        case 'threat-desc':
          return (b.riskScore || 0) - (a.riskScore || 0);
        case 'threat-asc':
          return (a.riskScore || 0) - (b.riskScore || 0);
        case 'name-asc':
          return (a.hostname || '').localeCompare(b.hostname || '');
        case 'name-desc':
          return (b.hostname || '').localeCompare(a.hostname || '');
        case 'ip-asc':
          return this.compareIPs(a.ip || '', b.ip || '');
        case 'type-asc':
          return (a.deviceType || '').localeCompare(b.deviceType || '');
        default:
          return (b.riskScore || 0) - (a.riskScore || 0);
      }
    });
  }

  private compareIPs(ipA: string, ipB: string): number {
    const partsA = ipA.split('.').map(num => parseInt(num).toString().padStart(3, '0')).join('.');
    const partsB = ipB.split('.').map(num => parseInt(num).toString().padStart(3, '0')).join('.');
    return partsA.localeCompare(partsB);
  }

  get paginatedDevices(): DeviceData[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredDevices.length);
    return this.filteredDevices.slice(startIndex, endIndex);
  }

  get paginationInfo(): string {
    if (this.filteredDevices.length === 0) return 'No devices found';
    const startIndex = (this.currentPage - 1) * this.pageSize + 1;
    const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredDevices.length);
    return `Showing ${startIndex}-${endIndex} of ${this.filteredDevices.length} devices`;
  }

showLoadingPopup(subnetCidr: string) {
    console.log('Showing loading popup for:', subnetCidr);
    this.currentSubnet = { 
      subnet: subnetCidr,
      devices: []
    } as any;
    this.isVisible = true;
    this.isLoading = true;          
    this.loadingMessage = 'Initializing...';  
    this.cdr.detectChanges();
  }

  updateLoadingProgress(subnetCidr: string, message: string) {
    console.log(`Progress update for ${subnetCidr}: ${message}`);
    this.loadingMessage = message;
    this.cdr.detectChanges();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.filterDevices();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.filterDevices();
  }

  onSortChange() {
    this.currentPage = 1;
    this.filterDevices();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getRiskClass(riskScore: number, hasRiskScore?: boolean): string {
  if (hasRiskScore === false) return 'no-score';
  if (riskScore >= 8.0) return 'critical';
  if (riskScore >= 6.0) return 'high';
  if (riskScore >= 4.0) return 'medium';
  return 'low';
}

  getRiskBadgeClass(riskScore: number): string {
    return this.getRiskClass(riskScore);
  }

  exportDeviceList() {
    if (!this.currentSubnet?.devices) return;

    const headers = ['Hostname', 'IP Address', 'Device Type', 'Operating System', 'Risk Score', 'Vulnerabilities'];
    const csvContent = [
      headers.join(','),
      ...this.currentSubnet.devices.map(device => [
        device.hostname || '',
        device.ip || '',
        device.deviceType || '',
        device.os || '',
        (device.riskScore || 0).toFixed(1),
        device.vulnerabilities ? device.vulnerabilities.join(';') : ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devices_${this.currentSubnet.subnet.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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

  showDeviceTooltip(event: MouseEvent, device: DeviceData): void {
    this.tooltipService.showDeviceTooltip(event, device);
  }

  hideTooltip(): void {
    this.tooltipService.hide();
  }

isShowingDeviceDetails = false;
selectedDevice: DeviceData | null = null;

onDeviceClick(device: DeviceData): void {
  this.tooltipService.hide();
  this.showDeviceDetailsInPopup(device);
}

showDeviceDetailsInPopup(device: DeviceData): void {
  console.log('Showing device details in popup for:', device.hostname);
  this.isShowingDeviceDetails = true;
  this.selectedDevice = device;
}

backToDeviceList(): void {
  console.log('Going back to device list from device details');
  this.isShowingDeviceDetails = false;
  this.selectedDevice = null;
}

getPopupTitle(): string {
  if (this.isShowingDeviceDetails && this.selectedDevice) {
    return `Device Details: ${this.selectedDevice.hostname || 'Unknown Device'}`;
  }
  return `Subnet: ${this.currentSubnet?.subnet || 'Unknown'}`;
}

getDeviceStatus(device: DeviceData): string {
  return (device as any).status || 'Unknown';
}

getDeviceLastSeen(device: DeviceData): string {
  return (device as any).lastSeen || 'Unknown';
}

getDeviceOpenPorts(device: DeviceData): string {
  const ports = (device as any).openPorts;
  return ports ? ports.join(', ') : 'N/A';
}
}