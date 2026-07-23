import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationParametersComponent } from './application-parameters.component';

xdescribe('ApplicationParametersComponent', () => {
  let component: ApplicationParametersComponent;
  let fixture: ComponentFixture<ApplicationParametersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationParametersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ApplicationParametersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
