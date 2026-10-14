import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonService } from '@app/services/common.service';
import { EMPTY } from 'rxjs';
import { ADFSLogoutComponent } from './adfs-logout.component';

describe('ADFSLogoutComponent', () => {
  let component: ADFSLogoutComponent;
  let fixture: ComponentFixture<ADFSLogoutComponent>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  // The real sanitizer: only a value it produced survives the iframe's
  // resource-URL binding, so a stubbed one cannot exercise the template.
  let sanitizer: DomSanitizer;

  beforeEach(waitForAsync(() => {
    mockCommonService = jasmine.createSpyObj('CommonService', ['getSettingDefault']);

    // Use EMPTY so subscribe never fires (avoids window.location.href redirect)
    mockCommonService.getSettingDefault.and.returnValue(EMPTY);

    TestBed.configureTestingModule({
      imports: [ADFSLogoutComponent],
      providers: [{ provide: CommonService, useValue: mockCommonService }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    sanitizer = TestBed.inject(DomSanitizer);
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ADFSLogoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getSettingDefault on init', () => {
    expect(mockCommonService.getSettingDefault).toHaveBeenCalled();
  });

  it('renders no iframe until there is a sign-out URL to load', () => {
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();

    // Same-origin so the test never reaches the network.
    component.sanitizedUrl = sanitizer.bypassSecurityTrustResourceUrl(
      '/assets/app-config.json'
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('iframe')).not.toBeNull();
  });

  it('disarms the redirect timer on destroy', () => {
    const clearSpy = spyOn(window, 'clearTimeout').and.callThrough();
    component['redirectTimer'] = setTimeout(() => undefined, 60_000);
    const timer = component['redirectTimer'];

    component.ngOnDestroy();

    expect(clearSpy).toHaveBeenCalledWith(timer as any);
    expect(component['redirectTimer']).toBeNull();
  });

  it('should clean up on destroy', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
