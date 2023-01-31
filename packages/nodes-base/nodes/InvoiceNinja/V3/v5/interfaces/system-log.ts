/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

export interface SystemLogRecord {
  id?: string;
  user_id?: string;
  company_id?: string;
  client_id?: string;
  event_id?: number;
  category_id?: number;
  type_id?: number;
  log: string;
  created_at: number;
}
