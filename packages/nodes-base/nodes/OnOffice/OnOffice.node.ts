import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { addressFields, addressOperations } from './descriptions/AddressDescription';
import { OnOfficeAddressReadAdditionalFields } from './descriptions/CommonReadDescription';
import { estateFields, estateOperations } from './descriptions/EstateDescription';
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
				],
				default: 'address',
				required: true,
				description: 'Resource to consume',
			},

			...addressOperations,
			...addressFields,

			...estateOperations,
			...estateFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			if (operation === 'read') {
				const additionalFields = this.getNodeParameter(
					'additionalFields',
					i,
				) as OnOfficeAddressReadAdditionalFields;

				const parameters = {
					data: this.getNodeParameter('data', i) as string[],
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
					const result = await onOfficeApiAction.call(this, 'read', resource, parameters);

					returnData.push(result);
				}
			}
		}

		const result = returnData.flat() as unknown as IDataObject[];

		// Map data to n8n data structure
		return [this.helpers.returnJsonArray(result)];
	}
}
