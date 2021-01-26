import {
	AltBillAddr,
	MetaData,
	PrimaryEmailAddr,
	PrimaryPhone,
} from '../Shared/Shared.interface';

export interface Customer {
	Active: boolean;
	Balance: 85.0;
	BalanceWithJobs: number;
	BillAddr: AltBillAddr;
	BillWithParent: false;
	CompanyName: string;
	DisplayName: string; // required
	FamilyName: string;
	FullyQualifiedName: string;
	GivenName: string;
	Id: string; // system-defined
	Job: boolean;
	MetaData: MetaData; // system-defined
	PreferredDeliveryMethod: string;
	PrimaryEmailAddr: PrimaryEmailAddr;
	PrimaryPhone: PrimaryPhone;
	PrintOnCheckName: string;
	SyncToken: string; // system-defined
	Taxable: boolean;
}
