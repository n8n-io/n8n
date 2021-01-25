import {
	CurrencyRef,
	Line,
	LinkedTxn,
	MetaData,
} from '../Shared.interface';

export interface Bill {
	APAccountRef: {
		name: string;
		value: string;
	};
	Balance: number;
	CurrencyRef: CurrencyRef;
	domain: 'QBO';
	DueDate: string;
	Id: string;
	Line: Line[];
	LinkedTxn: LinkedTxn[];
	MetaData: MetaData;
	SalesTermRef: {
		value: string;
	};
	SyncToken: string;
	TotalAmt: number;
	TxnDate: string;
	VendorRef: {
		name: string;
		value: string;
	};
}
