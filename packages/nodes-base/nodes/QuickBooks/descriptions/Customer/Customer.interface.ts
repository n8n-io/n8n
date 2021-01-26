import {
	AltBillAddr,
	PrimaryEmailAddr,
	PrimaryPhone,
} from '../Shared/Shared.interface';

export interface Customer {
	Active: boolean;
	Balance: number;
	BalanceWithJobs: number;
	BillAddr: AltBillAddr;
	BillWithParent: false;
	CompanyName: string;
	DisplayName: string; // required
	FamilyName: string;
	FullyQualifiedName: string;
	GivenName: string;
	Job: boolean;
	PreferredDeliveryMethod: string;
	PrimaryEmailAddr: PrimaryEmailAddr;
	PrimaryPhone: PrimaryPhone;
	PrintOnCheckName: string;
	Taxable: boolean;
}
