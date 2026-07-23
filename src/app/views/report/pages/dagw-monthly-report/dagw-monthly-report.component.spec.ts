import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IDepoList } from '@app/models/depo';
import { AuthService } from '@app/services/auth.service';
import { DepoService } from '@app/services/depo.service';
import { DailyReportService } from '@app/services/daily-report.service';
import DummyData from '@data/db.json';
import { of } from 'rxjs';
import { DagwMonthlyReportComponent } from './dagw-monthly-report.component';

describe('DagwMonthlyReportComponent', () => {
  let component: DagwMonthlyReportComponent;
  let fixture: ComponentFixture<DagwMonthlyReportComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockDailyReportService: jasmine.SpyObj<DailyReportService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of(mockDepots),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockDailyReportService = jasmine.createSpyObj('DailyReportService', ['download']);

    mockAuthService.getSVCProvider.and.returnValue('1');
    mockDailyReportService.download.and.returnValue(of(new Blob()));

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DailyReportService, useValue: mockDailyReportService },
        { provide: ActivatedRoute, useValue: { snapshot: { url: [{ path: 'daily-report' }] } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(DagwMonthlyReportComponent, { set: { template: '<div></div>' } })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DagwMonthlyReportComponent);
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
    expect(component.months).toHaveSize(3);
  });
});
