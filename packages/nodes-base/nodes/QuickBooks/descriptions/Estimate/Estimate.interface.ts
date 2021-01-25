import {
	BillAddr,
	BillEmail,
	Line,
	MetaData,
	ShipAddr,
} from '../Shared.interface';

export interface Estimate {
	DocNumber: string;
	SyncToken: string;
	domain: 'QBO';
	TxnStatus: string;
	BillEmail: BillEmail;
	TxnDate: string;
	TotalAmt: number;
	CustomerRef: {
		name: string;
		value: string;
	};
	CustomerMemo: {
		value: string;
	};
	ShipAddr: ShipAddr;
	PrintStatus: string;
	BillAddr: BillAddr;
	EmailStatus: string;
	Line: Line[];
	ApplyTaxAfterDiscount: boolean;
	CustomField: [
		{
			DefinitionId: string;
			Type: string;
			Name: string;
		}
	];
	Id: string;
	TxnTaxDetail: {
		TotalTax: number;
	};
	MetaData: MetaData;
}

