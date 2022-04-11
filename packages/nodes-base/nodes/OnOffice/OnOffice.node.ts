import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';
import {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { addressFields, addressOperations } from './descriptions/AddressDescription';
import { OnOfficeFieldConfiguration, OnOfficeReadAdditionalFields } from './interfaces';
import { estateFields, estateOperations } from './descriptions/EstateDescription';
import {
	fieldConfigurationFields,
	fieldConfigurationOperations,
} from './descriptions/FieldConfigurationDescription';
import { createFilterParameter, onOfficeApiAction } from './GenericFunctions';
import { searchCriteriasFields, searchCriteriasOperations } from './descriptions/SearchCriteriasDescription';
import { searchCriteriaFieldsFields, searchCriteriaFieldsOperations } from './descriptions/SearchCriteriaFieldsDescription';

export class OnOffice implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OnOffice',
		name: 'onOffice',
		icon: 'file:onoffice.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume OnOffice API',
		documentationUrl: 'https://apidoc.onoffice.de/',
		defaults: {
			name: 'OnOffice',
			color: '#80a9d7',
		},
		inputs: ['main'],
		outputs: ['main'],
		subtitle: '={{$parameter["operation"] + " " + $parameter["resource"]}}',
		credentials: [
			{
				name: 'onOfficeApi',
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
						name: 'Estate',
						value: 'estate',
					},
					{
						name: 'Address',
						value: 'address',
					},
					{
						name: 'Field Configuration',
						value: 'fields',
					},
					{
						name: 'Search Criterias',
						value: 'searchcriterias',
					},
					{
						name: 'Search Criteria Fields',
						value: 'searchCriteriaFields',
					},
				],
				default: 'address',
				required: true,
				description: 'Resource to consume',
			},

			...addressOperations,
			...addressFields,

			...estateOperations,
			...estateFields,

			...fieldConfigurationOperations,
			...fieldConfigurationFields,

			...searchCriteriasOperations,
			...searchCriteriasFields,

			...searchCriteriaFieldsOperations,
			// ...searchCriteriaFieldsFields,
		],
	};

	/* -------------------------------------------------------------------------- */
	/*                               Custom objects                               */
	/* -------------------------------------------------------------------------- */

	// Get all the custom object types to display them to user so that he can select them
	async getCustomObjectTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const request = this.helpers.request;
		if (!request) {
			return [];
		}
		const credentials = (await this.getCredentials(
			'onOfficeApi',
		)) as ICredentialDataDecryptedObject;
		const apiSecret = credentials.apiSecret as string;
		const apiToken = credentials.apiToken as string;

		const resource = 'fields';
		const operation = 'get';

		const parameters = {
			modules: ['address'],
			labels: true,
		};
		const result = await onOfficeApiAction<OnOfficeFieldConfiguration<true>>(
			this.getNode(),
			request,
			apiSecret,
			apiToken,
			operation,
			resource,
			parameters,
		);

		const availableFields = Object.entries(result[0].elements)
			.flatMap(([key, value]) => typeof value !== 'string' ? [{ ...value, name: key }] : []);
		const fieldNameOptions = availableFields.map(field => ({
			name: field.label,
			value: field.name,
		}));
		return fieldNameOptions;
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const request = this.helpers.request;

		const returnData = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const credentials = (await this.getCredentials(
			'onOfficeApi',
		)) as ICredentialDataDecryptedObject;

		const apiSecret = credentials.apiSecret as string;
		const apiToken = credentials.apiToken as string;

		for (let i = 0; i < items.length; i++) {
			if (operation === 'read') {
				const dataFields = [
					...(this.getNodeParameter('data', i) as string[]),
					...(this.getNodeParameter('specialData', i) as string[]),
				];

				const additionalFields = this.getNodeParameter(
					'additionalFields',
					i,
				) as OnOfficeReadAdditionalFields;

				const parameters = {
					data: dataFields,
					recordids: additionalFields.recordIds,
					filterid: additionalFields.filterId,
					filter: createFilterParameter(additionalFields.filters),
					listlimit: additionalFields.limit,
					listoffset: additionalFields.offset,
					sortby: additionalFields.sortBy,
					sortorder: additionalFields.order,
					formatoutput: additionalFields.formatOutput,
					outputlanguage: additionalFields.language,
					countryIsoCodeType: additionalFields.countryIsoCodeType || undefined,
					estatelanguage: additionalFields.estateLanguage,
					addestatelanguage: additionalFields.addEstateLanguage,
					addMainLangId: additionalFields.addMainLangId,
					georangesearch: additionalFields.geoRangeSearch,
				};

				if (resource === 'address' || resource === 'estate') {
					const result = await onOfficeApiAction(
						this.getNode(),
						request,
						apiSecret,
						apiToken,
						'read',
						resource,
						parameters,
					);

					returnData.push(result);
				}
			}
			if (operation === 'get') {
				if (resource === 'fields' || resource === 'searchcriterias' || resource === 'searchCriteriaFields') {
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const parameters = {
						modules: this.getNodeParameter('modules', i, null) as string[] | undefined,
						labels: additionalFields.labels,
						language: additionalFields.language,
						fieldList: additionalFields.fieldList,
						showOnlyInactive: additionalFields.showOnlyInactive,
						listlimit: additionalFields.limit,
						realDataTypes: additionalFields.realDataTypes,
						showFieldMeasureFormat: additionalFields.showFieldMeasureFormat,
						ids: this.getNodeParameter('ids', i, null) as string[] | undefined,
						mode: this.getNodeParameter('mode', i, null) as string | undefined,
					};

					const result = await onOfficeApiAction(
						this.getNode(),
						request,
						apiSecret,
						apiToken,
						'get',
						resource,
						parameters,
					);

					returnData.push(result);
				}
			}
			if (operation === 'update') {
				const resourceId = this.getNodeParameter('resourceId', i) as string;

				const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

				const properties: Record<string, unknown> = {};
				if (additionalFields.customPropertiesUi) {
					const customProperties = (additionalFields.customPropertiesUi as IDataObject).customPropertiesValues as IDataObject[];

					if (customProperties) {
						for (const customProperty of customProperties) {
							properties[customProperty.property as string] = customProperty.value;
						}
					}
				}

				const parameters = properties;

				if (resource === 'address' || resource === 'estate') {
					const result = await onOfficeApiAction(
						this.getNode(),
						request,
						apiSecret,
						apiToken,
						'modify',
						resource,
						parameters,
						resourceId,
					);

					returnData.push(result);
				}
			}
		}

		const result = returnData.flat() as unknown as IDataObject[];

		// Map data to n8n data structure
		return [this.helpers.returnJsonArray(result)];
	}
}
