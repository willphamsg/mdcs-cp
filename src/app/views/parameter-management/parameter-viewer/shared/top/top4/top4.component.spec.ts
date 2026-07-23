import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Top4Component } from './top4.component';

describe('Top4Component', () => {
  let component: Top4Component;
  let fixture: ComponentFixture<Top4Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Top4Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Top4Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
