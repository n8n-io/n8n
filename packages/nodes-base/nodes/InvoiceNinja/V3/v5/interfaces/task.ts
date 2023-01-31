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
import { TaskStatus } from './task-status';

export interface Task {
  id: string;
  user_id: string;
  assigned_user_id: string;
  client_id: string;
  invoice_id: string;
  project_id: string;
  status_id: string;
  status_sort_order: number;
  custom_value1: string;
  custom_value2: string;
  custom_value3: string;
  custom_value4: string;
  duration: number;
  description: string;
  is_running: boolean;
  time_log: string;
  number: string;
  rate: number;
  is_date_based: boolean;
  status_order: number;
  is_deleted: boolean;
  archived_at: number;
  created_at: number;
  updated_at: number;
  client?: Client;
  status?: TaskStatus;
  documents: any[];
}
