import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ComponentConfigService, ComponentConfig, ComponentDataSource, ComponentSchedule } from '../../services/component-config.service';
import { environment } from '../../../environments/environment';

@Component({
 selector: 'app-component-configuration',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './component-configuration.component.html',
 styleUrls: ['./component-configuration.component.css']
})
export class ComponentConfigurationComponent implements OnInit {
 components: ComponentConfig[] = [];
 loading = false;
 
 // Modal state
 showConfigModal = false;
 showFrequencyModal = false;
 private frequencyResolve: ((value: string | null) => void) | null = null;
 selectedComponent: ComponentConfig | null = null;
 selectedMethod: string = 'manual';
 dataSource: ComponentDataSource = { type: 'manual' };
 schedule: ComponentSchedule = { frequency: 'manual', enabled: false };
 private timerInterval: any;
componentTimers: { [key: string]: { 
  startTime: number, 
  elapsed: number,
  nextRunTime?: number,
  frequency?: string
} } = {};
 
 // Custom component modal state
 showCustomComponentModal = false;
 customComponent = {
   name: '',
   maxValue: 10
 };

 showConfirmModal = false;
 confirmModalData: {
   title: string;
   message: string;
   confirmText: string;
   cancelText: string;
   onConfirm: () => void;
   onCancel: () => void;
 } = {
   title: '',
   message: '',
   confirmText: 'OK',
   cancelText: 'Cancel',
   onConfirm: () => {},
   onCancel: () => {}
 };

 testing = false;
 testResults: any = null;
 saving = false;
 isLoading = false;
 apiUrl = environment.riskApiUrl;

 notifications: Array<{
 id: number;
 type: 'success' | 'info' | 'warning' | 'error';
 title: string;
 message: string;
 timestamp: number;
}> = [];

private notificationId = 0;
 
 methods = [
   { id: 'manual', name: 'Manual Input', description: 'Manually set scores for each node' },
   { id: 'database', name: 'Database Query', description: 'Pull scores from external database' },
   { id: 'api', name: 'API Integration', description: 'Fetch from external API endpoint' },
   { id: 'file', name: 'File Upload', description: 'Import scores from spreadsheet' },
   { id: 'script', name: 'Custom Script', description: 'Write custom calculation logic' }
 ];

updateFrequencies = [
  { value: 'manual', label: 'Manual Only' },
  // { value: 'minute', label: 'Every Minute (Testing)' },
  { value: 'hourly', label: 'Every Hour' },
  { value: 'daily', label: 'Once Daily' },
  { value: 'weekly', label: 'Once Weekly' },
  { value: 'monthly', label: 'Once Monthly' }
];

 constructor(private componentConfigService: ComponentConfigService,
             private http: HttpClient
 ) { }

 ngOnInit(): void {
  this.loadComponents();
  this.startGlobalTimer();
}

 ngOnDestroy() {
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
  }
}

 // Replace the existing configureComponent method
configureComponent(component: ComponentConfig): void {
  this.selectedComponent = component;
  
  // If component has an active schedule, show current frequency
  if (component.hasSchedule && component.schedule) {
    this.schedule.frequency = component.schedule.frequency;
  } else {
    this.schedule.frequency = 'manual';
  }
  
  this.askUpdateFrequency().then(frequency => {
    if (frequency) {
      this.saveComponentFrequency(frequency);
    }
  });
}

private askUpdateFrequency(): Promise<string | null> {
  return new Promise((resolve) => {
    this.schedule.frequency = this.selectedComponent?.schedule?.frequency || 'manual';
    this.frequencyResolve = resolve;
    this.showFrequencyModal = true;
  });
}

confirmFrequency(): void {
  if (this.frequencyResolve) {
    this.frequencyResolve(this.schedule.frequency);
    this.frequencyResolve = null;
  }
  this.showFrequencyModal = false;
}

cancelFrequencyModal(): void {
  if (this.frequencyResolve) {
    this.frequencyResolve(null);
    this.frequencyResolve = null;
  }
  this.showFrequencyModal = false;
}

setFrequency(value: string): void {
  this.schedule.frequency = value as 'manual' | 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';
}

