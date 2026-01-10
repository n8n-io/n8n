import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';

export class ExcelImportNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'excelImport',
    displayName: 'Excel Import',
    group: 'input',
    version: 1,
    description: 'Import tax data from Excel files (W-2s, 1099s, itemized deductions)',
    inputs: ['File Data'],
    outputs: ['Parsed Data'],
    properties: {
      sheetName: { type: 'string', default: 'Sheet1' },
      dataType: { type: 'string', default: 'w2' }, // 'w2', '1099', 'itemized'
      hasHeader: { type: 'boolean', default: true },
    },
  };

  async execute(
    _context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    this.validateInput(inputData);
    const input = this.getFirstInput(inputData);

    // In a real implementation, this would read from a file input
    // For now, we'll handle data passed as JSON or binary
    const fileData = input.json.fileData || input.json.buffer;
    const dataType = input.json.dataType || 'w2';
    const sheetName = input.json.sheetName || 'Sheet1';

    if (!fileData) {
      throw new Error('No file data provided');
    }

    let workbook: XLSX.WorkBook;

    // Handle different input types
    if (typeof fileData === 'string') {
      // Base64 encoded data
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      workbook = XLSX.read(bytes, { type: 'array' });
    } else if (fileData instanceof ArrayBuffer) {
      workbook = XLSX.read(fileData, { type: 'array' });
    } else {
      throw new Error('Invalid file data format');
    }

    // Get the specified sheet
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in workbook`);
    }

    // Convert to JSON
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      throw new Error('No data found in Excel sheet');
    }

    // Parse based on data type
    const results: TaxData[] = [];

    for (const row of jsonData) {
      let parsedData: any;

      if (dataType === 'w2') {
        parsedData = this.parseW2Row(row);
      } else if (dataType === '1099') {
        parsedData = this.parse1099Row(row);
      } else if (dataType === 'itemized') {
        parsedData = this.parseItemizedRow(row);
      } else {
        parsedData = row;
      }

      results.push(this.createOutput(parsedData));
    }

    return results;
  }

  private parseW2Row(row: any): any {
    return {
      type: 'w2',
      employerName: row['Employer Name'] || row['employer_name'] || '',
      employerEIN: row['Employer EIN'] || row['employer_ein'] || '',
      employeeSSN: row['Employee SSN'] || row['employee_ssn'] || '',
      wages: row['Wages'] ? new Decimal(row['Wages']) : new Decimal(0),
      federalTaxWithheld: row['Federal Tax Withheld']
        ? new Decimal(row['Federal Tax Withheld'])
        : new Decimal(0),
      socialSecurityWages: row['SS Wages']
        ? new Decimal(row['SS Wages'])
        : new Decimal(0),
      socialSecurityTaxWithheld: row['SS Tax']
        ? new Decimal(row['SS Tax'])
        : new Decimal(0),
      medicareWages: row['Medicare Wages']
        ? new Decimal(row['Medicare Wages'])
        : new Decimal(0),
      medicareTaxWithheld: row['Medicare Tax']
        ? new Decimal(row['Medicare Tax'])
        : new Decimal(0),
      stateWages: row['State Wages']
        ? new Decimal(row['State Wages'])
        : new Decimal(0),
      stateTaxWithheld: row['State Tax']
        ? new Decimal(row['State Tax'])
        : new Decimal(0),
    };
  }

  private parse1099Row(row: any): any {
    const type = row['Form Type'] || row['form_type'] || '1099-INT';

    return {
      type,
      payerName: row['Payer Name'] || row['payer_name'] || '',
      payerTIN: row['Payer TIN'] || row['payer_tin'] || '',
      recipientSSN: row['Recipient SSN'] || row['recipient_ssn'] || '',
      interestIncome: row['Interest Income']
        ? new Decimal(row['Interest Income'])
        : undefined,
      ordinaryDividends: row['Ordinary Dividends']
        ? new Decimal(row['Ordinary Dividends'])
        : undefined,
      qualifiedDividends: row['Qualified Dividends']
        ? new Decimal(row['Qualified Dividends'])
        : undefined,
      capitalGain: row['Capital Gain']
        ? new Decimal(row['Capital Gain'])
        : undefined,
      nonemployeeCompensation: row['Nonemployee Compensation']
        ? new Decimal(row['Nonemployee Compensation'])
        : undefined,
      federalTaxWithheld: row['Federal Tax Withheld']
        ? new Decimal(row['Federal Tax Withheld'])
        : new Decimal(0),
    };
  }

  private parseItemizedRow(row: any): any {
    const category = row['Category'] || row['category'] || 'other';
    const amount = row['Amount'] || row['amount'] || 0;

    return {
      type: 'itemized_deduction',
      category,
      amount: new Decimal(amount),
      description: row['Description'] || row['description'] || '',
      date: row['Date'] || row['date'] || '',
    };
  }
}
