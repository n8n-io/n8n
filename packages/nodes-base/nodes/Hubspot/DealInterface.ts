import {IDataObject, IParameterDependencies} from 'n8n-workflow';

export interface IAssociation {
	associatedCompanyIds?: number[];
	associatedVids?: number[];
}

export interface INewDeal {
	associations?: IAssociation;
	properties?: IDataObject[];
}

export interface IDeal {
	associations?: IAssociation;
	properties?: IDataObject;
}


export interface IDetailingProperty {
	name: string;
	method: string;
	additionName: string;
}

export interface IPipeline {
	label: string;
	displayOrder: number;
	active: boolean;
	stages: IDataObject[];
	pipelineId: string;
}

export interface IDetailingMethods {
	[key: string]: (data?: IDataObject) => Promise<Map<string, IParameterDependencies>>;
}