private saveComponentFrequency(frequency: string): void {
  if (!this.selectedComponent) return;
  
  const componentIdentifier = this.selectedComponent.neo4jProperty || 
                             this.selectedComponent.id.toString();
  
  const validFrequency = frequency as 'manual' | 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  
  const configUpdate = {
    component_name: this.selectedComponent.name,
    neo4j_property: this.selectedComponent.neo4jProperty,
    update_frequency: frequency,
    enabled: frequency !== 'manual',
    target_property: this.selectedComponent.neo4jProperty || componentIdentifier
  };
  
  // Check if we're updating an existing schedule or creating a new one
  const hasExistingSchedule = this.selectedComponent.hasSchedule;
  
  this.http.put(`${environment.riskApiUrl}/components/custom/${componentIdentifier}/config`, configUpdate)
    .subscribe({
      next: (response) => {
        if (this.selectedComponent) {
          this.selectedComponent.schedule = {
            frequency: validFrequency,
            enabled: frequency !== 'manual'
          };
        }
        
        if (frequency !== 'manual') {
          const scheduleConfig = {
            component_id: componentIdentifier,
            component_name: this.selectedComponent?.name,
            neo4j_property: this.selectedComponent?.neo4jProperty,
            update_frequency: frequency,
            calculation_method: this.selectedComponent?.calculationMethod || 'query_result',
            target_property: this.selectedComponent?.neo4jProperty || componentIdentifier
          };
          
          // If schedule exists, update it; otherwise create new
          const endpoint = hasExistingSchedule 
            ? `${environment.riskApiUrl}/components/schedule/update/${componentIdentifier}`
            : `${environment.riskApiUrl}/components/schedule/start`;
          
          const method = hasExistingSchedule ? 'put' : 'post';
          
          this.http[method](endpoint, scheduleConfig)
            .subscribe({
              next: () => {
                const action = hasExistingSchedule ? 'Updated' : 'Created';
                this.showSuccess(`Temporal Schedule ${action}`, 
                  `${this.selectedComponent?.name} will run ${frequency} on Temporal`);
                this.selectedComponent = null;
                this.loadComponents(); // Reload to get fresh timer data
              },
              error: (error) => {
                this.showWarning('Schedule Warning', 
                  `Frequency saved but Temporal schedule ${hasExistingSchedule ? 'update' : 'creation'} failed: ${error.error?.message || 'Unknown error'}`);
                this.selectedComponent = null;
              }
            });
        } else {
          // If set to manual, delete the schedule
          if (hasExistingSchedule) {
            this.http.delete(`${environment.riskApiUrl}/components/schedule/delete/${componentIdentifier}`)
              .subscribe({
                next: () => {
                  this.showSuccess('Schedule Removed', 
                    `${this.selectedComponent?.name} set to manual execution only`);
                  this.selectedComponent = null;
                  this.loadComponents();
                },
                error: (error) => {
                  this.showWarning('Delete Warning', 
                    `Set to manual but failed to delete Temporal schedule: ${error.error?.message || 'Unknown error'}`);
                  this.selectedComponent = null;
                  this.loadComponents();
                }
              });
          } else {
            this.showSuccess('Schedule Updated', 
              `${this.selectedComponent?.name} set to manual execution only`);
            this.selectedComponent = null;
          }
        }
      },
      error: (error) => {
        this.showError('Update Failed', error.error?.message || 'Failed to update schedule');
        this.selectedComponent = null;
      }
    });
}

toggleComponentAutomation(component: ComponentConfig): void {
  const componentIdentifier = component.neo4jProperty || component.id.toString();
  const newEnabledState = !component.schedule?.enabled;
  
  if (newEnabledState) {
    const scheduleConfig = {
      component_id: componentIdentifier,
      component_name: component.name,
      neo4j_property: component.neo4jProperty,
      update_frequency: component.schedule?.frequency || 'hourly',
      calculation_method: component.calculationMethod,
      target_property: component.neo4jProperty || componentIdentifier
    };
    
    this.http.post(`${environment.riskApiUrl}/risk/components/schedule/resume`, scheduleConfig)
      .subscribe({
        next: (response: any) => {
          if (component.schedule) {
            component.schedule.enabled = true;
          } else {
            component.schedule = {
              frequency: scheduleConfig.update_frequency as any,
              enabled: true
            };
          }
          this.initializeComponentTimer(component);
          this.showSuccess('Temporal Schedule Resumed', 
            `${component.name} automation resumed on Temporal`);
        },
        error: (error) => {
          this.showError('Resume Failed', error.error?.message || 'Failed to resume Temporal schedule');
        }
      });
  } else {
    this.http.post(`${environment.riskApiUrl}/risk/components/schedule/pause`, {
      component_id: componentIdentifier
    })
      .subscribe({
        next: (response) => {
          if (component.schedule) {
            component.schedule.enabled = false;
          }
          const timerId = component.neo4jProperty || component.id.toString();
          delete this.componentTimers[timerId];
          this.showSuccess('Temporal Schedule Paused', 
            `${component.name} automation paused on Temporal`);
        },
        error: (error) => {
          this.showError('Pause Failed', error.error?.message || 'Failed to pause Temporal schedule');
        }
      });
  }
}

