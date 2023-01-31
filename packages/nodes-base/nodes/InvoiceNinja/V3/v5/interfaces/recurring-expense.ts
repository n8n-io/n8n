/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

import { Client } from './client';
import { Vendor } from './vendor';

export interface RecurringExpense {
  id: string;
  user_id: string;
  assigned_user_id: string;
  vendor_id: string;
  invoice_id: string;
  client_id: string;
  bank_id: string;
  status_id: string;
  invoice_currency_id: string;
  expense_currency_id: string;
  currency_id: string;
  category_id: string;
  payment_type_id: string;
  recurring_expense_id: string;
  is_deleted: boolean;
  should_be_invoiced: boolean;
  invoice_documents: boolean;
  amount: number;
  foreign_amount: number;
  exchange_rate: number;
  tax_name1: string;
  tax_rate1: number;
  tax_name2: string;
  tax_rate2: number;
  tax_name3: string;
  tax_rate3: number;
  private_notes: string;
  public_notes: string;
  transaction_reference: string;
  transaction_id: string;
  date: string;
  number: string;
  payment_date: string;
  custom_value1: string;
  custom_value2: string;
  custom_value3: string;
  custom_value4: string;
  updated_at: number;
  archived_at: number;
  created_at: number;
  project_id: string;
  tax_amount1: number;
  tax_amount2: number;
  tax_amount3: number;
  uses_inclusive_taxes: boolean;
  calculate_tax_by_amount: boolean;
  entity_type: string;
  documents: any[];
  client?: Client;
  vendor?: Vendor;
  frequency_id: string;
  remaining_cycles: number;
  next_send_date: string;
}
