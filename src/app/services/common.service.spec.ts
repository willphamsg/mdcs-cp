import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { DepoRequest, IOperatorList, PayloadResponse } from '../models/common';
import { DynamicEndpoint } from './dynamic-endpoint';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { CommonService } from './common.service';
import { MessageService } from './message.service';
import { IDepoList } from '@app/models/depo';

function makeKeyEvent(opts: {
  key: string;
  value: string;
  selectionStart: number | null;
  selectionEnd?: number | null;
}): KeyboardEvent {
  const target = {
    value: opts.value,
    selectionStart: opts.selectionStart,
    selectionEnd:
      opts.selectionEnd === undefined ? opts.selectionStart : opts.selectionEnd,
  } as unknown as HTMLInputElement;

  return {
    key: opts.key,
    target,
    preventDefault: jasmine.createSpy('preventDefault'),
  } as unknown as KeyboardEvent;
}

describe('CommonService', () => {
  let service: CommonService;
  let httpClientMock: HttpClient;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let originalUseDummyData: boolean;

  const mockParams: DepoRequest = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 1,
    page_index: 1,
    sort_order: [],
  };

  const mockResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  beforeEach(() => {
    originalUseDummyData = environment.useDummyData;

    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', [
      'setDynamicEndpoint',
    ]);

    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        CommonService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: MessageService, useValue: mockMessageService },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CommonService);
    httpClientMock = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    environment.useDummyData = originalUseDummyData;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateBusNumber', () => {
    it('should allow control keys without further validation', () => {
      const event = makeKeyEvent({ key: 'Backspace', value: 'SBS1234', selectionStart: 3 });

      const result = service.validateBusNumber(event);

      expect(result).toBeTrue();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should block non-alphanumeric keys', () => {
      const event = makeKeyEvent({ key: '!', value: 'SBS', selectionStart: 3 });

      const result = service.validateBusNumber(event);

      expect(result).toBeFalse();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should default cursor/selection positions to 0 when they are null', () => {
      const event = makeKeyEvent({
        key: 'S',
        value: '',
        selectionStart: null,
        selectionEnd: null,
      });

      const result = service.validateBusNumber(event);

      expect(result).toBeTrue();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should block input once the simulated value exceeds 8 characters', () => {
      const event = makeKeyEvent({ key: '6', value: 'SBS12345', selectionStart: 8 });

      const result = service.validateBusNumber(event);

      expect(result).toBeFalse();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should block input that does not match the live bus-number pattern', () => {
      const event = makeKeyEvent({ key: '1', value: 'ABCD', selectionStart: 4 });

      const result = service.validateBusNumber(event);

      expect(result).toBeFalse();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should allow input that matches the live bus-number pattern', () => {
      const event = makeKeyEvent({ key: '4', value: 'SBS123', selectionStart: 6 });

      const result = service.validateBusNumber(event);

      expect(result).toBeTrue();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('updateOperatorList', () => {
    it('should push the updated operator list to subscribers', () => {
      const operators: IOperatorList[] = [
        { id: 1, svc_prov_id: 100, svc_prov_code: 'SBST', svc_prov_name: 'SBS Transit' },
      ];

      let emitted: IOperatorList[] | undefined;
      service.operatorList$.subscribe(value => (emitted = value));

      service.updateOperatorList(operators);

      expect(emitted).toEqual(operators);
    });
  });

  describe('getDepotIds', () => {
    it('should map depot_id from each depot item', () => {
      const depots: IDepoList[] = [
        { id: 1, version: 1, depot_id: '1', depot_code: 'HD', depot_name: 'Hougang Depot' },
        { id: 2, version: 1, depot_id: '2', depot_code: 'BD', depot_name: 'Bishan Depot' },
      ];

      const result = service.getDepotIds(depots);

      expect(result).toEqual(['1', '2']);
    });

    it('should return an empty array when given no depots', () => {
      expect(service.getDepotIds([])).toEqual([]);
    });
  });

  describe('search', () => {
    it('should send a search request and return data', (done: DoneFn) => {
      service.search(mockParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
        done();
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

  describe('getSettingDefault', () => {
    it('should send a GET request and return the default settings', () => {
      service.getSettingDefault().subscribe(response => {
        expect(response).toEqual({ foo: 'bar' });
      });

      const req = httpMock.expectOne(`${service['uriSettings']}settings/default`);
      expect(req.request.method).toBe('GET');
      req.flush({ foo: 'bar' });
    });
  });

  describe('getGeneralInformation', () => {
    it('should return hardcoded dummy general information when useDummyData is false', done => {
      environment.useDummyData = false;

      service.getGeneralInformation(false).subscribe(response => {
        expect(response.status).toBe(200);
        expect(response.payload.general_information.service_provider).toBe('SBST');
        done();
      });
    });

    it('should send a GET request when useDummyData is true', () => {
      environment.useDummyData = true;

      service.getGeneralInformation(true).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${environment.gateway}general-information`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should propagate an error via MessageService.multiError when useDummyData is true', () => {
      environment.useDummyData = true;

      service.getGeneralInformation(false).subscribe({
        next: () => fail('should have errored'),
        error: () => {
          expect(mockMessageService.multiError).toHaveBeenCalled();
        },
      });

      const req = httpMock.expectOne(`${environment.gateway}general-information`);
      req.flush('boom', { status: 500, statusText: 'Server Error' });
    });
  });
});
