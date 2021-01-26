import {
	Line,
	LinkedTxn,
	Ref,
} from '../Shared/Shared.interface';

export interface Payment {
	CustomerRef: Ref; // required
	// Line: Line[]; // required
	ProcessPayment: boolean;
	TotalAmt: number;
	TxnDate: string;
	UnappliedAmt: number;
}