getAutomationStatus(component: ComponentConfig): string {
  return component.schedule?.enabled ? 'active' : 'paused';
}

getToggleButtonText(component: ComponentConfig): string {
  return component.schedule?.enabled ? 'Pause' : 'Resume';
}

getToggleButtonClass(component: ComponentConfig): string {
  return component.schedule?.enabled ? 'btn-warning' : 'btn-success';
}

loadComponents(): void {
  this.isLoading = true;
  this.http.get<any>(`${this.apiUrl}/components/available`).subscribe({
    next: async (response) => {
      this.components = response.available_components.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        type: comp.type,
        description: comp.description,
        maxValue: comp.maxValue,
        currentValue: comp.currentValue,
        neo4jProperty: comp.neo4jProperty,
        icon: comp.icon,
        weight: comp.weight,
        isConfigured: comp.isConfigured || false,
        calculationMethod: comp.calculationMethod,
        updateFrequency: 'manual',
        enabled: false,
        hasSchedule: false,
        temporalRunning: false,
        schedule: {
          frequency: 'manual',
          enabled: false
        }
      }));

      for (const component of this.components) {
        const propToCheck = component.neo4jProperty;
        
        if (!propToCheck) {
          console.warn(`Component ${component.name} has no neo4jProperty, skipping status check`);
          continue;
        }
        
        try {
          const statusResponse = await this.http.get<any>(
            `${environment.riskApiUrl}/components/schedule/status/${propToCheck}`
          ).toPromise();

          if (statusResponse?.success && statusResponse?.exists) {
            component.hasSchedule = true;
            component.temporalRunning = statusResponse.running;
            component.enabled = statusResponse.running;
            component.isConfigured = true;
            
            component.schedule = {
              frequency: statusResponse.frequency || 'hourly',
              enabled: statusResponse.running
            };
            
            if (statusResponse.running && statusResponse.next_run) {
              try {
                const nextRun = new Date(statusResponse.next_run).getTime();
                this.initializeComponentCountdown(component, nextRun, statusResponse.frequency);
              } catch (e) {
                console.error(`Error initializing countdown for ${propToCheck}:`, e);
              }
            }
            
            console.log(`✅ ${propToCheck} - Schedule detected: running=${statusResponse.running}, frequency=${statusResponse.frequency}`);
          } else {
            component.hasSchedule = false;
            component.temporalRunning = false;
            component.enabled = false;
            console.log(`ℹ️  ${propToCheck} - No active schedule`);
          }
        } catch (error: any) {
          component.hasSchedule = false;
          component.temporalRunning = false;
          component.enabled = false;
          
          if (error.status === 404 || (error.error && !error.error.exists)) {
            console.log(`ℹ️  ${propToCheck} - No schedule found (expected for new components)`);
          } else {
            console.error(`❌ Error checking schedule status for ${propToCheck}:`, error);
          }
        }
      }

      this.isLoading = false;
      console.log('Components loaded with Temporal status:', this.components);
    },
    error: (error) => {
      console.error('Error loading components:', error);
      this.isLoading = false;
      this.showError('Load Failed', 'Failed to load components');
    }
  });
}

 copyComponentId(component: ComponentConfig): void {
   const identifier = component.neo4jProperty || 
                   component.name?.toLowerCase().replace(/\s+/g, '_') || 
                   component.id.toString();
   
   navigator.clipboard.writeText(identifier).then(() => {
     this.showSuccess('Copied!', `Component ID "${identifier}" copied to clipboard`);
   }).catch(err => {
     console.error('Failed to copy:', err);
   });
 }

 private applyAutomationFromConfig(component: ComponentConfig, automation: any): void {
  this.showInfo('Auto-Configuring', `Applying configuration for ${component.name}...`);
  
  const config = {
    calculationMethod: automation.calculation_method || 'query_result',
    dataSource: automation.data_source || { type: 'manual' },
    schedule: {
      frequency: automation.update_frequency || 'manual',
      enabled: automation.enabled || false,
      time: automation.schedule_time
    },
    isConfigured: true
  };
  
  component.calculationMethod = config.calculationMethod;
  component.dataSource = config.dataSource;
  component.schedule = config.schedule;
  component.isConfigured = true;
  
  if (automation.data_source?.type === 'neo4j_query' && automation.data_source?.query) {
    this.executeQueryAndUpdateNeo4j(component, automation);
  } else if (automation.data_source?.type === 'static_value') {
    const value = automation.data_source.value || 0;
    this.updateNeo4jProperty(component, value);
  } else {
    this.showSuccess('Configuration Applied', 
      `${component.name} has been configured successfully!`);
  }
  
  this.componentConfigService.saveComponentConfiguration(component.id, config).subscribe({
  next: () => {
    console.log('Configuration saved');
    this.initializeComponentTimer(component);
  },
  error: (error) => {
    console.error('Failed to save configuration:', error);
  }
});
}

 private executeQueryAndUpdateNeo4j(component: ComponentConfig, automation: any): void {
  const componentIdentifier = component.neo4jProperty || 
                             component.name?.toLowerCase().replace(/\s+/g, '_') || 
                             component.id.toString();
  
  this.http.post(`${environment.riskApiUrl}/components/custom/${componentIdentifier}/execute`, {
    query: automation.data_source.query,
    update_neo4j: true,
    target_property: automation.target_property || componentIdentifier
  }).subscribe({
    next: (result: any) => {
      if (result.value !== undefined) {
        component.currentValue = result.value;
        this.showSuccess('Query Executed & Neo4j Updated', 
          `${component.name} value updated to: ${result.value} and written to Neo4j`);
      }
    },
    error: (error) => {
      if (error.error?.user_action_required) {
        this.showError('Configuration Required', 
          error.error.message || 'Please edit the query in component_automation_config.yaml file');
      } else if (error.error?.blocked_keyword) {
        this.showError('Query Blocked', 
          `${error.error.message}\nBlocked keyword: ${error.error.blocked_keyword}`);
      } else if (error.error?.hint) {
        this.showError('Query Error', 
          `${error.error.message}\nHint: ${error.error.hint}`);
      } else {
        this.showError('Query Failed', 
          error.error?.message || `Failed to execute query: ${error.message}`);
      }
    }
  });
}

