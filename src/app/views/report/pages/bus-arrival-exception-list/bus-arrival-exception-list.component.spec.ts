import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IDepoList } from '@app/models/depo';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { DailyReportService } from '@app/services/daily-report.service';
import { MessageService } from '@app/services/message.service';
import DummyData from '@data/db.json';
import { of } from 'rxjs';
import { BusArrivalExceptionListComponent } from './bus-arrival-exception-list.component';

describe('BusArrivalExceptionListComponent', () => {
  let component: BusArrivalExceptionListComponent;
  let fixture: ComponentFixture<BusArrivalExceptionListComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockDailyReportService: jasmine.SpyObj<DailyReportService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of(mockDepots),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockDailyReportService = jasmine.createSpyObj('DailyReportService', ['download']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['search']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['MessageResponse']);

    mockAuthService.getSVCProvider.and.returnValue('1');
    mockDailyReportService.download.and.returnValue(of(new Blob()));
    mockCommonService.search.and.returnValue(of({ status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK', payload: { svc_prov_info: [] } }));
    mockMessageService.MessageResponse.and.returnValue(true);
    mockDepoService.search.and.returnValue(of({ status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK', payload: { depot_info: mockDepots } }));

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DailyReportService, useValue: mockDailyReportService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ActivatedRoute, useValue: { snapshot: { url: [{ path: 'daily-report' }] } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(BusArrivalExceptionListComponent, { set: { template: '<div></div>' } })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BusArrivalExceptionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form and load selections on ngOnInit', () => {
    expect(component.depots).toEqual(mockDepots);
  });

  it('should load form configurations correctly', () => {
    expect(component.reportName).toBe('BusArrivalExceptionReport');
  });
});
