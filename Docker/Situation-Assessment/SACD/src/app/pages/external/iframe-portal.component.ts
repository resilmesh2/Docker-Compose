import { Component, input, InputSignal, OnInit, signal, WritableSignal } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: 'iframe-portal',
  templateUrl: './iframe-portal.component.html',
  styleUrls: ['./iframe-portal.component.scss'],
  imports: [],
})

export class IframePortalComponent implements OnInit {
    src: WritableSignal<string> = signal('');
    safeURL: SafeResourceUrl | null = null;

    constructor(private sanitizer: DomSanitizer, private route: ActivatedRoute) {
    }

    ngOnInit(): void {
      console.log(this.src());
      this.route.data.subscribe(data => {
        this.src.set(data['iframeSrc']);
      }).unsubscribe();

      this.safeURL = this.sanitizer.bypassSecurityTrustResourceUrl(this.src());
    }
}