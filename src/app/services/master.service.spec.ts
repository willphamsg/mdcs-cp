import { DatePipe } from '@angular/common';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { VehicleList } from '@app/models/vehicle-list';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { of } from 'rxjs';
import { IParams, PayloadResponse } from '../models/common';
import { DynamicEndpoint } from './dynamic-endpoint';
import { MasterService } from './master.service';
import { MessageService } from './message.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('MasterService', () => {
  let service: MasterService;
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

  const mockVehicleList = new VehicleList();

  beforeEach(() => {
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', [
      'setDynamicEndpoint',
    ]);

    TestBed.configureTestingModule({
    imports: [],
    providers: [
        MasterService,
        { provide: MessageService, useValue: mockMessageService },
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
});

    service = TestBed.inject(MasterService);
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
      spyOn(service, 'search').and.callFake(() => of(mockResponse));

      environment.useDummyData = true;

      service.search(mockParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });

    it('should send an add request when useDummyData is false', () => {
      spyOn(service, 'add').and.callFake(() => of(mockResponse));

      environment.useDummyData = false;

      service.add(mockVehicleList).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });
  });

  describe('delete', () => {
    it('should return dummy data when useDummyData is true', () => {
      spyOn(service, 'search').and.callFake(() => of(mockResponse));

      environment.useDummyData = true;

      service.search(mockParams).subscribe(response => {
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

  describe('find', () => {
    it('should return dummy data when useDummyData is true', () => {
      spyOn(service, 'search').and.callFake(() => of(mockResponse));

      environment.useDummyData = true;

      service.search(mockParams).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });

    it('should send a find request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.find([]).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}find-info  `);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });
});
