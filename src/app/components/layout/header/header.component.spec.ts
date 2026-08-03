import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { AuthService } from '@app/services/auth.service';
import { DepoService } from '@app/services/depo.service';
import { CommonService } from '@app/services/common.service';
import { MessageService } from '@app/services/message.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { of } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

interface FixtureOverrides {
  isDagw?: boolean;
  fetchProfile?: any;
  hasAccessFn?: (access: string[], module: string) => boolean;
  cdaLink?: string;
  settingDefault?: any;
  depo$?: any;
  logoutAfterClosed?: any;
}

async function createFixture(overrides: FixtureOverrides = {}): Promise<{
  fixture: ComponentFixture<HeaderComponent>;
  mocks: {
    authService: jasmine.SpyObj<AuthService>;
    depoService: any;
    commonService: jasmine.SpyObj<CommonService>;
    messageService: jasmine.SpyObj<MessageService>;
    dialog: jasmine.SpyObj<MatDialog>;
    router: Router;
  };
}> {
  const mockAuthService: any = jasmine.createSpyObj('AuthService', [
    'isDagw', 'fetchProfile', 'hasAccess', 'getCDALink', 'logout', 'getSvcProvCode', 'getDefaultDepot', 'getUsername',
  ]);
  mockAuthService.isDagw.and.returnValue(overrides.isDagw ?? false);
  mockAuthService.fetchProfile.and.returnValue(
    overrides.fetchProfile !== undefined
      ? overrides.fetchProfile
      : {
          access_token_profile: { user_name: 'jdoe', given_name: 'John' },
          depot_list: [
            { id: '1', version: 1, depot_id: 'D1', depot_code: 'DC1', depot_name: 'Depot One', svc_prov_info: 'SP1' },
          ],
        }
  );
  mockAuthService.hasAccess.and.callFake(overrides.hasAccessFn ?? (() => true));
  mockAuthService.getCDALink.and.returnValue(overrides.cdaLink ?? '');
  mockAuthService.getSvcProvCode.and.returnValue('SP1');

  const mockDepoService: any = {
    depo$: overrides.depo$ ?? of('D1'),
    depoList$: of([]),
    updateDepoList: jasmine.createSpy('updateDepoList'),
    updateDepo: jasmine.createSpy('updateDepo'),
  };

  const mockCommonService: any = jasmine.createSpyObj('CommonService', ['getSettingDefault']);
  mockCommonService.getSettingDefault.and.returnValue(
    of(overrides.settingDefault !== undefined ? overrides.settingDefault : { logout_url: '/logout' })
  );

  const mockMessageService: any = jasmine.createSpyObj('MessageService', ['someMethod']);
  const mockDialog: any = jasmine.createSpyObj('MatDialog', ['open']);
  mockDialog.open.and.returnValue({ afterClosed: () => of(overrides.logoutAfterClosed ?? false) });

  await TestBed.configureTestingModule({
    imports: [HeaderComponent, NoopAnimationsModule],
    providers: [
      { provide: AuthService, useValue: mockAuthService },
      { provide: DepoService, useValue: mockDepoService },
      { provide: CommonService, useValue: mockCommonService },
      { provide: MessageService, useValue: mockMessageService },
      { provide: MatDialog, useValue: mockDialog },
      provideRouter([]),
    ],
  })
    .overrideComponent(HeaderComponent, {
      add: { providers: [{ provide: MatDialog, useValue: mockDialog }] },
    })
    .compileComponents();

  const router = TestBed.inject(Router);
  const fixture = TestBed.createComponent(HeaderComponent);
  spyOn(fixture.componentInstance, 'setSideBarHeight').and.stub();

  return {
    fixture,
    mocks: {
      authService: mockAuthService,
      depoService: mockDepoService,
      commonService: mockCommonService,
      messageService: mockMessageService,
      dialog: mockDialog,
      router,
    },
  };
}

