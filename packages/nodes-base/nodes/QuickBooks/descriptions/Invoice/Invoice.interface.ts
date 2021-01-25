import {
	BillAddr,
	BillEmail,
	CustomerMemo,
	CustomerRef,
	Line,
	LinkedTxn,
	MetaData,
	ShipAddr,
	TxnTaxCodeRef,
} from '../Shared.interface';

export interface Invoice {
	ApplyTaxAfterDiscount: boolean;
	Balance: number;
	BillAddr: BillAddr;
	BillEmail: BillEmail;
	CustomerMemo: CustomerMemo;
	CustomerRef: CustomerRef;
	Deposit: number;
	DocNumber: string;
	domain: 'QBO';
	DueDate: string;
	EmailStatus: string;
	Id: string;
	Line: Line[];
	LinkedTxn: LinkedTxn[];
	MetaData: MetaData;
	PrintStatus: string;
	SalesTermRef: {
		value: string;
	};
	ShipAddr: ShipAddr;
	sparse: boolean;
	SyncToken: string;
	TotalAmt: number;
	TxnDate: string;
	TxnTaxDetail: TxnTaxCodeRef;
	CustomField: [
		{
			DefinitionId: string;
			StringValue: string;
			Type: string;
			Name: string;
		}
	];
}
