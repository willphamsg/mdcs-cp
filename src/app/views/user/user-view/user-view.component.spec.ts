import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { UserService } from '@app/services/user.service';
import { UserViewComponent } from './user-view.component';

describe('UserViewComponent', () => {
  let component: UserViewComponent;
  let fixture: ComponentFixture<UserViewComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;

  beforeEach(waitForAsync(() => {
    mockUserService = jasmine.createSpyObj('UserService', ['userProfile']);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: UserService, useValue: mockUserService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct displayed columns', () => {
    expect(component.displayedColumns).toEqual(['id', 'email', 'preferred_name']);
  });

  it('should initialize with empty dataSource', () => {
    expect(component.dataSource).toEqual([]);
  });

  it('should have default params', () => {
    expect(component.params.page_size).toBe(10);
    expect(component.params.page_index).toBe(1);
  });
});
