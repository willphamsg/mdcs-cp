import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DepoService } from '@app/services/depo.service';
import { ManageDailyBusListService } from '@app/services/manage-daily-bus-list.service';
import { CommonService } from '@app/services/common.service';
import { MessageService } from '@app/services/message.service';
import { AuthService } from '@app/services/auth.service';
import { of } from 'rxjs';
import { ViewComponent } from './view.component';

describe('DailyBusList ViewComponent', () => {
  let component: ViewComponent;
  let fixture: ComponentFixture<ViewComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockDailyBusService: jasmine.SpyObj<ManageDailyBusListService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockMessage: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ViewComponent>>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockData = {
    title: 'Daily Bus List',
    action: 'add',
    selection: null,
  };

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of([{ depot_id: '1', depot_name: 'Depot A' }]),
    });
    mockDailyBusService = jasmine.createSpyObj('ManageDailyBusListService', ['manage']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockMessage = jasmine.createSpyObj('MessageService', ['confirmation', 'MessageResponse', 'multiError']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['closeAll']);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockAuthService.getSVCProvider.and.returnValue('1');

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: ManageDailyBusListService, useValue: mockDailyBusService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessage },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: AuthService, useValue: mockAuthService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set title from dialog data', () => {
    expect(component.title).toBe('Daily Bus List');
  });

  it('should initialize options from DayType data', () => {
    expect(component.options.length).toBeGreaterThan(0);
  });

  it('should add an item when no selection', () => {
    // When no selection, addItem is called
    expect(component.items).toHaveSize(1);
  });

  it('should return items FormArray from getter', () => {
    expect(component.items).toBeTruthy();
  });

  it('should get depot name by id', () => {
    component.depots = [{ depot_id: '1', depot_name: 'Depot A' }] as any;
    const name = component.getDepotName('1');
    expect(name).toBe('Depot A');
  });

  it('should check isArray correctly', () => {
    expect(component.isArray([])).toBeTrue();
    expect(component.isArray('test')).toBeFalse();
  });

  it('should get day type display string', () => {
    const display = component.getDayTypeDisplay([]);
    expect(display).toBe('');
  });
});
