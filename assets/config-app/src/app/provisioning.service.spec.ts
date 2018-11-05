import { TestBed, inject } from '@angular/core/testing';

import { ProvisioningService } from './provisioning.service';

describe('ProvisioningService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProvisioningService]
    });
  });

  it('should be created', inject([ProvisioningService], (service: ProvisioningService) => {
    expect(service).toBeTruthy();
  }));
});
