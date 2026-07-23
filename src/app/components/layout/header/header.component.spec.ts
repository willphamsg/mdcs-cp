import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { AuthService } from '@app/services/auth.service';
import { DepoService } from '@app/services/depo.service';
import { CommonService } from '@app/services/common.service';
import { MessageService } from '@app/services/message.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let router: Router;

  let mockAuthService: any;
  let mockDepoService: any;
  let mockCommonService: any;
  let mockMessageService: any;
  let mockDialog: any;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isDagw', 'fetchProfile', 'hasAccess', 'getCDALink', 'logout', 'getSvcProvCode', 'getDefaultDepot', 'getUsername',
    ]);
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.fetchProfile.and.returnValue({
      access_token_profile: { user_name: 'jdoe', given_name: 'John' },
      depot_list: [
        { id: '1', version: 1, depot_id: 'D1', depot_code: 'DC1', depot_name: 'Depot One', svc_prov_info: 'SP1' },
      ],
    });
    mockAuthService.hasAccess.and.returnValue(true);
    mockAuthService.getCDALink.and.returnValue('');
    mockAuthService.getSvcProvCode.and.returnValue('SP1');
    
    mockDepoService = { depo$: of('D1'), depoList$: of([]), updateDepoList: jasmine.createSpy(), updateDepo: jasmine.createSpy() };
    
    mockCommonService = jasmine.createSpyObj('CommonService', ['getSettingDefault']);
    mockCommonService.getSettingDefault.and.returnValue(of({ logout_url: '/logout' }));
    
    mockMessageService = jasmine.createSpyObj('MessageService', ['someMethod']);
    
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [HeaderComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: DepoService, useValue: mockDepoService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: MatDialog, useValue: mockDialog },
        provideRouter([])
      ]
    })
    .overrideComponent(HeaderComponent, {
      add: { providers: [{ provide: MatDialog, useValue: mockDialog }] },
    })
    .compileComponents();
    
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;

    // Mock setSideBarHeight to avoid null DOM querySelector in test environment
    spyOn(component, 'setSideBarHeight').and.stub();

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load user profile on init', () => {
    expect(component.userName).toBe('jdoe');
    expect(component.givenName).toBe('John');
    expect(component.userInitial).toBe('J');
  });

  it('should populate depot options from profile', () => {
    expect(component.options.length).toBe(1);
    expect(component.options[0].depot_name).toBe('Depot One');
  });

  it('should call updateDepoList and updateDepo on init', () => {
    expect(mockDepoService.updateDepoList).toHaveBeenCalled();
    expect(mockDepoService.updateDepo).toHaveBeenCalledWith('D1');
  });

  it('should build navList from mdcsNavList when not dagw', () => {
    expect(component.navList.length).toBeGreaterThan(0);
  });

  it('should handle menuHandler open/close', () => {
    component.menuHandler('open', 'monitoring');
    expect(component.expandedMenu['monitoring']).toBeTrue();

    component.menuHandler('close', 'monitoring');
    expect(component.expandedMenu['monitoring']).toBeFalse();
  });

  it('should set active menu', () => {
    component.setActiveMu('bus');
    expect(component.activeMenu).toBe('bus');
  });

  it('should check nav active based on router url', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/mdcs/monitoring/bus-operation-status');
    expect(component.checkNavActive('monitoring')).toBeTrue();
    expect(component.checkNavActive('notfound')).toBeFalse();
  });

  it('should toggle mobile menu', () => {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');
    component.toggleMobileMenu(event);
    expect(component.isOpenMobileMenu).toBeTrue();

    component.toggleMobileMenu(event);
    expect(component.isOpenMobileMenu).toBeFalse();
  });

  it('should open logout confirmation dialog on logOut', () => {
    mockDialog.open.and.returnValue({ afterClosed: () => of(false) });
    component.logOut();
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should clean up subscriptions on destroy', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
