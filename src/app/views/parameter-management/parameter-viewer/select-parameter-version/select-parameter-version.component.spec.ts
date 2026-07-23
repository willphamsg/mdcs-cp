import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectParameterVersionComponent } from './select-parameter-version.component';

describe('SelectParameterVersionComponent', () => {
  let component: SelectParameterVersionComponent;
  let fixture: ComponentFixture<SelectParameterVersionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectParameterVersionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SelectParameterVersionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
