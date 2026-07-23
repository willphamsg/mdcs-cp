import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { WrapperTableComponent, TableColumn } from './wrapper-table.component';

describe('WrapperTableComponent', () => {
  let component: WrapperTableComponent<any>;
  let fixture: ComponentFixture<WrapperTableComponent<any>>;

  const mockColumns: TableColumn<any>[] = [
    { columnDef: 'id', header: 'ID', subHeader: [], cell: (e: any) => e.id },
    { columnDef: 'name', header: 'Name', subHeader: [{ id: 'sub1', name: 'Sub 1' }], cell: (e: any) => e.name },
  ];

  const mockData = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WrapperTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WrapperTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map columnDefs on ngOnInit', () => {
    component.columns = mockColumns;
    component.ngOnInit();
    expect(component.columnDefs).toEqual(['id', 'name']);
  });

  it('should update gridOptions rowData on dataSource change', () => {
    component.ngOnChanges({
      dataSource: new SimpleChange([], mockData, false),
    });
    expect(component.gridOptions.rowData).toEqual(mockData);
  });

  it('should update gridOptions columnDefs on columns change', () => {
    component.ngOnChanges({
      columns: new SimpleChange([], mockColumns, false),
    });
    expect(component.gridOptions.columnDefs!).toHaveSize(2);
  });

  it('should detect hasSubHeader when columns have subHeaders', () => {
    component.columns = mockColumns;
    expect(component.hasSubHeader).toBeTrue();
  });

  it('should return false for hasSubHeader when no subHeaders', () => {
    component.columns = [
      { columnDef: 'id', header: 'ID', subHeader: [], cell: (e: any) => e.id },
    ];
    expect(component.hasSubHeader).toBeFalse();
  });

  it('should return mainHeaderIds', () => {
    component.columns = mockColumns;
    expect(component.mainHeaderIds).toEqual(['id', 'name']);
  });

  it('should return subHeaderIds with placeholders for columns without subHeaders', () => {
    component.columns = mockColumns;
    const subs = component.subHeaderIds;
    expect(subs).toContain('id_placeholder');
    expect(subs).toContain('name_sub1');
  });

  it('should default hasSearch to false', () => {
    expect(component.hasSearch).toBeFalse();
  });
});
