import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TooltipService {
  
  constructor() {}

  // Show method with boundary detection
 show(event: MouseEvent, content: string): void {
  // Remove any existing tooltips first
  this.hide();
  
  // Create new tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.innerHTML = content;
  
  // Add to body to measure dimensions
  document.body.appendChild(tooltip);
  
  // Get tooltip dimensions
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate optimal position
  const position = this.calculateOptimalPosition(
    event.pageX, 
    event.pageY, 
    tooltipRect.width, 
    tooltipRect.height,
    viewportWidth,
    viewportHeight
  );
  
  // Apply positioning
  tooltip.style.cssText = `
    position: absolute;
    left: ${position.x}px;
    top: ${position.y}px;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
    z-index: 10000;
    pointer-events: none;
    transform: translateY(5px);
  `;
  
  // Fade in with animation
  setTimeout(() => {
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateY(0)';
  }, 10);
}

private calculateOptimalPosition(
  mouseX: number, 
  mouseY: number, 
  tooltipWidth: number, 
  tooltipHeight: number,
  viewportWidth: number,
  viewportHeight: number
): { x: number, y: number } {
  
  const padding = 10; // Minimum distance from screen edge
  const offset = 15;  // Distance from mouse cursor
  
  let x = mouseX + offset;
  let y = mouseY - offset;
  
  // Check right edge - if tooltip would go off right side, show on left
  if (x + tooltipWidth + padding > viewportWidth) {
    x = mouseX - tooltipWidth - offset;
    
    // If still goes off left edge, center on screen
    if (x < padding) {
      x = Math.max(padding, (viewportWidth - tooltipWidth) / 2);
    }
  }
  
  // Check left edge - ensure minimum padding from left
  if (x < padding) {
    x = padding;
  }
  
  // Check bottom edge - if tooltip would go off bottom, show above cursor
  if (y + tooltipHeight + padding > viewportHeight) {
    y = mouseY - tooltipHeight - offset;
    
    // If still goes off top, position near bottom of viewport
    if (y < padding) {
      y = Math.max(padding, viewportHeight - tooltipHeight - padding);
    }
  }
  
  // Check top edge - ensure minimum padding from top
  if (y < padding) {
    y = padding;
  }
  
  return { x, y };
}

  hide(): void {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => {
      tooltip.remove();
    });
  }

showSubnetTooltip(event: MouseEvent, subnet: any): void {
  const riskClass = this.getRiskClass(subnet.riskScore || 0);
  const content = `
    <div class="tooltip-content subnet-tooltip">
      <div class="tooltip-title">${subnet.subnet}</div>
      <div class="tooltip-body">
        <div class="tooltip-grid">
          <span>Devices:</span> <span>${subnet.deviceCount?.toLocaleString() || 0}</span>
          <span>Risk Score:</span> <span class="risk-${riskClass}">${subnet.riskScore?.toFixed(2) || '0.00'} / 10.0</span>
          <span>Risk Level:</span> <span class="risk-${riskClass}">${riskClass.toUpperCase()}</span>
          <span>Network Size:</span> <span>/${subnet.networkSize || 24}</span>
          <span>Status:</span> <span class="${subnet.isVulnerable ? 'vulnerable' : 'secure'}">${subnet.isVulnerable ? '⚠ VULNERABLE' : '✓ Secure'}</span>
          ${subnet.vulnerableDeviceCount ? `<span>Vulnerable Devices:</span> <span class="vulnerable">${subnet.vulnerableDeviceCount}</span>` : ''}
        </div>
      </div>
    </div>
  `;
  this.show(event, content);
}

