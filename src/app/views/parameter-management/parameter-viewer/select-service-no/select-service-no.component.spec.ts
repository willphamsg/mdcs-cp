import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectServiceNoComponent } from './select-service-no.component';

describe('SelectDepotComponent', () => {
  let component: SelectServiceNoComponent;
  let fixture: ComponentFixture<SelectServiceNoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectServiceNoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SelectServiceNoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
