import {
	Line,
	MetaData,
} from '../Shared.interface';

export interface Bill {
	SyncToken: string;
	domain: 'QBO';
	APAccountRef: {
		name: string;
		value: string;
	};
	VendorRef: {
		name: string;
		value: string;
	};
	TxnDate: string;
	TotalAmt: number;
	CurrencyRef: {
		name: string;
		value: string;
	};
	LinkedTxn: [
		{
			TxnId: string;
			TxnType: string;
		}
	];
	SalesTermRef: {
		value: string;
	};
	DueDate: string;
	Line: Line[];
	Balance: number;
	Id: string;
	MetaData: MetaData;
}
