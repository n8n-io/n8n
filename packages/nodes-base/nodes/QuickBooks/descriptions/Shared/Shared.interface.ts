export interface Line {
	DetailType: string;
	Amount: number;
	Id: string;
	AccountBasedExpenseLineDetail: {
		TaxCodeRef: {
			value: string
		},
		AccountRef: {
			name: string,
			value: string
		},
		BillableStatus: string,
		CustomerRef: Ref,
	};
	Description: string;
}

export interface GeneralAddress {
	City: string;
	Line1: string;
	PostalCode: string;
	Lat: string;
	Long: string;
	CountrySubDivisionCode: string;
}

export interface EstimateBillAddr {
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

export interface PrimaryPhone {
	FreeFormNumber: string;
}

export interface CustomerMemo {
	value: string;
}

export interface LinkedTxn {
	TxnId: string;
	TxnType: string;
}

export interface PrimaryEmailAddr {
	Address: string;
}

export interface Ref {
	name: string;
	value: string;
}

export interface CustomField {
	DefinitionId: string;
	Name: string;
}