private updateNeo4jProperty(component: ComponentConfig, value: number): void {
  const componentIdentifier = component.neo4jProperty || 
                             component.name?.toLowerCase().replace(/\s+/g, '_') || 
                             component.id.toString();
  
  this.http.post(`${environment.riskApiUrl}/components/neo4j/update`, {
    property: componentIdentifier,
    value: value
  }).subscribe({
    next: () => {
      component.currentValue = value;
      this.showSuccess('Neo4j Updated', 
        `${component.name} value set to ${value} in Neo4j`);
    },
    error: (error) => {
      this.showError('Update Failed', `Failed to update Neo4j: ${error.message}`);
    }
  });
}

 private executeQueryForComponent(component: ComponentConfig, query: string): void {
  const componentIdentifier = component.neo4jProperty || 
                             component.name?.toLowerCase().replace(/\s+/g, '_') || 
                             component.id.toString();

  this.http.post(`${environment.riskApiUrl}/components/custom/${componentIdentifier}/execute`, {
    query: query,
    update_neo4j: true,
    target_property: component.neo4jProperty || componentIdentifier
  }).subscribe({
    next: (result: any) => {
      if (result.value !== undefined) {
        component.currentValue = result.value;
        this.showSuccess('Query Executed & Neo4j Updated', 
          `${component.name} value updated to: ${result.value} and written to Neo4j`);
      }
    },
    error: (error) => {
      if (error.error?.user_action_required) {
        this.showError('Configuration Required', 
          error.error.message || 'Please edit the query in component_automation_config.yaml file');
      } else if (error.error?.blocked_keyword) {
        this.showError('Query Blocked', 
          `${error.error.message}\nBlocked keyword: ${error.error.blocked_keyword}`);
      } else if (error.error?.hint) {
        this.showError('Query Error', 
          `${error.error.message}\nHint: ${error.error.hint}`);
      } else {
        this.showError('Query Failed', 
          error.error?.message || `Failed to execute query: ${error.message}`);
      }
    }
  });
}

