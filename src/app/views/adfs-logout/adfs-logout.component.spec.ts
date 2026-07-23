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
  let mockSanitizer: jasmine.SpyObj<DomSanitizer>;

  beforeEach(waitForAsync(() => {
    mockCommonService = jasmine.createSpyObj('CommonService', ['getSettingDefault']);
    mockSanitizer = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustResourceUrl', 'sanitize']);
    mockSanitizer.sanitize.and.returnValue('safe');

    // Use EMPTY so subscribe never fires (avoids window.location.href redirect)
    mockCommonService.getSettingDefault.and.returnValue(EMPTY);

    TestBed.configureTestingModule({
      imports: [ADFSLogoutComponent],
      providers: [
        { provide: CommonService, useValue: mockCommonService },
        { provide: DomSanitizer, useValue: mockSanitizer },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ADFSLogoutComponent);
    component = fixture.componentInstance;
    // Call ngOnInit manually; skip detectChanges to avoid NG0904 from iframe [src]
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getSettingDefault on init', () => {
    expect(mockCommonService.getSettingDefault).toHaveBeenCalled();
  });

  it('should clean up on destroy', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
