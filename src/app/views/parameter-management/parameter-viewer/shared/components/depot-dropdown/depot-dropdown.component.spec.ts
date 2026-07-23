import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DepoService } from '@app/services/depo.service';
import { of } from 'rxjs';
import { DepotDropdownComponent } from './depot-dropdown.component';

describe('DepotDropdownComponent', () => {
  let component: DepotDropdownComponent;
  let fixture: ComponentFixture<DepotDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepotDropdownComponent],
      providers: [
        { provide: DepoService, useValue: { depoList$: of([]) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DepotDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
