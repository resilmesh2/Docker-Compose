import { TestBed } from '@angular/core/testing';

import { ComponentConfigService } from './component-config.service';

describe('ComponentConfigService', () => {
  let service: ComponentConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ComponentConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
