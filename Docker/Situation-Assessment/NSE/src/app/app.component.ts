import { Component, OnInit, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet, ActivatedRoute } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetworkDataService } from './services/network-data.service';
import { DeviceStateService } from './services/device-state.service';
import { SubnetData, NetworkStats } from './models/network-data';

import { NetworkGraphComponent } from './components/network-graph/network-graph.component';
import { TreemapComponent } from './components/treemap/treemap.component';
import { DataTableComponent } from './components/data-table/data-table.component';
import { DevicePopupComponent } from './components/device-popup/device-popup.component';
import { DragDropDesignerComponent } from './components/drag-drop-designer/drag-drop-designer.component';
import { ComponentConfigurationComponent } from './components/component-configuration/component-configuration.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,                    
    NetworkGraphComponent,
    TreemapComponent, 
    DataTableComponent,
    DevicePopupComponent,
    DragDropDesignerComponent,
    ComponentConfigurationComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild(DevicePopupComponent) devicePopup!: DevicePopupComponent;
  @ViewChild('headerElement', { static: true }) headerElement!: ElementRef<HTMLElement>;
  
  title = 'Network System Status';
  networkStatus = 'unknown';
  networkData: SubnetData[] = [];
  stats: NetworkStats = {
    totalSubnets: 0,
    totalDevices: 0,
    highRiskSubnets: 0,
    avgRiskScore: 0
  };
  activeView = 'graph';
  isLoading = true;
  isRoutedPage = false;

  isDeviceTablePage = false;

private destroy$ = new Subject<void>();

constructor(
  private networkDataService: NetworkDataService,
  private deviceStateService: DeviceStateService,
  private router: Router,
  private route: ActivatedRoute,
  private cdr: ChangeDetectorRef
) {
  // Listen for route changes
  this.router.events.pipe(
    filter(event => event instanceof NavigationEnd)
  ).subscribe((event: NavigationEnd) => {
    const urlWithoutQuery = event.url.split('?')[0];
    this.isRoutedPage = urlWithoutQuery !== '/';
    this.isDeviceTablePage = event.url.includes('/devices/');
    
    console.log(' Route change detected:');
    console.log('   Full URL:', event.url);
    console.log('   Path only:', urlWithoutQuery);
    console.log('   isRoutedPage:', this.isRoutedPage);
    
    this.cdr.detectChanges();
  });
}

ngOnInit() {
  const currentUrl = this.router.url;
  const pathWithoutQuery = currentUrl.split('?')[0];
  this.isRoutedPage = pathWithoutQuery !== '/';
  this.isDeviceTablePage = currentUrl.includes('/devices/');
  
  console.log(' Initial route check:');
  console.log('   Full URL:', currentUrl);
  console.log('   Path only:', pathWithoutQuery);
  console.log('   isRoutedPage:', this.isRoutedPage);

  this.clearUrl();
  this.activeView = 'graph';
  
  // Handle view query parameter
  this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
    if (params['view']) {
      this.activeView = params['view'];
      console.log(' Set activeView from query param:', this.activeView);
    }
  });
  
  this.initializeData().then(() => {
    this.setupSubscriptions();
  });
}

