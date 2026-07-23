import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParameterViewerTableComponent } from './parameter-viewer-table.component';

describe('ParameterViewerTableComponent', () => {
  let component: ParameterViewerTableComponent;
  let fixture: ComponentFixture<ParameterViewerTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParameterViewerTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ParameterViewerTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
