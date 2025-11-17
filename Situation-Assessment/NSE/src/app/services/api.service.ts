import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, timeout, map } from 'rxjs/operators';
import { ApiResponse } from '../models/network-data';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_BASE_URL = environment.apiUrl;
  private readonly API_DEVICE_DETAILS_URL = environment.apiUrl;
  private readonly REQUEST_TIMEOUT = 120000;
  private readonly HEALTH_CHECK_TIMEOUT = 10000;

  constructor(private http: HttpClient) {}

  checkApiHealth(): Observable<boolean> {
    return this.http.get(`${this.API_BASE_URL}/get-virtual-network-data`).pipe(
      timeout(this.HEALTH_CHECK_TIMEOUT),
      map(() => true),
      catchError(() => of(false))
    );
  }

  getVirtualNetworkData(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_BASE_URL}/get-virtual-network-data`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(this.handleError)
      );
  }

  fetchCidrData(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API_BASE_URL}/fetch-cidr-data`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(this.handleError)
      );
  }

  getDeviceDetails(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_DEVICE_DETAILS_URL}/get-virtual-network-data`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(this.handleError)
      );
  }

  fetchSubnetDetails(subnetCidr: string): Observable<any[]> {
    const params = new HttpParams().set('netRange', subnetCidr);
    return this.http.get<any[]>(`${this.API_DEVICE_DETAILS_URL}/fetch-subnet-data`, { params })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(this.handleError)
      );
  }

  expandVirtualNetwork(nodeId: string, nodeType: string): Observable<any> {
    return this.http.get<any>(`${this.API_DEVICE_DETAILS_URL}/expand-virtual-network/${encodeURIComponent(nodeId)}/${encodeURIComponent(nodeType)}`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(() => error);
  }

  getNodeAttributes(): Observable<any> {
    return this.http.get<any>(`${this.API_DEVICE_DETAILS_URL}/get-node-attributes`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(this.handleError)
      );
  }

  writeCustomRiskComponent(componentData: any): Observable<any> {
    return this.http.post<any>(`${this.API_DEVICE_DETAILS_URL}/write-custom-risk-component`, componentData)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(this.handleError)
      );
  }

  getSubnetDevicesDirect(subnetCidr: string): Observable<any> {
    return this.http.get<any>(`${this.API_DEVICE_DETAILS_URL}/get-subnet-devices/${encodeURIComponent(subnetCidr)}`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(this.handleError)
      );
  }
}