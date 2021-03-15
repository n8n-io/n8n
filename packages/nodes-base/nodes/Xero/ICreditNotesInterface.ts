import { ITenantId, IContact } from './IContactInterface';
import { ILineItem } from './InvoiceInterface';

export interface ICreditNotes extends ITenantId {
	InvoiceID?: string;
	Type?: string;
	Contact?: IContact;
	Date?: string;
	Status?: string;
	LineAmountTypes?: string;
	LineItems?: ILineItem[];
	CurrencyCode?: string;
	CreditNoteNumber?: string;
	Reference?: string;
	SentToContact?: boolean;
	CurrencyRate?: string;
	BrandingThemeId?: string;
	Amount?: number;
}
