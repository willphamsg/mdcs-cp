import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectBusGroupComponent } from './select-bus-group.component';

describe('SelectDepotComponent', () => {
  let component: SelectBusGroupComponent;
  let fixture: ComponentFixture<SelectBusGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectBusGroupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SelectBusGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
