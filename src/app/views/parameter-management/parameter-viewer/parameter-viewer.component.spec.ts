import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ParameterViewerService } from '@app/services/parameter-viewer.service';
import { DepoService } from '@app/services/depo.service';
import { AuthService } from '@app/services/auth.service';
import { of } from 'rxjs';
import { ParameterViewerComponent } from './parameter-viewer.component';

describe('ParameterViewerComponent', () => {
  let component: ParameterViewerComponent;
  let fixture: ComponentFixture<ParameterViewerComponent>;
  let mockParameterViewerService: jasmine.SpyObj<ParameterViewerService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(waitForAsync(() => {
    mockParameterViewerService = jasmine.createSpyObj('ParameterViewerService', [
      'getSystemParametersTab', 'getSystemParametersItems', 'getDataSource', 'getParameterList',
    ]);
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([{ depot_id: '1', depot_name: 'Depot A' }]),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockAuthService.getSVCProvider.and.returnValue('1');

    mockParameterViewerService.getSystemParametersTab.and.returnValue(of({
      status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK',
      payload: { tabList: [{ id: 1, label: 'System' }] },
    }));
    mockParameterViewerService.getSystemParametersItems.and.returnValue(of({
      status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK',
      payload: { devices: [] },
    }));

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: ParameterViewerService, useValue: mockParameterViewerService },
        { provide: DepoService, useValue: mockDepoService },
        { provide: AuthService, useValue: mockAuthService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParameterViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tab items on init', () => {
    expect(mockParameterViewerService.getSystemParametersTab).toHaveBeenCalled();
  });

  it('should load parameter items after tabs load', () => {
    expect(mockParameterViewerService.getSystemParametersItems).toHaveBeenCalled();
  });

  it('should set active tab', () => {
    component.tabList = [{ id: 1, label: 'System', tab_code: 1 }];
    component.sideNavHeader = 1;
    component.setActiveTab();
    expect(component.tabIdx).toBe(0);
  });

  it('should clean up on destroy', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  it('should reset content on noContent', () => {
    component.noContent();
    expect(component.dataSource).toBeNull();
    expect(component.noDataFound).toBeTrue();
  });
});