showDeviceTooltip(event: MouseEvent, device: any): void {
  const riskClass = this.getRiskClass(device.riskScore || 0, device.hasRiskScore);
  const content = `
    <div class="tooltip-content">
      <div class="tooltip-title">${device.hostname || 'Unknown Host'}</div>
      <div class="tooltip-body">
        <div class="tooltip-grid">
          <span>IP Address:</span> <span>${device.ip || 'N/A'}</span>
          <span>Device Type:</span> <span>${device.deviceType || 'Unknown'}</span>
          <span>Operating System:</span> <span>${device.os || 'Unknown'}</span>
          <span>Status:</span> <span class="status-${device.status?.toLowerCase()}">${device.status || 'Unknown'}</span>
          <span>Risk Score:</span> <span class="risk-${riskClass}">
            ${device.hasRiskScore === false ? 'No Score Available' : (device.riskScore?.toFixed(2) || '0.00') + ' / 10.0'}
          </span>
          <span>Risk Level:</span> <span class="risk-${riskClass}">
            ${device.hasRiskScore === false ? 'UNKNOWN' : riskClass.toUpperCase()}
          </span>
        </div>
        ${device.vulnerabilities?.length > 0 ? `
          <div class="tooltip-section">
            <div class="tooltip-section-title">Top Vulnerabilities:</div>
            <div class="vulnerability-list">
              ${device.vulnerabilities.slice(0, 3).map((vuln: string) => `<div class="vulnerability-item">• ${vuln}</div>`).join('')}
              ${device.vulnerabilities.length > 3 ? `<div class="vulnerability-more">... and ${device.vulnerabilities.length - 3} more</div>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  this.show(event, content);
}

  // Network group tooltip with comprehensive statistics
  showNetworkGroupTooltip(event: MouseEvent, group: any): void {
  const content = `
    <div class="tooltip-content">
      <div class="tooltip-title">${group.name} Organization</div>
      <div class="tooltip-body">
        <div class="tooltip-grid">
          <span>Subnets:</span> <span>${group.children?.length || 0}</span>
          <span>Total Devices:</span> <span>${group.totalDevices?.toLocaleString() || 0}</span>
          <span>Average Risk:</span> <span class="risk-score">${group.avgRisk?.toFixed(2) || '0.00'}</span>
          <span>Vulnerable Subnets:</span> <span class="${group.vulnerableCount > 0 ? 'vulnerable' : 'secure'}">${group.vulnerableCount > 0 ? `⚠ ${group.vulnerableCount}` : '✓ None'}</span>
          <span>Organization ID:</span> <span>${group.organizationId || 'Unknown'}</span>
          <span>Security Status:</span> <span class="${group.vulnerableCount > 0 ? 'vulnerable' : 'secure'}">${group.vulnerableCount > 0 ? 'HIGH RISK' : 'SECURE'}</span>
        </div>
        ${group.vulnerableCount > 0 ? `
          <div class="tooltip-section">
            <div class="tooltip-section-title">⚠ Security Alert:</div>
            <div class="security-alert">
              ${group.vulnerableCount} subnet${group.vulnerableCount > 1 ? 's' : ''} in this organization ${group.vulnerableCount > 1 ? 'have' : 'has'} security vulnerabilities requiring attention.
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  this.show(event, content);
}

showOrganizationTooltip(event: MouseEvent, org: any): void {
  const content = `
    <div class="tooltip-content">
      <div class="tooltip-title">${org.name}</div>
      <div class="tooltip-body">
        <div class="tooltip-grid">
          <span>Subnets:</span><span>${org.totalSubnets}</span>
          <span>Total Devices:</span><span>${org.totalDevices}</span>
          <span>Avg Risk Score:</span><span class="risk-${this.getRiskLevel(org.avgRiskScore)}">${org.avgRiskScore.toFixed(1)}</span>
          <span>High Risk Subnets:</span><span class="risk-${org.highRiskSubnets > 0 ? 'high' : 'low'}">${org.highRiskSubnets}</span>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center; color: #87CEEB; font-weight: 500;">
          📊 Click to view in treemap
        </div>
      </div>
    </div>
  `;
  
  this.show(event, content);
}

private getRiskLevel(riskScore: number): string {
  if (riskScore >= 8.0) return 'critical';
  if (riskScore >= 6.0) return 'high';  
  if (riskScore >= 4.0) return 'medium';
  return 'low';
}

  private getRiskClass(riskScore: number, hasRiskScore?: boolean): string {
  if (hasRiskScore === false) return 'no-score';
  if (riskScore >= 8.0) return 'critical';
  if (riskScore >= 6.0) return 'high';
  if (riskScore >= 4.0) return 'medium';
  if (riskScore >= 2.0) return 'low';
  return 'very-low';
}
}