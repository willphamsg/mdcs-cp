import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MaintenanceSharedService, DepotParam } from './maintenance-shared.service';
import { environment } from '@env/environment';
import DummyData from '@data/db.json';
import { IDepoList } from '@app/models/depo';
import {
  IEodProcess,
  IAudtitLog,
  ISystemInfo,
  IUpdateType,
} from '@app/models/maitenance';
import { DynamicEndpoint } from './dynamic-endpoint';
import { PayloadResponse } from '../models/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('MaintenanceSharedService', () => {
  let service: MaintenanceSharedService;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;

  const mockDepot: IDepoList = DummyData.depot_list[0];

  beforeEach(() => {
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', ['setDynamicEndpoint']);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        MaintenanceSharedService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(MaintenanceSharedService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTaskItems', () => {
    it('should return dummy data if useDummyData is true', () => {
      environment.useDummyData = true;
      const expectedData: IEodProcess[] = DummyData.eod_process_tasks;

      service.getTaskItems(mockDepot).subscribe((data: IEodProcess[]) => {
        expect(data).toEqual(expectedData);
      });
    });

    it('should make an HTTP GET request if useDummyData is false', () => {
      environment.useDummyData = false;
      const expectedData: IEodProcess[] = [];

      service.getTaskItems(mockDepot).subscribe((data: IEodProcess[]) => {
        expect(data).toEqual(expectedData);
      });

      const req = httpMock.expectOne('');
      expect(req.request.method).toBe('GET');
      req.flush(expectedData);
    });
  });

  describe('getUpdateTypeItems', () => {
    it('should return dummy data if useDummyData is true', () => {
      environment.useDummyData = true;
      const expectedData: IUpdateType[] = DummyData['update-type'];

      service.getUpdateTypeItems().subscribe((data: IUpdateType[]) => {
        expect(data).toEqual(expectedData);
      });
    });

    it('should make an HTTP GET request if useDummyData is false', () => {
      environment.useDummyData = false;
      const expectedData: IUpdateType[] = [];

      service.getUpdateTypeItems().subscribe((data: IUpdateType[]) => {
        expect(data).toEqual(expectedData);
      });

      const req = httpMock.expectOne('');
      expect(req.request.method).toBe('GET');
      req.flush(expectedData);
    });
  });

  describe('getSystemInformation', () => {
    it('should make an HTTP GET request', () => {
      const expectedData: ISystemInfo[] = [];

      service.getSystemInformation('depot1').subscribe((data: ISystemInfo[]) => {
        expect(data).toEqual(expectedData);
      });

      const req = httpMock.expectOne('');
      expect(req.request.method).toBe('GET');
      req.flush(expectedData);
    });
  });

  describe('searchDiagnostic', () => {
    it('should send a POST request', () => {
      const params: DepotParam = { depot_id: 'depot1' };
      const mockResponse: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'OK',
        payload: {},
      };

      service.searchDiagnostic(params).subscribe((response: PayloadResponse) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uriDiagnostic']}view`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('searchSystemInfo', () => {
    it('should send a POST request', () => {
      const params: DepotParam = { depot_id: 'depot1' };
      const mockResponse: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'OK',
        payload: {},
      };

      service.searchSystemInfo(params).subscribe((response: PayloadResponse) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uriSystemInformation']}fetch`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('selectedDepot', () => {
    it('should update and emit selected depot', (done: DoneFn) => {
      service.updateSelectedDepot(mockDepot);

      service.selectedDepot$.subscribe((depot: IDepoList | null) => {
        expect(depot).toEqual(mockDepot);
        done();
      });
    });
  });
});
