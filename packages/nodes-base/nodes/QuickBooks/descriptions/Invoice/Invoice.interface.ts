import {
	BillAddr,
	Line,
	ShipAddr,
} from '../Shared.interface';

export interface Invoice {
	Invoice: {
		TxnDate: string;
		domain: 'QBO';
		PrintStatus: string;
		SalesTermRef: {
			value: string;
		};
		TotalAmt: number;
		Line: Line[];
		DueDate: string;
		ApplyTaxAfterDiscount: boolean;
		DocNumber: string;
		sparse: boolean;
		CustomerMemo: {
			value: string;
		};
		Deposit: number;
		Balance: number;
		CustomerRef: {
			name: string;
			value: string;
		};
		TxnTaxDetail: {
			TxnTaxCodeRef: {
				value: string;
			};
			TotalTax: number;
			TaxLine: [
				{
					DetailType: string;
					Amount: number;
					TaxLineDetail: {
						NetAmountTaxable: number;
						TaxPercent: number;
						TaxRateRef: {
							value: string;
						};
						PercentBased: true;
					};
				}
			];
		};
		SyncToken: string;
		LinkedTxn: [
			{
				TxnId: string;
				TxnType: string;
			}
		];
		BillEmail: {
			Address: string;
		};
		ShipAddr: ShipAddr;
		EmailStatus: string;
		BillAddr: BillAddr;
		MetaData: {
			CreateTime: string;
			LastUpdatedTime: string;
		};
		CustomField: [
			{
				DefinitionId: string;
				StringValue: string;
				Type: string;
				Name: string;
			}
		];
		Id: string;
	};
	time: '2015-07-24T10:48:27.082-07:00';
}
