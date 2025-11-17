import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, output, signal, Signal } from "@angular/core";
import { MatTooltip } from "@angular/material/tooltip";
import { Router } from "@angular/router";
import { Agenda, AgendaContainer } from "@sentinel/layout";
import { SentinelLayoutI18nService, SentinelNavI18n } from "@sentinel/layout/i18n";
import { MatDivider } from '@angular/material/divider';
import { NgClass } from "@angular/common";
import { AgendaContainerComponent } from "./agenda-container/agenda-container.component";


@Component({
  selector: 'custom-nav',
  templateUrl: 'custom-nav.component.html',
  styleUrls: ['custom-nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltip, MatDivider, NgClass, AgendaContainerComponent
  ],
  standalone: true
})

export class CustomNavComponent {
    readonly i18nService? = inject(SentinelLayoutI18nService, { optional: true });

    readonly maxNavElementLength = input(19);
    readonly topLevelAgendaContainersCollapsed = input<boolean>();
    readonly footerExtraContent = input(false);

    readonly version = input<string>("2.0.0");
    readonly logoSrc: InputSignal<string | undefined> = input();
    readonly agendaContainers: InputSignal<AgendaContainer[] | undefined> = input();
    readonly agendaSelected = output<Agenda>();

    i18n: Signal<SentinelNavI18n>;

    /**
     * Emits event when agenda is selected
     * @param agenda selected agenda
     */
    onAgendaSelected(agenda: Agenda) {
        this.agendaSelected.emit(agenda);
    }

    constructor() {
        const i18nFallback: SentinelNavI18n = {
            versionTooltip: 'Version of the application',
        };
        this.i18n = this.i18nService?.stateSig()
            ? computed(() => this.i18nService?.stateSig().nav ?? i18nFallback)
            : signal(i18nFallback);
    }

    router = inject(Router);

    navigateToHome(): void {
      this.router.navigateByUrl('/').then(() => {
        //window.location.reload();
      }); 
    }

}