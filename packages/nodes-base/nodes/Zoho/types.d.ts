import { IDataObject } from "n8n-workflow";

// ----------------------------------------
//               for auth
// ----------------------------------------

export type ZohoOAuth2ApiCredentials = {
	oauthTokenData: {
		api_domain: string;
	};
};

// ----------------------------------------
//         for field adjusters
// ----------------------------------------

export type IdType = 'accountId' | 'contactId' | 'dealId' | 'purchaseOrderId';

export type NameType = 'Account_Name' | 'Full_Name' | 'Deal_Name' | 'Product_Name' | 'Vendor_Name';

type LocationType = 'Address' | 'Billing_Address' | 'Mailing_Address' | 'Shipping_Address' | 'Other_Address';

type DateType = 'Date_of_Birth' | 'Closing_Date' | 'Due_Date' | 'Invoice_Date' | 'PO_Date' | 'Valid_Till';

export type AllFields =
	{ [Date in DateType]?: string } &
	{ [Location in LocationType]?: { address_fields: { [key: string]: string } } } &
	{ Account?: { subfields: { id: string; name: string; } } } &
	{ [key in 'accountId' | 'contactId' | 'dealId']?: string } &
	IDataObject;

export type ProductDetails = Array<{ id: string, quantity: number }>;

// ----------------------------------------
//         for resource loaders
// ----------------------------------------

export type LoadedAccounts = Array<{
	Account_Name: string;
	id: string;
}>;

export type LoadedContacts = Array<{
	Full_Name: string;
	id: string;
}>;

export type LoadedDeals = Array<{
	Deal_Name: string;
	id: string;
}>;

export type LoadedVendors = Array<{
	Vendor_Name: string;
	id: string;
}>;

export type LoadedProducts = Array<{
	Product_Name: string;
	id: string;
}>;
