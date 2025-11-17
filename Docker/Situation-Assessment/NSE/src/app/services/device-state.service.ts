import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SubnetData, DeviceData } from '../models/network-data';

export interface DeviceTableState {
  searchTerm: string;
  filterType: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
}


@Injectable({
  providedIn: 'root'
})
export class DeviceStateService {
  private selectedSubnetSubject = new BehaviorSubject<SubnetData | null>(null);
  private selectedDeviceSubject = new BehaviorSubject<DeviceData | null>(null);
  private deviceTableStateSubject = new BehaviorSubject<DeviceTableState>({
    searchTerm: '',
    filterType: 'all',
    sortField: 'riskScore',
    sortDirection: 'desc',
    currentPage: 1,
    pageSize: 15
  });

  public selectedSubnet$: Observable<SubnetData | null> = this.selectedSubnetSubject.asObservable();
  public selectedDevice$: Observable<DeviceData | null> = this.selectedDeviceSubject.asObservable();
  public deviceTableState$: Observable<DeviceTableState> = this.deviceTableStateSubject.asObservable();
  private selectedOrganizationSource = new BehaviorSubject<any>(null);
  selectedOrganization$ = this.selectedOrganizationSource.asObservable();

  setSelectedSubnet(subnet: SubnetData | null): void {
    this.selectedSubnetSubject.next(subnet);
  }

  getSelectedSubnet(): SubnetData | null {
    return this.selectedSubnetSubject.value;
  }

  setSelectedDevice(device: DeviceData | null): void {
    this.selectedDeviceSubject.next(device);
  }

  updateDeviceTableState(updates: Partial<DeviceTableState>): void {
    const currentState = this.deviceTableStateSubject.value;
    const newState = { ...currentState, ...updates };
    this.deviceTableStateSubject.next(newState);
  }

  getDeviceTableState(): DeviceTableState {
    return this.deviceTableStateSubject.value;
  }

  clearAllState(): void {
    this.setSelectedSubnet(null);
    this.setSelectedDevice(null);
  }

  exportDeviceList(devices: DeviceData[], subnetCidr: string): void {
    const headers = ['Hostname', 'IP Address', 'Device Type', 'OS', 'Risk Score', 'Vulnerabilities'];
    const csvContent = [
      headers.join(','),
      ...devices.map(device => [
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
    a.download = `devices_${subnetCidr.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  setSelectedOrganization(organization: any): void {
  this.selectedOrganizationSource.next(organization);
}

getSelectedOrganization(): any {
  return this.selectedOrganizationSource.value;
}

clearSelectedOrganization(): void {
  this.selectedOrganizationSource.next(null);
  console.log('Organization selection cleared from service');
}
}