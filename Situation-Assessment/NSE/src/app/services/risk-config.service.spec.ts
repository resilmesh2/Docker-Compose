import { TestBed } from '@angular/core/testing';

import { RiskConfigService } from './risk-config.service';

describe('RiskConfigService', () => {
  let service: RiskConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RiskConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
