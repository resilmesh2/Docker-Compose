import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

@Component({
  selector: 'status-chip',
  templateUrl: 'status-chip.component.html',
  styleUrl: 'status-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})

export class StatusChipComponent {
  label = input<string | undefined>('unknown');

  // TODO : Configure colors to be different from cvss-chip
  color = computed(() => {
    switch (this.label()?.toLowerCase()) {
      case 'discovered':
        return '#A1D2CE';
      case 'confirmed':
        return '#F45B69';
      case 'assessed':
        return '#d26d0f';
      case 'reassessed':
        return '#f1c037';
      case 'contained':
        return '#86B46A';
      case 'verified':
        return '#4CAF50';
      default:
        return '#cacaca';
    }
  });

  labelColor = computed(() => {
    return this.label() == 'critical' ? '#ffff': '#1C1D21';
  });
}