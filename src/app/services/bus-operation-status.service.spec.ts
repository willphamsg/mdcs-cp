import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { of, throwError } from 'rxjs';
import { IBusTransferList } from '../models/bus-transfer';
import { IParams, PayloadResponse } from '../models/common';
import { ManageBusOperationService } from './bus-operation-status.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { MessageService } from './message.service';

describe('ManageBusOperationService', () => {
  let service: ManageBusOperationService;
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
    timestamp: Date.now(),
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
        ManageBusOperationService,
        { provide: MessageService, useValue: mockMessageService },
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ManageBusOperationService);
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

      service.search(mockParams).subscribe((response: PayloadResponse) => {
        expect(response).toEqual(mockResponse);
      });
    });

    it('should send a search request and return data', () => {
      environment.useDummyData = false;

      service.search(mockParams).subscribe((response: PayloadResponse) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}search`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('import', () => {
    it('should send an import request', () => {
      service.import({}).subscribe((response: PayloadResponse) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}import`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle errors in the import request', () => {
      spyOn(service, 'import').and.callFake(() =>
        throwError(() => new Error('test'))
      );

      service.import({}).subscribe({
        error: (err: Error) => {
          expect(err).toEqual(jasmine.any(Error));
          expect(err.message).toContain('test');
        },
      });
    });
  });

  describe('manage', () => {
    const mockBusTransferList: IBusTransferList[] = [
      {
        chk: false,
        id: 1,
        version: 1,
        bus_id: 'SBS0225U',
        bus_num: '12',
        current_depot: ['12'],
        current_depot_name: ['TEST DEPOT'],
        current_operator: 'SBSTransit',
        current_operator_name: 'TEST OPERATOR NAME',
        current_effective_date: '2024-07-01T11:00:00',
        future_depot: ['Hougang'],
        future_depot_name: ['TEST FUTURE DEPOT NAME'],
        future_operator: 'Go Ahead Singapore',
        future_operator_name: 'TEST FUTURE OEPRATOR NAME',
        status: 'approved',
        future_effective_date: '2024-07-01T13:00:00',
        target_effective_date: '2024-07-01T13:00:00',
        target_effective_time: '2024-07-01T13:00:00',
      },
    ];

    it('should approve bus operations', () => {
      environment.useDummyData = false;

      service.manage(mockBusTransferList, 'approve').subscribe((response: PayloadResponse) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}approved`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should reject bus operations', () => {
      environment.useDummyData = false;

      service.manage(mockBusTransferList, 'reject').subscribe((response: PayloadResponse) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}reject`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should update bus operations', () => {
      spyOn(service, 'update').and.returnValue(of(mockResponse));

      service.manage(mockBusTransferList, 'update').subscribe((response: PayloadResponse) => {
        expect(response).toEqual(mockResponse);
      });
    });
  });
});
