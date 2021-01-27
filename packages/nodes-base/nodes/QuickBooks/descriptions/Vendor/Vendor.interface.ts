import {
	GeneralAddress,
	PrimaryEmailAddr,
	PrimaryPhone
} from '../Shared/Shared.interface';

export interface Vendor {
	AcctNum: string;
	Active: boolean;
	Balance: number;
	BillAddr: GeneralAddress;
	CompanyName: string;
	DisplayName: string; // required
	FamilyName: string;
	GivenName: string;
	PrimaryEmailAddr: PrimaryEmailAddr;
	PrimaryPhone: PrimaryPhone;
	PrintOnCheckName: string;
	Vendor1099: boolean;
}
