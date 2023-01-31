/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

export interface Project {
  id: string;
  user_id: string;
  assigned_user_id: string;
  client_id: string;
  name: string;
  number: string;
  created_at: number;
  updated_at: number;
  archived_at: number;
  is_deleted: boolean;
  task_rate: number;
  due_date: string;
  private_notes: string;
  public_notes: string;
  budgeted_hours: number;
  custom_value1: string;
  custom_value2: string;
  custom_value3: string;
  custom_value4: string;
  color: string;
  documents: any[];
}
