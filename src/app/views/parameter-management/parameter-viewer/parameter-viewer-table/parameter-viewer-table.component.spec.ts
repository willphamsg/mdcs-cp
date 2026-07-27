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
  });
});
