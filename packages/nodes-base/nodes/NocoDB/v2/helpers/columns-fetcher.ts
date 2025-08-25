import type { ILoadOptionsFunctions, ResourceMapperField } from 'n8n-workflow';

import { apiRequest } from '../transport';

const makeUidtMapper = (version: number) => {
	const uidtMapper: Record<string, (field: any) => ResourceMapperField | undefined> = {
		ID: (_field: any) => {
			return undefined;
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
			if (version === 3 && field.system) {
				return undefined;
			}
			return {
				id: field.title,
				displayName: field.title,
				type: 'string',
				display: true,
				readOnly: false,
			} as ResourceMapperField;
		},
		Number: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: 'number',
				display: true,
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
			const options =
				version === 3
					? field.colOptions
					: field.options.choices.map((opt: any) => ({
							name: opt.title,
							value: opt.title,
						}));

			return {
				id: field.title,
				displayName: field.title,
				type: 'options',
				options,
				display: true,
				readOnly: false,
			} as ResourceMapperField;
		},
		MultiSelect: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: version === 3 ? 'string' : 'array',
				display: true,
				readOnly: false,
			} as ResourceMapperField;
		},
		DateTime: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: 'dateTime',
				display: true,
				readOnly: false,
			} as ResourceMapperField;
		},
		Url: (field: any) => {
			return {
				id: field.title,
				displayName: field.title,
				type: 'url',
				display: true,
				readOnly: false,
			} as ResourceMapperField;
		},
	};
	uidtMapper['Decimal'] = uidtMapper['Number'];
	uidtMapper['Percent'] = uidtMapper['Number'];
	uidtMapper['Currency'] = uidtMapper['Number'];
	uidtMapper['Rating'] = uidtMapper['Number'];
	uidtMapper['Year'] = uidtMapper['Number'];
	return uidtMapper;
};

export class ColumnsFetcher {
	constructor(protected loadOptionsFunctions: ILoadOptionsFunctions) {}

	async mapperFieldsFromDefinedParam() {
		const version = Number(this.loadOptionsFunctions.getNodeParameter('version', 0));
		const fetchResult = await this.fetchFromDefinedParam();
		return this.mapApiResultToMapperFields({
			version,
			apiResponse: fetchResult,
		});
	}

	async fetchFromDefinedParam() {
		const version = Number(this.loadOptionsFunctions.getNodeParameter('version', 0));
		const workspaceId = this.loadOptionsFunctions.getNodeParameter('workspaceId', 0, {
			extractValue: true,
		}) as string;
		const baseId = this.loadOptionsFunctions.getNodeParameter('projectId', 0, {
			extractValue: true,
		}) as string;
		const tableId = this.loadOptionsFunctions.getNodeParameter('table', 0, {
			extractValue: true,
		}) as string;
		return await this.fetch({
			version,
			workspaceId,
			baseId,
			tableId,
		});
	}

	async fetch({
		version,
		baseId,
		tableId,
	}: {
		version: number;
		workspaceId: string;
		baseId: string;
		tableId: string;
	}) {
		const url =
			version === 3
				? `/api/v2/meta/tables/${tableId}`
				: `/api/v3/meta/bases/${baseId}/tables/${tableId}`;
		const response = await apiRequest.call(this.loadOptionsFunctions, 'GET', url, {}, {});
		return version === 3 ? response.columns : response.fields;
	}

	mapApiResultToMapperFields({
		version,
		apiResponse,
	}: {
		version: number;
		apiResponse: any;
	}): ResourceMapperField[] {
		const uidtMapper = makeUidtMapper(version);
		const getUidtHandler = (field: any) => (version === 3 ? field.uidt : field.type);
		return apiResponse
			.map((field: any) => {
				return uidtMapper[getUidtHandler(field)]
					? uidtMapper[getUidtHandler(field)](field)
					: uidtMapper['SingleLineText'](field);
			})
			.filter((k: ResourceMapperField) => k);
	}
}
