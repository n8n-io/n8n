import { IExecuteFunctions } from 'n8n-core';
import {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { addressFields, addressOperations } from './descriptions/AddressDescription';
import { OnOfficeReadAdditionalFields } from './interfaces';
import { estateFields, estateOperations } from './descriptions/EstateDescription';
import {
	fieldConfigurationFields,
	fieldConfigurationOperations,
} from './descriptions/FieldConfigurationDescription';
import { createFilterParameter, onOfficeApiAction } from './GenericFunctions';

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
		],
	};

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
				if (resource === 'fields') {
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const parameters = {
						modules: this.getNodeParameter('modules', i) as string[],
						labels: additionalFields.labels,
						language: additionalFields.language,
						fieldList: additionalFields.fieldList,
						showOnlyInactive: additionalFields.showOnlyInactive,
						listlimit: additionalFields.limit,
						realDataTypes: additionalFields.realDataTypes,
						showFieldMeasureFormat: additionalFields.showFieldMeasureFormat,
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
		}

		const result = returnData.flat() as unknown as IDataObject[];

		// Map data to n8n data structure
		return [this.helpers.returnJsonArray(result)];
	}
}
