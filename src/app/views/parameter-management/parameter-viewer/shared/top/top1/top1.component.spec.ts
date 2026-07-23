import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Top1Component } from './top1.component';

describe('Top1Component', () => {
  let component: Top1Component;
  let fixture: ComponentFixture<Top1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Top1Component],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Top1Component);
    component = fixture.componentInstance;
    component.data = { userData: [] };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
