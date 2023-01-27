/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

export interface ApiToken {
  id: string;
  name: string;
  token: string;
  user_id: string;
  is_system: boolean;
  archived_at: number;
  created_at: number;
  is_deleted: boolean;
  updated_at: number;
}
