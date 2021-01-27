import {
	BillEmail,
	BillingAddress,
	CustomerMemo,
	CustomField,
	GeneralAddress,
	Line,
	Ref,
} from '../Shared/Shared.interface';

export interface Invoice {
	ApplyTaxAfterDiscount: boolean;
	Balance: number;
	BillAddr: BillingAddress;
	BillEmail: BillEmail;
	CustomerMemo: CustomerMemo;
	CustomerRef: Ref; // required
	CustomField: CustomField[];
	Deposit: number;
	DocNumber: string;
	DueDate: string;
	EmailStatus: string;
	Line: Line[]; // required
	PrintStatus: string;
	SalesTermRef: Ref;
	ShipAddr: GeneralAddress;
	TotalAmt: number;
	TxnDate: string;
}
