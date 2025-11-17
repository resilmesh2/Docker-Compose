import { Component, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { AgendaContainer, SentinelUser } from "@sentinel/layout";
import { SentinelBreadcrumb, SentinelBreadcrumbBuilder } from "@sentinel/layout/breadcrumbs";
import { CustomNavDirective, SentinelLayout1Component } from "@sentinel/layout/layout1";
import { SentinelNotificationService, SentinelNotificationTypeEnum } from "@sentinel/layout/notification";
import { filter, map, Observable } from "rxjs";

/**
 * Angular Material
 */
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { agendaContainers } from "./agendas";
import { MatIconButton } from "@angular/material/button";
import { CustomNavComponent } from "./components/custom-nav/custom-nav.component";

export const user = {
  picture:
    // eslint-disable-next-line max-len
    'iVBORw0KGgoAAAANSUhEUgAAAEsAAABLCAYAAAA4TnrqAAAB8ElEQVR4Xu3YIQ5DQQwD0R6qFyro/Y/wy8cymAZFCnjE0loO3dfzPK9/vT/fZxveYERgcMgGvMGIwOCQDXiDEYHBIRvwBiMCg0M24A1GBAaHbMAbjAgMDtmANxgRGByyAW8wIjA4ZAPeYERgcMgGvMGIwOCQDXiDEYHBIRvwBiMCg0M24A1GBAaHbMAbjAgMDtmANxgRnC6C00VwughOF8HpIjhdBKeL4HQRnC6C00VwughOF8HpIjhdBKcb/UmxzGCXwS6DXcboMYcY7DLYZbDLGD3mEINdBrsMdhmjxxxisMtgl8EuY/SYQwx2Gewy2GWMHnOIwS6DXQa7jNFjDjHYZbDLYJcxeswhBrsMdhnsMkaPOcRgl8Eug13G6DGHGOwy2GWwyxg95hCDXQa7DHYZo8ccYrDLYJfBLmP0mEMMdhnsMthljB5ziMEug10Gu4zRYw4x2GWwy2CXEWWni+B0EZwugtNFcLoIThfB6SI4XQSni+B0EZwugtNFcLoIThfB6Ub/OyzbgDcYo8ccsgFvMEaPOWQD3mCMHnPIBrzBGD3mkA14gzF6zCEb8AZj9JhDNuANxugxh2zAG4zRYw7ZgDcYo8ccsgFvMEaPOWQD3mCMHnPIBrzBGD3mkA14gzF6zCEb8AZj9JhDNuANxg9pN4hcwILIiAAAAABJRU5ErkJggg==',
  name: 'Sentinel User',
  login: 'sentinel@sentinel.cz',
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    RouterOutlet, 
    SentinelLayout1Component,
    MatIconButton,
    MatIconModule,
    CustomNavDirective,
    CustomNavComponent
  ],
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private activeRoute = inject(ActivatedRoute);
  private notificationService = inject(SentinelNotificationService, { optional: true });

  protected readonly title = signal('SACD');
  agendaContainers: AgendaContainer[] = agendaContainers;
  user: SentinelUser;
  breadcrumbs$?: Observable<SentinelBreadcrumb[]>;

  constructor(private matIconRegistry: MatIconRegistry) {
    this.user = user;
    this.matIconRegistry.setDefaultFontSetClass('material-symbols-outlined');
  }

  ngOnInit(): void {
    const navigationEndEvent$ = this.router.events.pipe(filter((event) => event instanceof NavigationEnd));
    this.breadcrumbs$ = navigationEndEvent$.pipe(map(() => SentinelBreadcrumbBuilder.build(this.activeRoute.snapshot)));
  }

  addNotification(): void {
    this.notificationService
      ?.emit({
        type: this.generateRandomNotificationType(),
        title: 'Delete user with ID: 153',
        additionalInfo: ['You do not have right to perform this operation.'],
        source: 'Some Agenda',
        action: 'show',
        duration: 3000,
      })
      ?.subscribe((result) => console.log('Result: ' + result));
  }

  private generateRandomNotificationType(): SentinelNotificationTypeEnum {
    const notificationTypes = Object.entries(SentinelNotificationTypeEnum);
    return notificationTypes[Math.floor(Math.random() * Math.floor(4))][1];
  }

  onClick() {
    console.log('click');
  }
}
