import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { IActionHistoryParams, IParams, PayloadResponse } from '../models/common';
import {
  INewParameterApproval,
  IParameterModeActionRequest,
  IValidateLiveRequest,
} from '../models/parameter-trial';
import { DynamicEndpoint } from './dynamic-endpoint';
import { MessageService } from './message.service';
import { ParameterService } from './parameter.service';

describe('ParameterService', () => {
  let service: ParameterService;
  let httpMock: HttpTestingController;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;
  let originalUseDummyData: boolean;

  const mockParams: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {},
  };

  const mockHistoryParams: IActionHistoryParams = {
    search_select_filter: {},
    search_text: '',
  };

  const mockResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: 121231,
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  beforeEach(() => {
    originalUseDummyData = environment.useDummyData;

    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', [
      'setDynamicEndpoint',
    ]);
    const mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        ParameterService,
        { provide: MessageService, useValue: mockMessageService },
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: MatDialog, useValue: mockMatDialog },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ParameterService);
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
    it('should send a search request and return data', () => {
      service.search(mockParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}search`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should propagate an error via MessageService.multiError', () => {
      service.search(mockParams).subscribe({
        next: () => fail('should have errored'),
        error: () => {
          expect(mockMessageService.multiError).toHaveBeenCalled();
        },
      });

      const req = httpMock.expectOne(`${service['uri']}search`);
      req.flush('boom', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('historySearch / searchHistory', () => {
    it('should send a history search request and return data', () => {
      service.historySearch(mockHistoryParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uriHistorySearch']}search`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should propagate an error via MessageService.multiError from historySearch', () => {
      service.historySearch(mockHistoryParams).subscribe({
        next: () => fail('should have errored'),
        error: () => {
          expect(mockMessageService.multiError).toHaveBeenCalled();
        },
      });

      const req = httpMock.expectOne(`${service['uriHistorySearch']}search`);
      req.flush('boom', { status: 500, statusText: 'Server Error' });
    });

    it('should delegate searchHistory to historySearch', () => {
      spyOn(service, 'historySearch').and.callThrough();

      service.searchHistory(mockHistoryParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      expect(service.historySearch).toHaveBeenCalledWith(mockHistoryParams);
      const req = httpMock.expectOne(`${service['uriHistorySearch']}search`);
      req.flush(mockResponse);
    });
  });

  describe('searchError', () => {
    it('should return dummy data when useDummyData is true', () => {
      environment.useDummyData = true;

      service.searchError(mockHistoryParams).subscribe(response => {
        expect(response.status_code).toBe('INFO 4400');
        expect(response.payload.records_count).toBe(0);
      });
    });

    it('should default the component type to "unknown" when none is provided', () => {
      environment.useDummyData = false;

      service.searchError(mockHistoryParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uriHistorySearch']}search-error`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body._component).toBe('unknown');
      req.flush(mockResponse);
    });

    it('should include the provided component type in the request body', () => {
      environment.useDummyData = false;

      service.searchError(mockHistoryParams, 'end-trial').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uriHistorySearch']}search-error`);
      expect(req.request.body._component).toBe('end-trial');
      req.flush(mockResponse);
    });

    it('should propagate an error via MessageService.multiError', () => {
      environment.useDummyData = false;

      service.searchError(mockHistoryParams).subscribe({
        next: () => fail('should have errored'),
        error: () => {
          expect(mockMessageService.multiError).toHaveBeenCalled();
        },
      });

      const req = httpMock.expectOne(`${service['uriHistorySearch']}search-error`);
      req.flush('boom', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('component-specific error search delegates', () => {
    beforeEach(() => {
      environment.useDummyData = false;
      spyOn(service, 'searchError').and.callThrough();
    });

    it('should delegate searchNewParameterApprovalErrors with the right component type', () => {
      service.searchNewParameterApprovalErrors(mockHistoryParams).subscribe();

      expect(service.searchError).toHaveBeenCalledWith(
        mockHistoryParams,
        'new-parameter-approval'
      );
      const req = httpMock.expectOne(`${service['uriHistorySearch']}search-error`);
      req.flush(mockResponse);
    });

    it('should delegate searchParameterModeErrors with the right component type', () => {
      service.searchParameterModeErrors(mockHistoryParams).subscribe();

      expect(service.searchError).toHaveBeenCalledWith(mockHistoryParams, 'parameter-mode');
      const req = httpMock.expectOne(`${service['uriHistorySearch']}search-error`);
      req.flush(mockResponse);
    });

    it('should delegate searchEndTrialErrors with the right component type', () => {
      service.searchEndTrialErrors(mockHistoryParams).subscribe();

      expect(service.searchError).toHaveBeenCalledWith(mockHistoryParams, 'end-trial');
      const req = httpMock.expectOne(`${service['uriHistorySearch']}search-error`);
      req.flush(mockResponse);
    });
  });

  describe('manage', () => {
    const mockApprovalList: INewParameterApproval[] = [];

    it('should return dummy data when useDummyData is true', () => {
      environment.useDummyData = true;

      service.manage(mockApprovalList, 'Accept').subscribe(response => {
        expect(response.status_code).toBe('SUCCESS');
      });
    });

    it('should send a request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.manage(mockApprovalList, 'Accept').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}Accept`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('validateLive', () => {
    it('should send a validate-live request', () => {
      const params: IValidateLiveRequest[] = [
        { param_master_id: 1, depot_id: 1, parameter_name: 'p', parameter_version: '1' },
      ];

      service.validateLive(params).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}validate-live`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('live', () => {
    it('should send a live request', () => {
      const params: IParameterModeActionRequest[] = [
        { parameter_status: {}, scenario_reply: { acknowledged: true } },
      ];

      service.live(params).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}live`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('validateTrial', () => {
    it('should send a validate-trial request', () => {
      const params: IValidateLiveRequest[] = [
        { param_master_id: 1, depot_id: 1, parameter_name: 'p', parameter_version: '1' },
      ];

      service.validateTrial(params).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}validate-trial`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('trial', () => {
    it('should send a trial request', () => {
      const params: IParameterModeActionRequest[] = [
        { parameter_status: {}, scenario_reply: { acknowledged: false } },
      ];

      service.trial(params).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}trial`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('getTrialSchedulerRateSeconds', () => {
    it('should send a GET request and return data', () => {
      service.getTrialSchedulerRateSeconds().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uriScheduler']}trialRateSeconds`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should propagate an error via MessageService.multiError', () => {
      service.getTrialSchedulerRateSeconds().subscribe({
        next: () => fail('should have errored'),
        error: () => {
          expect(mockMessageService.multiError).toHaveBeenCalled();
        },
      });

      const req = httpMock.expectOne(`${service['uriScheduler']}trialRateSeconds`);
      req.flush('boom', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getImportRateSeconds', () => {
    it('should send a GET request and return data', () => {
      service.getImportRateSeconds().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uriScheduler']}importRateSeconds`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should propagate an error via MessageService.multiError', () => {
      service.getImportRateSeconds().subscribe({
        next: () => fail('should have errored'),
        error: () => {
          expect(mockMessageService.multiError).toHaveBeenCalled();
        },
      });

      const req = httpMock.expectOne(`${service['uriScheduler']}importRateSeconds`);
      req.flush('boom', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getExportRateSeconds', () => {
    it('should send a GET request and return data', () => {
      service.getExportRateSeconds().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uriScheduler']}exportRateSeconds`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should propagate an error via MessageService.multiError', () => {
      service.getExportRateSeconds().subscribe({
        next: () => fail('should have errored'),
        error: () => {
          expect(mockMessageService.multiError).toHaveBeenCalled();
        },
      });

      const req = httpMock.expectOne(`${service['uriScheduler']}exportRateSeconds`);
      req.flush('boom', { status: 500, statusText: 'Server Error' });
    });
  });
});
