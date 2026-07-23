import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MaintenanceSharedService } from '@app/services/maintenance-shared.service';
import { DepoService } from '@app/services/depo.service';
import { AuthService } from '@app/services/auth.service';
import { BehaviorSubject, of } from 'rxjs';
import { MaintenanceComponent } from './maintenance.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('MaintenanceComponent', () => {
  let component: MaintenanceComponent;
  let fixture: ComponentFixture<MaintenanceComponent>;
  let sharedService: MaintenanceSharedService;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockDepots = [
    { id: 1, depot_id: '1', version: 1, depot_name: 'Ang Mo Kio Depot', depot_code: 'AMKD' },
    { id: 2, depot_id: '2', version: 1, depot_name: 'Bedok Depot', depot_code: 'BD' },
  ];

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of(mockDepots),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['isDagw', 'hasAccess']);
    mockAuthService.isDagw.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, BrowserAnimationsModule],
      providers: [
        MaintenanceSharedService,
        { provide: DepoService, useValue: mockDepoService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              firstChild: { routeConfig: { path: 'maintenance/diagnostics' } },
            },
          },
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MaintenanceComponent);
    component = fixture.componentInstance;
    sharedService = TestBed.inject(MaintenanceSharedService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load depots on init', () => {
    expect(component.depots).toEqual(mockDepots);
  });

  it('should initialize depot form on init', () => {
    expect(component.depotConfig).toHaveSize(1);
    expect(component.depotConfig[0].controlName).toBe('depots');
  });

  it('should return correct page title based on route', () => {
    const title = component.getPageTitle();
    expect(title).toBe('Diagnostic');
  });

  it('should unsubscribe on ngOnDestroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
