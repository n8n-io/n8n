import {
	AltBillingAddress,
	MetaData,
} from '../Shared.interface';

export interface Customer {
	PrimaryEmailAddr: {
		Address: 'Surf@Intuit.com';
	};
	SyncToken: string;
	domain: 'QBO';
	GivenName: string;
	DisplayName: string;
	BillWithParent: false;
	FullyQualifiedName: string;
	CompanyName: string;
	FamilyName: string;
	PrimaryPhone: {
		FreeFormNumber: string;
	};
	Active: boolean;
	Job: boolean;
	BalanceWithJobs: number;
	BillAddr: AltBillingAddress;
	PreferredDeliveryMethod: string;
	Taxable: boolean;
	PrintOnCheckName: string;
	Balance: 85.0;
	Id: string;
	MetaData: MetaData;
}

