import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';
import { PayloadResponse } from '../models/common';
import { UserService } from './user.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;

  const mockResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: 121231,
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  beforeEach(() => {
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', ['setDynamicEndpoint']);

    TestBed.configureTestingModule({
    imports: [],
    providers: [
        UserService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
});

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send profile request', () => {
    service.userProfile().subscribe((response: PayloadResponse) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${service['uri']}profile/fetch`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
