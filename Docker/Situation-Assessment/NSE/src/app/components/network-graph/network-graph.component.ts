import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, Output, EventEmitter, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubnetData } from '../../models/network-data';
import { TooltipService } from '../../services/tooltip.service';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

declare var d3: any;

@Component({
  selector: 'app-network-graph',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './network-graph.component.html',
  styleUrls: ['./network-graph.component.css']
})
export class NetworkGraphComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() networkData: SubnetData[] = [];
  @Output() subnetClick = new EventEmitter<SubnetData>();
  @ViewChild('graphContainer', { static: true }) graphContainer!: ElementRef;
  @ViewChild('legendContainer', { static: true }) legendContainer!: ElementRef;

  searchTerm = '';
  simulation: any = null;
  svg: any = null;
  g: any = null;
  nodes: any[] = [];
  links: any[] = [];
  zoom: any = null;
  
  private searchSubject = new Subject<string>();
  private isSimulationReady = false;

  constructor(private tooltipService: TooltipService) {
    // Set up search debouncing
    this.searchSubject.pipe(
      debounceTime(1000) // Wait 1 second after user stops typing
    ).subscribe(searchTerm => {
      this.performZoomSearch(searchTerm);
    });
  }

  ngOnInit() {
  console.log('NetworkGraphComponent initialized');
  
  // Listen for pause simulation events
  this.graphContainer.nativeElement.addEventListener('pauseSimulation', () => {
    if (this.simulation) {
      this.simulation.stop();
      console.log('Graph simulation paused');
    }
  });
  
  // Add window resize listener for responsive legend
  window.addEventListener('resize', () => {
    if (this.networkData && this.networkData.length > 0) {
      setTimeout(() => {
        const container = this.graphContainer.nativeElement;
        const containerWidth = container.clientWidth || 800;
        this.createLegend(containerWidth);
      }, 100);
    }
  });
}

ngOnDestroy() {
  if (this.searchSubject) {
    this.searchSubject.complete();
  }
}

  ngAfterViewInit() {
  // Increased delay to ensure data loading completes
  setTimeout(() => {
    this.initGraph();
  }, 200);
}

ngOnChanges(changes: SimpleChanges) {
  if (changes['networkData']) {
    if (!changes['networkData'].firstChange) {
      const previousData = changes['networkData'].previousValue || [];
      const currentData = changes['networkData'].currentValue || [];
      
      // Only reinitialize if subnet count changed or subnets added/removed
      const structuralChange = this.hasStructuralChanges(previousData, currentData);
      
      if (structuralChange) {
        console.log('Structural network changes detected, reinitializing graph');
        setTimeout(() => {
          this.initGraph();
        }, 50);
      } else {
        console.log('Only data updates detected, updating node colors and sizes without restarting simulation');
        this.updateExistingNodes(currentData);
      }
    } else {
      // First change - always initialize
      setTimeout(() => {
        this.initGraph();
      }, 50);
    }
  }
}

private hasStructuralChanges(previousData: SubnetData[], currentData: SubnetData[]): boolean {
  // Check if subnet count changed
  if (previousData.length !== currentData.length) {
    return true;
  }
  
  // Check if any subnet IDs are different (subnets added/removed)
  const prevIds = new Set(previousData.map(s => s.id));
  const currentIds = new Set(currentData.map(s => s.id));
  
  for (const id of currentIds) {
    if (!prevIds.has(id)) return true;
  }
  
  for (const id of prevIds) {
    if (!currentIds.has(id)) return true;
  }
  
  return false;
}

private updateExistingNodes(updatedData: SubnetData[]): void {
  if (!this.svg || !this.nodes) return;
  
  // Create a map for quick lookup of updated data
  const dataMap = new Map(updatedData.map(item => [item.id, item]));
  
  // Update the nodes array with new data
  this.nodes.forEach(node => {
    const updatedItem = dataMap.get(node.id);
    if (updatedItem) {
      node.deviceCount = updatedItem.deviceCount;
      node.riskScore = updatedItem.riskScore;
      node.threatLevel = updatedItem.riskLevel;
      node.isVulnerable = updatedItem.isVulnerable;
    }
  });
  
  // Update visual elements without restarting simulation
  const sizeScale = d3.scaleLinear()
    .domain(d3.extent(this.nodes, (d: any) => d.deviceCount))
    .range([8, 25]);

  const colorScale = d3.scaleLinear()
    .domain([0, 2, 4, 6, 8, 10])
    .range(['#00e676', '#4caf50', '#ffeb3b', '#ff9800', '#ff5722', '#ff0000']);
  
  // Update node sizes and colors
  this.svg.selectAll('.nodes circle')
    .data(this.nodes, (d: any) => d.id)
    .transition()
    .duration(300)
    .attr('r', (d: any) => sizeScale(d.deviceCount))
    .attr('fill', (d: any) => colorScale(d.riskScore));
}

