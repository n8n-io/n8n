import {
	BillAddr,
	BillEmail,
	CustomerMemo,
	CustomerRef,
	Line,
	MetaData,
	ShipAddr,
} from '../Shared.interface';

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
	CustomerRef: CustomerRef;
	DocNumber: string;
	domain: 'QBO';
	EmailStatus: string;
	Id: string;
	Line: Line[];
	MetaData: MetaData;
	PrintStatus: string;
	ShipAddr: ShipAddr;
	SyncToken: string;
	TotalAmt: number;
	TxnDate: string;
	TxnStatus: string;
	TxnTaxDetail: {
		TotalTax: number;
	};
}
