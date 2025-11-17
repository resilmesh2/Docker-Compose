import { Routes } from '@angular/router';
import { HOME_PATH, ISSUE_PATH, MISSION_PATH, NETWORK_NODES_PATH, ORGANIZATION_PATH, ASSETS_PATH, SUBNETS_PATH, VULNERABILITY_PATH, SUBNETS_GRAPH_PATH, ORGANIZATION_GRAPH_PATH, CSA_PATH } from './paths';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { MissionPageComponent } from './pages/mission-page/mission-page.component';
import { SubnetPageComponent } from './pages/subnet-page/subnet-page.component';
import { NetworkPageComponent } from './pages/network-page/network-page.component';
import { AssetPageComponent } from './pages/asset-page/asset-page.component';
import { IssuePageComponent } from './pages/issue-page/issue-page.component';
import { VulnerabilityPageComponent } from './pages/vulnerability-page/vulnerability.component';
import { IssueDetailComponent } from './pages/issue-detail/issue-detail.component';
import { OrgUnitsComponent } from './pages/org-units-page/org-units.component';
import { SubnetDetailComponent } from './pages/subnet-detail/subnet-detail.component';
import { OrgUnitDetailComponent } from './pages/org-unit-detail/org-unit-detail.component';
import { SubnetGraphPageComponent } from './pages/subnet-graph-page/subnet-graph-page.component';
import { OrgGraphPageComponent } from './pages/org-graph-page/org-graph-page.component';
import { IframePortalComponent } from './pages/external/iframe-portal.component';
import { EXTERNAL_ROUTES } from './external';
import { CSAPageComponent } from './pages/csa-page/csa-page.component';

export const ROOT_ROUTES: Routes = [
  {
    path: HOME_PATH,
    component: HomePageComponent,
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: HOME_PATH,
  },
  {
    path: SUBNETS_PATH,
    component: SubnetPageComponent,
    data: { breadcrumb: 'Subnets' },
  },
  {
    path: SUBNETS_PATH + '/:range',
    component: SubnetDetailComponent,
    data: { breadcrumb: 'Subnet Details' },
  },
  {
    path: SUBNETS_GRAPH_PATH,
    component: SubnetGraphPageComponent,
    data: { breadcrumb: 'Subnets Graph' },
  },
  {
    path: NETWORK_NODES_PATH,
    component: NetworkPageComponent,
    data: { breadcrumb: 'Network Nodes' },
  },
  {
    path: ASSETS_PATH,
    component: AssetPageComponent,
    data: { breadcrumb: 'Assets' },
  },
  {
    path: MISSION_PATH,
    component: MissionPageComponent,
    data: { breadcrumb: 'Missions' },
  },
  {
    path: ISSUE_PATH,
    component: IssuePageComponent,
    data: { breadcrumb: 'Issues' },
  },
  {
    path: ISSUE_PATH + '/:name',
    component: IssueDetailComponent,
    data: { breadcrumb: 'Issue Details' },
  },
  {
    path: VULNERABILITY_PATH,
    component: VulnerabilityPageComponent,
    data: { breadcrumb: 'Vulnerabilities' },
  },
  {
    path: ORGANIZATION_PATH,
    component: OrgUnitsComponent,
    data: { breadcrumb: 'Organization Units' },
  },
  {
    path: ORGANIZATION_PATH + '/:orgName',
    component: OrgUnitDetailComponent,
    data: { breadcrumb: 'Organization Unit Details' },
  },
  {
    path: ORGANIZATION_GRAPH_PATH,
    component: OrgGraphPageComponent,
    data: { breadcrumb: 'Organization Units Graph' },
  },
  {
    path: CSA_PATH,
    component: CSAPageComponent,
    data: { breadcrumb: 'CSA' },
  },

  // generated in external.ts
  ... EXTERNAL_ROUTES,

  // {
  //   path: USER_PATH,
  //   loadChildren: () => import('./user-example-page/user-example-page.module').then((m) => m.UserExamplePageModule),
  //   data: { breadcrumb: 'User' },
  // },
  // {
  // {
  //   path: NOTIFICATION_PATH,
  //   data: { breadcrumb: 'Notifications' },
  //   children: [
  //     {
  //       path: '',
  //       loadChildren: () =>
  //         import('./notification-page/notification-page-overview.module').then((m) => m.NotificationPageOverviewModule),
  //     },
  //   ],
  // },

];
