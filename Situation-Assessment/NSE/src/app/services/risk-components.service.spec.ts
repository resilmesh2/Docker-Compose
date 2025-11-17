import { TestBed } from '@angular/core/testing';

import { RiskComponentsService } from './risk-components.service';

describe('RiskComponentsService', () => {
  let service: RiskComponentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RiskComponentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
