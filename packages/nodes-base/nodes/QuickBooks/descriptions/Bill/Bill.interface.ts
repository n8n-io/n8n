import {
	CurrencyRef,
	Line,
	MetaData,
} from '../Shared.interface';

export interface Bill {
	APAccountRef: {
		name: string;
		value: string;
	};
	Balance: number;
	CurrencyRef: CurrencyRef;
	DueDate: string;
	Id: string; // system-defined
	Line: Line[]; // required
	MetaData: MetaData; // system-defined
	SalesTermRef: {
		value: string;
	};
	SyncToken: string; // system-defined
	TotalAmt: number;
	TxnDate: string;
	VendorRef: { // required
		name: string;
		value: string;
	};
}
