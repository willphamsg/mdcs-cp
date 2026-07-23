import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { IParameterJSONData } from '@app/models/parameter-management';
import { isEmpty } from '@app/shared/utils/utils';
import { CONTROL_NAME_LABELS } from '@app/shared/utils/constants';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { IPaginationEvent } from '@app/models/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { PaginationService } from '@app/services/pagination.service';

@Component({
  selector: 'app-parameter-viewer-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCardModule,
    FormsModule,
    PaginationComponent,
  ],
  templateUrl: './parameter-viewer-table.component.html',
  styleUrl: './parameter-viewer-table.component.scss'
})

export class ParameterViewerTableComponent
  implements OnInit, OnChanges
{
  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<any>();

  @Input() payload: IParameterJSONData;

  FILTER_NAMES: { [key: string]: string } = CONTROL_NAME_LABELS;

  tabIdx:number = 0;
  descriptionPayload: any;
  tabPayload: any = null;
  tablePayload: any = null;

  isShowDescription: boolean = false;
  isShowTab: boolean = false;
  isShowTable: boolean = false;
  isShowInfo: boolean = false;

  isDevideInfo: boolean = false;

  isPatronCatMap: boolean = false;
  categorySelection: string[] = [];
  categorySelected: string = "aobjWeekdayTimeTable";

  dataInfo1: any;
  dataInfo2: any;

  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;

  originalData: any;
  filterValue: string;
  searchText: string;
  rowCount: number = 0;
  currentPage: any = 0;
  itemsPerPage: any = 10;

  isSVT: boolean = false;
  isShowTabSVT: boolean = false;
  variantSelected: number | null;
  aVN: any[];
  variantInformation: any;

  baseVariantDescriptions: any[] = [];
  displayedColumnsBase: string[] = [];
  displayedColumnsVariant: string[] = [];
  dataSourceBase = new MatTableDataSource<any>();
  dataSourceVariant = new MatTableDataSource<any>();

  A: any;

  // FileIds that should NOT have the No. column
  private readonly excludedFileIds = [
    26, 28, 29, 35, 36, 37, 48, 49, 50, 51, 52, 53, 54,
  ];
  private fileId: number | undefined;
  public shouldShowNoColumn: boolean = true;

  constructor(
    private readonly paginationService: PaginationService,
  ) {
  }

  ngOnInit(): void {
    this.displayedColumns = [];
    this.dataSource.data = [];
    // Initialize SVT column definitions
    this.updateSVTColumnDefinitions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['payload']?.currentValue) {
      this.filterValue = '';
      this.searchText = '';
      // Reset pagination to defaults when payload changes
      this.currentPage = 0;
      this.itemsPerPage = 10;
      this.paginationService.currentPage = 1;
      this.paginationService.pageSize = 10;

      this.isShowDescription = false;
      this.isShowTab = false;
      this.isShowTable = false;
      this.isShowInfo = false;
      this.isShowTabSVT = false;

      // Store fileId and determine if No. column should be shown
      this.fileId = this.payload.fileId;
      this.shouldShowNoColumn = !this.excludedFileIds.includes(
        this.fileId || 0
      );

      // Update SVT column definitions when shouldShowNoColumn changes
      this.updateSVTColumnDefinitions();

      const hasObjPayload = this.hasObjPayloadData(this.payload);

      if (hasObjPayload) {
        this.isSVT = false;
        this.massagePayload(this.payload);
      } else if (this.payload.parameter_name?.includes("BUS_SVT")) {
        this.isSVT = true;
        this.forSVT(this.payload);
      }
    }
  }

  applyFilter(event?: Event) {
    // this.filterValue = (event?.target as HTMLInputElement).value;
    this.filterValue = event ? (event.target as HTMLInputElement).value : '';
    this.searchText = this.filterValue;

    // Reset page when new filter/search happens
    this.paginationService.currentPage = 1;
    this.currentPage = 0;

    this.updateDataSource();
  }

  updateDataSource() {
    if(!isEmpty(this.descriptionPayload)) this.isShowDescription = true;
    if(!isEmpty(this.tabPayload)) this.isShowTab = true;

    this.filterValue = this.filterValue?this.filterValue:'';

    if(!this.originalData) return;

    if(this.originalData?.rows && this.originalData?.rows.length > 1) {
      // Conditionally include No. column based on fileId
      const baseColumns = this.originalData?.headers || [];
      this.displayedColumns = this.shouldShowNoColumn 
        ? ['No.', ...baseColumns] 
        : baseColumns;
      
      const filteredData = this.originalData?.rows?.filter(
        (item: any) =>
          Object.values(item)
            .join(' ')
            .toLowerCase()
            .includes(this.filterValue.toLowerCase())
      ) || [];
      this.rowCount = filteredData.length;

      const startIndex = this.currentPage * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;
      this.dataSource.data = filteredData.slice(startIndex, endIndex);
      
      this.isShowInfo = false;
      this.isShowTable = true;
    } else {
      const propertyCount = Object.keys(this.originalData?.rows[0]).length;
      const keys = Object.keys(this.originalData?.rows[0]);

      if(propertyCount > 9) {
        // Find the midpoint
        const midpoint = Math.ceil(keys.length / 2);

        // Create two new objects by splitting the keys
        this.dataInfo1 = this.extractDividePropertyToArray(
          keys.slice(0, midpoint).reduce((obj: any, key) => {
            obj[key] = this.originalData?.rows[0][key];
            return obj;
          }, {})
        );

        this.dataInfo2 = this.extractDividePropertyToArray(
          keys.slice(midpoint).reduce((obj: any, key) => {
            obj[key] = this.originalData?.rows[0][key];
            return obj;
          }, {})
        );
        
        this.isDevideInfo = true;
      } else {
        this.dataInfo1 = this.extractDividePropertyToArray(this.originalData?.rows[0]);
        this.isDevideInfo = false;
      }

      this.isShowInfo = true;
      this.isShowTable = false;
    }
  }
  
  onTabChange(): void {
    this.filterValue = '';
    this.searchText = ''
    // Reset pagination to defaults when changing tabs
    this.currentPage = 0;
    this.itemsPerPage = 10;
    this.paginationService.currentPage = 1;
    this.paginationService.pageSize = 10;

    if(this.hasObjPayloadData(this.payload)) {
      this.massagePayload(this.payload);
    } else {
      this.variantSelected = this.aVN[0].VN;
      this.getVariantInformation(this.variantSelected, this.tabIdx);
    }
  }

  onPageChange(event: IPaginationEvent): void {
    this.currentPage = event.page-1;
    this.itemsPerPage = event.pageSize;
    this.updateDataSource();
  }

  forSVT(json: IParameterJSONData): void {
    if (!json?.jsondata) return;

    // Handle both string and object types for jsondata
    const parseJSONPayload = typeof json.jsondata === 'string'
      ? this.safeParseJson(json.jsondata)
      : json.jsondata;

    if (!isEmpty(parseJSONPayload)) {
      this.tabPayload = ["Bus Service Definitions", "Base & Variant(Inbound)", "Base & Variant(Outbound)"];
      this.isShowTabSVT = true;
      this.variantInformation = parseJSONPayload[0];
      this.A = parseJSONPayload[1].A;

      const filteredNoArray = this.objectReturnNoArray(this.variantInformation);

      this.dataInfo1 = this.extractDividePropertyToArray(filteredNoArray);
      
      this.aVN = this.variantInformation.aVN ? this.variantInformation.aVN : [];

      this.variantSelected = this.aVN[0].VN;
      this.getVariantInformation(this.variantSelected, this.tabIdx);

      // this.updateDataSource();
    }
  }

  onVariantChange(event: any):void {
    const selectedValue = event.value;
    this.getVariantInformation(selectedValue, this.tabIdx);
  }

  getVariantInformation(selectedValue: any, tabId: number) {
    const variantContent = this.variantInformation.VP.find((item: { VID: number | null; }) => item.VID === selectedValue);
    this.baseVariantDescriptions = this.extractDividePropertyToArray(this.objectReturnNoArray(variantContent));
    
    if(tabId === 1) {
      this.dataSourceVariant.data = variantContent.VI;
      this.dataSourceBase.data = this.variantInformation.BI;
    } else if(tabId === 2) {
      this.dataSourceVariant.data = variantContent.VO;
      this.dataSourceBase.data = this.variantInformation.BO;
    }
  }

  massagePayload(json: IParameterJSONData): void {
    if (!json?.jsondata) return;

    // Handle both string and object types for jsondata
    const parseJSONPayload = typeof json.jsondata === 'string'
      ? this.safeParseJson(json.jsondata)
      : json.jsondata;

    if (!isEmpty(parseJSONPayload) && parseJSONPayload.objPayloadData) {
      this.descriptionPayload = this.extractTopLevelProperties(parseJSONPayload.objPayloadData);
      this.tabPayload = this.massageTabPayload(parseJSONPayload.objPayloadData);
      this.tablePayload = this.massageParameterDetails(parseJSONPayload.objPayloadData);

      this.originalData = this.massageTableContent(this.tablePayload, this.tabPayload[this.tabIdx]);

      this.updateDataSource();
    }
  }

  // this function is only return the top level only that contains string or number, it wont return nested object (for description use)
  extractTopLevelProperties(obj: Record<string, any>): { name: string; value: string | number }[] {
    const result: { name: string; value: string | number }[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' || typeof value === 'number') {
        result.push({ name: key, value }); // Add to result in the specified format
      }
    }
    return result;
  }

  //Function to Extract Only Nested Objects or Arrays (for table use)
  massageParameterDetails(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    if (obj["aobjBU"] && Array.isArray(obj["aobjBU"]) && obj["aobjBU"].length > 0) {
      const firstObj = obj["aobjBU"][0];

      // Extract only nested objects from 'aobjBU[0]'
      for (const key of Object.keys(firstObj)) {
        if (typeof firstObj[key] === 'object' && firstObj[key] !== null) {
          result[key] = firstObj[key];
        }
      }
    } else {
      // For normal cases including PDT which has aobjPDTDetails
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  //Function to Extract Only Nested Structures Without Inner Values (for tab use)
  extractNestedStructure(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {}; // Explicitly typed result object
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        // Retain the structure but empty the nested values
        result[key] = Array.isArray(value) ? [] : {};
      }
    }
    return result;
  }

  massageTabPayload(obj: Record<string, any>): string[] {
    const nestedStructureNames: string[] = [];

    // Ensure 'aobjBU' exists and is an array
    if (obj["aobjBU"] && Array.isArray(obj["aobjBU"]) && obj["aobjBU"].length > 0) {
        const firstObj = obj["aobjBU"][0];
        
        // Extract keys specifically from `aobjBU[0]`
        for (const key of Object.keys(firstObj)) {
            if (typeof firstObj[key] === 'object' && firstObj[key] !== null) {
                nestedStructureNames.push(key);
            }
        }
    } else {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          nestedStructureNames.push(key); 
        }
      }
    }

    return nestedStructureNames;
  }


  //Function to Extract Headers and Rows (for table header and data)
  massageTableContent(obj: Record<string, any>, key: string): { headers: string[]; rows: any[] } | null {
    const currentTab = this.tabPayload[this.tabIdx];
    if (currentTab === 'aobjPatronCatMap') {
      return this.massagePatronCatMapContent(obj, key);
    }
    return this.massageDefaultTableContent(obj, key);
  }

  private massagePatronCatMapContent(obj: Record<string, any>, key: string): { headers: string[]; rows: any[] } | null {
    this.isPatronCatMap = true;

    const paramData = obj[key];
    this.categorySelection = Object.keys(paramData[0]);
    this.categorySelected = !this.categorySelected ? this.categorySelection[0] : this.categorySelected;

    const category = this.categorySelected;

    if (Array.isArray(paramData[0][category]) && paramData[0][category].length > 0 && typeof paramData[0][category] === 'object') {
      const headers = Object.keys(paramData[0][category][0]);
      const rows = paramData[0][category];

      return { headers, rows };
    }
    return null;
  }

  private massageDefaultTableContent(obj: Record<string, any>, key: string): { headers: string[]; rows: any[] } | null {
    this.isPatronCatMap = false;
    this.categorySelection = [];
    this.categorySelected = "";

    if (obj[key] && Array.isArray(obj[key]) && obj[key].length > 0 && typeof obj[key][0] === 'object') {
      const headers = Object.keys(obj[key][0]);
      const rows = obj[key];
      return { headers, rows };
    }
    return null;
  }

  extractDividePropertyToArray(data: any) {
    return Object.entries(data).map(([key, value]) => ({
      name: key,
      value: value,
    }))
  }

  tableObjectValueHandler(elementValue: any) {
    let data: any = elementValue;
    
    if (Array.isArray(elementValue) && elementValue.length > 0 && typeof elementValue[0] === 'object') {
      const dynamicKey = Object.keys(elementValue[0])[0];
      data = elementValue.map(item => item[dynamicKey]);
    }
    return data;
  }

  hasObjPayloadData(response: { jsondata: any }): boolean {
    const parsed = this.safeParseJson(response.jsondata);
    return parsed?.hasOwnProperty('objPayloadData') ?? false;
  }

  objectReturnNoArray(json: any) {
    let data: any = json;

    data = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => !Array.isArray(value))
    );

    return data;
  }

  handleSelectTimetable(item: any) {
    this.categorySelected = item;
    this.massagePayload(this.payload);
  }

  safeParseJson(data: any): any {
    if (!data) return null;

    // Handle empty object case
    if (typeof data === 'object' && Object.keys(data).length === 0) {
      return null;
    }

    try {
      if (typeof data === 'object') return data;

      // Handle empty string case
      if (data === '') {
        return null;
      }

      let parsed = JSON.parse(data);

      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }

      return parsed;
    } catch {
      const fixed = this.autoFixJsonString(data);
      if (fixed !== null) {
        return fixed;
      }
      return null;
    }
  }

  autoFixJsonString(input: string): any {
    const tryParse = (str: string) => {
      try {
        return JSON.parse(str);
      } catch {
        return null;
      }
    };

    // First attempt: parse as-is
    const parsed = tryParse(input);
    if (parsed !== null) return parsed;

    // Second attempt: if it's a double-encoded string, try to parse it twice
    const doubleParsed = this.tryDoubleEncodedParse(input, tryParse);
    if (doubleParsed !== null) return doubleParsed;

    // Third attempt: fix unbalanced brackets/braces
    const fixedInput = this.balanceBracketsAndBraces(input);
    const fixedParsed = tryParse(fixedInput);
    if (fixedParsed !== null) return fixedParsed;

    // Fourth attempt: for double-encoded strings with missing brackets
    return this.tryUnescapedDoubleEncodedParse(input, tryParse);
  }

  private tryDoubleEncodedParse(input: string, tryParse: (str: string) => any): any {
    if (!(input.startsWith('"') && input.endsWith('"'))) {
      return null;
    }
    // Remove outer quotes and unescape
    const unescaped = input.slice(1, -1).replaceAll(String.raw`\"`, '"').replaceAll(String.raw`\\`, '\\');
    return tryParse(unescaped);
  }

  private balanceBracketsAndBraces(input: string): string {
    const openBraces = (input.match(/{/g) || []).length;
    const closeBraces = (input.match(/}/g) || []).length;
    const openBrackets = (input.match(/\[/g) || []).length;
    const closeBrackets = (input.match(/]/g) || []).length;

    let fixedInput = input;

    // If we have more opens than closes, add the missing closes
    if (openBrackets > closeBrackets) {
      fixedInput += ']'.repeat(openBrackets - closeBrackets);
    }
    if (openBraces > closeBraces) {
      fixedInput += '}'.repeat(openBraces - closeBraces);
    }

    return fixedInput;
  }

  private tryUnescapedDoubleEncodedParse(input: string, tryParse: (str: string) => any): any {
    // Fourth attempt: for double-encoded strings with missing brackets
    if (!input.includes(String.raw`\"`)) {
      return null;
    }
    try {
      // Remove outer quotes if present
      let cleanInput = input.startsWith('"') && input.endsWith('"')
        ? input.slice(1, -1)
        : input;

      // Unescape the string
      cleanInput = cleanInput.replaceAll(String.raw`\"`, '"').replaceAll(String.raw`\\`, '\\');

      // Count brackets/braces again after unescaping and add missing ones
      cleanInput = this.balanceBracketsAndBraces(cleanInput);

      return tryParse(cleanInput);
    } catch {
      // Failed to fix double-encoded JSON
      return null;
    }
  }

  getRowNumber(index: number): number {
    return (this.currentPage * this.itemsPerPage) + index + 1;
  }

  getRowNumberForStaticTable(index: number): number {
    return index + 1;
  }

  private updateSVTColumnDefinitions(): void {
    const baseColumns = ['MI', 'TBP', 'ST'];
    const variantColumns = ['NM', 'SN', 'DFO'];
    
    this.displayedColumnsBase = this.shouldShowNoColumn 
      ? ['No.', ...baseColumns] 
      : baseColumns;
    
    this.displayedColumnsVariant = this.shouldShowNoColumn 
      ? ['No.', ...variantColumns] 
      : variantColumns;
  }

}
