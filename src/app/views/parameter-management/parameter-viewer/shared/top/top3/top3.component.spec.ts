import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DepoService } from '@app/services/depo.service';
import { of } from 'rxjs';
import { Top3Component } from './top3.component';

describe('Top3Component', () => {
  let component: Top3Component;
  let fixture: ComponentFixture<Top3Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Top3Component],
      providers: [
        { provide: DepoService, useValue: { depoList$: of([]) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(Top3Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
