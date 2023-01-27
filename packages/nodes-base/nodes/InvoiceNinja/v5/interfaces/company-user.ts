/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

import { Account } from './account';
import { Company } from './company.interface';
import { User } from './user';

export interface CompanyUser {
  permissions: string;
  notifications: Notifications;
  settings: Settings;
  is_owner: boolean;
  is_admin: boolean;
  is_locked: boolean;
  updated_at: number;
  archived_at: number;
  created_at: number;
  permissions_updated_at: number;
  ninja_portal_url: string;
  user: User;
  company: Company;
  token: Token;
  account: Account;
}

export type ReactTableColumns =
  | 'invoice'
  | 'client'
  | 'product'
  | 'recurringInvoice'
  | 'payment'
  | 'quote'
  | 'credit'
  | 'project'
  | 'task'
  | 'vendor'
  | 'purchaseOrder'
  | 'expense'
  | 'recurringExpense';

export interface Settings {
  accent_color: string;
  table_columns?: Record<ReactTableColumns, string[]>;
  react_table_columns?: Record<ReactTableColumns, string[]>;
}

export interface Notifications {
  email: string[];
}

export interface Token {
  id: string;
  user_id: string;
  token: string;
  name: string;
  is_system: boolean;
  updated_at: number;
  archived_at: number;
  created_at: number;
  is_deleted: boolean;
}
