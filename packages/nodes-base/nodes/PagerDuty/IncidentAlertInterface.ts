import {
	IDataObject,
} from 'n8n-workflow';

export interface IIncidentAlert {
	status?: string;
	service?: IDataObject;
	first_trigger_log_entry?: IDataObject;	
	incident?: IDataObject;
	integration?: IDataObject;
}