private openManualConfigModal(component: ComponentConfig): void {
  this.selectedComponent = component;
  this.selectedMethod = component.calculationMethod || 'manual';
  // Remove dataSource initialization
  this.schedule = component.schedule || { 
    frequency: 'manual', 
    enabled: false 
  };
  this.showConfigModal = true;
  this.testResults = null;
}

private applyComponentConfiguration(component: ComponentConfig, configData: any): void {
  this.showInfo('Applying Configuration', `Configuring ${component.name} automatically...`);
  
  const automation = configData.automation;
  
  if (!automation) {
    this.openManualConfigModal(component);
    return;
  }
  
  // Apply only update frequency configuration
  component.schedule = {
    frequency: automation.update_frequency || 'manual',
    enabled: automation.enabled || false
  };
  
  component.calculationMethod = automation.calculation_method || 'query_result';
  component.neo4jProperty = automation.neo4j_property || automation.target_property;
  
  this.showSuccess('Configuration Applied', 
    `${component.name} configured with ${automation.update_frequency} updates`);
}

// Update save configuration method
async saveComponentConfig(component: any): Promise<void> {
  const payload = {
    component_name: component.name,
    component_id: component.neo4jProperty,
    neo4j_property: component.neo4jProperty,
    update_frequency: component.updateFrequency,
    enabled: component.enabled,
    target_property: component.neo4jProperty
  };

  this.http.put(`${this.apiUrl}/components/custom/${component.neo4jProperty}/config`, payload)
    .subscribe({
      next: async (response: any) => {
        // If schedule frequency changed, update Temporal schedule
        if (component.updateFrequency !== 'manual' && component.hasSchedule) {
          try {
            await this.http.put(
              `${this.apiUrl}/components/schedule/update/${component.neo4jProperty}`,
              { update_frequency: component.updateFrequency }
            ).toPromise();
            
            console.log('Temporal schedule updated');
          } catch (error) {
            console.error('Failed to update Temporal schedule:', error);
          }
        }
        
        this.loadComponents();
      },
      error: (error) => {
        console.error('Error saving component config:', error);
      }
    });
}

 closeConfigModal(): void {
   this.showConfigModal = false;
   this.selectedComponent = null;
   this.testResults = null;
 }

 onMethodChange(): void {
   this.dataSource.type = this.selectedMethod as any;
   this.testResults = null;
 }

 private showConfirm(title: string, message: string, confirmText: string = 'OK', cancelText: string = 'Cancel'): Promise<boolean> {
   return new Promise((resolve) => {
     this.confirmModalData = {
       title,
       message,
       confirmText,
       cancelText,
       onConfirm: () => {
         this.closeConfirmModal();
         resolve(true);
       },
       onCancel: () => {
         this.closeConfirmModal();
         resolve(false);
       }
     };
     this.showConfirmModal = true;
   });
 }

 closeConfirmModal() {
   this.showConfirmModal = false;
 }

 testConfiguration(): void {
   if (!this.selectedComponent) return;
   
   this.testing = true;
   this.testResults = null;

   const testConfig = {
     calculationMethod: this.selectedMethod,
     dataSource: this.dataSource,
     schedule: this.schedule
   };

   this.componentConfigService.testComponentConfiguration(this.selectedComponent.id, testConfig).subscribe({
     next: (results) => {
       this.testResults = results;
       this.testing = false;
     },
     error: (error) => {
       console.error('Test failed:', error);
       this.testResults = { error: error.message || 'Test failed' };
       this.testing = false;
     }
   });
 }

 saveConfiguration(): void {
   if (!this.selectedComponent) return;
   
   this.saving = true;

   const config = {
     calculationMethod: this.selectedMethod,
     dataSource: this.dataSource,
     schedule: this.schedule,
     isConfigured: true
   };

   this.componentConfigService.saveComponentConfiguration(this.selectedComponent.id, config).subscribe({
     next: () => {
       this.saving = false;
       this.closeConfigModal();
       this.loadComponents();
     },
     error: (error) => {
       console.error('Save failed:', error);
       this.saving = false;
     }
   });
 }

 executeNow(): void {
   if (!this.selectedComponent) return;

   this.componentConfigService.executeComponentCalculation(this.selectedComponent.id).subscribe({
     next: (result) => {
       console.log('Execution started:', result);
       this.showSuccess('Execution Started', 'Component calculation started successfully!');
     },
     error: (error) => {
       console.error('Execution failed:', error);
       this.showError('Execution Failed', 'Failed to start component calculation: ' + error.message);
     }
   });
 }

 async deleteComponent(component: ComponentConfig): Promise<void> {
   const confirmed = await this.showConfirm(
     'Delete Component',
     `Are you sure you want to delete "${component.name}"?\n\nThis will:\n• Remove the component from configuration\n• Delete the "${component.neo4jProperty}" property from all nodes in Neo4j\n\nThis action cannot be undone.`,
     'Delete Component',
     'Cancel'
   );
   
   if (!confirmed) return;

   console.log('Deleting component:', component.id, component.name);

   this.componentConfigService.deleteCustomComponent(component.id).subscribe({
     next: (response) => {
       console.log('Delete response:', response);
       
       let message = `"${component.name}" has been deleted successfully`;
       if (response.neo4jDeletion && response.neo4jDeletion.nodesUpdated) {
         message += `\n\nRemoved from ${response.neo4jDeletion.nodesUpdated} nodes in Neo4j`;
       }
       if (response.warning) {
         message += `\n\nWarning: ${response.warning}`;
       }
       
       this.showSuccess('Component Deleted', message);
       this.loadComponents();
     },
     error: (error) => {
       console.error('Error deleting component:', error);
       this.showError('Delete Failed', 'Failed to delete component: ' + error.message);
     }
   });
 }

 private startGlobalTimer(): void {
  if (this.timerInterval) {
    clearInterval(this.timerInterval);
  }
  
  this.timerInterval = setInterval(() => {
    this.components.forEach(component => {
      if (component.schedule?.enabled && component.schedule?.frequency !== 'manual') {
        const timerId = component.neo4jProperty || component.id.toString();
        
        if (this.componentTimers[timerId] && this.componentTimers[timerId].nextRunTime) {
          // Calculate time remaining until next run
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((this.componentTimers[timerId].nextRunTime! - now) / 1000));
          this.componentTimers[timerId].elapsed = remaining;
          
          // If countdown reaches zero, refresh to get new next run time
          if (remaining === 0) {
            setTimeout(() => this.loadComponents(), 2000);
          }
        } else {
          // Fallback to elapsed time if no next run time
          if (!this.componentTimers[timerId]) {
            this.componentTimers[timerId] = {
              startTime: Date.now(),
              elapsed: 0
            };
          }
          this.componentTimers[timerId].elapsed = Math.floor((Date.now() - this.componentTimers[timerId].startTime) / 1000);
        }
      }
    });
  }, 1000);
}

