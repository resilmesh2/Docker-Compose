import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RiskComponent } from './risk-components.service';

export interface RiskFormula {
  id: string;
  name: string;
  description: string;
  components: { [key: string]: number };
  created_by: string;
  created_date: string;
  type: 'predefined' | 'custom';
}

export interface CreateFormulaRequest {
  name: string;
  description: string;
  components: { [key: string]: number };
  created_by?: string;
}

export interface ComponentData {
  name: string;
  weight: number;
  currentValue: number;
  maxValue: number;
  neo4jProperty?: string;
}

export interface RiskConfigurationRequest {
  formulaName: string;
  components: ComponentData[];
  targetType: string;
  targetValues: string[];
  calculationMode: string;
  calculationMethod?: string;
  customFormula?: string;
  updateFrequency: string;
  targetProperty: string;
}

export interface ConfigurationResponse {
  success: boolean;
  nodesUpdated: number;
  avgRiskScore: number;
  automationEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RiskConfigService {
  private baseUrl = 'http://localhost:3002/api/risk';
  private POSTbaseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // Formula methods
  getPredefinedFormulas(): Observable<{ formulas: RiskFormula[] }> {
    return this.http.get<{ formulas: RiskFormula[] }>(`${this.baseUrl}/formulas/predefined`);
  }

  getCustomFormulas(): Observable<{ formulas: RiskFormula[] }> {
    return this.http.get<{ formulas: RiskFormula[] }>(`${this.baseUrl}/formulas/custom`);
  }

  createCustomFormula(formula: CreateFormulaRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/formulas/custom`, formula);
  }

  getActiveFormula(): Observable<{ active_formula: RiskFormula }> {
    return this.http.get<{ active_formula: RiskFormula }>(`${this.baseUrl}/formulas/active`);
  }

  setActiveFormula(formulaId: string, type: 'predefined' | 'custom'): Observable<any> {
    return this.http.put(`${this.baseUrl}/formulas/active`, {
      formula_id: formulaId,
      type: type
    });
  }

  deleteCustomFormula(formulaId: string): Observable<any> {
    const url = `${this.baseUrl}/formulas/custom/${formulaId}`;
    return this.http.delete(url, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  deleteCustomComponent(componentId: string): Observable<any> {
  return this.http.delete(`${this.baseUrl}/components/custom/${componentId}`);
}

getCustomComponents(): Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/components/custom`);
}

  validateFormula(components: { [key: string]: number }): { valid: boolean; error?: string } {
    const total = Object.values(components).reduce((sum, weight) => sum + weight, 0);
    
    if (Math.abs(total - 1.0) > 0.01) {
      return { 
        valid: false, 
        error: `Component weights must sum to 1.0, currently sum to ${total.toFixed(3)}` 
      };
    }
    
    return { valid: true };
  }

  // Component methods using existing interface
  getAvailableComponents(): Observable<{ available_components: RiskComponent[] }> {
    return this.http.get<{ available_components: RiskComponent[] }>(`${this.baseUrl}/components/available`);
  }

  saveCustomComponent(component: RiskComponent): Observable<any> {
    return this.http.post<any>(`${this.POSTbaseUrl}/risk/components/custom`, component);
  }

  updateComponents(components: RiskComponent[]): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/components/available`, {
      available_components: components
    });
  }

  applyRiskConfiguration(config: RiskConfigurationRequest): Observable<ConfigurationResponse> {
    return this.http.post<ConfigurationResponse>(
      `${this.POSTbaseUrl}/risk/apply-configuration`, 
      config
    );
  }
}