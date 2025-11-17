import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, output, signal, Signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { SentinelButtonWithIconComponent } from "@sentinel/components/button-with-icon";
import { Agenda, AgendaContainer } from "@sentinel/layout";


@Component({
  selector: 'agenda-container',
  templateUrl: 'agenda-container.component.html',
  styleUrls: ['agenda-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
  ],
  standalone: true
})

export class AgendaContainerComponent {

    private router = inject(Router);
    readonly maxNavElementLength = input(19);

    readonly agendaContainer: InputSignal<AgendaContainer | undefined> = input();
    readonly agendaSelected = output<Agenda>();
    agendas = computed(() => this.agendaContainer()?.children.map(agenda => agenda as Agenda) || []);

    isCollapsed = signal<boolean>(false);

    /**
     * Emits event when agenda is selected
     * @param agenda selected agenda
     */
    onAgendaSelected(agenda: Agenda) {
        this.agendaSelected.emit(agenda);
    }

    navigateToAgenda(link: string): void {
        this.router.navigate([link]);
    }

    constructor() {
    }

    toggleCollapse(): void {
        this.isCollapsed.set(!this.isCollapsed());
    }
}