initializeComponentTimer(component: ComponentConfig): void {
  const timerId = component.neo4jProperty || component.id.toString();
  
  if (!this.componentTimers[timerId]) {
    this.componentTimers[timerId] = {
      startTime: Date.now(),
      elapsed: 0
    };
  }
}

initializeComponentCountdown(component: ComponentConfig, nextRunTime: number, frequency: string): void {
  const timerId = component.neo4jProperty || component.id.toString();
  
  this.componentTimers[timerId] = {
    startTime: Date.now(),
    elapsed: 0,
    nextRunTime: nextRunTime,
    frequency: frequency
  };
}

 getTimerDisplay(component: ComponentConfig): string {
  const timerId = component.neo4jProperty || component.id.toString();
  const timer = this.componentTimers[timerId];
  
  if (!timer || !component.schedule?.enabled || component.schedule?.frequency === 'manual') {
    return '--:--';
  }
  
  const seconds = timer.elapsed;
  
  if (seconds === 0) return '00:00';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  // Show countdown format based on time remaining
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

getStatusBadgeClass(component: ComponentConfig): string {
  // Check Temporal status first
  if (component.hasSchedule && component.temporalRunning) {
    return 'badge-active';
  }
  if (component.hasSchedule && !component.temporalRunning) {
    return 'badge-paused';
  }
  if (component.schedule?.enabled && component.schedule?.frequency !== 'manual') {
    return 'badge-active';
  }
  if (component.schedule?.frequency !== 'manual' && !component.schedule?.enabled) {
    return 'badge-paused';
  }
  if (component.isConfigured) return 'badge-success';
  if (component.currentValue === 0) return 'badge-warning';
  return 'badge-secondary';
}

getStatusText(component: ComponentConfig): string {
  // Check Temporal status first
  if (component.hasSchedule && component.temporalRunning) {
    return 'Active';
  }
  if (component.hasSchedule && !component.temporalRunning) {
    return 'Paused';
  }
  if (component.schedule?.enabled && component.schedule?.frequency !== 'manual') {
    return 'Active';
  }
  if (component.schedule?.frequency !== 'manual' && !component.schedule?.enabled) {
    return 'Paused';
  }
  if (component.isConfigured) return 'Configured';
  if (component.currentValue === 0) return 'Needs Configuration';
  return 'Ready';
}

 addCustomComponent() {
  this.customComponent = {
    name: '',
    maxValue: 10
  };
  this.showCustomComponentModal = true;
}

 closeCustomComponentModal() {
  this.showCustomComponentModal = false;
  this.customComponent = {
    name: '',
    maxValue: 10
  };
}

 async saveCustomComponent() {
  if (!this.customComponent.name.trim()) {
    this.showWarning('Validation Error', 'Please enter a component name');
    return;
  }
  
  if (this.customComponent.maxValue < 1 || this.customComponent.maxValue > 10) {
    this.showWarning('Validation Error', 'Max value must be between 1 and 10');
    return;
  }
  
  const componentId = this.customComponent.name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  const componentData = {
    name: this.customComponent.name,
    type: 'custom',
    maxValue: this.customComponent.maxValue,
    description: 'Custom component for risk assessment',
    neo4jProperty: componentId,
    identifier: componentId
  };
  
  this.componentConfigService.saveCustomComponent(componentData).subscribe({
    next: async (response) => {
      try {
        await this.writeComponentToNeo4j(componentData);
        this.showSuccess('Component Created', 
          `${this.customComponent.name} created with ID: ${componentId} and added to Neo4j`);
      } catch (error) {
        this.showWarning('Component Created', 
          `${this.customComponent.name} created but Neo4j update failed`);
      }
      
      this.closeCustomComponentModal();
      this.loadComponents();
    },
    error: (error) => {
      console.error('Failed to save component:', error);
      this.showError('Save Failed', 'Failed to create custom component');
    }
  });
}

 private async writeComponentToNeo4j(component: any): Promise<any> {
   const componentData = {
     componentName: component.name,
     neo4jProperty: component.neo4jProperty,
     formula: 'setValue',
     method: 'setValue',
     components: [{
       name: component.name,
       neo4jProperty: component.neo4jProperty,
       weight: 0.2,
       maxValue: component.maxValue,
       //currentValue: 0
     }],
     targetType: 'all',
     targetValues: [],
     calculationMode: 'setValue'
   };

   return await this.http.post(`${environment.apiUrl}/write-custom-risk-component`, componentData).toPromise();
 }

 getCategoryIcon(category: string): string {
  return '🔧';
}

getAutoDescription(): string {
  return 'Custom component for risk assessment';
}

 private showNotification(type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) {
   const notification = {
     id: ++this.notificationId,
     type,
     title,
     message,
     timestamp: Date.now()
   };
   
   this.notifications.push(notification);
   
   const dismissTime = type === 'error' ? 8000 : 5000;
   setTimeout(() => {
     this.dismissNotification(notification.id);
   }, dismissTime);
 }

 private showSuccess(title: string, message: string) {
   this.showNotification('success', title, message);
 }

 private showError(title: string, message: string) {
   this.showNotification('error', title, message);
 }

 private showWarning(title: string, message: string): void {
  const notification = {
    id: this.notificationId++,
    type: 'warning' as const,
    title,
    message,
    timestamp: Date.now()
  };
  this.notifications.push(notification);
  setTimeout(() => this.dismissNotification(notification.id), 6000);
}

 private showInfo(title: string, message: string) {
   this.showNotification('info', title, message);
 }

 dismissNotification(id: number) {
   this.notifications = this.notifications.filter(n => n.id !== id);
 }

 getNotificationIcon(type: string): string {
   switch(type) {
     case 'success': return '✅';
     case 'error': return '❌';
     case 'warning': return '⚠️';
     case 'info': return 'ℹ️';
     default: return 'ℹ️';
   }
 }
}