import { Company } from './company.interface';

/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */
export interface Product {
  id: string;
  user_id: string;
  assigned_user_id: string;
  product_key: string;
  notes: string;
  cost: number;
  price: number;
  quantity: number;
  tax_name1: string;
  tax_rate1: number;
  tax_name2: string;
  tax_rate2: number;
  tax_name3: string;
  tax_rate3: number;
  created_at: number;
  updated_at: number;
  archived_at: number;
  custom_value1: string;
  custom_value2: string;
  custom_value3: string;
  custom_value4: string;
  is_deleted: boolean;
  in_stock_quantity: number;
  stock_notification: boolean;
  stock_notification_threshold: number;
  documents: any[];
  company?: Company;
}
