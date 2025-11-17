import { Component, OnInit } from '@angular/core';
import { Node, Edge, NgxGraphModule } from '@swimlane/ngx-graph';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import _ from 'lodash';
import { DataService } from '../../services/data.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SentinelButtonWithIconComponent } from '@sentinel/components/button-with-icon';
import { SentinelCardComponent } from '@sentinel/components/card';
import { SentinelControlItem } from '@sentinel/components/controls';


@Component({
  selector: 'network-page',
  templateUrl: './network-page.component.html',
  styleUrls: ['./network-page.component.scss'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinner,
    NgxGraphModule,
    MatTooltipModule,
    SentinelButtonWithIconComponent,
    SentinelCardComponent,
  ]
})

export class NetworkPageComponent implements OnInit {
  nodes: Node[] = [];
  edges: Edge[] = [];
  error: any;
  selectedNode: Node = { id: '', label: '' };
  ipSearch = '4.122.55.26';
  errorMessage = '';
  graphLoading?: boolean;
  center$: Subject<any> = new Subject();
  controls: SentinelControlItem[] = [];

  constructor(private dataService: DataService, private route: ActivatedRoute) {
    this.route.queryParams.subscribe(params => {
      if (params['ip']) {
        this.ipSearch = params['ip'];
        this.loadGraphData();
      }
    });
  }

  ngOnInit(): void {
    if (this.ipSearch) {
      this.loadGraphData();
    }
  }

  /**
   * Loads graph data from GraphQL API
   */
  loadGraphData() {
    if (this.ipSearch.trim() === '') {
      return;
    }
    this.graphLoading = true;
    this.errorMessage = '';
    this.selectedNode = { id: '', label: '' };
    
    this.dataService.getIPNode(this.ipSearch).subscribe({
      next: (res) => {
        console.log("Graph data loaded", res);
        this.edges = res.edges;
        this.nodes = res.nodes;
        if (this.nodes.length === 0 && this.edges.length === 0) {
          this.errorMessage = 'Empty result.';
        }

        this.updateChart();
        this.graphLoading = false;
      },
      error: (error) => {
        this.edges = [];
        this.nodes = [];
        this.errorMessage = error;
        this.graphLoading = false;
      },
  });
}

  onNodeSelect(node: Node) {
    console.log("Selected node", node);
  }

  /**
   * This function is called when a user clicks on graph node
   * @param node selected node
   */
  selectNode(node: Node) {
    this.selectedNode = node;
  }

  /**
   * Returns node attributes of type string ignoring attributes such as color, labelname
   * @param node
   */
  public getNodeAttributes(node: Node) {
    const attr = { ...node.data };
    delete attr.color;
    delete attr.customColor;
    delete attr.textColor;
    delete attr.type;
    delete attr.labelName;
    return Object.entries(attr).filter((a) => typeof a[1] === 'string' || typeof a[1] === 'number');
  }

  public getLabel(node: Node) {
    return this.dataService.getLabelOfGraphNode(node);
  }

  public expandNode(node: Node) {
    this.dataService.getNodeNeighbours(node).subscribe({
      next: (res) => {
        this.edges = _.unionBy(this.edges, res.edges, (e: Edge) => [e.source, e.target, e.label].join());
        this.nodes = _.unionBy(this.nodes, res.nodes, (n: Node) => n.id);

        if (this.nodes.length === 0 && this.edges.length === 0) {
          this.errorMessage = 'Empty result.';
        }

        this.graphLoading = false;
      },
      error: (error) => {
        this.edges = [];
        this.nodes = [];
        this.errorMessage = error;
        this.updateChart();
        this.graphLoading = false;
      },
    }
    );
  }

  navigateToAssetDetail(assetId: string) {
    // Implement navigation logic to asset detail page
  }

  updateChart() {
    this.center$.next(true);
  }
}

