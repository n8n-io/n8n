import {
	BillEmail,
	CustomerMemo,
	CustomField,
	EstimateBillAddr,
	GeneralAddress,
	Line,
	Ref,
} from '../Shared/Shared.interface';

export interface Estimate {
	ApplyTaxAfterDiscount: boolean;
	BillAddr: EstimateBillAddr;
	BillEmail: BillEmail;
	CustomField: CustomField[];
	CustomerMemo: CustomerMemo;
	CustomerRef: Ref; // required
	DocNumber: string;
	EmailStatus: string;
	Line: Line[]; // required
	PrintStatus: string;
	ShipAddr: GeneralAddress;
	TotalAmt: number;
	TxnDate: string;
	TxnStatus: string;
	TxnTaxDetail: {
		TotalTax: number;
	};
}
