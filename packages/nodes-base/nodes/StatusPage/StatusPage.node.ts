import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

interface Incident {
	id: string
	components: {
		id: string
	}[]
}

interface IncidentCreate {
	name?: string
	components?: {
		[id: string]: string
	}
	component_ids?: string[]
	impact_override?: string
}

export class StatusPage implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'StatusPage',
			name: 'statusPage',
			icon: 'file:statusPage.svg',
			group: ['transform'],
			version: 1,
			description: 'Consume StatusPage API',
			defaults: {
					name: 'StatusPage',
					color: '#0052cc',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'statusPageApi',
					required: true,
				},
			],
			properties: [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					options: [
						{
							name: 'Component',
							value: 'component',
						},
						{
							name: 'Incident',
							value: 'incident',
						},
					],
					default: 'component',
					required: true,
					description: 'Resource to consume',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					displayOptions: {
						show: {
							resource: [
								'component',
							],
						},
					},
					options: [
						{
							name: 'Patch',
							value: 'patch',
							description: 'Patch a component',
						},
					],
					default: 'patch',
					description: 'The operation to perform.',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					displayOptions: {
						show: {
							resource: [
								'incident',
							],
						},
					},
					options: [
						{
							name: 'Create',
							value: 'create',
							description: `Create an incident`,
						},
						{
							name: 'Patch by component',
							value: 'patchByComponent',
							description: `Patch an incident from a specific incident`,
						},
					],
					default: 'create',
					description: 'The operation to perform.',
				},
				{
					displayName: 'Page Id',
					name: 'pageId',
					type: 'string',
					required: true,
					displayOptions: {
						show: {
							operation: [
								'patch',
								'create',
								'patchByComponent',
							],
							resource: [
								'component',
								'incident'
							],
						},
					},
					default:'',
					description:'Page identifier',
				},
				{
					displayName: 'Component Id',
					name: 'componentId',
					type: 'string',
					required: true,
					displayOptions: {
						show: {
							operation: [
								'patch',
							],
							resource: [
								'component',
							],
						},
					},
					default:'',
					description:'Component identifier',
				},
				{
					displayName: 'Component Id',
					name: 'componentId',
					type: 'string',
					required: true,
					displayOptions: {
						show: {
							operation: [
								'patchByComponent'
							],
							resource: [
								'incident'
							],
						},
					},
					default:'',
					description:'Component identifier',
				},
				{
					displayName: 'Incident name',
					name: 'incidentName',
					type: 'string',
					required: true,
					displayOptions: {
						show: {
							operation: [
								'create'
							],
							resource: [
								'incident'
							],
						},
					},
					default:'',
					description:'Incident name',
				},
				{
					displayName: 'Status',
					name: 'status',
					type: 'options',
					displayOptions: {
						show: {
							operation: [
								'patch',
							],
							resource: [
								'component',
							],
						},
					},
					options: [
						{
							name: 'Operational',
							value: 'operational',
						},
						{
							name: 'Degraded performance',
							value: 'degraded_performance',
						},
						{
							name: 'Partial outage',
							value: 'partial_outage',
						},
						{
							name: 'Major outage',
							value: 'major_outage',
						},
						{
							name: 'Under maintenance',
							value: 'under_maintenance',
						},
					],
					default: '',
					description: 'The status of the component',
				},
				{
					displayName: 'Status',
					name: 'status',
					type: 'options',
					displayOptions: {
						show: {
							operation: [
								'patchByComponent',
							],
							resource: [
								'incident',
							],
						},
					},
					options: [
						{
							name: 'Investigating',
							value: 'investigating',
						},
						{
							name: 'Identified',
							value: 'identified',
						},
						{
							name: 'Monitoring',
							value: 'monitoring',
						},
						{
							name: 'Resolved',
							value: 'resolved',
						},
					],
					default: '',
					description: 'The status of the component',
				},

				{
					displayName: 'Incident impact',
					name: 'impact',
					type: 'options',
					displayOptions: {
						show: {
							operation: [
								'create',
							],
							resource: [
								'incident',
							],
						},
					},
					options: [
						{
							name: 'Minor',
							value: 'minor',
						},
						{
							name: 'Major',
							value: 'major',
						},
						{
							name: 'Critical',
							value: 'critical',
						},
					],
					default: '',
					description: 'The impact of the incident',
				},
				{
					displayName: 'Component Id',
					name: 'componentId',
					type: 'string',
					required: false,
					displayOptions: {
						show: {
							operation: [
								'create'
							],
							resource: [
								'incident'
							],
						},
					},
					default:'',
					description:'Component identifier',
				},
				{
					displayName: 'Component Status',
					name: 'componentStatus',
					type: 'options',
					displayOptions: {
						show: {
							operation: [
								'create',
							],
							resource: [
								'incident',
							],
						},
					},
					options: [
						{
							name: 'No change',
							value: '',
						},
						{
							name: 'Operational',
							value: 'operational',
						},
						{
							name: 'Degraded performance',
							value: 'degraded_performance',
						},
						{
							name: 'Partial outage',
							value: 'partial_outage',
						},
						{
							name: 'Major outage',
							value: 'major_outage',
						},
						{
							name: 'Under maintenance',
							value: 'under_maintenance',
						},
					],
					default: '',
					description: 'The status of the component',
				},
				{
					displayName: 'Only if no incident exists for component',
					name: 'onlyIfNoIncident',
					type: 'boolean',
					displayOptions: {
						show: {
							operation: [
								'create',
							],
							resource: [
								'incident',
							],
						},
					},
					default: false,
					description: '',
				},
			],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		//Get credentials the user provided for this node
		const credentials = await this.getCredentials('statusPageApi') as IDataObject;		const pageId = this.getNodeParameter('pageId', 0) as string;

		const getActiveIncident: () => Promise<Incident | null> = async () => {
			const componentId = this.getNodeParameter('componentId', 0) as string;

			// get the list of incidents
			const options: OptionsWithUri = {
				headers: {
					'Accept': 'application/json',
				},
				method: 'GET',
				uri: `https://api.statuspage.io/v1/pages/${pageId}/incidents/unresolved?api_key=${credentials.apiKey}`,
				json: true,
			};

			const responseData = await this.helpers.request(options);
			let activeIncident: Incident | null = null
			responseData.forEach((incident: Incident) => {
				if (incident.components?.find(component => component.id === componentId)) {
					activeIncident = incident
				}
			})

			return activeIncident
		}

		if (resource === 'component') {
			if (operation === 'patch') {
				const componentId = this.getNodeParameter('componentId', 0) as string;
				const status = this.getNodeParameter('status', 0) as string;

				const options: OptionsWithUri = {
					headers: {
						'Accept': 'application/json',
					},
					method: 'PATCH',
					body: {
						component: {
							status
						}
					},
					uri: `https://api.statuspage.io/v1/pages/${pageId}/components/${componentId}?api_key=${credentials.apiKey}`,
					json: true,
				};

				responseData = await this.helpers.request(options);
			}
		}

		if (resource === 'incident') {
			if (operation === 'patchByComponent') {
				const status = this.getNodeParameter('status', 0) as string;

				const activeIncident = await getActiveIncident()

				if (activeIncident) {
					const options: OptionsWithUri = {
						headers: {
							'Accept': 'application/json',
						},
						method: 'PATCH',
						body: {
							incident: {
								status
							}
						},
						uri: `https://api.statuspage.io/v1/pages/${pageId}/incidents/${activeIncident.id}?api_key=${credentials.apiKey}`,
						json: true,
					};

					responseData = await this.helpers.request(options);
				}
			}

			if (operation === 'create') {
				const incidentName = this.getNodeParameter('incidentName', 0) as string;
				const impact = this.getNodeParameter('impact', 0) as string;
				const componentId = this.getNodeParameter('componentId', 0, null) as string;
				const onlyIfNoIncident = this.getNodeParameter('onlyIfNoIncident', 0, false) as boolean;
				const componentStatus = this.getNodeParameter('componentStatus', 0, null) as string;

				let shouldCreate = true;
				if (onlyIfNoIncident) {
					const activeIncident = await getActiveIncident()
					if (activeIncident)	{
						shouldCreate = false;
					}
				}
				if (shouldCreate) {
					const incident: IncidentCreate = {
						name : incidentName,
						impact_override: impact,
					};
					if (componentId && componentStatus) {
						incident.components = {
							[componentId]: componentStatus
						}
					} else if (componentId) {
						incident.component_ids = [componentId]
					}

					const options: OptionsWithUri = {
						headers: {
							'Accept': 'application/json',
						},
						method: 'POST',
						body: {
							incident,
						},
						uri: `https://api.statuspage.io/v1/pages/${pageId}/incidents?api_key=${credentials.apiKey}`,
						json: true,
					};

					responseData = await this.helpers.request(options);
				}
			}
		}

		// Map data to n8n data
		return [this.helpers.returnJsonArray(responseData)];
	}



}
