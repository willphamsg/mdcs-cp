import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ParameterViewerService } from './parameter-viewer.service';
import { environment } from '@env/environment';
import DummyData from '@data/db.json';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { DepoService } from './depo.service';
import { PayloadResponse } from '../models/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { of } from 'rxjs';

describe('ParameterViewerService', () => {
  let service: ParameterViewerService;
  let httpMock: HttpTestingController;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;
  let mockDepoService: jasmine.SpyObj<DepoService>;

  beforeEach(() => {
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', ['setDynamicEndpoint']);
    mockDepoService = jasmine.createSpyObj('DepoService', [], {
      depoList$: of([]),
    });

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        ParameterViewerService,
        { provide: MessageService, useValue: mockMessageService },
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: DepoService, useValue: mockDepoService },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ParameterViewerService);
    httpMock = TestBed.inject(HttpTestingController);

    environment.useDummyData = true;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send getSystemParametersItems POST request', () => {
    environment.useDummyData = false;
    const mockResponse: PayloadResponse = {
      status: 200,
      status_code: 'SUCCESS',
      timestamp: Date.now(),
      message: 'OK',
      payload: {},
    };

    service.getSystemParametersItems(1).subscribe((data: PayloadResponse) => {
      expect(data).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${service['uri']}view-group-list-by-type-Id`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should return dummy depot data when useDummyData is true', () => {
    const expectedData = DummyData.parameter_viewer_depot_data;

    service.getSelectedDepotData('').subscribe(data => {
      expect(data).toEqual(expectedData);
    });
  });

  it('should return dummy bus list data when useDummyData is true', () => {
    service.getBusList('').subscribe(data => {
      expect(data).toBeTruthy();
    });
  });

  it('should get bus list when useDummyData is false', () => {
    environment.useDummyData = false;
    const expectedData = DummyData.daily_bus_list;

    service.getBusList('').subscribe(data => {
      expect(data).toEqual(expectedData as any);
    });

    const req = httpMock.expectOne('');
    expect(req.request.method).toBe('GET');
    req.flush(expectedData);
  });

  it('should return getParameter list data when useDummyData is true', () => {
    const expectedData = DummyData.parameter_list;

    service.getParameterList('').subscribe(data => {
      expect(data).toEqual(expectedData);
    });
  });

  it('should return dummy bus cash fare details when useDummyData is true', () => {
    const expectedData = DummyData.parameter_bus_cash_fare;

    service.getBusCashFareDetails('', '').subscribe(data => {
      expect(data).toEqual(expectedData);
    });
  });

  it('should return bus cash fare details when useDummyData is false', () => {
    environment.useDummyData = false;
    const expectedData = DummyData.parameter_bus_cash_fare;

    service.getBusCashFareDetails('', '').subscribe(data => {
      expect(data).toEqual(expectedData);
    });

    const req = httpMock.expectOne('');
    expect(req.request.method).toBe('GET');
    req.flush(expectedData);
  });

  it('should use HTTP client when useDummyData is false for getUserAccessDetails', () => {
    environment.useDummyData = false;

    service.getUserAccessDetails().subscribe(data => {
      expect(data).toBeTruthy();
    });

    const req = httpMock.expectOne('');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
