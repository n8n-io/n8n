/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

export interface Account {
  id: string;
  default_url: string;
  plan: string;
  plan_term: string;
  plan_started: string;
  plan_paid: string;
  plan_expires: string;
  user_agent: string;
  payment_id: string;
  trial_started: string;
  trial_plan: string;
  plan_price: number;
  num_users: number;
  utm_source: string;
  utm_medium: string;
  utm_content: string;
  utm_term: string;
  referral_code: string;
  latest_version: string;
  current_version: string;
  updated_at: number;
  archived_at: number;
  report_errors: boolean;
  debug_enabled: boolean;
  is_docker: boolean;
  is_scheduler_running: boolean;
  default_company_id: string;
  disable_auto_update: boolean;
  emails_sent: number;
  email_quota: number;
  is_migrated: boolean;
  hosted_client_count: number;
  hosted_company_count: number;
}
