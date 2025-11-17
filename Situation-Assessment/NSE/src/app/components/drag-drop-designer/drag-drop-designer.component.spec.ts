import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DragDropDesignerComponent } from './drag-drop-designer.component';

describe('DragDropDesignerComponent', () => {
  let component: DragDropDesignerComponent;
  let fixture: ComponentFixture<DragDropDesignerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DragDropDesignerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DragDropDesignerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
