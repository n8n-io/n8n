/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

export interface PaymentTerm {
  id: string;
  num_days: number;
  name: string;
  is_deleted: boolean;
  created_at: number;
  updated_at: number;
  archived_at: number;
}
