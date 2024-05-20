import { mock } from 'jest-mock-extended';
import type {
	IDataObject,
	INodeType,
	INodeTypeData,
	INodeTypes,
	IVersionedNodeType,
	LoadedClass,
} from '@/Interfaces';
import * as NodeHelpers from '@/NodeHelpers';

const stickyNode: LoadedClass<INodeType> = {
	type: {
		description: {
			displayName: 'Sticky Note',
			name: 'n8n-nodes-base.stickyNote',
			icon: 'fa:sticky-note',
			group: ['input'],
			version: 1,
			description: 'Make your workflow easier to understand',
			defaults: { name: 'Sticky Note', color: '#FFD233' },
			inputs: [],
			outputs: [],
			properties: [
				{
					displayName: 'Content',
					name: 'content',
					type: 'string',
					required: true,
					default:
						"## I'm a note \n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/sticky-notes/)",
				},
				{ displayName: 'Height', name: 'height', type: 'number', required: true, default: 160 },
				{ displayName: 'Width', name: 'width', type: 'number', required: true, default: 240 },
				{ displayName: 'Color', name: 'color', type: 'number', required: true, default: 1 },
			],
		},
	},
	sourcePath: '',
};

const googleSheetsNode: LoadedClass<IVersionedNodeType> = {
	sourcePath: '',
	type: {
		nodeVersions: {
			'1': {
				methods: {
					loadOptions: {},
					credentialTest: {},
				},
				description: {
					displayName: 'Google Sheets ',
					name: 'googleSheets',
					icon: 'file:googleSheets.svg',
					group: ['input', 'output'],
					defaultVersion: 4.2,
					subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
					description: 'Read, update and write data to Google Sheets',
					version: [1, 2],
					defaults: {
						name: 'Google Sheets',
					},
					inputs: ['main'],
					outputs: ['main'],
					credentials: [
						{
							name: 'googleApi',
							required: true,
							displayOptions: {
								show: {
									authentication: ['serviceAccount'],
								},
							},
							testedBy: 'googleApiCredentialTest',
						},
						{
							name: 'googleSheetsOAuth2Api',
							required: true,
							displayOptions: {
								show: {
									authentication: ['oAuth2'],
								},
							},
						},
					],
					properties: [
						{
							displayName:
								'<strong>New node version available:</strong> get the latest version with added features from the nodes panel.',
							name: 'oldVersionNotice',
							type: 'notice',
							default: '',
						},
						{
							displayName: 'Authentication',
							name: 'authentication',
							type: 'options',
							options: [
								{
									name: 'Service Account',
									value: 'serviceAccount',
								},
								{
									name: 'OAuth2',
									value: 'oAuth2',
								},
							],
							default: 'serviceAccount',
							displayOptions: {
								show: {
									'@version': [1],
								},
							},
						},
						{
							displayName: 'Authentication',
							name: 'authentication',
							type: 'options',
							options: [
								{
									name: 'OAuth2 (recommended)',
									value: 'oAuth2',
								},
								{
									name: 'Service Account',
									value: 'serviceAccount',
								},
							],
							default: 'oAuth2',
							displayOptions: {
								show: {
									'@version': [2],
								},
							},
						},
						{
							displayName: 'Resource',
							name: 'resource',
							type: 'options',
							noDataExpression: true,
							options: [
								{
									name: 'Spreadsheet',
									value: 'spreadsheet',
								},
								{
									name: 'Sheet',
									value: 'sheet',
								},
							],
							default: 'sheet',
						},
						{
							displayName: 'Operation',
							name: 'operation',
							type: 'options',
							noDataExpression: true,
							displayOptions: {
								show: {
									resource: ['sheet'],
								},
							},
							options: [
								{
									name: 'Append',
									value: 'append',
									description: 'Append data to a sheet',
									action: 'Append data to a sheet',
								},
								{
									name: 'Clear',
									value: 'clear',
									description: 'Clear data from a sheet',
									action: 'Clear a sheet',
								},
								{
									name: 'Create',
									value: 'create',
									description: 'Create a new sheet',
									action: 'Create a sheet',
								},
								{
									name: 'Create or Update',
									value: 'upsert',
									description:
										'Create a new record, or update the current one if it already exists (upsert)',
									action: 'Create or update a sheet',
								},
								{
									name: 'Delete',
									value: 'delete',
									description: 'Delete columns and rows from a sheet',
									action: 'Delete a sheet',
								},
								{
									name: 'Lookup',
									value: 'lookup',
									description: 'Look up a specific column value and return the matching row',
									action: 'Look up a column value in a sheet',
								},
								{
									name: 'Read',
									value: 'read',
									description: 'Read data from a sheet',
									action: 'Read a sheet',
								},
								{
									name: 'Remove',
									value: 'remove',
									description: 'Remove a sheet',
									action: 'Remove a sheet',
								},
								{
									name: 'Update',
									value: 'update',
									description: 'Update rows in a sheet',
									action: 'Update a sheet',
								},
							],
							default: 'read',
						},
						{
							displayName: 'Spreadsheet ID',
							name: 'sheetId',
							type: 'string',
							displayOptions: {
								show: {
									resource: ['sheet'],
								},
							},
							default: '',
							required: true,
							description:
								'The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.',
						},
						{
							displayName: 'Range',
							name: 'range',
							type: 'string',
							displayOptions: {
								show: {
									resource: ['sheet'],
								},
								hide: {
									operation: ['create', 'delete', 'remove'],
								},
							},
							default: 'A:F',
							required: true,
							description:
								'The table range to read from or to append data to. See the Google <a href="https://developers.google.com/sheets/api/guides/values#writing">documentation</a> for the details. If it contains multiple sheets it can also be added like this: "MySheet!A:F"',
						},
					],
				},
			},
			'4': {
				description: {
					subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
					version: [3, 4, 4.1, 4.2],
					credentials: [
						{
							displayOptions: {
								show: {
									authentication: ['serviceAccount'],
								},
							},
							name: 'googleApi',
							required: true,
							testedBy: 'googleApiCredentialTest',
						},
						{
							displayOptions: {
								show: {
									authentication: ['oAuth2'],
								},
							},
							name: 'googleSheetsOAuth2Api',
							required: true,
						},
					],
					defaults: {
						name: 'Google Sheets',
					},
					defaultVersion: 4.2,
					description: 'Read, update and write data to Google Sheets',
					displayName: 'Google Sheets',
					group: ['input', 'output'],
					icon: 'file:googleSheets.svg',
					inputs: ['main'],
					name: 'googleSheets',
					outputs: ['main'],
					properties: [
						{
							default: 'oAuth2',
							displayName: 'Authentication',
							name: 'authentication',
							options: [
								{
									name: 'Service Account',
									value: 'serviceAccount',
								},
								{
									name: 'OAuth2 (recommended)',
									value: 'oAuth2',
								},
							],
							type: 'options',
						},
						{
							default: 'sheet',
							displayName: 'Resource',
							name: 'resource',
							noDataExpression: true,
							options: [
								{
									name: 'Document',
									value: 'spreadsheet',
								},
								{
									name: 'Sheet Within Document',
									value: 'sheet',
								},
							],
							type: 'options',
						},
						{
							default: 'read',
							displayName: 'Operation',
							displayOptions: {
								show: {
									resource: ['sheet'],
								},
							},
							name: 'operation',
							noDataExpression: true,
							options: [
								{
									action: 'Append or update row in sheet',
									description: 'Append a new row or update an existing one (upsert)',
									name: 'Append or Update Row',
									value: 'appendOrUpdate',
								},
								{
									action: 'Append row in sheet',
									description: 'Create a new row in a sheet',
									name: 'Append Row',
									value: 'append',
								},
								{
									action: 'Clear sheet',
									description: 'Delete all the contents or a part of a sheet',
									name: 'Clear',
									value: 'clear',
								},
								{
									action: 'Create sheet',
									description: 'Create a new sheet',
									name: 'Create',
									value: 'create',
								},
								{
									action: 'Delete sheet',
									description: 'Permanently delete a sheet',
									name: 'Delete',
									value: 'remove',
								},
								{
									action: 'Delete rows or columns from sheet',
									description: 'Delete columns or rows from a sheet',
									name: 'Delete Rows or Columns',
									value: 'delete',
								},
								{
									action: 'Get row(s) in sheet',
									description: 'Retrieve one or more rows from a sheet',
									name: 'Get Row(s)',
									value: 'read',
								},
								{
									action: 'Update row in sheet',
									description: 'Update an existing row in a sheet',
									name: 'Update Row',
									value: 'update',
								},
							],
							type: 'options',
						},
						{
							default: {
								mode: 'list',
								value: '',
							},
							displayName: 'Document',
							displayOptions: {
								show: {
									resource: ['sheet'],
								},
							},
							modes: [
								{
									displayName: 'From List',
									name: 'list',
									type: 'list',
									typeOptions: {
										searchable: true,
										searchListMethod: 'spreadSheetsSearch',
									},
								},
								{
									displayName: 'By URL',
									extractValue: {
										regex:
											'https:\\/\\/(?:drive|docs)\\.google\\.com(?:\\/.*|)\\/d\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
										type: 'regex',
									},
									name: 'url',
									type: 'string',
									validation: [
										{
											properties: {
												errorMessage: 'Not a valid Google Drive File URL',
												regex:
													'https:\\/\\/(?:drive|docs)\\.google\\.com(?:\\/.*|)\\/d\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
											},
											type: 'regex',
										},
									],
								},
								{
									displayName: 'By ID',
									name: 'id',
									type: 'string',
									url: '=https://docs.google.com/spreadsheets/d/{{$value}}/edit',
									validation: [
										{
											properties: {
												errorMessage: 'Not a valid Google Drive File ID',
												regex: '[a-zA-Z0-9\\-_]{2,}',
											},
											type: 'regex',
										},
									],
								},
							],
							name: 'documentId',
							required: true,
							type: 'resourceLocator',
						},
						{
							default: {
								mode: 'list',
								value: '',
							},
							displayName: 'Sheet',
							displayOptions: {
								show: {
									operation: [
										'append',
										'appendOrUpdate',
										'clear',
										'delete',
										'read',
										'remove',
										'update',
									],
									resource: ['sheet'],
								},
							},
							modes: [
								{
									displayName: 'From List',
									name: 'list',
									type: 'list',
									typeOptions: {
										searchable: false,
										searchListMethod: 'sheetsSearch',
									},
								},
								{
									displayName: 'By URL',
									extractValue: {
										regex:
											'https:\\/\\/docs\\.google\\.com/spreadsheets\\/d\\/[0-9a-zA-Z\\-_]+\\/edit\\#gid=([0-9]+)',
										type: 'regex',
									},
									name: 'url',
									type: 'string',
									validation: [
										{
											properties: {
												errorMessage: 'Not a valid Sheet URL',
												regex:
													'https:\\/\\/docs\\.google\\.com/spreadsheets\\/d\\/[0-9a-zA-Z\\-_]+\\/edit\\#gid=([0-9]+)',
											},
											type: 'regex',
										},
									],
								},
								{
									displayName: 'By ID',
									name: 'id',
									type: 'string',
									validation: [
										{
											properties: {
												errorMessage: 'Not a valid Sheet ID',
												regex: '((gid=)?[0-9]{1,})',
											},
											type: 'regex',
										},
									],
								},
							],
							name: 'sheetName',
							required: true,
							type: 'resourceLocator',
							typeOptions: {
								loadOptionsDependsOn: ['documentId.value'],
							},
						},
					],
				},
			},
		},
		currentVersion: 4.2,
		description: {
			displayName: 'Google Sheets',
			name: 'googleSheets',
			icon: 'file:googleSheets.svg',
			group: ['input', 'output'],
			defaultVersion: 4.2,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Read, update and write data to Google Sheets',
		},
		getNodeType(version: number | undefined) {
			return this.nodeVersions[Math.floor(version ?? this.currentVersion)];
		},
	},
};

