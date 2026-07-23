import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IDepoList } from '@app/models/depo';
import { MaintenanceSharedService } from '@app/services/maintenance-shared.service';
import { BehaviorSubject, of } from 'rxjs';
import { DiagnosticsComponent } from './diagnostics.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DiagnosticsComponent', () => {
  let component: DiagnosticsComponent;
  let fixture: ComponentFixture<DiagnosticsComponent>;
  let mockSharedService: jasmine.SpyObj<MaintenanceSharedService>;
  let selectedDepotSubject: BehaviorSubject<IDepoList | null>;

  const mockDepot: IDepoList = {
    id: 1,
    depot_id: '1',
    version: 1,
    depot_name: 'Hougang Depot',
    depot_code: 'HD',
  };

  const mockPayload = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'OK',
    payload: { diagnostics_item: [{ category: 'Test', items: [] }] },
  };

  beforeEach(waitForAsync(() => {
    selectedDepotSubject = new BehaviorSubject<IDepoList | null>(null);

    mockSharedService = jasmine.createSpyObj('MaintenanceSharedService', [
      'searchDiagnostic',
      'updateSelectedDepot',
      'resetFormGroup',
    ]);

    Object.defineProperty(mockSharedService, 'selectedDepot$', {
      get: () => selectedDepotSubject.asObservable(),
    });

    mockSharedService.searchDiagnostic.and.returnValue(of(mockPayload));

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: MaintenanceSharedService, useValue: mockSharedService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DiagnosticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should not fetch diagnostic when no depot is selected', () => {
    expect(mockSharedService.searchDiagnostic).not.toHaveBeenCalled();
  });

  it('should fetch diagnostic items when depot is selected', () => {
    selectedDepotSubject.next(mockDepot);
    component.ngOnInit();
    expect(component.depot).toEqual(mockDepot);
    expect(mockSharedService.searchDiagnostic).toHaveBeenCalled();
  });

  it('should clean up on destroy', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(mockSharedService.updateSelectedDepot).toHaveBeenCalledWith(null);
    expect(mockSharedService.resetFormGroup).toHaveBeenCalled();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
