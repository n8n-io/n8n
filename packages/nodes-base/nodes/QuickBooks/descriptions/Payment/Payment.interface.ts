import { Line, MetaData } from '../Shared.interface';

export interface Payment {
	SyncToken: string;
	domain: 'QBO';
	DepositToAccountRef: {
		value: string;
	};
	UnappliedAmt: number;
	TxnDate: string;
	TotalAmt: number;
	ProcessPayment: boolean;
	Line: Line[];
	CustomerRef: {
		name: string;
		value: string;
	};
	Id: string;
	MetaData: MetaData;
}