const setNode: LoadedClass<INodeType> = {
	sourcePath: '',
	type: {
		description: {
			displayName: 'Set',
			name: 'set',
			group: ['input'],
			version: 1,
			description: 'Sets a value',
			defaults: {
				name: 'Set',
				color: '#0000FF',
			},
			inputs: ['main'],
			outputs: ['main'],
			properties: [
				{
					displayName: 'Value1',
					name: 'value1',
					type: 'string',
					default: 'default-value1',
				},
				{
					displayName: 'Value2',
					name: 'value2',
					type: 'string',
					default: 'default-value2',
				},
			],
		},
	},
};

export class NodeTypes implements INodeTypes {
	nodeTypes: INodeTypeData = {
		'n8n-nodes-base.stickyNote': stickyNode,
		'n8n-nodes-base.set': setNode,
		'test.googleSheets': googleSheetsNode,
		'test.set': setNode,
		'test.setMulti': {
			sourcePath: '',
			type: {
				description: {
					displayName: 'Set Multi',
					name: 'setMulti',
					group: ['input'],
					version: 1,
					description: 'Sets multiple values',
					defaults: {
						name: 'Set Multi',
						color: '#0000FF',
					},
					inputs: ['main'],
					outputs: ['main'],
					properties: [
						{
							displayName: 'Values',
							name: 'values',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: true,
							},
							default: {},
							options: [
								{
									name: 'string',
									displayName: 'String',
									values: [
										{
											displayName: 'Name',
											name: 'name',
											type: 'string',
											default: 'propertyName',
											placeholder: 'Name of the property to write data to.',
										},
										{
											displayName: 'Value',
											name: 'value',
											type: 'string',
											default: '',
											placeholder: 'The string value to write in the property.',
										},
									],
								},
							],
						},
					],
				},
			},
		},
	};

	getByName(nodeType: string): INodeType | IVersionedNodeType {
		return this.nodeTypes[nodeType]?.type;
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		if (this.nodeTypes[nodeType]?.type) {
			return NodeHelpers.getVersionedNodeType(this.nodeTypes[nodeType]?.type, version);
		}
		return mock<INodeType>({
			description: {
				properties: [],
			},
		});
	}

	getKnownTypes(): IDataObject {
		throw new Error('Method not implemented.');
	}
}
