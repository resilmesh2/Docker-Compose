import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { colorLookupTable } from "./colorLookupTable";

@Component({
  selector: 'cvss-chip',
  templateUrl: 'cvss-chip.component.html',
  styleUrl: 'cvss-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})

export class CvssChipComponent {
  score = input<number | null>(null);
  type = input<2 | 3 | 4>(3); // 2 for CVSS v2, 3 for CVSS v3, 4 for CVSS v4
  tooltip = input<string>('CVSS Score');
  //label = computed(() => scoreToClassCVSS(this.score(), this.type()));

  label = input<string | undefined>('unknown');
  property = input<string>('base_severity'); // Default to base_severity
  version = input<string>('v31'); // Default to v31

  propertySeverity = computed(() => {
    if (!this.label()) return 'unknown';
    const propertyTable = colorLookupTable[this.version()]?.[this.property().toLowerCase()] || colorLookupTable['default'][this.property().toLowerCase()] || {};
    return propertyTable[this.label()?.toLowerCase() ?? 'unknown'] || 'unknown';
  });

  color = computed(() => {
    console.log('Computing color for:', this.label(), this.property(), this.version());

    switch (this.property() != 'base_severity' ? this.propertySeverity() : this.label()?.toLowerCase()) {
      case 'none':
        return '#86B46A';
      case 'low':
        return '#f6d55c'; // '#f2cc0c', #f6d55c, #d4edda
      case 'medium':
        return '#ed913b'; // '#ec971f', #ed913b, #fff3cd
      case 'high':
        return '#ed625e'; // '#d9534f', #f44336, #f8d7da
      case 'critical':
        return '#1C1D21';
      default:
        return '#cacaca';
    }
  });

  labelColor = computed(() => {
    return this.label() == 'critical' ? '#ffff': '#1C1D21';
  });
}