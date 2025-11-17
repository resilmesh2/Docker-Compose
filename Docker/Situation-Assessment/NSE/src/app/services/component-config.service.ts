import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ComponentConfig {
  id: number;
  name: string;
  description: string;
  type: string;
  neo4jProperty: string;
  maxValue: number;
  currentValue: number;
  isConfigured?: boolean;
  calculationMethod?: string;
  dataSource?: ComponentDataSource;
  schedule?: ComponentSchedule;

  updateFrequency?: 'manual' | 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  enabled?: boolean;
  hasSchedule?: boolean;
  temporalRunning?: boolean;
  
  // Legacy properties (for backward compatibility)
  isLoading?: boolean;
  apiUrl?: string;

}

export interface ComponentDataSource {
  type: 'manual' | 'database' | 'api' | 'file' | 'script';
  connectionString?: string;
  query?: string;
  apiUrl?: string;
  headers?: { [key: string]: string };
  mapping?: { [key: string]: any };
  scriptContent?: string;
}

export interface ComponentSchedule {
  frequency: 'manual' | 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  time?: string;
  enabled: boolean;
}

export interface ComponentAutomation {
  componentName: string;
  componentId: string;
  dataSource: {
    type: 'neo4j_query' | 'wazuh_alerts' | 'static_value' | 'calculation';
    query?: string;
    value?: number;
  };
  updateFrequency: 'manual' | 'minute' | 'hourly' | 'daily' | 'weekly';
  calculationMethod: string;
  durationHours?: number;
  customQuery?: string;
  targetProperty?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComponentConfigService {
  private apiUrl = environment.riskApiUrl;
  private nodeApiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getAvailableComponents(): Observable<{available_components: ComponentConfig[]}> {
    return this.http.get<{available_components: ComponentConfig[]}>(`${this.apiUrl}/components/available`);
  }

  saveComponentConfiguration(componentId: number, config: Partial<ComponentConfig>): Observable<any> {
    return this.http.put(`${this.apiUrl}/components/custom/${componentId}/config`, config);
  }

  testComponentConfiguration(componentId: number, config: Partial<ComponentConfig>): Observable<any> {
    return this.http.post(`${this.apiUrl}/components/custom/${componentId}/test`, config);
  }

  deleteCustomComponent(componentId: number): Observable<any> {
    return this.http.delete(`${this.nodeApiUrl}/risk/components/custom/${componentId}`);
  }

  executeComponentCalculation(componentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/components/custom/${componentId}/execute`, {});
  }

  saveCustomComponent(component: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/risk/components/custom`, component);
  }

  saveComponentAutomation(automation: ComponentAutomation): Observable<any> {
    return this.http.post(`${this.apiUrl}/components/automation/save`, automation);
  }

  getActiveComponentAutomations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/components/automation/active`);
  }

  testComponentQuery(query: string, sourceType: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/components/automation/test`, {
      query,
      sourceType
    });
  }

  getComponentAutomationConfig(componentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/components/automation/${componentId}`);
  }

  applyAutomationConfig(componentId: number, automationId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/components/${componentId}/apply-automation`, {
      automation_id: automationId
    });
  }

  getAvailableAutomations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/components/automations/list`);
  }
}