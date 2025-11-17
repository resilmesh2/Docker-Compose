import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

export interface RiskComponent {
  id: number | string;
  name: string;
  type: string;
  icon: string;
  description: string;
  weight: number;
  maxValue: number;
  currentValue?: number;
  neo4jProperty: string;
  isComposite: boolean;
  compositeOf?: string[];
  statistics?: {
    avg: number;
    max: number;
    min: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RiskComponentsService {
  private componentsSubject = new BehaviorSubject<RiskComponent[]>([]);
  public components$ = this.componentsSubject.asObservable();

  constructor(private apiService: ApiService) {}

  async loadComponents(): Promise<RiskComponent[]> {
    try {
      console.log('Loading components from ISIM...');
      const response = await this.apiService.getNodeAttributes().toPromise();
      console.log('API response:', response);
      
      const stats = response.statistics || {};
      const discoveredProps = response.discoveredProperties || {};
      
      console.log(`Found ${Object.keys(discoveredProps).length} total properties in ISIM`);
      
      const components: RiskComponent[] = [];
      let componentId = 1;
      
      // Build components from all discovered properties
      Object.entries(discoveredProps).forEach(([propKey, propStats]: [string, any]) => {
        // Determine component type and details based on property name
        let componentType = 'custom';
        let icon = '🔧';
        let description = `ISIM property: ${propKey}`;
        
        if (propKey.includes('betweenness') || propKey.includes('Betweenness')) {
          componentType = 'centrality';
          icon = '🔗';
          description = propKey.includes('normalized') ? 'Normalized betweenness centrality' : 'Raw betweenness centrality';
        } else if (propKey.includes('degree') || propKey.includes('Degree')) {
          componentType = 'centrality';
          icon = '🌟';
          description = propKey.includes('normalized') ? 'Normalized degree centrality' : 'Raw degree centrality';
        } else if (propKey.includes('cvss') || propKey.includes('CVSS')) {
          componentType = 'vulnerability';
          icon = '🔓';
          description = 'CVSS vulnerability score';
        } else if (propKey.includes('threat') || propKey.includes('Threat')) {
          componentType = 'threat';
          icon = '⚠️';
          description = 'Threat detection score';
        } else if (propKey.includes('Risk') || propKey.includes('risk')) {
          componentType = 'composite';
          icon = '🚨';
          description = 'Risk assessment score';
        } else if (propKey.includes('criticality') || propKey.includes('Criticality')) {
          componentType = 'composite';
          icon = '🎯';
          description = 'System criticality score';
        }
        
        // Create readable name
        const readableName = propKey
          .replace(/([A-Z])/g, ' $1')
          .replace(/[-_]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');

        components.push({
          id: componentId++,
          name: readableName,
          type: componentType,
          icon: icon,
          description: description,
          weight: componentType === 'composite' ? 0.4 : 0.3,
          maxValue: propStats.max || 10,
          currentValue: propStats.avg || 0,
          neo4jProperty: propKey,
          isComposite: componentType === 'composite',
          statistics: {
            avg: propStats.avg,
            max: propStats.max,
            min: propStats.min
          }
        });
      });

      console.log(`Created ${components.length} components from discovered properties`);
      
      this.componentsSubject.next(components);
      return components;

    } catch (error) {
      console.error('Failed to load components:', error);
      console.error('Error details:', error);
      return this.getFallbackComponents();
    }
  }

  private getFallbackComponents(): RiskComponent[] {
    return [
      {
        id: 1,
        name: 'CVSS Score',
        type: 'vulnerability',
        icon: '🔓',
        description: 'Vulnerability severity score',
        weight: 0.4,
        maxValue: 10,
        currentValue: 0,
        neo4jProperty: 'cvss_score',
        isComposite: false
      },
      {
        id: 2,
        name: 'Threat Score',
        type: 'threat',
        icon: '⚠️',
        description: 'Threat detection score',
        weight: 0.3,
        neo4jProperty: 'threatScore',
        maxValue: 10,
        currentValue: 0,
        isComposite: false
      }
    ];
  }

  async initializeComponentsInNeo4j(): Promise<void> {
  try {
    const components = this.getFallbackComponents();
    
    for (const component of components) {
      const componentData = {
        componentName: component.name,
        neo4jProperty: component.neo4jProperty,
        formula: 'direct',
        method: 'setValue',
        components: [{
          name: component.name,
          neo4jProperty: component.neo4jProperty,
          weight: component.weight,
          maxValue: component.maxValue,
          currentValue: 0
        }],
        targetType: 'all',
        targetValues: [],
        calculationMode: 'setValue'
      };

      await this.apiService.writeCustomRiskComponent(componentData).toPromise();
      console.log(`Initialized ${component.name} with default value 0 in Neo4j`);
    }
  } catch (error) {
    console.error('Failed to initialize components in Neo4j:', error);
  }
}

  getComponents(): RiskComponent[] {
    return this.componentsSubject.value;
  }

  async writeCustomComponent(
    componentName: string,
    neo4jProperty: string,
    formula: string,
    method: string,
    components: RiskComponent[],
    targetType: string = 'all',
    targetValues: any[] = [],
    calculationMode: string = 'calculate'
  ): Promise<any> {
    try {
      const componentData = {
        componentName,
        neo4jProperty,
        formula,
        method,
        components: components.map(comp => ({
          name: comp.name,
          neo4jProperty: comp.neo4jProperty,
          weight: comp.weight,
          maxValue: comp.maxValue,
          currentValue: comp.currentValue || comp.statistics?.avg || 0
        })),
        targetType,
        targetValues,
        calculationMode,
        calculationDetails: this.getCalculationDetails(method, components)
      };

      const response = await this.apiService.writeCustomRiskComponent(componentData).toPromise();
      return response;
    } catch (error) {
      console.error('Failed to write custom component to ISIM:', error);
      throw error;
    }
  }

  private getCalculationDetails(method: string, components: RiskComponent[]): any {
    switch(method) {
      case 'weighted_avg':
        const totalWeight = components.reduce((sum, comp) => sum + comp.weight, 0);
        return {
          type: 'weighted_average',
          formula: components.map(comp => 
            `(${comp.neo4jProperty} * ${comp.weight})`
          ).join(' + ') + ` / ${totalWeight}`,
          totalWeight
        };
        
      case 'max':
        return {
          type: 'maximum',
          formula: `max([${components.map(comp => comp.neo4jProperty).join(', ')}])`
        };
        
      case 'sum':
        return {
          type: 'sum',
          formula: components.map(comp => comp.neo4jProperty).join(' + ')
        };
        
      case 'geometric_mean':
        const safeComponents = components.map(comp => 
          `CASE WHEN ${comp.neo4jProperty} IS NULL OR ${comp.neo4jProperty} <= 0 THEN 0.1 ELSE toFloat(${comp.neo4jProperty}) END`
        );
        return {
          type: 'geometric_mean',
          formula: `(${safeComponents.join(' * ')}) ^ (1.0/${components.length})`
        };
        
      case 'custom_formula':
        return {
          type: 'custom',
          formula: method // The custom formula string
        };
        
      default:
        return {
          type: 'weighted_average',
          formula: components.map(comp => 
            `(${comp.neo4jProperty} * ${comp.weight})`
          ).join(' + ') + ` / ${components.reduce((sum, comp) => sum + comp.weight, 0)}`
        };
    }
  }
}