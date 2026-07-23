import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Top0Component } from './top0.component';

describe('Top0Component', () => {
  let component: Top0Component;
  let fixture: ComponentFixture<Top0Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Top0Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Top0Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
