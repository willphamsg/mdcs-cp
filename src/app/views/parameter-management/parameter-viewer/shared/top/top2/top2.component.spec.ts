import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Top2Component } from './top2.component';

describe('Top2Component', () => {
  let component: Top2Component;
  let fixture: ComponentFixture<Top2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Top2Component],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Top2Component);
    component = fixture.componentInstance;
    component.data = { userData: [], headerData: {} };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