initGraph() {
  if (!this.networkData || this.networkData.length === 0) {
    console.log('No network data available for graph');
    return;
  }

  if (typeof d3 === 'undefined') {
    console.error('D3 not loaded');
    return;
  }

  // Clear any existing content
  const container = this.graphContainer.nativeElement;
  d3.select(container).selectAll('*').remove();

  // Set up dimensions
  const containerWidth = container.clientWidth || 800;
  const containerHeight = container.clientHeight || 500;

  // Create legend
  this.createLegend(containerWidth);

  // Transform network data to D3 format
  const { nodes, links } = this.transformNetworkDataForD3();
  this.nodes = nodes;
  this.links = links;

  // Create size scale for device count
  const sizeScale = d3.scaleLinear()
    .domain(d3.extent(nodes, (d: any) => d.deviceCount))
    .range([8, 25]);

  // Create color scale
  const colorScale = d3.scaleLinear()
    .domain([0, 2, 4, 6, 8, 10])
    .range(['#00e676', '#4caf50', '#ffeb3b', '#ff9800', '#ff5722', '#ff0000']);

  // Create the force simulation
  this.simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d: any) => d.id).distance(80))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2))
    .force("collision", d3.forceCollide().radius((d: any) => sizeScale(d.deviceCount) + 2));

  // Create SVG
  this.svg = d3.select(container)
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', containerHeight)
    .attr('viewBox', [0, 0, containerWidth, containerHeight])
    .style('max-width', '100%')
    .style('height', 'auto')
    .style('border', '1px solid #dee2e6')
    .style('border-radius', '8px')
    .style('background', '#fafafa');

  this.g = this.svg.append('g');

  // Set up zoom behavior
  this.zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event: any) => {
      this.g.attr('transform', event.transform);
    });

  this.svg.call(this.zoom);

  // Set initial zoom level
  const initialScale = 0.8;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const initialTransform = d3.zoomIdentity
    .translate(centerX, centerY)
    .scale(initialScale)
    .translate(-centerX, -centerY);

  this.svg.call(this.zoom.transform, initialTransform);
  this.g.attr('transform', initialTransform);

  // Create links
  const link = this.g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 1);

  // Create nodes
  const node = this.g.append('g')
    .attr('class', 'nodes')
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', (d: any) => sizeScale(d.deviceCount))
    .attr('fill', (d: any) => colorScale(d.riskScore))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .style('cursor', 'pointer');

  // Add labels for larger nodes
  const labels = this.g.append('g')
    .attr('class', 'labels')
    .selectAll('text')
    .data(nodes)
    .join('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '.35em')
    .attr('font-size', '8px')
    .attr('font-weight', 'bold')
    .attr('fill', '#333')
    .attr('pointer-events', 'none')
    .text((d: any) => {
      const parts = d.subnet.split('.');
      return parts.length >= 3 ? `${parts[2]}.${parts[3]}` : d.subnet;
    });

  // Add tooltips and interactions
  node
    .on('mouseover', (event: any, d: any) => {
      d3.select(event.currentTarget)
        .attr('stroke-width', 3)
        .attr('stroke', '#007bff');
      
      this.showSubnetTooltip(event, d);
    })
    .on('mouseout', (event: any, d: any) => {
      d3.select(event.currentTarget)
        .attr('stroke-width', 1.5)
        .attr('stroke', '#fff');
      
      this.hideTooltip();
    })
    .on('click', (event: any, d: any) => {
      const subnetData = this.networkData.find(item => item.id === d.id);
      if (subnetData) {
        this.subnetClick.emit(subnetData);
      }
    });

  // Add drag behavior
  node.call(d3.drag()
    .on('start', (event: any, d: any) => this.dragstarted(event, d))
    .on('drag', (event: any, d: any) => this.dragged(event, d))
    .on('end', (event: any, d: any) => this.dragended(event, d)));

  // Update positions on each tick
  this.simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);
    
    node
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y);
    
    labels
      .attr('x', (d: any) => d.x)
      .attr('y', (d: any) => d.y);
  });

  // Mark simulation as ready after it settles
  this.simulation.on('end', () => {
    this.isSimulationReady = true;
    console.log('Simulation ready for zooming');
  });

  // Also mark as ready after a few seconds regardless
  setTimeout(() => {
    this.isSimulationReady = true;
  }, 3000);

  console.log('D3 force-directed graph initialized');
}

  private transformNetworkDataForD3() {
    const nodes: any[] = [];
    const links: any[] = [];
    
    // Create nodes from network data
    this.networkData.forEach(item => {
      nodes.push({
        id: item.id,
        subnet: item.subnet,
        deviceCount: item.deviceCount,
        riskScore: item.riskScore,
        threatLevel: item.riskLevel,
        isVulnerable: item.isVulnerable
      });
    });
    
    // Create links between subnets in same network
    const networkGroups: { [key: string]: any[] } = {};
    this.networkData.forEach(item => {
      const prefix = item.subnet.split('.').slice(0, 2).join('.');
      if (!networkGroups[prefix]) networkGroups[prefix] = [];
      networkGroups[prefix].push(item);
    });
    
    Object.values(networkGroups).forEach(group => {
      if (group.length > 1) {
        // Create links between nodes in the same network group
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < Math.min(group.length, i + 4); j++) {
            links.push({
              source: group[i].id,
              target: group[j].id,
              value: 1
            });
          }
        }
      }
    });
    
    return { nodes, links };
  }

  private createLegend(containerWidth: number) {
  const legendContainer = d3.select(this.legendContainer.nativeElement);
  legendContainer.selectAll('*').remove();

  // Detect if mobile/tablet
  const isMobile = window.innerWidth <= 768;
  const isPhone = window.innerWidth <= 480;

  if (isPhone) {
    this.createPhoneLegend(legendContainer, containerWidth);
  } else if (isMobile) {
    this.createMobileLegend(legendContainer, containerWidth);
  } else {
    this.createDesktopLegend(legendContainer, containerWidth);
  }
}

