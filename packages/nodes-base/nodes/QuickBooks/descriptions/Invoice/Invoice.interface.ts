import {
	BillAddr,
	BillEmail,
	CustomerMemo,
	CustomerRef,
	Line,
	LinkedTxn,
	MetaData,
	ShipAddr,
} from '../Shared.interface';

export interface Invoice {
	ApplyTaxAfterDiscount: boolean;
	Balance: number;
	BillAddr: BillAddr;
	BillEmail: BillEmail;
	CustomerMemo: CustomerMemo;
	CustomerRef: CustomerRef; // required
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
	ShipAddr: ShipAddr;
	SyncToken: string; // system-defined
	TotalAmt: number;
	TxnDate: string;
}
