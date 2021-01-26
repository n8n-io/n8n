import {
	BillAddr,
	BillEmail,
	CustomerMemo,
	CustomerRef,
	Line,
	MetaData,
	ShipAddr,
} from '../Shared/Shared.interface';

export interface Estimate {
	ApplyTaxAfterDiscount: boolean;
	BillAddr: BillAddr;
	BillEmail: BillEmail;
	CustomField: [
		{
			DefinitionId: string;
			Type: string;
			Name: string;
		}
	];
	CustomerMemo: CustomerMemo;
	CustomerRef: CustomerRef; // required
	DocNumber: string;
	EmailStatus: string;
	Id: string; // system-defined
	Line: Line[]; // required
	MetaData: MetaData; // system-defined
	PrintStatus: string;
	ShipAddr: ShipAddr;
	SyncToken: string; // system-defined
	TotalAmt: number;
	TxnDate: string;
	TxnStatus: string;
	TxnTaxDetail: {
		TotalTax: number;
	};
}
