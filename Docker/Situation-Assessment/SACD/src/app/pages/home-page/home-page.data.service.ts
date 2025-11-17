import { Injectable, signal } from "@angular/core";
import { Apollo, QueryRef } from "apollo-angular";
import { Subscription } from "rxjs";
import { Subnet } from "../../models/vulnerability.model";
import { QUERIES } from "./home-page.data.queries";


@Injectable({
  providedIn: 'root',
})
export class HomePageDataService {
    queries: { [key: string]: QueryRef<any> } = {};
    querySubscriptions: Subscription[] = [];

    subnets = signal(<Subnet[]>([]));
    orgUnits = signal(<{name: string}[]>([]));
    ipCount = signal(0);
    csaNodesCount = signal(0);
    missionsCount = signal(0);

    vulnerabilityChartData = signal<{name: string, value: number}[]>([]);
    osChartData = signal<{name: string, value: number}[]>([]);

    constructor(private apollo: Apollo) {
        Object.entries(QUERIES).map(([key, queryGQL]) => {
            const query = this.apollo.watchQuery<any>({
                query: queryGQL,
                pollInterval: 500,
            });
            this.queries[key] = query;
        });
    }

    refreshData() {
        Object.values(this.queries).forEach(query => query.refetch());
    }
    
    unscubscribeAll() {
        this.querySubscriptions.forEach(sub => sub.unsubscribe());
    }    

    fetchData() {
        this.querySubscriptions.push(this.queries['GET_SUBNETS']
            .valueChanges
            .subscribe(({ data, loading }) => {
                this.subnets.set(data.subnets);
            }));

        this.querySubscriptions.push(this.queries['GET_ORG_UNITS']
            .valueChanges
            .subscribe(({ data, loading }) => {
                this.orgUnits.set(data.organizationUnits);
            }));

        this.querySubscriptions.push(this.queries['GET_IPS']
            .valueChanges
            .subscribe(({ data, loading }) => {
                this.ipCount.set(data.ips.length);
            }));

        this.querySubscriptions.push(this.queries['GET_CSA_NODES']
            .valueChanges
            .subscribe(({ data, loading }) => {
                this.csaNodesCount.set(data.nodeObjects.length);
            }));

        this.querySubscriptions.push(this.queries['GET_MISSIONS']
            .valueChanges
            .subscribe(({ data, loading }) => {
                this.missionsCount.set(data.missions.length);
            }));
        
        this.querySubscriptions.push(this.queries['GET_VULNERABILITIES']
            .valueChanges
            .subscribe(({ data, loading }) => {
                const severityCountMap: { [key: string]: number } = {};
                const cves = data.cves;

                cves.forEach((cve: any) => {
                    const severity = cve.cvss_v31?.base_severity || 'unknown';
                    if (severityCountMap[severity]) {
                        severityCountMap[severity]++;
                    } else {
                        severityCountMap[severity] = 1;
                    }
                });

                this.vulnerabilityChartData.set(Object.entries(severityCountMap).map(([severity, count]) => ({
                    name: severity,
                    value: count
                })));
            }));

        this.querySubscriptions.push(this.queries['GET_OS_DATA']
            .valueChanges
            .subscribe(({ data, loading }) => {
                const osCountMap: { [key: string]: number } = {};
                const hosts = data.hosts;

                hosts.forEach((host: any) => {
                    host.software_versions.forEach((version: any) => {
                        if (version.version.startsWith('cpe:2.3:o')) {
                            osCountMap[version.version] = (osCountMap[version.version] || 0) + 1;
                        }
                    });
                });

                this.osChartData.set(Object.entries(osCountMap).map(([name, value]) => ({
                    name: name.split('cpe:2.3:o:')[1], 
                    value 
                })).sort((a, b) => b.value - a.value));
            }
        ));
    }
}