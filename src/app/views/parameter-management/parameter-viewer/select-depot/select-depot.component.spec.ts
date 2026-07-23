import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DepoService } from '@app/services/depo.service';
import { of } from 'rxjs';
import { SelectDepotComponent } from './select-depot.component';

describe('SelectDepotComponent', () => {
  let component: SelectDepotComponent;
  let fixture: ComponentFixture<SelectDepotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectDepotComponent],
      providers: [
        { provide: DepoService, useValue: { depoList$: of([]) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectDepotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
