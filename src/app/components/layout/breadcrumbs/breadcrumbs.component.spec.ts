import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreadcrumbsComponent } from './breadcrumbs.component';

describe('BreadcrumbsComponent', () => {
  let component: BreadcrumbsComponent;
  let fixture: ComponentFixture<BreadcrumbsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BreadcrumbsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have showHome default to true', () => {
    expect(component.showHome).toBeTrue();
  });

  it('should detect if menuItem is an array', () => {
    component.menuItem = ['menu1', 'menu2'];
    expect(component.isMenuArray).toBeTrue();
  });

  it('should detect if menuItem is a string', () => {
    component.menuItem = 'menu1';
    expect(component.isMenuArray).toBeFalse();
  });

  it('should accept headerTitle input', () => {
    component.headerTitle = 'Test Header';
    expect(component.headerTitle).toBe('Test Header');
  });
});
