/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

interface Headers {
  [key: string]: string;
}

interface Webhook {
  post_purchase_body: string;
  post_purchase_headers: Headers;
  post_purchase_rest_method: string;
  post_purchase_url: string;
  return_url: string;
}

export interface Subscription {
  id: string;
  allow_cancellation: boolean;
  allow_plan_changes: boolean;
  allow_query_overrides: boolean;
  archived_at: number;
  assigned_user_id: string;
  auto_bill: string;
  company_id: string;
  created_at: number;
  currency_id: string;
  frequency_id: string;
  group_id: string;
  is_amount_discount: boolean;
  is_deleted: boolean;
  max_seats_limit: number;
  name: string;
  optional_product_ids: string;
  optional_recurring_product_ids: string;
  per_seat_enabled: boolean;
  plan_map: string;
  price: number;
  product_ids: string;
  promo_code: string;
  promo_discount: number;
  promo_price: number;
  purchase_page: string;
  recurring_product_ids: string;
  refund_period: number;
  registration_required: boolean;
  trial_duration: number;
  trial_enabled: boolean;
  updated_at: number;
  use_inventory_management: boolean;
  user_id: string;
  webhook_configuration: Webhook;
}
