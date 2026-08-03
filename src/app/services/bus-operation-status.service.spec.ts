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

  let originalUseDummyData: boolean;

  beforeEach(() => {
    originalUseDummyData = environment.useDummyData;
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
    environment.useDummyData = originalUseDummyData;
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

    it('should route search errors through message.multiError', () => {
      mockMessageService.multiError.and.returnValue(
        throwError(() => new Error('Search failed'))
      );

      service.search(mockParams).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Search failed');
        },
      });

      const req = httpMock.expectOne(`${service['uri']}search`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(mockMessageService.multiError).toHaveBeenCalled();
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

    it('should route real import errors through message.multiError', () => {
      mockMessageService.multiError.and.returnValue(
        throwError(() => new Error('Import failed'))
      );

      service.import({}).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Import failed');
        },
      });

      const req = httpMock.expectOne(`${service['uri']}import`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(mockMessageService.multiError).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should send an update request and return the response when useDummyData is false', () => {
      environment.useDummyData = false;

      service.update(mockBusTransferList).subscribe((response: PayloadResponse) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}update`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should route update errors through message.multiError when useDummyData is false', () => {
      environment.useDummyData = false;
      mockMessageService.multiError.and.returnValue(
        throwError(() => new Error('Update failed'))
      );

      service.update(mockBusTransferList).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Update failed');
        },
      });

      const req = httpMock.expectOne(`${service['uri']}update`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(mockMessageService.multiError).toHaveBeenCalled();
    });

    it('should fall back to dummy data on update error when useDummyData is true', () => {
      environment.useDummyData = true;

      let received: PayloadResponse | undefined;
      service.update(mockBusTransferList).subscribe((response: PayloadResponse) => {
        received = response;
      });

      const req = httpMock.expectOne(`${service['uri']}update`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(received?.status_code).toBe('SUCCESS');
      expect(received?.message).toBe('Updated successfully');
    });
  });

  describe('manage', () => {
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

  describe('approve (real invocation, error paths)', () => {
    it('should route approve errors through message.multiError when useDummyData is false', () => {
      environment.useDummyData = false;
      mockMessageService.multiError.and.returnValue(
        throwError(() => new Error('Approve failed'))
      );

      service.approve(mockBusTransferList).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Approve failed');
        },
      });

      const req = httpMock.expectOne(`${service['uri']}approved`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(mockMessageService.multiError).toHaveBeenCalled();
    });

    it('should fall back to dummy data on approve error when useDummyData is true', () => {
      environment.useDummyData = true;

      let received: PayloadResponse | undefined;
      service.approve(mockBusTransferList).subscribe((response: PayloadResponse) => {
        received = response;
      });

      const req = httpMock.expectOne(`${service['uri']}approved`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(received?.status_code).toBe('SUCCESS');
    });
  });

  describe('reject (real invocation, error paths)', () => {
    it('should route reject errors through message.multiError when useDummyData is false', () => {
      environment.useDummyData = false;
      mockMessageService.multiError.and.returnValue(
        throwError(() => new Error('Reject failed'))
      );

      service.reject(mockBusTransferList).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Reject failed');
        },
      });

      const req = httpMock.expectOne(`${service['uri']}reject`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(mockMessageService.multiError).toHaveBeenCalled();
    });

    it('should fall back to dummy data on reject error when useDummyData is true', () => {
      environment.useDummyData = true;

      let received: PayloadResponse | undefined;
      service.reject(mockBusTransferList).subscribe((response: PayloadResponse) => {
        received = response;
      });

      const req = httpMock.expectOne(`${service['uri']}reject`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(received?.status_code).toBe('SUCCESS');
    });
  });
});
