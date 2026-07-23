import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Middle2Component } from './middle2.component';

describe('Middle2Component', () => {
  let component: Middle2Component;
  let fixture: ComponentFixture<Middle2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Middle2Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Middle2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
