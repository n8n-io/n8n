import {
	IDataObject,
} from 'n8n-workflow';

export interface ICreateCompanyBody {
	custom_fields?: IDataObject;
	description?: string;
	domains?: string[];
	id?: number;
	name: string;
	note?: string;
	health_score?: string;
	account_tier?: string;
	renewal_date?: Date;
	industry?: string;
}
