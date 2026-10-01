import type { ILoadOptionsFunctions, ResourceMapperField } from 'n8n-workflow';

import { apiRequest } from '../transport';

const makeUidtMapper = () => {
	const uidtMapper: Record<string, (field: any) => ResourceMapperField | undefined> = {
		ID: (_field: any) => {
			return undefined;
		},
		// eslint-disable-next-line @typescript-eslint/naming-convention
		QrCode: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: 'string',
				display: true,
				readOnly: true,
			} as ResourceMapperField;
		},
		Attachment: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: 'array',
				display: true,
				readOnly: false,
			} as ResourceMapperField;
		},
		SingleLineText: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: 'string',
				display: true,
				defaultMatch: false,
				readOnly: false,
			} as ResourceMapperField;
		},
		Number: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: 'number',
				display: true,
				defaultMatch: false,
				readOnly: false,
			} as ResourceMapperField;
		},
		Checkbox: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: 'boolean',
				display: true,
				readOnly: false,
			} as ResourceMapperField;
		},
		SingleSelect: (field: any) => {
			const options = field.options.choices.map((opt: any) => ({
				name: opt.title,
				value: opt.title,
			}));

			return {
				id: field.title,
				displayName: field.title,
				type: 'options',
				options: options ?? [],
				display: true,
				defaultMatch: false,
				readOnly: false,
			} as ResourceMapperField;
		},
		MultiSelect: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: 'array',
				display: true,
				defaultMatch: false,
				readOnly: false,
			} as ResourceMapperField;
		},
		DateTime: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: 'dateTime',
				display: true,
				defaultMatch: false,
				readOnly: false,
			} as ResourceMapperField;
		},
		Url: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: 'url',
				display: true,
				defaultMatch: false,
				readOnly: false,
			} as ResourceMapperField;
		},
		Links: (field: any) => {
			const relationType = field.options?.relationType ?? 'hm';
			let type = 'array';
			if (['bt', 'oo'].includes(relationType)) {
				type = 'string';
			}

			return {
				id: field.title,
				displayName: field.title,
				type,
				display: true,
				defaultMatch: false,
				readOnly: false,
				options: {},
			} as ResourceMapperField;
		},
	};
	uidtMapper['Decimal'] = uidtMapper['Number'];
	uidtMapper['Duration'] = uidtMapper['Number'];
	uidtMapper['Percent'] = uidtMapper['Number'];
	uidtMapper['Currency'] = uidtMapper['Number'];
	uidtMapper['Rating'] = uidtMapper['Number'];
	uidtMapper['Year'] = uidtMapper['Number'];
	uidtMapper['Date'] = uidtMapper['DateTime'];
	uidtMapper['LinkToAnotherRecord'] = uidtMapper['Links'];

	// readonly
	uidtMapper['Barcode'] = uidtMapper['QrCode'];
	uidtMapper['ForeignKey'] = uidtMapper['QrCode'];
	uidtMapper['CreatedBy'] = uidtMapper['QrCode'];
	uidtMapper['CreatedTime'] = uidtMapper['QrCode'];
	uidtMapper['LastModifiedBy'] = uidtMapper['QrCode'];
	uidtMapper['LastModifiedTime'] = uidtMapper['QrCode'];
	uidtMapper['Lookup'] = uidtMapper['QrCode'];
	uidtMapper['Formula'] = uidtMapper['QrCode'];
	uidtMapper['Rollup'] = uidtMapper['QrCode'];
	uidtMapper['Button'] = uidtMapper['QrCode'];
	return uidtMapper;
};

export class ColumnsFetcher {
	constructor(protected loadOptionsFunctions: ILoadOptionsFunctions) {}

	async mapperFieldsFromDefinedParam() {
		const fetchResult = await this.fetchFromDefinedParam();
		return this.mapApiResultToMapperFields(fetchResult);
	}

	async fetchFromDefinedParam() {
		const baseId = this.loadOptionsFunctions.getNodeParameter('projectId', 0, {
			extractValue: true,
		}) as string;
		const tableId = this.loadOptionsFunctions.getNodeParameter('table', 0, {
			extractValue: true,
		}) as string;
		return await this.fetch({
			baseId,
			tableId,
		});
	}

	async fetch({
		baseId,
		tableId,
	}: {
		baseId: string;
		tableId: string;
	}) {
		const url = `/api/v3/meta/bases/${baseId}/tables/${tableId}`;
		const response = await apiRequest.call(this.loadOptionsFunctions, 'GET', url, {}, {});
		return response.fields;
	}

	mapApiResultToMapperFields(apiResponse: any): ResourceMapperField[] {
		const uidtMapper = makeUidtMapper();
		return apiResponse
			.map((field: any) => {
				return uidtMapper[field.type]
					? uidtMapper[field.type](field)
					: uidtMapper['SingleLineText'](field);
			})
			.filter((k: ResourceMapperField) => k);
	}
}
