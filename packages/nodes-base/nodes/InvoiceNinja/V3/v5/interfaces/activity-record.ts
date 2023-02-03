/**
 * Invoice Ninja (https://invoiceninja.com).
 *
 * @link https://github.com/invoiceninja/invoiceninja source repository
 *
 * @copyright Copyright (c) 2022. Invoice Ninja LLC (https://invoiceninja.com)
 *
 * @license https://www.elastic.co/licensing/elastic-license
 */

// import { User } from '@sentry/react';
import type { Client } from './client';
import type { ClientContact } from './client-contact';
import type { Expense } from './expense';
import type { Invoice } from './invoice';
import type { Credit } from './credit';
import type { Payment } from './payment';
import type { Quote } from './quote';
import type { RecurringInvoice } from './recurring-invoice';
import type { Task } from './task';
import type { Vendor } from './vendor';
import type { PurchaseOrder } from './purchase-order';
import type { VendorContact } from './vendor-contact';

interface WithHashId {
	hashed_id: string;
}

export interface ActivityRecord {
	id: string;
	activity_type_id: string;
	client_id: string;
	recurring_invoice_id: string;
	recurring_expense_id: string;
	company_id: string;
	user_id: string;
	invoice_id: string;
	quote_id: string;
	payment_id: string;
	credit_id: string;
	updated_at: number;
	created_at: number;
	expense_id: string;
	is_system: boolean;
	contact_id: string;
	vendor_id: string;
	task_id: string;
	token_id: string;
	vendor_contact_id: string;
	purchase_order_id: string;
	notes: string;
	ip: string;
	client: Client & WithHashId;
	task: Task;
	contact: ClientContact;
	// user: User & WithHashId;
	expense?: Expense & WithHashId;
	invoice?: Invoice & WithHashId;
	recurring_invoice?: RecurringInvoice & WithHashId;
	payment?: Payment & WithHashId;
	credit?: Credit & WithHashId;
	quote?: Quote & WithHashId;
	vendor?: Vendor & WithHashId;
	vendor_contact?: VendorContact & WithHashId;
	purchase_order?: PurchaseOrder & WithHashId;
}