private createDesktopLegend(legendContainer: any, containerWidth: number) {
  const legendWidth = Math.min(300, containerWidth * 0.4);
  const legendBarHeight = 15;

  const legendSvg = legendContainer.append('svg')
    .attr('width', legendWidth + 120)
    .attr('height', 80)
    .style('display', 'block')
    .style('margin', '0 auto')
    .style('transform', 'translateX(-20%)');

  // Legend title
  legendSvg.append('text')
    .attr('x', (legendWidth + 120) / 2)
    .attr('y', 12)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('fill', '#333')
    .text('Risk Score');

  this.createLegendContent(legendSvg, legendWidth, legendBarHeight, 60, 'Red Nodes indicate High-Risk subnets | Hover for details | Click to explore devices');
}

private createMobileLegend(legendContainer: any, containerWidth: number) {
  const legendWidth = Math.min(250, containerWidth * 0.6);
  const legendBarHeight = 12;

  const legendSvg = legendContainer.append('svg')
    .attr('width', legendWidth + 80)
    .attr('height', 65)
    .style('display', 'block')
    .style('margin', '0 auto');

  // Legend title
  legendSvg.append('text')
    .attr('x', (legendWidth + 80) / 2)
    .attr('y', 12)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px')
    .attr('font-weight', 'bold')
    .attr('fill', '#333')
    .text('Risk Score');

  this.createLegendContent(legendSvg, legendWidth, legendBarHeight, 40, 'Red = High Risk | Tap to explore');
}