describe('HeaderComponent', () => {
  it('should create', async () => {
    const { fixture } = await createFixture();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load user profile on init', async () => {
    const { fixture } = await createFixture();
    fixture.detectChanges();
    expect(fixture.componentInstance.userName).toBe('jdoe');
    expect(fixture.componentInstance.givenName).toBe('John');
    expect(fixture.componentInstance.userInitial).toBe('J');
  });

  it('should populate depot options from profile', async () => {
    const { fixture } = await createFixture();
    fixture.detectChanges();
    expect(fixture.componentInstance.options).toHaveSize(1);
    expect(fixture.componentInstance.options[0].depot_name).toBe('Depot One');
  });

  it('should call updateDepoList and updateDepo on init', async () => {
    const { fixture, mocks } = await createFixture();
    fixture.detectChanges();
    expect(mocks.depoService.updateDepoList).toHaveBeenCalled();
    expect(mocks.depoService.updateDepo).toHaveBeenCalledWith('D1');
  });

  it('should build navList from mdcsNavList when not dagw', async () => {
    const { fixture } = await createFixture();
    fixture.detectChanges();
    expect(fixture.componentInstance.navList.length).toBeGreaterThan(0);
  });

  it('should handle menuHandler open/close', async () => {
    const { fixture } = await createFixture();
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.menuHandler('open', 'monitoring');
    expect(component.expandedMenu['monitoring']).toBeTrue();

    component.menuHandler('close', 'monitoring');
    expect(component.expandedMenu['monitoring']).toBeFalse();
  });

  it('should set active menu', async () => {
    const { fixture } = await createFixture();
    fixture.detectChanges();
    fixture.componentInstance.setActiveMu('bus');
    expect(fixture.componentInstance.activeMenu).toBe('bus');
  });

  it('should check nav active based on router url', async () => {
    const { fixture, mocks } = await createFixture();
    fixture.detectChanges();
    spyOnProperty(mocks.router, 'url', 'get').and.returnValue('/mdcs/monitoring/bus-operation-status');
    expect(fixture.componentInstance.checkNavActive('monitoring')).toBeTrue();
    expect(fixture.componentInstance.checkNavActive('notfound')).toBeFalse();
  });

  it('should toggle mobile menu', async () => {
    const { fixture } = await createFixture();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    component.toggleMobileMenu(event);
    expect(component.isOpenMobileMenu).toBeTrue();

    component.toggleMobileMenu(event);
    expect(component.isOpenMobileMenu).toBeFalse();
  });

  it('should open logout confirmation dialog on logOut', async () => {
    const { fixture, mocks } = await createFixture();
    fixture.detectChanges();
    fixture.componentInstance.logOut();
    expect(mocks.dialog.open).toHaveBeenCalled();
  });

  it('should clean up subscriptions on destroy', async () => {
    const { fixture } = await createFixture();
    fixture.detectChanges();
    expect(() => fixture.componentInstance.ngOnDestroy()).not.toThrow();
  });

  describe('loadUserProfile', () => {
    it('should default userName/givenName/userInitial to empty strings when fetchProfile returns null', async () => {
      const { fixture } = await createFixture({ fetchProfile: null });
      fixture.detectChanges();
      const component = fixture.componentInstance;
      expect(component.userName).toBe('');
      expect(component.givenName).toBe('');
      expect(component.userInitial).toBe('');
    });

    it('should not call updateDepoList when the profile has no depot_list', async () => {
      const { fixture, mocks } = await createFixture({
        fetchProfile: { access_token_profile: { user_name: 'x', given_name: 'X' } },
      });
      fixture.detectChanges();
      expect(fixture.componentInstance.options).toEqual([]);
      expect(mocks.depoService.updateDepoList).not.toHaveBeenCalled();
    });

    it('should call updateDepoList with an empty array but not updateDepo when depot_list is empty', async () => {
      const { fixture, mocks } = await createFixture({
        fetchProfile: { access_token_profile: { user_name: 'x', given_name: 'X' }, depot_list: [] },
      });
      fixture.detectChanges();
      expect(mocks.depoService.updateDepoList).toHaveBeenCalledWith([]);
      expect(mocks.depoService.updateDepo).not.toHaveBeenCalled();
    });
  });

  describe('depo$ subscription', () => {
    it('should not set depotId when depo$ emits a falsy value', async () => {
      const { fixture } = await createFixture({ depo$: of('') });
      fixture.detectChanges();
      expect(fixture.componentInstance.depotId).toBeUndefined();
    });

    it('should not set depotId when options is empty', async () => {
      const { fixture } = await createFixture({
        fetchProfile: { access_token_profile: { user_name: 'x', given_name: 'X' } },
        depo$: of('D1'),
      });
      fixture.detectChanges();
      expect(fixture.componentInstance.depotId).toBeUndefined();
    });
  });

  describe('buildNavList access filtering', () => {
    it('should produce an empty navList when access is denied everywhere', async () => {
      const { fixture } = await createFixture({ hasAccessFn: () => false, cdaLink: 'https://cda.example.com' });
      fixture.detectChanges();
      expect(fixture.componentInstance.navList).toEqual([]);
    });

    it('should include the DAMS link when param-viewer access and a CDA link are both present', async () => {
      const { fixture } = await createFixture({ hasAccessFn: () => true, cdaLink: 'https://cda.example.com' });
      fixture.detectChanges();
      const paramMenu = fixture.componentInstance.navList.find((n: any) => n.value === 'paramManagement');
      const dams = paramMenu?.subs.find((s: any) => s.value === 'dams');
      expect(dams).toBeTruthy();
      expect(dams.href).toBe('https://cda.example.com');
      expect(dams.action).toBe('redirectToCDA');
    });

    it('should exclude the DAMS link when no CDA link is configured', async () => {
      const { fixture } = await createFixture({ hasAccessFn: () => true, cdaLink: '' });
      fixture.detectChanges();
      const paramMenu = fixture.componentInstance.navList.find((n: any) => n.value === 'paramManagement');
      const dams = paramMenu?.subs.find((s: any) => s.value === 'dams');
      expect(dams).toBeUndefined();
    });

    it('should build navList from the dagw navigation source with dagw route prefixes when isDagw is true', async () => {
      const { fixture } = await createFixture({ isDagw: true, hasAccessFn: () => true });
      fixture.detectChanges();
      const component = fixture.componentInstance;
      expect(component.navList.length).toBeGreaterThan(0);
      const monitoring = component.navList.find((n: any) => n.value === 'monitoring');
      expect(monitoring.subs[0].href).toMatch(/^\/dagw\//);
    });

    it('should exclude a nested Report sub when its own access is denied even if its children would be allowed', async () => {
      const { fixture } = await createFixture({
        hasAccessFn: (access: string[]) => !(access[0] === 'report' && access[1] === 'adhoc'),
      });
      fixture.detectChanges();
      const component = fixture.componentInstance;
      const reportMenu = component.navList.find((n: any) => n.value === 'report');
      const adhoc = reportMenu?.subs.find((s: any) => s.value === 'ad-hoc-report');
      const daily = reportMenu?.subs.find((s: any) => s.value === 'daily-report');
      expect(adhoc).toBeUndefined();
      expect(daily).toBeTruthy();
    });

    it('should prefix regular sub hrefs with the module route prefix', async () => {
      const { fixture } = await createFixture({ hasAccessFn: () => true });
      fixture.detectChanges();
      const component = fixture.componentInstance;
      const busMenu = component.navList.find((n: any) => n.value === 'bus');
      const dailyBusList = busMenu?.subs.find((s: any) => s.value === 'daily-bus-list');
      expect(dailyBusList.href).toMatch(/^\/mdcs\//);
    });
  });

  describe('onClick (document click outside handling)', () => {
    it('should do nothing when the mobile menu is already closed', async () => {
      const { fixture } = await createFixture();
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component.isOpenMobileMenu = false;
      const containsSpy = spyOn(component.mobileNav.nativeElement, 'contains');

      component.onClick({ target: document.body } as unknown as Event);

      expect(containsSpy).not.toHaveBeenCalled();
      expect(component.isOpenMobileMenu).toBeFalse();
    });

    it('should keep the mobile menu open when the click target is inside it', async () => {
      const { fixture } = await createFixture();
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component.isOpenMobileMenu = true;
      const insideEl = document.createElement('div');
      component.mobileNav.nativeElement.appendChild(insideEl);

      component.onClick({ target: insideEl } as unknown as Event);

      expect(component.isOpenMobileMenu).toBeTrue();
      component.mobileNav.nativeElement.removeChild(insideEl);
    });

    it('should close the mobile menu when the click target is outside it', async () => {
      const { fixture } = await createFixture();
      fixture.detectChanges();
      const component = fixture.componentInstance;
      component.isOpenMobileMenu = true;
      const outsideEl = document.createElement('div');
      document.body.appendChild(outsideEl);

      component.onClick({ target: outsideEl } as unknown as Event);

      expect(component.isOpenMobileMenu).toBeFalse();
      document.body.removeChild(outsideEl);
    });
  });

  describe('redirectToCDA', () => {
    it('should open a new window when a CDA link is present', async () => {
      const { fixture } = await createFixture({ cdaLink: 'https://cda.example.com' });
      fixture.detectChanges();
      const openSpy = spyOn(window, 'open');

      fixture.componentInstance.redirectToCDA();

      expect(openSpy).toHaveBeenCalledWith('https://cda.example.com', '_blank');
    });

    it('should not open a window when no CDA link is present', async () => {
      const { fixture } = await createFixture({ cdaLink: '' });
      fixture.detectChanges();
      const openSpy = spyOn(window, 'open');

      fixture.componentInstance.redirectToCDA();

      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  describe('logOut / showLogoutConfirmation', () => {
    // `window.location.href` is not a configurable property in this Karma/Chrome
    // environment: `spyOnProperty(window.location, 'href', 'set')` throws
    // immediately, and replacing `window.location` itself via
    // `Object.defineProperty` (even with `configurable: true` requested) only
    // ever succeeds once per browser session - later redefinition attempts
    // (including the restore in afterEach) throw "Cannot redefine property:
    // location", leaving window.location permanently broken for every other
    // spec sharing this browser tab. Worse, if the fake silently fails to take
    // effect, HeaderComponent.logOut()'s real `window.location.href = ...`
    // assignment would trigger an actual page navigation inside the Karma
    // runner tab, which would crash the entire test run - not just this file.
    // These 3 redirect-URL scenarios are left pending rather than risk that;
    // `authService.logout()` being called and the dialog-dismissed branch are
    // still covered by the tests below. Kept only so the pending bodies below
    // still type-check - never actually invoked.
    function stubWindowLocation(): { href: string } {
      return { href: '' };
    }

    it('should not call authService.logout when the dialog is dismissed without confirmation', async () => {
      const { fixture, mocks } = await createFixture({ logoutAfterClosed: false });
      fixture.detectChanges();

      fixture.componentInstance.logOut();

      expect(mocks.authService.logout).not.toHaveBeenCalled();
    });

    // Skipped: exercising these branches requires faking window.location.href,
    // which this environment cannot do reliably (see comment above) without
    // risking a real page navigation that would crash the whole test run.
    xit('should log out and redirect to /adfs-logout when authenticate_adfs_url is set', async () => {
      const { fixture, mocks } = await createFixture({
        logoutAfterClosed: true,
        settingDefault: { authenticate_adfs_url: true, logout_url: '/logout' },
      });
      fixture.detectChanges();
      const fakeLocation = stubWindowLocation();

      fixture.componentInstance.logOut();

      expect(mocks.authService.logout).toHaveBeenCalled();
      expect(fakeLocation.href).toBe('/adfs-logout');
    });

    // Skipped: same window.location.href limitation as above.
    xit('should log out and redirect to the configured logout_url when adfs url is not set', async () => {
      const { fixture } = await createFixture({
        logoutAfterClosed: true,
        settingDefault: { logout_url: '/custom-logout' },
      });
      fixture.detectChanges();
      const fakeLocation = stubWindowLocation();

      fixture.componentInstance.logOut();

      expect(fakeLocation.href).toBe('/custom-logout');
    });

    // Skipped: same window.location.href limitation as above.
    xit('should log out and redirect to / when neither adfs url nor logout_url are configured', async () => {
      const { fixture } = await createFixture({ logoutAfterClosed: true, settingDefault: {} });
      fixture.detectChanges();
      const fakeLocation = stubWindowLocation();

      fixture.componentInstance.logOut();

      expect(fakeLocation.href).toBe('/');
    });
  });

  describe('toggleAutoClick', () => {
    it('should start the auto clicker without throwing when toggled on', async () => {
      const { fixture } = await createFixture();
      fixture.detectChanges();
      jasmine.clock().install();
      try {
        expect(() =>
          fixture.componentInstance.toggleAutoClick({ checked: true } as MatSlideToggleChange)
        ).not.toThrow();
      } finally {
        jasmine.clock().uninstall();
      }
    });

    it('should stop the auto clicker and attempt to download logs when toggled off', async () => {
      const { fixture } = await createFixture();
      fixture.detectChanges();
      expect(() =>
        fixture.componentInstance.toggleAutoClick({ checked: false } as MatSlideToggleChange)
      ).not.toThrow();
    });
  });

  describe('ngAfterViewInit / onResize', () => {
    it('should call setSideBarHeight after view init and on window resize', async () => {
      const { fixture } = await createFixture();
      fixture.detectChanges();
      const component = fixture.componentInstance;
      expect(component.setSideBarHeight).toHaveBeenCalled();

      (component.setSideBarHeight as jasmine.Spy).calls.reset();
      component.onResize();
      expect(component.setSideBarHeight).toHaveBeenCalled();
    });
  });
});
