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
		CustomerRef: CustomerRef,
	};
	Description: string;
}

export interface ShipAddr {
	City: string;
	Line1: string;
	PostalCode: string;
	Lat: string;
	Long: string;
	CountrySubDivisionCode: string;
	Id: string;
}

export interface BillAddr {
	Line4: string;
	Line3: string;
	Line2: string;
	Line1: string;
	Long: string;
	Lat: string;
	Id: string;
}

export interface AltBillAddr {
	City: string;
	Line1: string;
	PostalCode: string;
	Lat: string;
	Long: string;
	CountrySubDivisionCode: string;
}

export interface BillEmail {
	Address: string;
}

export interface MetaData {
	CreateTime: string;
	LastUpdatedTime: string;
}

export interface PrimaryPhone {
	FreeFormNumber: string;
}

export interface CustomerMemo {
	value: string;
}

export interface CustomerRef {
	name: string;
	value: string;
}

export interface LinkedTxn {
	TxnId: string;
	TxnType: string;
}

export interface CurrencyRef {
	name: string;
	value: string;
}

export interface PrimaryEmailAddr {
	Address: string;
}
