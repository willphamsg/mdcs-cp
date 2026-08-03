import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ParameterViewerService } from './parameter-viewer.service';
import { environment } from '@env/environment';
import DummyData from '@data/db.json';
import Param_BLS1ConfigGrid from '@data/Param_BLS1ConfigGrid.json';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { DepoService } from './depo.service';
import { PayloadResponse } from '../models/common';
import { IDepoList } from '@app/models/depo';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { of } from 'rxjs';

describe('ParameterViewerService', () => {
  let service: ParameterViewerService;
  let httpMock: HttpTestingController;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let originalUseDummyData: boolean;

  beforeEach(() => {
    originalUseDummyData = environment.useDummyData;

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
    environment.useDummyData = originalUseDummyData;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSystemParametersTab', () => {
    it('should send a GET request and return data', () => {
      const mockResponse: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'OK',
        payload: {},
      };

      service.getSystemParametersTab().subscribe((data: PayloadResponse) => {
        expect(data).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}view-device-types`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should propagate an error via MessageService.multiError', () => {
      service.getSystemParametersTab().subscribe({
        next: () => fail('should have errored'),
        error: () => {
          expect(mockMessageService.multiError).toHaveBeenCalled();
        },
      });

      const req = httpMock.expectOne(`${service['uri']}view-device-types`);
      req.flush('boom', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getSystemParametersItems', () => {
    it('should still send a POST request when useDummyData is true', () => {
      environment.useDummyData = true;
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
      expect(req.request.body).toEqual({ id: 1 });
      req.flush(mockResponse);
    });

    it('should send getSystemParametersItems POST request when useDummyData is false', () => {
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
  });

  describe('getDataSource', () => {
    it('should send a POST request and return data', () => {
      const mockResponse: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'OK',
        payload: {},
      };

      service.getDataSource({ fileId: 'f1' }).subscribe(data => {
        expect(data).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}view-parameter-file-by-file-id`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('getSelectedDepotData', () => {
    it('should return dummy depot data when useDummyData is true', () => {
      const expectedData = DummyData.parameter_viewer_depot_data;

      service.getSelectedDepotData('').subscribe(data => {
        expect(data).toEqual(expectedData);
      });
    });

    it('should send a GET request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.getSelectedDepotData('depot-1').subscribe(data => {
        expect(data).toBeTruthy();
      });

      const req = httpMock.expectOne('');
      expect(req.request.method).toBe('GET');
      req.flush(DummyData.parameter_viewer_depot_data);
    });
  });

  describe('getDepotData', () => {
    it('should return an item built from the current depot list', () => {
      service.getDepotData('code-1').subscribe(data => {
        expect(data.item_code).toBe('code-1');
        expect(data.items).toEqual(service.depots);
      });
    });

    it('should reflect the depots emitted by DepoService', () => {
      const depots: IDepoList[] = [
        { id: 1, version: 1, depot_id: '1', depot_code: 'HD', depot_name: 'Hougang Depot' },
      ];

      TestBed.resetTestingModule();
      const depoServiceSpy = jasmine.createSpyObj('DepoService', [], {
        depoList$: of(depots),
      });

      TestBed.configureTestingModule({
        providers: [
          ParameterViewerService,
          { provide: MessageService, useValue: mockMessageService },
          { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
          { provide: DepoService, useValue: depoServiceSpy },
          provideHttpClient(withInterceptorsFromDi()),
          provideHttpClientTesting(),
        ],
      });

      const localService = TestBed.inject(ParameterViewerService);

      expect(localService.depots).toEqual(depots);

      localService.getDepotData('code-2').subscribe(data => {
        expect(data).toEqual({ item_code: 'code-2', items: depots });
      });

      TestBed.inject(HttpTestingController).verify();
    });
  });

  describe('getSVTServiceNo', () => {
    it('should send a POST request and return data', () => {
      const mockResponse: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'OK',
        payload: {},
      };

      service.getSVTServiceNo({ depot: '1' }).subscribe(data => {
        expect(data).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        `${service['uri']}view-parameter-bus-service_number_list`
      );
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('getSVTPayload', () => {
    it('should send a POST request and return data', () => {
      const mockResponse: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'OK',
        payload: {},
      };

      service.getSVTPayload({ service_num: '30' }).subscribe(data => {
        expect(data).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}view-parameter-file-by-service-number`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('getParameterBfcConfig', () => {
    it('should return dummy bfc config when useDummyData is true', () => {
      const expectedData = DummyData.parameter_bfc_config;

      service.getParameterBfcConfig('p', 'd', 'b').subscribe(data => {
        expect(data).toEqual(expectedData);
      });
    });

    it('should send a GET request when useDummyData is false', () => {
      environment.useDummyData = false;
      const expectedData = DummyData.parameter_bfc_config;

      service.getParameterBfcConfig('p', 'd', 'b').subscribe(data => {
        expect(data).toEqual(expectedData);
      });

      const req = httpMock.expectOne('');
      expect(req.request.method).toBe('GET');
      req.flush(expectedData);
    });
  });

  describe('getParameterList', () => {
    it('should return getParameter list data when useDummyData is true', () => {
      const expectedData = DummyData.parameter_list;

      service.getParameterList('').subscribe(data => {
        expect(data).toEqual(expectedData);
      });
    });

    it('should return a synthetic list based on the type when useDummyData is false', () => {
      environment.useDummyData = false;

      service.getParameterList('MDCS').subscribe(data => {
        expect(data).toEqual([{ id: 1, value: 'MDCS' }]);
      });
    });
  });

  describe('getBusList', () => {
    it('should return dummy bus list data when useDummyData is true', () => {
      service.getBusList('').subscribe(data => {
        expect(data).toBeTruthy();
        expect(data.length).toBe(DummyData.daily_bus_list.length);
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
  });

  describe('getUserAccessDetails', () => {
    it('should return dummy user access details when useDummyData is true', () => {
      const expectedData = DummyData.parameter_user_access_details;

      service.getUserAccessDetails().subscribe(data => {
        expect(data).toEqual(expectedData);
      });
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

  describe('getBusCashFareDetails', () => {
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
  });

  describe('parameterMapper', () => {
    it('should map payload data into param1 and param2 grids', () => {
      const list: { [key: string]: string } = {};
      [...Param_BLS1ConfigGrid.Param1, ...Param_BLS1ConfigGrid.Param2].forEach(
        (item: any, index: number) => {
          list[item.itemId] = `value-${index}`;
        }
      );

      const payload = {
        payloadData: JSON.stringify({
          objPayloadData: {
            aobjBLS1SpecificConfig: [list],
          },
        }),
      };

      const result = service.parameterMapper(1, payload);

      expect(result.param1.length).toBe(Param_BLS1ConfigGrid.Param1.length);
      expect(result.param2.length).toBe(Param_BLS1ConfigGrid.Param2.length);
      expect(result.param1[0]).toEqual({
        key: Param_BLS1ConfigGrid.Param1[0].fieldLabel,
        value: list[Param_BLS1ConfigGrid.Param1[0].itemId],
      });
      expect(result.param2[0]).toEqual({
        key: Param_BLS1ConfigGrid.Param2[0].fieldLabel,
        value: list[Param_BLS1ConfigGrid.Param2[0].itemId],
      });
    });

    it('should handle an undefined id argument', () => {
      const payload = {
        payloadData: JSON.stringify({
          objPayloadData: {
            aobjBLS1SpecificConfig: [{}],
          },
        }),
      };

      const result = service.parameterMapper(undefined, payload);

      expect(result.param1.length).toBe(Param_BLS1ConfigGrid.Param1.length);
      expect(result.param2.length).toBe(Param_BLS1ConfigGrid.Param2.length);
    });
  });
});
