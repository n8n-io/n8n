/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

export interface ValidationBag {
  message: string;
  errors: Record<string, string[]>;
}

export interface GenericValidationBag<T> {
  message: string;
  errors?: T;
}
