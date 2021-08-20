import {IExecuteFunctions} from 'n8n-core';
import {IDataObject, IParameterDependencies} from 'n8n-workflow';

import {hubspotApiRequest} from './GenericFunctions';
import {IDetailingMethods, IDetailingProperty, IPipeline} from './DealInterface';

export const detailingProperties: IDetailingProperty[] = [
	{
		name: 'hubspot_owner_id',
		method: 'getDealOwners',
		additionName: 'dealOwnerDetailed',
	},
	{
		name: 'dealstage',
		method: 'getDealStages',
		additionName: 'dealStageDetailed',
	},
];

export const detailingMethods: IDetailingMethods = {
	async getDealOwners(this: IExecuteFunctions): Promise<Map<string, IParameterDependencies>> {
		const dataMap = new Map();
		const endpoint = '/owners/v2/owners';
		const owners = await hubspotApiRequest.call(this, 'GET', endpoint, {});
		for (const owner of owners) {
			dataMap.set(String(owner.ownerId), owner);
		}
		return dataMap;
	},
	async getDealStages(this: IExecuteFunctions): Promise<Map<string, IParameterDependencies>> {
		const dataMap = new Map();
		const endpoint = '/crm-pipelines/v1/pipelines/deals';
		let stages = await hubspotApiRequest.call(this, 'GET', endpoint, {});
		stages = stages.results.reduce((accumulator: IDataObject[], pipeline: IPipeline) => {
			accumulator.push(...pipeline.stages);
			return accumulator;
		}, []);
		for (const stage of stages) {
			dataMap.set(String(stage.stageId), {label: stage.label, stageId: stage.stageId});
		}
		return dataMap;
	},

};
