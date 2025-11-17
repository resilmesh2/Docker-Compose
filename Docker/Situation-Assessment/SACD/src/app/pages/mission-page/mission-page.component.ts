import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { NgxGraphModule, Node } from '@swimlane/ngx-graph';
import { Mission, MissionStructure } from '../../models/mission-structure.model';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MissionGraphComponent } from './mission-graph/mission-graph.component';
import { SentinelButtonWithIconComponent } from '@sentinel/components/button-with-icon';
import { SentinelCardComponent } from '@sentinel/components/card';
import { SentinelControlItem } from '@sentinel/components/controls';

@Component({
  selector: 'mission-page',
  templateUrl: './mission-page.component.html',
  styleUrls: ['./mission-page.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgxGraphModule,
    MissionGraphComponent,
    SentinelButtonWithIconComponent,
    SentinelCardComponent,
  ]
})

export class MissionPageComponent implements OnInit {
  errorMessage = '';
  missionNames: string[] = [""];
  selectedMissionName = "";
  selectedNode: Node | null = null;
  setSelectedNode = (node: Node) => {
    this.selectedNode = node
  }
  missions: Mission[] = [];
  missionsStructure: MissionStructure | null = null;
  graphLoading: boolean = false;

  controls: SentinelControlItem[] = [];

  constructor(private dataService: DataService) {
  }

  ngOnInit(): void {
    this.dataService.getMissionNames().subscribe({
      next: (missionNames: string[]) => {
        this.missionNames = missionNames;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Error fetching mission names'; // Handle errors
      }
    });
    this.getGraphData();
  }

  public getGraphData(): void {
    this.graphLoading = true
    this.getMissions().subscribe({
      next: (missions) => {
        this.missions = missions;
        this.missionsStructure = this.dataService.makeMissionsStructure(missions);
        this.graphLoading = false;
        this.errorMessage = "";
      },
      error: (error) => {
        this.missions = [];
        this.missionsStructure = null;
        this.graphLoading = false;
        this.errorMessage = error.message;
      }
    });
    this.selectedNode = null
  }

  /**
   * Returns an observable of missions
   */
  private getMissions(): Observable<Mission[]> {
    return this.dataService.getMission(this.selectedMissionName).pipe(
      tap((missions: Mission[]) => {
        if (!this.missionsStructure) {
          this.missionsStructure = this.dataService.makeMissionsStructure(missions);
        }
      })
    );
  }

  public getLabel(node: Node) {
    console.log("Getting label for node", node);
    return this.dataService.getLabelOfGraphNode(node);
  }
}

