import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bottom2Component } from './bottom2.component';

describe('Bottom2Component', () => {
  let component: Bottom2Component;
  let fixture: ComponentFixture<Bottom2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bottom2Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Bottom2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
