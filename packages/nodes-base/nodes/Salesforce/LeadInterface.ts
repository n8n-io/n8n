export interface ILead {
	// tslint:disable-next-line: no-any
	[key: string]: any;
	Company?: string;
	LastName?: string;
	Email?: string;
	City?: string;
	Phone?: string;
	State?: string;
	Title?: string;
	Jigsaw?: string;
	Rating?: string;
	Status?: string;
	Street?: string;
	Country?: string;
	OwnerId?: string;
	Website?: string;
	Industry?: string;
	FirstName?: string;
	LeadSource?: string;
	PostalCode?: string;
	Salutation?: string;
	Description?: string;
	AnnualRevenue?: number;
	IsUnreadByOwner?: boolean;
	NumberOfEmployees?: number;
	MobilePhone?: string;
}
