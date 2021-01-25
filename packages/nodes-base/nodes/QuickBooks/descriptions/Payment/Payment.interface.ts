import {
	CustomerRef,
	Line,
	MetaData,
} from '../Shared.interface';

export interface Payment {
	CustomerRef: CustomerRef; // required
	DepositToAccountRef: {
		value: string;
	};
	Id: string; // system-defined
	Line: Line[]; // required
	MetaData: MetaData; // system-defined
	ProcessPayment: boolean;
	SyncToken: string; // system-defined
	TotalAmt: number;
	TxnDate: string;
	UnappliedAmt: number;
}
