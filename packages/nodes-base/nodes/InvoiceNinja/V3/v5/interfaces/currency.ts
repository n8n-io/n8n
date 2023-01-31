/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

export interface Currency {
  id: string;
  code: string;
  decimal_separator: string;
  exchange_rate: number;
  name: string;
  precision: number;
  swap_currency_symbol: boolean;
  symbol: string;
  thousand_separator: string;
}
