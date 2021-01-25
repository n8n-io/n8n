import {
	CustomerRef,
	Line,
	MetaData,
} from '../Shared.interface';

export interface Payment {
	CustomerRef: CustomerRef;
	DepositToAccountRef: {
		value: string;
	};
	domain: 'QBO';
	Id: string;
	Line: Line[];
	MetaData: MetaData;
	ProcessPayment: boolean;
	SyncToken: string;
	TotalAmt: number;
	TxnDate: string;
	UnappliedAmt: number;
}
