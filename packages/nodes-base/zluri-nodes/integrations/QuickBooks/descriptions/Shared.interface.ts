export interface BillingAddress {
	Line4: string;
	Line3: string;
	Line2: string;
	Line1: string;
	Long: string;
	Lat: string;
}

export interface BillEmail {
	Address: string;
}

export interface CustomField {
	DefinitionId: string;
	Name: string;
}

export interface CustomerMemo {
	value: string;
}

export interface GeneralAddress {
	City: string;
	Line1: string;
	PostalCode: string;
	Lat: string;
	Long: string;
	CountrySubDivisionCode: string;
}

export interface LinkedTxn {
	TxnId: string;
	TxnType: string;
}

export interface PrimaryEmailAddr {
	Address: string;
}

export interface PrimaryPhone {
	FreeFormNumber: string;
}

export interface Ref {
	value: string;
	name?: string;
}
