import { IDataObject } from "n8n-workflow";


export interface IAssociation {
	associatedCompanyIds?: number[];
	associatedVids?: number[];
}

export interface IDeal {
	association?: IAssociation;
	properties?: IDataObject[];
}
