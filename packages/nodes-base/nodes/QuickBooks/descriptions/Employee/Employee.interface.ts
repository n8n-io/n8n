import {
	AltBillAddr,
	PrimaryEmailAddr,
	PrimaryPhone,
} from '../Shared/Shared.interface';

export interface Employee {
	Active: boolean;
	BillableTime: boolean;
	DisplayName: string;
	FamilyName: string; // required
	GivenName: string; // required
	PrimaryAddr: AltBillAddr;
	PrimaryEmailAddr: PrimaryEmailAddr;
	PrimaryPhone: PrimaryPhone;
	PrintOnCheckName: string;
	SSN: string;
}
