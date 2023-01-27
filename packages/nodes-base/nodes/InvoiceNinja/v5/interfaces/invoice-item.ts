/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

export enum InvoiceItemType {
  Product = '1',
  Task = '2',
}

export interface InvoiceItem {
  _id?: string;
  quantity: number;
  cost: number;
  product_key: string;
  notes: string;
  discount: number;
  is_amount_discount: boolean;
  tax_name1: string;
  tax_rate1: number;
  tax_name2: string;
  tax_rate2: number;
  tax_name3: string;
  tax_rate3: number;
  sort_id: number;
  line_total: number;
  gross_line_total: number;
  custom_value1: string;
  custom_value2: string;
  custom_value3: string;
  custom_value4: string;
  type_id: InvoiceItemType;
  product_cost: number;
  date: string;
}
