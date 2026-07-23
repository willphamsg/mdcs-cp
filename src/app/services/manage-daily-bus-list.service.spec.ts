import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { of } from 'rxjs';
import { IParams, PayloadResponse } from '../models/common';
import { DynamicEndpoint } from './dynamic-endpoint';
import { ManageDailyBusListService } from './manage-daily-bus-list.service';
import { MessageService } from './message.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('ManageDailyBusListService', () => {
  let service: ManageDailyBusListService;
  let httpMock: HttpTestingController;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;

  const mockParams: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {},
  };
  const mockResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: 123123,
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  beforeEach(() => {
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', [
      'setDynamicEndpoint',
    ]);

    TestBed.configureTestingModule({
    imports: [],
    providers: [
        ManageDailyBusListService,
        { provide: MessageService, useValue: mockMessageService },
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
});

    service = TestBed.inject(ManageDailyBusListService);
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

      service.search(mockParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });

    it('should send search request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.search(mockParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}search`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('add', () => {
    it('should return dummy data when useDummyData is true for add', () => {
      spyOn(service, 'add').and.callFake(() => of(mockResponse));

      environment.useDummyData = true;

      service.add([]).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });

    it('should send an add request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.add([]).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}add`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('update', () => {
    it('should return dummy data when useDummyData is true for update', () => {
      spyOn(service, 'update').and.callFake(() => of(mockResponse));

      environment.useDummyData = true;

      service.update([]).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });

    it('should send an update request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.update([]).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}update`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockResponse);
    });
  });

  describe('delete', () => {
    it('should return dummy data when useDummyData is true', () => {
      spyOn(service, 'delete').and.callFake(() => of(mockResponse));

      environment.useDummyData = true;

      service.delete([]).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });
    it('should send a delete request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.delete([]).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}delete`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });
  });
});