private createPhoneLegend(legendContainer: any, containerWidth: number) {
  const legendWidth = Math.min(200, containerWidth * 0.8);
  const legendBarHeight = 10;

  const legendSvg = legendContainer.append('svg')
    .attr('width', legendWidth + 60)
    .attr('height', 55)
    .style('display', 'block')
    .style('margin', '0 auto');

  // Legend title
  legendSvg.append('text')
    .attr('x', (legendWidth + 60) / 2)
    .attr('y', 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('font-weight', 'bold')
    .attr('fill', '#333')
    .text('Risk Score');

  this.createLegendContent(legendSvg, legendWidth, legendBarHeight, 30, 'Tap nodes to explore');
}

private createLegendContent(legendSvg: any, legendWidth: number, legendBarHeight: number, xOffset: number, instructionText: string) {
  // Create color scale
  const colorScale = d3.scaleLinear()
    .domain([0, 2, 4, 6, 8, 10])
    .range(['#00e676', '#4caf50', '#ffeb3b', '#ff9800', '#ff5722', '#ff0000']);

  // Create gradient
  const defs = legendSvg.append('defs');
  const gradient = defs.append('linearGradient')
    .attr('id', 'risk-gradient')
    .attr('x1', '0%')
    .attr('x2', '100%');

  const stops = [0, 20, 40, 60, 80, 100];
  stops.forEach((percent, i) => {
    gradient.append('stop')
      .attr('offset', `${percent}%`)
      .attr('stop-color', colorScale(i * 2));
  });

  // Draw legend bar
  legendSvg.append('rect')
    .attr('x', xOffset)
    .attr('y', 20)
    .attr('width', legendWidth)
    .attr('height', legendBarHeight)
    .style('fill', 'url(#risk-gradient)')
    .style('stroke', '#999')
    .style('stroke-width', 1);

  // Add scale labels
  const scaleLabels = [0, 2, 4, 6, 8, 10];
  scaleLabels.forEach((value, i) => {
    const x = xOffset + (i * legendWidth / 5);
    legendSvg.append('text')
      .attr('x', x)
      .attr('y', 20 + legendBarHeight + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', window.innerWidth <= 480 ? '8px' : '10px')
      .attr('fill', '#666')
      .text(value.toString());
  });

  // Add instructions text
  legendSvg.append('text')
    .attr('x', xOffset + (legendWidth / 2))
    .attr('y', 20 + legendBarHeight + 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', window.innerWidth <= 480 ? '9px' : '11px')
    .attr('fill', '#666')
    .text(instructionText);
}

  // Drag functions
  private dragstarted(event: any, d: any) {
    if (!event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  private dragged(event: any, d: any) {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragended(event: any, d: any) {
    if (!event.active) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  private showSubnetTooltip(event: any, d: any) {
    // Remove any existing tooltips
    d3.selectAll('.tooltip').remove();

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '10px')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('font-size', '12px')
      .style('z-index', '1000');

    tooltip.html(`
      <strong>${d.subnet}</strong><br>
      <strong>Devices:</strong> ${d.deviceCount}<br>
      <strong>Risk Score:</strong> ${d.riskScore.toFixed(1)}<br>
      <strong>Threat Level:</strong> ${d.threatLevel}
      ${d.isVulnerable ? '<br><strong style="color: #ff6b6b;">⚠ VULNERABLE</strong>' : ''}
    `)
    .style('left', (event.pageX + 10) + 'px')
    .style('top', (event.pageY - 10) + 'px')
    .transition()
    .duration(200)
    .style('opacity', 1);
  }

  private hideTooltip() {
    d3.selectAll('.tooltip').remove();
  }

onSearchChange() {
  if (this.nodes && this.svg) {
    const searchLower = this.searchTerm.toLowerCase();
    
    // Update node and label opacity immediately
    this.svg.selectAll('.nodes circle')
      .style('opacity', (d: any) => {
        if (!this.searchTerm) return 1;
        return d.subnet.toLowerCase().includes(searchLower) ? 1 : 0.2;
      });

    this.svg.selectAll('.labels text')
      .style('opacity', (d: any) => {
        if (!this.searchTerm) return 1;
        return d.subnet.toLowerCase().includes(searchLower) ? 1 : 0.2;
      });

    // Also fade the links for better focus
    this.svg.selectAll('.links line')
      .style('opacity', (d: any) => {
        if (!this.searchTerm) return 0.6;
        
        const sourceMatch = d.source.subnet?.toLowerCase().includes(searchLower);
        const targetMatch = d.target.subnet?.toLowerCase().includes(searchLower);
        
        return (sourceMatch || targetMatch) ? 0.6 : 0.1;
      });

    // Trigger debounced zoom if search term exists
    if (this.searchTerm.trim()) {
      this.searchSubject.next(this.searchTerm);
    } else {
      // Reset zoom immediately when search is cleared
      this.resetZoom();
    }
  }
}

// Add keyboard event handler for Enter key
@HostListener('document:keydown', ['$event'])
onKeyDown(event: KeyboardEvent) {
  // Enter key triggers immediate zoom to search results
  if (event.key === 'Enter' && this.searchTerm.trim()) {
    this.performZoomSearch(this.searchTerm);
    event.preventDefault();
  }
  
  // Escape key clears search
  if (event.key === 'Escape' && this.searchTerm) {
    this.clearSearch();
    event.preventDefault();
  }
}

performZoomSearch(searchTerm: string) {
  if (!this.isSimulationReady) {
    console.log('Simulation not ready, waiting...');
    // Retry after simulation settles
    setTimeout(() => {
      if (this.isSimulationReady) {
        this.performZoomSearch(searchTerm);
      }
    }, 1000);
    return;
  }

  console.log('Performing zoom search for:', searchTerm);
  this.zoomToMatchingNodes(searchTerm);
}

private zoomToMatchingNodes(searchTerm: string) {
  if (!this.nodes || !this.svg || !this.zoom || !searchTerm.trim()) {
    return;
  }

  const searchLower = searchTerm.toLowerCase();
  const matchingNodes = this.nodes.filter(node => 
    node.subnet.toLowerCase().includes(searchLower)
  );

  console.log(`Found ${matchingNodes.length} matching nodes for search: ${searchTerm}`);

  if (matchingNodes.length === 0) {
    return;
  }

  // Calculate bounding box of matching nodes
  const bounds = this.calculateNodesBounds(matchingNodes);
  
  if (bounds) {
    console.log('Zooming to bounds:', bounds);
    this.animateZoomToBounds(bounds, matchingNodes.length);
  }
}

private calculateNodesBounds(nodes: any[]) {
  if (nodes.length === 0) return null;

  // Make sure nodes have valid positions
  const validNodes = nodes.filter(node => 
    node.x !== undefined && node.y !== undefined && 
    !isNaN(node.x) && !isNaN(node.y)
  );

  if (validNodes.length === 0) {
    console.log('No valid positioned nodes found');
    return null;
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  validNodes.forEach(node => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  });

  // Add padding around the bounds
  const padding = validNodes.length === 1 ? 150 : 100;
  
  return {
    x: minX - padding,
    y: minY - padding,
    width: (maxX - minX) + (padding * 2),
    height: (maxY - minY) + (padding * 2),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

private animateZoomToBounds(bounds: any, nodeCount: number) {
  const container = this.graphContainer.nativeElement;
  const containerWidth = container.clientWidth || 800;
  const containerHeight = container.clientHeight || 500;

  // Calculate scale to fit the bounds in the container
  const scaleX = containerWidth / bounds.width;
  const scaleY = containerHeight / bounds.height;
  let scale = Math.min(scaleX, scaleY);

  // Limit scale to reasonable bounds
  scale = Math.max(0.3, Math.min(scale, 4.0));

  // For single nodes, use a higher zoom level
  if (nodeCount === 1) {
    scale = Math.min(2.0, scale * 1.5);
  }

  // Calculate translation to center the bounds
  const translateX = containerWidth / 2 - bounds.centerX * scale;
  const translateY = containerHeight / 2 - bounds.centerY * scale;

  // Create the transform
  const transform = d3.zoomIdentity
    .translate(translateX, translateY)
    .scale(scale);

  console.log('Applying zoom transform:', { scale, translateX, translateY });

  // Animate to the new transform
  this.svg.transition()
    .duration(1000)
    .ease(d3.easeQuadInOut)
    .call(this.zoom.transform, transform);
}

private resetZoom() {
  if (!this.svg || !this.zoom) return;

  const container = this.graphContainer.nativeElement;
  const containerWidth = container.clientWidth || 800;
  const containerHeight = container.clientHeight || 500;

  // Reset to initial zoom level
  const initialScale = 0.8;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  
  const initialTransform = d3.zoomIdentity
    .translate(centerX, centerY)
    .scale(initialScale)
    .translate(-centerX, -centerY);

  this.svg.transition()
    .duration(750)
    .ease(d3.easeQuadInOut)
    .call(this.zoom.transform, initialTransform);
}

clearSearch() {
  this.searchTerm = '';
  this.onSearchChange();
}
}