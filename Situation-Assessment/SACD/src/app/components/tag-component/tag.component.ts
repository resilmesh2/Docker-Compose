import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ENTER } from '@angular/cdk/keycodes';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, Input, InputSignal, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'tag-component',
  templateUrl: 'tag-component.html',
  styleUrl: 'tag-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    MatFormFieldModule, 
    MatChipsModule, 
    MatIconModule, 
    MatAutocompleteModule, 
    FormsModule, 
    MatTooltipModule
  ]
})

export class TagComponent {
  readonly separatorKeysCodes: number[] = [ENTER];
  readonly currentTag = model('');
  readonly tags = signal<string[]>([]);
  readonly tagsCache = signal<string[]>([]);
  readonly editOn = signal<boolean>(false);
  readonly filteredTags = computed(() => {
    const currentTag = this.currentTag().toLowerCase();
    return currentTag
      ? this.allTags.filter(tag => tag.toLowerCase().includes(currentTag))
      : this.allTags.slice();
  });

  inputTags: InputSignal<string[]> = input<string[]>([]);
  @Input() allTags: string[] = [];
  @Input() onSubmit: (id: string, tags: string[]) => void = () => null;
  @Input() id: string = "";

  readonly announcer = inject(LiveAnnouncer);

  ngOnInit(): void {
    this.tags.set(this.inputTags());
    this.tagsCache.set([...this.inputTags()]);
    console.log('Tags initialized:', this.tags());
    console.log('ID:', this.id);
  }


  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (value && !this.tags().includes(value)) {
      this.tags.update(tags => [...tags, value]);
    }

    event.chipInput!.clear();
    this.currentTag.set('');
  }

  remove(tag: string): void {
    this.tags.update(tags => {
      const index = tags.indexOf(tag);
      if (index < 0) {
        return tags;
      }

      tags.splice(index, 1);
      this.announcer.announce(`Removed ${tag}`);
      return [...tags];
    });
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    if (!this.tags().includes(event.option.viewValue)) {
      this.tags.update(tags => [...tags, event.option.viewValue]);
    }
    this.currentTag.set('');
    event.option.deselect();
  }

  changeEditStatus(): void {
    if (this.editOn()) {
      this.tagsCache.set([...this.tags()]);
    }
    this.editOn.update(editStatus => !editStatus)
  }

  saveChanges(): void {
    this.changeEditStatus();
    this.onSubmit(this.id, this.tags())
  }
  
  discardChanges(): void {
    this.tags.set(this.tagsCache());
    this.changeEditStatus();
  }
}