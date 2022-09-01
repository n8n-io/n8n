
export interface IAddress {
	AddressType?: string;
	AddressLine1?: string;
	AddressLine2?: string;
	City?: string;
	Region?: string;
	PostalCode?: string;
	Country?: string;
	AttentionTo?: string;
}

export interface IPhone {
	PhoneType?: string;
	PhoneNumber?: string;
	PhoneAreaCode?: string;
	PhoneCountryCode?: string;
}

export interface IContact extends ITenantId {
	AccountNumber?: string;
	Addresses?: IAddress[];
	BankAccountDetails?: string;
	ContactId?: string;
	ContactNumber?: string;
	ContactStatus?: string;
	DefaultCurrency?: string;
	EmailAddress?: string;
	FirstName?: string;
	LastName?: string;
	Name?: string;
	Phones?: IPhone[];
	PurchaseTrackingCategory?: string;
	PurchasesDefaultAccountCode?: string;
	SalesDefaultAccountCode?: string;
	SalesTrackingCategory?: string;
	SkypeUserName?: string;
	taxNumber?: string;
	xeroNetworkKey?: string;
}

export interface ITenantId {
	organizationId?: string;
}
