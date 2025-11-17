import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkGraphComponent } from './network-graph.component';

describe('NetworkGraphComponent', () => {
  let component: NetworkGraphComponent;
  let fixture: ComponentFixture<NetworkGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetworkGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NetworkGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
