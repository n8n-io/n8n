import {IDataObject, IParameterDependencies} from 'n8n-workflow';

export interface IAssociation {
	associatedCompanyIds?: number[];
	associatedVids?: number[];
}

export interface IDeal {
	associations?: IAssociation;
	properties?: IDataObject[];
}

export interface IDetailingProperty {
	name: string;
	method: string;
	additionName: string;
}

export interface IDetailingMethods {
	[key: string]: () => Promise<Map<string, IParameterDependencies>>;
}
