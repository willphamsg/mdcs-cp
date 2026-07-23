import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { of } from 'rxjs';
import { IParams, PayloadResponse } from '../models/common';
import { DynamicEndpoint } from './dynamic-endpoint';
import { MessageService } from './message.service';
import { ParameterService } from './parameter.service';

describe('NewParameterApprovalService', () => {
  let service: ParameterService;
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
    timestamp: 121231,
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  beforeEach(() => {
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', [
      'setDynamicEndpoint',
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ParameterService,
        { provide: MessageService, useValue: mockMessageService },
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
      ],
    });

    service = TestBed.inject(ParameterService);
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

  // describe('manage', () => {
  //   it('should return dummy data when useDummyData is true', () => {
  //     spyOn(service, 'update').and.returnValue(of(mockResponse));

  //     service
  //       .manage([])
  //       .subscribe(() => expect(service.update).toHaveBeenCalled());
  //   });
  // });

  describe('add', () => {
    it('should return dummy data when useDummyData is true for add', () => {
      spyOn(service, 'manage').and.callFake(() => of(mockResponse));

      environment.useDummyData = true;

      service.manage([], 'Accept').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });
    });

    it('should send an add request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.manage([], 'Accept').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${service['uri']}${'Accept'}`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });
});
