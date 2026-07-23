import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bottom4Component } from './bottom4.component';

describe('Bottom4Component', () => {
  let component: Bottom4Component;
  let fixture: ComponentFixture<Bottom4Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bottom4Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Bottom4Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
