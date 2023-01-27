/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

import { Expense } from './expense';
import { InvoiceItem } from './invoice-item';
import { Vendor } from './vendor';

export interface PurchaseOrder {
  id: string;
  user_id: string;
  project_id: string;
  assigned_user_id: string;
  vendor_id: string;
  amount: number;
  balance: number;
  client_id: string;
  status_id: string;
  design_id: string;
  created_at: number;
  updated_at: number;
  archived_at: number;
  is_deleted: boolean;
  number: string;
  discount: number;
  po_number: string;
  date: string;
  last_sent_date: string;
  next_send_date: string;
  reminder1_sent: string;
  reminder2_sent: string;
  reminder3_sent: string;
  reminder_last_sent: string;
  due_date: string;
  terms: string;
  public_notes: string;
  private_notes: string;
  uses_inclusive_taxes: boolean;
  tax_name1: string;
  tax_rate1: number;
  tax_name2: string;
  tax_rate2: number;
  tax_name3: string;
  tax_rate3: number;
  total_taxes: number;
  is_amount_discount: boolean;
  footer: string;
  partial: number;
  partial_due_date: string;
  custom_value1: string;
  custom_value2: string;
  custom_value3: string;
  custom_value4: string;
  has_tasks: boolean;
  has_expenses: boolean;
  custom_surcharge1: number;
  custom_surcharge2: number;
  custom_surcharge3: number;
  custom_surcharge4: number;
  custom_surcharge_tax1: boolean;
  custom_surcharge_tax2: boolean;
  custom_surcharge_tax3: boolean;
  custom_surcharge_tax4: boolean;
  line_items: InvoiceItem[];
  entity_type: string;
  exchange_rate: number;
  paid_to_date: number;
  subscription_id: string;
  expense_id: string;
  invitations: Invitation[];
  documents: any[];
  vendor?: Vendor;
  expense?: Expense;
}

export interface Invitation {
  id: string;
  vendor_contact_id: string;
  client_contact_id: string;
  key: string;
  link: string;
  sent_date: string;
  viewed_date: string;
  opened_date: string;
  updated_at: number;
  archived_at: number;
  created_at: number;
  email_status: string;
  email_error: string;
}
