import {
	Line,
	Ref,
} from '../Shared/Shared.interface';

export interface Bill {
	APAccountRef: Ref;
	Balance: number;
	CurrencyRef: Ref;
	DueDate: string;
	Line: Line[]; // required
	SalesTermRef: Ref;
	TotalAmt: number;
	TxnDate: string;
	VendorRef: Ref; // required
}
