import { useEffect, useState } from 'react';
import {
  DollarSign,
  FileText,
  Download,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { sanitizeString } from '../schemas/validation';
import Decimal from 'decimal.js';

interface TaxSummary {
  agi: Decimal | null;
  deductions: Decimal | null;
  taxableIncome: Decimal | null;
  totalTax: Decimal | null;
  refundOrOwed: Decimal | null;
}

export function Dashboard() {
  const { result, error, isExecuting } = useWorkflowStore();
  const [taxSummary, setTaxSummary] = useState<TaxSummary>({
    agi: null,
    deductions: null,
    taxableIncome: null,
    totalTax: null,
    refundOrOwed: null,
  });
  const [formsGenerated, setFormsGenerated] = useState<string[]>([]);

  useEffect(() => {
    if (result) {
      // Extract tax summary from result
      const summary: TaxSummary = {
        agi: result.agi ? new Decimal(result.agi) : null,
        deductions: result.deductions?.amount
          ? new Decimal(result.deductions.amount)
          : null,
        taxableIncome: result.taxableIncome ? new Decimal(result.taxableIncome) : null,
        totalTax: result.tax?.totalTax ? new Decimal(result.tax.totalTax) : null,
        refundOrOwed: result.refundOrOwed ? new Decimal(result.refundOrOwed) : null,
      };

      setTaxSummary(summary);

      // Track forms generated from schedules
      const forms: string[] = [];
      if (result.schedules.has('form1040')) forms.push('Form 1040');
      if (result.schedules.has('scheduleA')) forms.push('Schedule A');
      if (result.schedules.has('scheduleC')) forms.push('Schedule C');
      if (result.schedules.has('scheduleSE')) forms.push('Schedule SE');
      setFormsGenerated(forms);
    }
  }, [result]);

  const formatCurrency = (value: Decimal | null): string => {
    if (!value) return '$0.00';
    return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const handleGeneratePDF = async () => {
    alert('PDF generation would be implemented here');
  };

  const handleDownloadExcel = async () => {
    alert('Excel download would be implemented here');
  };

  return (
    <div className="h-80 border-t border-gray-200 bg-white overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Tax Return Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">
              {isExecuting
                ? 'Executing workflow...'
                : result
                ? 'Workflow executed successfully'
                : 'No workflow executed yet'}
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleGeneratePDF}
              disabled={!result || isExecuting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Generate PDF package"
            >
              <FileText size={16} />
              Generate PDF
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={!result || isExecuting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              aria-label="Download Excel report"
            >
              <Download size={16} />
              Download Excel
            </button>
          </div>
        </div>

        {/* Execution Status */}
        {isExecuting && (
          <div
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <Loader2 size={24} className="animate-spin text-blue-600" aria-hidden="true" />
            <div>
              <div className="font-medium text-blue-900">Executing Workflow</div>
              <div className="text-sm text-blue-700">
                Processing tax calculations...
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isExecuting && (
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <XCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-medium text-red-900">Execution Error</div>
              <div
                className="text-sm text-red-700 mt-1"
                dangerouslySetInnerHTML={{ __html: sanitizeString(error.message) }}
              />
            </div>
          </div>
        )}

        {/* Tax Summary Cards */}
        {result && !isExecuting && (
          <div className="grid grid-cols-5 gap-4">
            {/* AGI */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">AGI</span>
                <DollarSign size={18} className="text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(taxSummary.agi)}
              </div>
              <div className="text-xs text-blue-700 mt-1">Adjusted Gross Income</div>
            </div>

            {/* Deductions */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-900">Deductions</span>
                <TrendingDown size={18} className="text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(taxSummary.deductions)}
              </div>
              <div className="text-xs text-green-700 mt-1">Total Deductions</div>
            </div>

            {/* Taxable Income */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-900">Taxable Income</span>
                <DollarSign size={18} className="text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {formatCurrency(taxSummary.taxableIncome)}
              </div>
              <div className="text-xs text-purple-700 mt-1">After Deductions</div>
            </div>

            {/* Total Tax */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-900">Total Tax</span>
                <TrendingUp size={18} className="text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {formatCurrency(taxSummary.totalTax)}
              </div>
              <div className="text-xs text-orange-700 mt-1">Federal Tax Owed</div>
            </div>

            {/* Refund or Owed */}
            <div
              className={`bg-gradient-to-br rounded-lg p-4 border ${
                taxSummary.refundOrOwed && taxSummary.refundOrOwed.isPositive()
                  ? 'from-emerald-50 to-emerald-100 border-emerald-200'
                  : 'from-red-50 to-red-100 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-sm font-medium ${
                    taxSummary.refundOrOwed && taxSummary.refundOrOwed.isPositive()
                      ? 'text-emerald-900'
                      : 'text-red-900'
                  }`}
                >
                  {taxSummary.refundOrOwed && taxSummary.refundOrOwed.isPositive()
                    ? 'Refund'
                    : 'Owed'}
                </span>
                <DollarSign
                  size={18}
                  className={
                    taxSummary.refundOrOwed && taxSummary.refundOrOwed.isPositive()
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }
                />
              </div>
              <div
                className={`text-2xl font-bold ${
                  taxSummary.refundOrOwed && taxSummary.refundOrOwed.isPositive()
                    ? 'text-emerald-900'
                    : 'text-red-900'
                }`}
              >
                {taxSummary.refundOrOwed
                  ? formatCurrency(taxSummary.refundOrOwed.abs())
                  : '$0.00'}
              </div>
              <div
                className={`text-xs mt-1 ${
                  taxSummary.refundOrOwed && taxSummary.refundOrOwed.isPositive()
                    ? 'text-emerald-700'
                    : 'text-red-700'
                }`}
              >
                {taxSummary.refundOrOwed && taxSummary.refundOrOwed.isPositive()
                  ? 'Expected Refund'
                  : 'Amount to Pay'}
              </div>
            </div>
          </div>
        )}

        {/* Forms Generated */}
        {formsGenerated.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={18} />
              Forms Generated
            </h3>
            <div className="flex flex-wrap gap-2">
              {formsGenerated.map((form) => (
                <div
                  key={form}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  {form}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !isExecuting && !error && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <DollarSign size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Build your workflow on the canvas above and click "Execute" to see tax calculation
              results here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
