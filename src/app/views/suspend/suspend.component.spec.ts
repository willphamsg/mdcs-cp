import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { SuspendComponent } from './suspend.component';

describe('SuspendComponent', () => {
  let component: SuspendComponent;
  let fixture: ComponentFixture<SuspendComponent>;

  beforeEach(async () => {
    // Install fake clock BEFORE component creation to intercept setTimeout in ngOnInit
    jasmine.clock().install();

    await TestBed.configureTestingModule({
      imports: [SuspendComponent],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SuspendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