private clearUrl(): void {
  if (window.location.search) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}

  private async initializeData(): Promise<void> {
  try {
    console.log('Initializing network data...');
    this.isLoading = true;
    
    // Load network data with existing subnet details check
    await this.networkDataService.loadNetworkData();
    
    console.log('Successfully loaded network data with existing details');
  } catch (error) {
    console.error(' Failed to initialize network data:', error);
  } finally {
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}

  private setupSubscriptions(): void {
  this.networkDataService.networkData$.subscribe({
    next: (data) => {
      console.log(' Received network data update:', data.length, 'items');
      this.networkData = data;
      this.updateStats();
      this.updateHeaderNetworkStatus();
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error(' Error in network data subscription:', error);
    }
  });
}

  onSubnetClick(subnetData: SubnetData) {
    this.showSubnetDetails(subnetData);
  }

  private async showSubnetDetails(subnetData: SubnetData) {
    if (this.activeView === 'graph') {
      this.pauseGraphSimulation();
    }

    if (this.devicePopup) {
      this.devicePopup.showLoadingPopup(subnetData.subnet);
    }

    try {
      const details = await this.networkDataService.getSubnetDetails(
        subnetData.subnet, 
        (message: string) => {
          if (this.devicePopup) {
            this.devicePopup.updateLoadingProgress(subnetData.subnet, message);
          }
        }
      );
      
      // Update the subnet data with devices and device count
      subnetData.devices = details.devices;
      subnetData.deviceCount = details.devices.length;
      subnetData.hasDetailedData = true;
      
      // Update the main network data array to reflect the new device count
      const currentData = this.networkData;
      const subnetIndex = currentData.findIndex(s => s.subnet === subnetData.subnet);
      if (subnetIndex !== -1) {
        currentData[subnetIndex] = subnetData;
        this.networkData = [...currentData]; // Trigger change detection
        this.updateStats(); // Recalculate stats
      }
      
      if (this.devicePopup) {
        this.devicePopup.showPopup(subnetData);
      }

    } catch (error) {
      console.error('Error loading subnet details:', error);
      if (this.devicePopup) {
        subnetData.devices = [];
        subnetData.deviceCount = 0;
        this.devicePopup.showPopup(subnetData);
      }
    }
  }

  private pauseGraphSimulation(): void {
    // Get reference to network graph component
    const networkGraphComponent = document.querySelector('app-network-graph');
    if (networkGraphComponent) {
      // Dispatch a custom event to pause simulation
      networkGraphComponent.dispatchEvent(new CustomEvent('pauseSimulation'));
    }
  }

  // Navigation methods using Angular Router
  navigateToDeviceTable(subnetData: SubnetData): void {
    this.deviceStateService.setSelectedSubnet(subnetData);
    this.router.navigate(['/devices', subnetData.subnet]);
  }

switchView(viewName: string) {
  console.log('Switching to view:', viewName);
  console.log('Current networkData length:', this.networkData.length);
  console.log('Current isLoading state:', this.isLoading);
  
  if (viewName !== 'treemap') {
    this.clearOrganizationState();
    this.clearAutomationState();
  }
  
  if (this.isRoutedPage) {
    this.router.navigate(['/'], { 
      queryParams: { view: viewName },
      replaceUrl: true
    }).then(() => {
      this.activeView = viewName;
      console.log('Navigation complete, activeView set to:', this.activeView);
    });
  } else {
    if (viewName !== 'treemap' && window.location.search.includes('organization')) {
      this.router.navigate(['/'], { 
        queryParams: { view: viewName },
        replaceUrl: true 
      });
    }
    this.activeView = viewName;
    console.log('View switched to:', this.activeView);
  }
}

private clearOrganizationState(): void {
  this.deviceStateService.clearSelectedOrganization();
  
  if (window.location.search.includes('organization')) {
    console.log('Clearing organization URL parameters');
    this.router.navigate(['/'], { 
      queryParams: {},
      replaceUrl: true 
    });
  }
}

private clearAutomationState(): void {
  sessionStorage.removeItem('automationTreemapData');
  
  if (window.location.search.includes('showAutomations')) {
    console.log('Clearing automation URL parameters');
    this.router.navigate(['/'], { 
      queryParams: {},
      replaceUrl: true 
    });
  }
}

  private updateStats(): void {
    if (!this.networkData || this.networkData.length === 0) {
      this.stats = { totalSubnets: 0, totalDevices: 0, highRiskSubnets: 0, avgRiskScore: 0 };
      return;
    }

    const totalSubnets = this.networkData.length;
    const totalDevices = this.networkData.reduce((sum, item) => sum + item.deviceCount, 0);
    const highRiskSubnets = this.networkData.filter(item => item.riskScore >= 6.5).length;
    const avgRiskScore = totalSubnets > 0 ? 
      this.networkData.reduce((sum, item) => sum + item.riskScore, 0) / totalSubnets : 0;

    this.stats = { totalSubnets, totalDevices, highRiskSubnets, avgRiskScore };
  }

  private updateHeaderNetworkStatus(): void {
    const avgRisk = this.stats.avgRiskScore;
    const highRiskPercentage = this.stats.totalSubnets > 0 ? 
      (this.stats.highRiskSubnets / this.stats.totalSubnets) * 100 : 0;
    
    let networkStatus;
    if (avgRisk >= 6.5 || highRiskPercentage >= 30) {
      networkStatus = 'high';
    } else if (avgRisk >= 4.0 || highRiskPercentage >= 15) {
      networkStatus = 'medium';
    } else {
      networkStatus = 'low';
    }
    
    this.networkStatus = networkStatus;
    
    this.removeHeaderStatusClasses();
    if (this.headerElement?.nativeElement) {
      this.headerElement.nativeElement.classList.add(`status-${networkStatus}`);
    }
  }

  private removeHeaderStatusClasses(): void {
    if (this.headerElement?.nativeElement) {
      this.headerElement.nativeElement.classList.remove('status-high', 'status-medium', 'status-low');
    }
  }

  get networkStatusClass(): string {
    return `status-${this.networkStatus}`;
  }

  get networkStatusDisplay(): string {
    const displays = { high: 'HIGH RISK', medium: 'MEDIUM RISK', low: 'LOW RISK' };
    return displays[this.networkStatus as keyof typeof displays] || 'UNKNOWN';
  }
}