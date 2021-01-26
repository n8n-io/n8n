import {
	BillEmail,
	CustomerMemo,
	EstimateBillAddr,
	GeneralAddress,
	Line,
	MetaData,
	Ref,
} from '../Shared/Shared.interface';

export interface Invoice {
	ApplyTaxAfterDiscount: boolean;
	Balance: number;
	BillAddr: EstimateBillAddr;
	BillEmail: BillEmail;
	CustomerMemo: CustomerMemo;
	CustomerRef: Ref; // required
	CustomField: [
		{
			DefinitionId: string;
			StringValue: string;
			Type: string;
			Name: string;
		}
	];
	Deposit: number;
	DocNumber: string;
	DueDate: string;
	EmailStatus: string;
	Id: string; // system-defined
	Line: Line[]; // required
	MetaData: MetaData; // system-defined
	PrintStatus: string;
	SalesTermRef: {
		value: string;
	};
	ShipAddr: GeneralAddress;
	SyncToken: string; // system-defined
	TotalAmt: number;
	TxnDate: string;
}
