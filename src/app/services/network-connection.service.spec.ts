import { TestBed } from '@angular/core/testing';
import { NetworkConnectionService } from './network-connection.service';

describe('NetworkConnectionService', () => {
  let service: NetworkConnectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NetworkConnectionService],
    });

    service = TestBed.inject(NetworkConnectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have an online$ observable', () => {
    expect(service.online$).toBeTruthy();
  });

  it('should emit the current online status', (done: DoneFn) => {
    service.online$.subscribe((isOnline: boolean) => {
      expect(typeof isOnline).toBe('boolean');
      done();
    });
  });
});
