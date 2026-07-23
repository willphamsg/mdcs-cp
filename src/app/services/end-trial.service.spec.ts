import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EndTrialService } from './end-trial.service';
import { environment } from '@env/environment';
import { IEndTrial } from '../models/parameter-trial';
import { IParams, PayloadResponse } from '../models/common';
import DummyData from '@data/db.json';
import { of } from 'rxjs';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('EndTrialService', () => {
  let service: EndTrialService;
  let httpMock: HttpTestingController;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;

  const mockParams: IEndTrial[] = DummyData.end_trial_list as any;

  const mockResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  const mockBusRequest: IParams = {
    page_size: 5,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {},
  };

  beforeEach(() => {
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', [
      'setDynamicEndpoint',
    ]);

    TestBed.configureTestingModule({
    imports: [],
    providers: [
        EndTrialService,
        { provide: MessageService, useValue: mockMessageService },
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
});

    service = TestBed.inject(EndTrialService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('search', () => {
    it('should return dummy data when useDummyData is true', () => {
      spyOn(service, 'search').and.callFake(() => of(mockResponse));

      environment.useDummyData = true;

      service.search(mockBusRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });

    it('should send search request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.search(mockBusRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}search`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('add', () => {
    it('should return dummy data when useDummyData is true for add', () => {
      spyOn(service, 'search').and.callFake(() => of(mockResponse));

      environment.useDummyData = true;

      service.search(mockBusRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });

    it('should send an add request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.add(mockParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}add`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('update', () => {
    it('should return dummy data when useDummyData is true for update', () => {
      spyOn(service, 'search').and.callFake(() => of(mockResponse));

      environment.useDummyData = true;

      service.search(mockBusRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });

    it('should send an update request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.update(mockParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}update`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });
  });

  describe('delete', () => {
    it('should return dummy data when useDummyData is true', () => {
      spyOn(service, 'search').and.callFake(() => of(mockResponse));

      environment.useDummyData = true;

      service.search(mockBusRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });
    it('should send a delete request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.delete(mockParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}delete`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });
  });
});
