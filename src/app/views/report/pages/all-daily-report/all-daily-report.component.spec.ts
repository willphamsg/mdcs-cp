import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PayloadResponse } from '@app/models/common';
import { IReportList } from '@app/models/daily-report';
import { IDepoList } from '@app/models/depo';
import { DailyReportService } from '@app/services/daily-report.service';
import { DepoService } from '@app/services/depo.service';
import DummyData from '@data/db.json';
import { of } from 'rxjs';
import { AllDailyReportComponent } from './all-daily-report.component';

describe('AllDailyReportComponent', () => {
  let component: AllDailyReportComponent;
  let fixture: ComponentFixture<AllDailyReportComponent>;
  let dailyReportServiceSpy: jasmine.SpyObj<DailyReportService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockDepots: IDepoList[] = DummyData.depot_list;
  const mockReport: any[] = DummyData['daily-report'] as any[];
  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: { 'daily-report': mockReport },
  };

  beforeEach(waitForAsync(() => {
    dailyReportServiceSpy = jasmine.createSpyObj('DailyReportService', [
      'search',
    ]);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open', 'closeAll']);
    mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DailyReportService, useValue: dailyReportServiceSpy },
        { provide: DepoService, useValue: mockDepoService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    mockDepoService.depoList$ = of(mockDepots);
    dailyReportServiceSpy.search.and.returnValue(of(mockPayloadResponse));
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AllDailyReportComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load depots and fetch daily report list on init', () => {
    spyOn(component, 'reloadHandler').and.callThrough();

    component.ngOnInit();

    expect(component.depots).toEqual(mockDepots);
    expect(component.reloadHandler).toHaveBeenCalled();
  });

  it('should toggle individual checkboxes and update selection', () => {
    component.dataSource = mockReport;

    component.checkboxToggle(mockReport[0]);

    expect(mockReport[0].chk).toBeTrue();
    expect(component.selection).toContain(mockReport[0]);

    component.checkboxToggle(mockReport[0]);

    expect(mockReport[0].chk).toBeFalse();
    expect(component.selection).not.toContain(mockReport[0]);
  });

  it('should toggle all checkboxes and update selection', () => {
    component.dataSource = mockReport;
    component.onCheckAllToggle();

    expect(component.chkAll).toBeTrue();
    expect(component.selection).toHaveSize(8);

    component.onCheckAllToggle();

    expect(component.chkAll).toBeFalse();
    expect(component.selection).toHaveSize(0);
  });

  it('should open the download dialog', () => {
    component.downloadHandler();

    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
