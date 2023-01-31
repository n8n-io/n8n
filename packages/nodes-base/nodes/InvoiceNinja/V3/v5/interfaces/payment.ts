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
import { Invoice } from './invoice';

export interface Payment {
  id: string;
  user_id: string;
  assigned_user_id: string;
  amount: number;
  refunded: number;
  applied: number;
  transaction_reference: string;
  date: string;
  is_manual: boolean;
  created_at: number;
  updated_at: number;
  archived_at: number;
  is_deleted: boolean;
  type_id: string;
  invitation_id: string;
  private_notes: string;
  number: string;
  custom_value1: string;
  custom_value2: string;
  custom_value3: string;
  custom_value4: string;
  client_id: string;
  client_contact_id: string;
  company_gateway_id: string;
  status_id: string;
  project_id: string;
  vendor_id: string;
  currency_id: string;
  exchange_rate: number;
  exchange_currency_id: string;
  paymentables: Paymentable[];
  documents?: any[];
  invoices?: Invoice[];
  client?: Client;
}

export interface Paymentable {
  id: string;
  invoice_id: string;
  amount: number;
  refunded: number;
  created_at: number;
  updated_at: number;
  archived_at: number;
}
