/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

export interface Transaction {
  account_type: string;
  amount: number;
  archived_at: number;
  bank_account_id: number;
  bank_integration_id: string;
  bank_transaction_rule_id: string;
  base_type: string;
  category_id: number;
  category_type: string;
  created_at: number;
  currency_id: string;
  date: string;
  description: string;
  expense_id: string;
  id: string;
  invoice_ids: string;
  is_deleted: boolean;
  ninja_category_id: string;
  payment_id: string;
  status_id: string;
  transaction_id: number;
  updated_at: number;
  vendor_id: string;
}
