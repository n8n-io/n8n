export interface ILead {
	Annual_Revenue?: number;
	City?: string;
	Company?: string;
	Country?: string;
	Description?: string;
	Designation?: string;
	Email?: string;
	Email_Opt_Out?: boolean;
	Fax?: string;
	First_Name?: string;
	Industry?: string;
	Is_Record_Duplicate?: boolean;
	Last_Name?: string;
	Lead_Owner?: string;
	Lead_Source?: string;
	Lead_Status?: string;
	Mobile?: string;
	No_of_Employees?: number;
	Phone?: string;
	Salutation?: string;
	Secondary_Email?: string;
	Skype_ID?: string;
	State?: string;
	Street?: string;
	Twitter?: string;
	Website?: string;
	Zip_Code?: string;
}

export interface IAddress {
	street?: string;
	city?: string;
	state?: string;
	country?: string;
	zipCode?: string;
}
