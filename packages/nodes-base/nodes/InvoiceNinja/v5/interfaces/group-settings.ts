/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

export interface GroupSettings {
  id: string;
  name: string;
  settings: Record<string, any>;
  created_at: number;
  updated_at: number;
  archived_at: number;
  is_deleted: boolean;
  documents: any[];
}
