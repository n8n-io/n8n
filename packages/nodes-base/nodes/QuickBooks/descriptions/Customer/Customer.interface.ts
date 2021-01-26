import {
	GeneralAddress,
	PrimaryEmailAddr,
	PrimaryPhone,
} from '../Shared/Shared.interface';

export interface Customer {
	Active: boolean;
	Balance: number;
	BalanceWithJobs: number;
	BillAddr: GeneralAddress;
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
