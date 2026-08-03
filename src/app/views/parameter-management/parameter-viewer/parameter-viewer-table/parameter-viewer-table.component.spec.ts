import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';

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

  describe('forSVT', () => {
    it('returns early without parsing when jsondata is missing', () => {
      const spy = spyOn(component, 'safeParseJson');

      component.forSVT({ parameter_name: 'BUS_SVT', jsondata: null } as any);

      expect(spy).not.toHaveBeenCalled();
      expect(component.isShowTabSVT).toBeFalse();
    });

    it('returns early without parsing when jsondata is an empty string', () => {
      const spy = spyOn(component, 'safeParseJson');

      component.forSVT({ parameter_name: 'BUS_SVT', jsondata: '' } as any);

      expect(spy).not.toHaveBeenCalled();
      expect(component.isShowTabSVT).toBeFalse();
    });

    it('populates SVT tab/variant state on the happy path', () => {
      const variantInformation = {
        aVN: [{ VN: 1 }],
        VP: [{ VID: 1, VI: ['vi-row'], VO: ['vo-row'] }],
        BI: ['bi-row'],
        BO: ['bo-row'],
        plainProp: 'plain-value',
      };
      const jsonData = [variantInformation, { A: 'a-value' }];

      component.forSVT({
        parameter_name: 'BUS_SVT',
        jsondata: jsonData,
      } as any);

      expect(component.isShowTabSVT).toBeTrue();
      expect(component.tabPayload).toEqual([
        'Bus Service Definitions',
        'Base & Variant(Inbound)',
        'Base & Variant(Outbound)',
      ]);
      expect(component.variantInformation).toBe(variantInformation);
      expect(component.A).toBe('a-value');
      expect(component.aVN).toEqual([{ VN: 1 }]);
      expect(component.variantSelected).toBe(1);
      expect(component.dataInfo1).toEqual([
        { name: 'plainProp', value: 'plain-value' },
      ]);
    });
  });

  describe('massagePayload', () => {
    it('returns early without parsing when jsondata is missing', () => {
      const spy = spyOn(component, 'safeParseJson');

      component.massagePayload({ parameter_name: 'X', jsondata: undefined } as any);

      expect(spy).not.toHaveBeenCalled();
      expect(component.originalData).toBeUndefined();
    });

    it('returns early without parsing when jsondata is an empty string', () => {
      const spy = spyOn(component, 'safeParseJson');

      component.massagePayload({ parameter_name: 'X', jsondata: '' } as any);

      expect(spy).not.toHaveBeenCalled();
      expect(component.originalData).toBeUndefined();
    });

    it('massages a full payload into description/tab/table state on the happy path', () => {
      const objPayloadData = {
        strA: 'hello',
        numB: 5,
        aobjSomething: [{ col1: 'a', col2: 'b' }],
      };

      component.massagePayload({
        parameter_name: 'X',
        jsondata: { objPayloadData },
      } as any);

      expect(component.descriptionPayload).toEqual([
        { name: 'strA', value: 'hello' },
        { name: 'numB', value: 5 },
      ]);
      expect(component.tabPayload).toEqual(['aobjSomething']);
      expect(component.originalData).toEqual({
        headers: ['col1', 'col2'],
        rows: [{ col1: 'a', col2: 'b' }],
      });
    });
  });

  describe('massageTableContent', () => {
    it('dispatches to massagePatronCatMapContent when the current tab is aobjPatronCatMap', () => {
      component.tabPayload = ['aobjPatronCatMap'];
      component.tabIdx = 0;
      component.categorySelected = '';

      const obj = {
        aobjPatronCatMap: [
          {
            catA: [{ h1: 'v1' }],
          },
        ],
      };

      const result = component.massageTableContent(obj, 'aobjPatronCatMap');

      expect(component.isPatronCatMap).toBeTrue();
      expect(component.categorySelected).toBe('catA');
      expect(result).toEqual({ headers: ['h1'], rows: [{ h1: 'v1' }] });
    });

    it('dispatches to massageDefaultTableContent for any other tab', () => {
      component.tabPayload = ['aobjOther'];
      component.tabIdx = 0;

      const obj = { aobjOther: [{ c1: 'x' }] };

      const result = component.massageTableContent(obj, 'aobjOther');

      expect(component.isPatronCatMap).toBeFalse();
      expect(result).toEqual({ headers: ['c1'], rows: [{ c1: 'x' }] });
    });
  });

  describe('safeParseJson recovery via autoFixJsonString', () => {
    it('recovers a quote-wrapped double-encoded JSON string', () => {
      // A string that itself starts/ends with a quote character, containing
      // an unescaped JSON object in between (invalid as-is, but recoverable
      // by stripping the outer quotes).
      const input = `"{"foo":"bar"}"`;

      const result = component.safeParseJson(input);

      expect(result).toEqual({ foo: 'bar' });
    });

    it('recovers JSON with unbalanced/missing closing braces', () => {
      const input = '{"a":1';

      const result = component.safeParseJson(input);

      expect(result).toEqual({ a: 1 });
    });

    it('recovers an escaped and truncated double-encoded JSON string', () => {
      // Contains literal backslash-quote sequences (escaped double-encoding)
      // and is missing its closing brace, so only the fourth recovery
      // strategy (tryUnescapedDoubleEncodedParse) can fix it.
      const input = '{' + String.raw`\"` + 'a' + String.raw`\"` + ':1';

      const result = component.safeParseJson(input);

      expect(result).toEqual({ a: 1 });
    });

    it('returns null when the string is unrecoverable by any strategy', () => {
      const input = 'not json at all {';

      const result = component.safeParseJson(input);

      expect(result).toBeNull();
    });

    it('returns the object directly when data is already a populated object', () => {
      const obj = { a: 1 };
      expect(component.safeParseJson(obj)).toBe(obj);
    });

    it('returns null for a falsy value', () => {
      expect(component.safeParseJson(null)).toBeNull();
      expect(component.safeParseJson(undefined)).toBeNull();
    });

    it('returns null for an empty object', () => {
      expect(component.safeParseJson({})).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(component.safeParseJson('')).toBeNull();
    });

    it('double-parses a JSON string that decodes to another JSON string', () => {
      const inner = JSON.stringify({ a: 1 });
      const doubleEncoded = JSON.stringify(inner);
      expect(component.safeParseJson(doubleEncoded)).toEqual({ a: 1 });
    });
  });

  describe('ngOnInit', () => {
    it('resets displayedColumns/dataSource and initializes SVT column definitions', () => {
      component.displayedColumns = ['stale'];
      component.dataSource.data = [{ x: 1 }];

      component.ngOnInit();

      expect(component.displayedColumns).toEqual([]);
      expect(component.dataSource.data).toEqual([]);
      expect(component.displayedColumnsBase).toEqual(['No.', 'MI', 'TBP', 'ST']);
      expect(component.displayedColumnsVariant).toEqual([
        'No.',
        'NM',
        'SN',
        'DFO',
      ]);
    });
  });

  describe('ngOnChanges', () => {
    it('does nothing when the payload change has no currentValue', () => {
      spyOn(component, 'massagePayload');
      spyOn(component, 'forSVT');

      component.ngOnChanges({
        payload: new SimpleChange(undefined, undefined, true),
      });

      expect(component.massagePayload).not.toHaveBeenCalled();
      expect(component.forSVT).not.toHaveBeenCalled();
    });

    it('shows the No. column when fileId is not in the excluded list and dispatches to massagePayload', () => {
      spyOn(component, 'massagePayload');
      const payload = {
        parameter_name: 'BUS_FOO',
        jsondata: { objPayloadData: { a: 1 } },
        fileId: 1,
      } as any;

      component.payload = payload;
      component.ngOnChanges({
        payload: new SimpleChange(undefined, payload, true),
      });

      expect(component.shouldShowNoColumn).toBeTrue();
      expect(component.isSVT).toBeFalse();
      expect(component.massagePayload).toHaveBeenCalledWith(payload);
    });

    it('hides the No. column when fileId is in the excluded list', () => {
      const payload = {
        parameter_name: 'BUS_FOO',
        jsondata: {},
        fileId: 26,
      } as any;

      component.payload = payload;
      component.ngOnChanges({
        payload: new SimpleChange(undefined, payload, true),
      });

      expect(component.shouldShowNoColumn).toBeFalse();
    });

    it('dispatches to forSVT when the payload has no objPayloadData but the name contains BUS_SVT', () => {
      spyOn(component, 'forSVT');
      const payload = {
        parameter_name: 'BUS_SVT_FILE',
        jsondata: {},
      } as any;

      component.payload = payload;
      component.ngOnChanges({
        payload: new SimpleChange(undefined, payload, true),
      });

      expect(component.isSVT).toBeTrue();
      expect(component.forSVT).toHaveBeenCalledWith(payload);
    });

    it('dispatches to neither handler when payload has no objPayloadData and is not a BUS_SVT file', () => {
      spyOn(component, 'massagePayload');
      spyOn(component, 'forSVT');
      const payload = {
        parameter_name: 'BUS_OTHER',
        jsondata: {},
      } as any;

      component.payload = payload;
      component.ngOnChanges({
        payload: new SimpleChange(undefined, payload, true),
      });

      expect(component.massagePayload).not.toHaveBeenCalled();
      expect(component.forSVT).not.toHaveBeenCalled();
    });
  });

  describe('applyFilter', () => {
    it('resets filterValue to empty string when no event is provided', () => {
      component.filterValue = 'stale';
      spyOn(component, 'updateDataSource');

      component.applyFilter();

      expect(component.filterValue).toBe('');
      expect(component.currentPage).toBe(0);
      expect(component.updateDataSource).toHaveBeenCalled();
    });

    it('reads the filter value from the input event target', () => {
      spyOn(component, 'updateDataSource');
      const event = { target: { value: 'search-text' } } as unknown as Event;

      component.applyFilter(event);

      expect(component.filterValue).toBe('search-text');
      expect(component.searchText).toBe('search-text');
    });
  });

  describe('updateDataSource', () => {
    it('returns early when originalData is not set', () => {
      component.originalData = undefined;
      expect(() => component.updateDataSource()).not.toThrow();
      expect(component.isShowTable).toBeFalse();
    });

    it('shows the table with the No. column and paginates filtered rows', () => {
      component.shouldShowNoColumn = true;
      component.currentPage = 0;
      component.itemsPerPage = 1;
      component.filterValue = '';
      component.originalData = {
        headers: ['col1'],
        rows: [{ col1: 'alpha' }, { col1: 'beta' }],
      };

      component.updateDataSource();

      expect(component.displayedColumns).toEqual(['No.', 'col1']);
      expect(component.rowCount).toBe(2);
      expect(component.dataSource.data).toEqual([{ col1: 'alpha' }]);
      expect(component.isShowTable).toBeTrue();
      expect(component.isShowInfo).toBeFalse();
    });

    it('omits the No. column when shouldShowNoColumn is false', () => {
      component.shouldShowNoColumn = false;
      component.originalData = {
        headers: ['col1'],
        rows: [{ col1: 'alpha' }, { col1: 'beta' }],
      };

      component.updateDataSource();

      expect(component.displayedColumns).toEqual(['col1']);
    });

    it('filters rows case-insensitively by the filter value', () => {
      component.filterValue = 'BETA';
      component.originalData = {
        headers: ['col1'],
        rows: [{ col1: 'alpha' }, { col1: 'beta' }],
      };

      component.updateDataSource();

      expect(component.rowCount).toBe(1);
      expect(component.dataSource.data).toEqual([{ col1: 'beta' }]);
    });

    it('shows description and tab sections when they have content', () => {
      component.descriptionPayload = [{ name: 'a', value: 1 }];
      component.tabPayload = ['tab1'];
      component.originalData = {
        headers: ['col1'],
        rows: [{ col1: 'alpha' }, { col1: 'beta' }],
      };

      component.updateDataSource();

      expect(component.isShowDescription).toBeTrue();
      expect(component.isShowTab).toBeTrue();
    });

    it('splits properties into two info groups when there are more than 9 keys and a single row', () => {
      const row: any = {};
      for (let i = 0; i < 12; i++) {
        row[`k${i}`] = i;
      }
      component.originalData = { headers: [], rows: [row] };

      component.updateDataSource();

      expect(component.isDevideInfo).toBeTrue();
      expect(component.isShowInfo).toBeTrue();
      expect(component.isShowTable).toBeFalse();
      expect(component.dataInfo1.length + component.dataInfo2.length).toBe(12);
    });

    it('builds a single info group when there are 9 or fewer keys and a single row', () => {
      component.originalData = { headers: [], rows: [{ a: 1, b: 2 }] };

      component.updateDataSource();

      expect(component.isDevideInfo).toBeFalse();
      expect(component.dataInfo1).toEqual([
        { name: 'a', value: 1 },
        { name: 'b', value: 2 },
      ]);
    });
  });

  describe('onTabChange', () => {
    it('resets filter/search/pagination and re-massages the payload when it has objPayloadData', () => {
      component.payload = {
        parameter_name: 'X',
        jsondata: { objPayloadData: { a: 1 } },
      } as any;
      component.filterValue = 'stale';
      component.currentPage = 5;
      spyOn(component, 'massagePayload');

      component.onTabChange();

      expect(component.filterValue).toBe('');
      expect(component.currentPage).toBe(0);
      expect(component.massagePayload).toHaveBeenCalledWith(component.payload);
    });

    it('selects the first variant and loads its info when there is no objPayloadData', () => {
      component.payload = { parameter_name: 'X', jsondata: {} } as any;
      component.aVN = [{ VN: 7 }];
      component.tabIdx = 0;
      spyOn(component, 'getVariantInformation');

      component.onTabChange();

      expect(component.variantSelected).toBe(7);
      expect(component.getVariantInformation).toHaveBeenCalledWith(7, 0);
    });
  });

  describe('onPageChange', () => {
    it('updates currentPage/itemsPerPage and refreshes the data source', () => {
      spyOn(component, 'updateDataSource');

      component.onPageChange({ page: 3, pageSize: 25 });

      expect(component.currentPage).toBe(2);
      expect(component.itemsPerPage).toBe(25);
      expect(component.updateDataSource).toHaveBeenCalled();
    });
  });

  describe('onVariantChange', () => {
    it('delegates to getVariantInformation with the selected value and current tab', () => {
      spyOn(component, 'getVariantInformation');
      component.tabIdx = 1;

      component.onVariantChange({ value: 42 });

      expect(component.getVariantInformation).toHaveBeenCalledWith(42, 1);
    });
  });

  describe('getVariantInformation', () => {
    beforeEach(() => {
      component.variantInformation = {
        VP: [{ VID: 1, VI: ['vi-row'], VO: ['vo-row'] }],
        BI: ['bi-row'],
        BO: ['bo-row'],
      };
    });

    it('populates variant/base inbound data for tabId 1', () => {
      component.getVariantInformation(1, 1);

      expect(component.dataSourceVariant.data).toEqual(['vi-row']);
      expect(component.dataSourceBase.data).toEqual(['bi-row']);
    });

    it('populates variant/base outbound data for tabId 2', () => {
      component.getVariantInformation(1, 2);

      expect(component.dataSourceVariant.data).toEqual(['vo-row']);
      expect(component.dataSourceBase.data).toEqual(['bo-row']);
    });

    it('leaves the variant/base data sources untouched for any other tabId', () => {
      component.dataSourceVariant.data = ['unchanged'];
      component.dataSourceBase.data = ['unchanged'];

      component.getVariantInformation(1, 0);

      expect(component.dataSourceVariant.data).toEqual(['unchanged']);
      expect(component.dataSourceBase.data).toEqual(['unchanged']);
    });
  });

  describe('forSVT isEmpty guard', () => {
    it('does not populate tab state when the parsed payload is empty', () => {
      component.forSVT({ parameter_name: 'BUS_SVT', jsondata: [] } as any);
      expect(component.isShowTabSVT).toBeFalse();
    });
  });

  describe('massagePayload objPayloadData guard', () => {
    it('does not populate description/tab/table when objPayloadData is absent', () => {
      component.massagePayload({
        parameter_name: 'X',
        jsondata: { somethingElse: true },
      } as any);

      expect(component.descriptionPayload).toBeUndefined();
      expect(component.originalData).toBeUndefined();
    });
  });

  describe('extractTopLevelProperties', () => {
    it('includes only string/number values and skips nested objects', () => {
      const result = component.extractTopLevelProperties({
        a: 'x',
        b: 5,
        c: { nested: true },
        d: ['array'],
      });

      expect(result).toEqual([
        { name: 'a', value: 'x' },
        { name: 'b', value: 5 },
      ]);
    });
  });

  describe('massageParameterDetails', () => {
    it('extracts nested objects from aobjBU[0] when aobjBU is a populated array', () => {
      const result = component.massageParameterDetails({
        aobjBU: [{ nested: { a: 1 }, plain: 'x' }],
      });

      expect(result).toEqual({ nested: { a: 1 } });
    });

    it('extracts all nested objects at the top level when aobjBU is absent', () => {
      const result = component.massageParameterDetails({
        plain: 'x',
        nested: { a: 1 },
      });

      expect(result).toEqual({ nested: { a: 1 } });
    });

    it('falls back to top-level extraction when aobjBU is an empty array', () => {
      const result = component.massageParameterDetails({
        aobjBU: [],
        nested: { a: 1 },
      });

      // The fallback branch iterates over the original object's own entries,
      // and an empty array is still `typeof 'object'` and non-null, so aobjBU
      // itself is retained in the result alongside the other nested object.
      expect(result).toEqual({ aobjBU: [], nested: { a: 1 } });
    });
  });

  describe('extractNestedStructure', () => {
    it('retains nested structure but empties arrays and objects', () => {
      const result = component.extractNestedStructure({
        arr: [1, 2, 3],
        obj: { a: 1 },
        plain: 'x',
      });

      expect(result).toEqual({ arr: [], obj: {} });
    });
  });

  describe('massageTabPayload', () => {
    it('extracts nested keys from aobjBU[0] when present', () => {
      const result = component.massageTabPayload({
        aobjBU: [{ nested: { a: 1 }, plain: 'x' }],
      });
      expect(result).toEqual(['nested']);
    });

    it('extracts nested keys at the top level when aobjBU is absent', () => {
      const result = component.massageTabPayload({
        plain: 'x',
        nested: { a: 1 },
      });
      expect(result).toEqual(['nested']);
    });
  });

  describe('massagePatronCatMapContent (private)', () => {
    it('returns headers/rows when the selected category holds an array of objects', () => {
      component.categorySelected = '';
      const obj = {
        aobjPatronCatMap: [{ catA: [{ h1: 'v1' }], catB: [{ h2: 'v2' }] }],
      };

      const result = component['massagePatronCatMapContent'](
        obj,
        'aobjPatronCatMap'
      );

      expect(component.isPatronCatMap).toBeTrue();
      expect(component.categorySelected).toBe('catA');
      expect(result).toEqual({ headers: ['h1'], rows: [{ h1: 'v1' }] });
    });

    it('keeps a previously selected category instead of defaulting to the first one', () => {
      component.categorySelected = 'catB';
      const obj = {
        aobjPatronCatMap: [{ catA: [{ h1: 'v1' }], catB: [{ h2: 'v2' }] }],
      };

      const result = component['massagePatronCatMapContent'](
        obj,
        'aobjPatronCatMap'
      );

      expect(result).toEqual({ headers: ['h2'], rows: [{ h2: 'v2' }] });
    });

    it('returns null when the selected category is not a populated array of objects', () => {
      component.categorySelected = 'catA';
      const obj = { aobjPatronCatMap: [{ catA: 'not-an-array' }] };

      const result = component['massagePatronCatMapContent'](
        obj,
        'aobjPatronCatMap'
      );

      expect(result).toBeNull();
    });
  });

  describe('massageDefaultTableContent (private)', () => {
    it('returns headers/rows for a populated array of objects', () => {
      const result = component['massageDefaultTableContent'](
        { key: [{ a: 1 }] },
        'key'
      );
      expect(component.isPatronCatMap).toBeFalse();
      expect(result).toEqual({ headers: ['a'], rows: [{ a: 1 }] });
    });

    it('returns null when the key is missing', () => {
      const result = component['massageDefaultTableContent']({}, 'key');
      expect(result).toBeNull();
    });

    it('returns null when the array is empty', () => {
      const result = component['massageDefaultTableContent'](
        { key: [] },
        'key'
      );
      expect(result).toBeNull();
    });

    it('returns null when the array holds non-object values', () => {
      const result = component['massageDefaultTableContent'](
        { key: ['plain-string'] },
        'key'
      );
      expect(result).toBeNull();
    });
  });

  describe('extractDividePropertyToArray', () => {
    it('maps object entries to name/value pairs', () => {
      expect(component.extractDividePropertyToArray({ a: 1, b: 'two' })).toEqual([
        { name: 'a', value: 1 },
        { name: 'b', value: 'two' },
      ]);
    });
  });

  describe('tableObjectValueHandler', () => {
    it('maps an array of objects to the values of their first key', () => {
      const result = component.tableObjectValueHandler([
        { code: 'A', label: 'Alpha' },
        { code: 'B', label: 'Beta' },
      ]);
      expect(result).toEqual(['A', 'B']);
    });

    it('returns the value unchanged for a non-array input', () => {
      expect(component.tableObjectValueHandler('plain')).toBe('plain');
    });

    it('returns the array unchanged when it holds primitive values', () => {
      expect(component.tableObjectValueHandler([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('returns an empty array unchanged', () => {
      expect(component.tableObjectValueHandler([])).toEqual([]);
    });
  });

  describe('hasObjPayloadData', () => {
    it('returns true when the parsed payload has objPayloadData', () => {
      expect(
        component.hasObjPayloadData({ jsondata: { objPayloadData: {} } })
      ).toBeTrue();
    });

    it('returns false when the parsed payload lacks objPayloadData', () => {
      expect(component.hasObjPayloadData({ jsondata: { other: 1 } })).toBeFalse();
    });

    it('returns false when the payload cannot be parsed', () => {
      expect(component.hasObjPayloadData({ jsondata: null })).toBeFalse();
    });
  });

  describe('objectReturnNoArray', () => {
    it('filters out properties whose value is an array', () => {
      const result = component.objectReturnNoArray({
        a: 1,
        b: [1, 2],
        c: 'x',
      });
      expect(result).toEqual({ a: 1, c: 'x' });
    });
  });

  describe('handleSelectTimetable', () => {
    it('sets categorySelected and re-massages the payload', () => {
      component.payload = { parameter_name: 'X', jsondata: {} } as any;
      spyOn(component, 'massagePayload');

      component.handleSelectTimetable('newCategory');

      expect(component.categorySelected).toBe('newCategory');
      expect(component.massagePayload).toHaveBeenCalledWith(component.payload);
    });
  });

  describe('getRowNumber / getRowNumberForStaticTable', () => {
    it('computes the row number using the current page and page size', () => {
      component.currentPage = 2;
      component.itemsPerPage = 10;
      expect(component.getRowNumber(3)).toBe(24);
    });

    it('computes the static row number from the index alone', () => {
      expect(component.getRowNumberForStaticTable(4)).toBe(5);
    });
  });

  describe('updateSVTColumnDefinitions (private)', () => {
    it('excludes the No. column when shouldShowNoColumn is false', () => {
      component.shouldShowNoColumn = false;
      component['updateSVTColumnDefinitions']();
      expect(component.displayedColumnsBase).toEqual(['MI', 'TBP', 'ST']);
      expect(component.displayedColumnsVariant).toEqual(['NM', 'SN', 'DFO']);
    });

    it('includes the No. column when shouldShowNoColumn is true', () => {
      component.shouldShowNoColumn = true;
      component['updateSVTColumnDefinitions']();
      expect(component.displayedColumnsBase).toEqual(['No.', 'MI', 'TBP', 'ST']);
      expect(component.displayedColumnsVariant).toEqual([
        'No.',
        'NM',
        'SN',
        'DFO',
      ]);
    });
  });
});
