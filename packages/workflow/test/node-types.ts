import { mock } from 'vitest-mock-extended';

import {
	NodeConnectionTypes,
	type IDataObject,
	type INodeType,
	type INodeTypeData,
	type INodeTypes,
	type IVersionedNodeType,
	type LoadedClass,
} from '../src/interfaces';
import * as NodeHelpers from '../src/node-helpers';

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
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
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
					inputs: [NodeConnectionTypes.Main],
					name: 'googleSheets',
					outputs: [NodeConnectionTypes.Main],
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
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
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

const codeNode: LoadedClass<INodeType> = {
	sourcePath: '',
	type: {
		description: {
			displayName: 'Code',
			name: 'code',
			group: ['input'],
			version: 1,
			description: 'Code node',
			defaults: {
				name: 'Code',
				color: '#0000FF',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [
				{
					displayName: 'Code',
					name: 'jsCode',
					type: 'string',
					default: '// placeholder',
				},
			],
		},
	},
};

const htmlNode: LoadedClass<INodeType> = {
	sourcePath: '',
	type: {
		description: {
			displayName: 'HTML',
			name: 'html',
			group: ['input'],
			version: 1,
			description: 'HTML node',
			defaults: {
				name: 'HTML',
				color: '#0000FF',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [
				{
					displayName: 'HTML',
					name: 'html',
					type: 'string',
					default: '// placeholder',
				},
			],
		},
	},
};

const formNode: LoadedClass<INodeType> = {
	sourcePath: '',
	type: {
		description: {
			displayName: 'Form',
			name: 'form',
			group: ['input'],
			version: 1,
			description: 'Form node',
			defaults: {
				name: 'Form',
				color: '#0000FF',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [
				{
					displayName: 'Form Elements',
					name: 'formFields',
					placeholder: 'Add Form Element',
					type: 'fixedCollection',
					default: {},
					typeOptions: {
						multipleValues: true,
						sortable: true,
					},
					options: [
						{
							displayName: 'Values',
							name: 'values',
							values: [
								{
									displayName: 'Field Name',
									name: 'fieldLabel',
									type: 'string',
									default: '',
									placeholder: 'e.g. What is your name?',
									description: 'Label that appears above the input field',
									required: true,
									displayOptions: {
										hide: {
											fieldType: ['hiddenField', 'html'],
										},
									},
								},
								{
									displayName: 'Element Type',
									name: 'fieldType',
									type: 'options',
									default: 'text',
									description: 'The type of field to add to the form',
									options: [
										{
											name: 'Custom HTML',
											value: 'html',
										},
										{
											name: 'Date',
											value: 'date',
										},
										{
											name: 'Dropdown List',
											value: 'dropdown',
										},
										{
											name: 'Email',
											value: 'email',
										},
										{
											name: 'File',
											value: 'file',
										},
										{
											name: 'Hidden Field',
											value: 'hiddenField',
										},
										{
											name: 'Number',
											value: 'number',
										},
										{
											name: 'Password',
											value: 'password',
										},
										{
											name: 'Text',
											value: 'text',
										},
										{
											name: 'Textarea',
											value: 'textarea',
										},
									],
									required: true,
								},
								{
									displayName: 'Element Name',
									name: 'elementName',
									type: 'string',
									default: '',
									placeholder: 'e.g. content-section',
									description: 'Optional field. It can be used to include the html in the output.',
									displayOptions: {
										show: {
											fieldType: ['html'],
										},
									},
								},
								{
									displayName: 'Placeholder',
									name: 'placeholder',
									description: 'Sample text to display inside the field',
									type: 'string',
									default: '',
									displayOptions: {
										hide: {
											fieldType: ['dropdown', 'date', 'file', 'html', 'hiddenField'],
										},
									},
								},
								{
									displayName: 'Field Name',
									name: 'fieldName',
									description:
										'The name of the field, used in input attributes and referenced by the workflow',
									type: 'string',
									default: '',
									displayOptions: {
										show: {
											fieldType: ['hiddenField'],
										},
									},
								},
								{
									displayName: 'Field Value',
									name: 'fieldValue',
									description:
										'Input value can be set here or will be passed as a query parameter via Field Name if no value is set',
									type: 'string',
									default: '',
									displayOptions: {
										show: {
											fieldType: ['hiddenField'],
										},
									},
								},
								{
									displayName: 'Field Options',
									name: 'fieldOptions',
									placeholder: 'Add Field Option',
									description: 'List of options that can be selected from the dropdown',
									type: 'fixedCollection',
									default: { values: [{ option: '' }] },
									required: true,
									displayOptions: {
										show: {
											fieldType: ['dropdown'],
										},
									},
									typeOptions: {
										multipleValues: true,
										sortable: true,
									},
									options: [
										{
											displayName: 'Values',
											name: 'values',
											values: [
												{
													displayName: 'Option',
													name: 'option',
													type: 'string',
													default: '',
												},
											],
										},
									],
								},
								{
									displayName: 'Multiple Choice',
									name: 'multiselect',
									type: 'boolean',
									default: false,
									description:
										'Whether to allow the user to select multiple options from the dropdown list',
									displayOptions: {
										show: {
											fieldType: ['dropdown'],
										},
									},
								},
								{
									displayName: 'HTML',
									name: 'html',
									typeOptions: {
										editor: 'htmlEditor',
									},
									type: 'string',
									noDataExpression: true,
									default: '<!-- Your custom HTML here --->',
									description: 'HTML elements to display on the form page',
									hint: 'Does not accept <code>&lt;script&gt;</code>, <code>&lt;style&gt;</code> or <code>&lt;input&gt;</code> tags',
									displayOptions: {
										show: {
											fieldType: ['html'],
										},
									},
								},
								{
									displayName: 'Multiple Files',
									name: 'multipleFiles',
									type: 'boolean',
									default: true,
									description:
										'Whether to allow the user to select multiple files from the file input or just one',
									displayOptions: {
										show: {
											fieldType: ['file'],
										},
									},
								},
								{
									displayName: 'Accepted File Types',
									name: 'acceptFileTypes',
									type: 'string',
									default: '',
									description: 'Comma-separated list of allowed file extensions',
									hint: 'Leave empty to allow all file types',
									placeholder: 'e.g. .jpg, .png',
									displayOptions: {
										show: {
											fieldType: ['file'],
										},
									},
								},
								{
									displayName:
										"The displayed date is formatted based on the locale of the user's browser",
									name: 'formatDate',
									type: 'notice',
									default: '',
									displayOptions: {
										show: {
											fieldType: ['date'],
										},
									},
								},
								{
									displayName: 'Required Field',
									name: 'requiredField',
									type: 'boolean',
									default: false,
									description:
										'Whether to require the user to enter a value for this field before submitting the form',
									displayOptions: {
										hide: {
											fieldType: ['html', 'hiddenField'],
										},
									},
								},
							],
						},
					],
				},
			],
		},
	},
};

const manualTriggerNode: LoadedClass<INodeType> = {
	sourcePath: '',
	type: {
		description: {
			displayName: 'Manual Trigger',
			name: 'n8n-nodes-base.manualTrigger',
			icon: 'fa:mouse-pointer',
			group: ['trigger'],
			version: 1,
			description: 'Runs the flow on clicking a button in n8n',
			eventTriggerDescription: '',
			maxNodes: 1,
			defaults: {
				name: 'When clicking ‘Execute workflow’',
				color: '#909298',
			},
			inputs: [],
			outputs: [NodeConnectionTypes.Main],
			properties: [
				{
					displayName:
						'This node is where the workflow execution starts (when you click the ‘test’ button on the canvas).<br><br> <a data-action="showNodeCreator">Explore other ways to trigger your workflow</a> (e.g on a schedule, or a webhook)',
					name: 'notice',
					type: 'notice',
					default: '',
				},
			],
		},
	},
};

const executeWorkflowNode: LoadedClass<INodeType> = {
	type: {
		description: {
			name: 'n8n-nodes-base.executeWorkflow',
			displayName: 'Execute Sub-workflow',
			icon: 'fa:sign-in-alt',
			iconColor: 'orange-red',
			group: ['transform'],
			version: [1, 1.1, 1.2],
			subtitle: '={{"Workflow: " + $parameter["workflowId"]}}',
			description: 'Execute another workflow',
			defaults: { name: 'Execute Workflow', color: '#ff6d5a' },
			inputs: [],
			outputs: [],
			properties: [
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'hidden',
					noDataExpression: true,
					default: 'call_workflow',
					options: [{ name: 'Execute a Sub-Workflow', value: 'call_workflow' }],
				},
				{
					displayName:
						'This node is out of date. Please upgrade by removing it and adding a new one',
					name: 'outdatedVersionWarning',
					type: 'notice',
					displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
					default: '',
				},
				{
					displayName: 'Source',
					name: 'source',
					type: 'options',
					options: [
						{
							name: 'Database',
							value: 'database',
							description: 'Load the workflow from the database by ID',
						},
						{
							name: 'Local File',
							value: 'localFile',
							description: 'Load the workflow from a locally saved file',
						},
						{
							name: 'Parameter',
							value: 'parameter',
							description: 'Load the workflow from a parameter',
						},
						{ name: 'URL', value: 'url', description: 'Load the workflow from an URL' },
					],
					default: 'database',
					description: 'Where to get the workflow to execute from',
					displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
				},
				{
					displayName: 'Source',
					name: 'source',
					type: 'options',
					options: [
						{
							name: 'Database',
							value: 'database',
							description: 'Load the workflow from the database by ID',
						},
						{
							name: 'Define Below',
							value: 'parameter',
							description: 'Pass the JSON code of a workflow',
						},
					],
					default: 'database',
					description: 'Where to get the workflow to execute from',
					displayOptions: { show: { '@version': [{ _cnd: { gte: 1.2 } }] } },
				},
				{
					displayName: 'Workflow ID',
					name: 'workflowId',
					type: 'string',
					displayOptions: { show: { source: ['database'], '@version': [1] } },
					default: '',
					required: true,
					hint: 'Can be found in the URL of the workflow',
					description:
						"Note on using an expression here: if this node is set to run once with all items, they will all be sent to the <em>same</em> workflow. That workflow's ID will be calculated by evaluating the expression for the <strong>first input item</strong>.",
				},
				{
					displayName: 'Workflow',
					name: 'workflowId',
					type: 'workflowSelector',
					displayOptions: { show: { source: ['database'], '@version': [{ _cnd: { gte: 1.1 } }] } },
					default: '',
					required: true,
				},
				{
					displayName: 'Workflow Path',
					name: 'workflowPath',
					type: 'string',
					displayOptions: { show: { source: ['localFile'] } },
					default: '',
					placeholder: '/data/workflow.json',
					required: true,
					description: 'The path to local JSON workflow file to execute',
				},
				{
					displayName: 'Workflow JSON',
					name: 'workflowJson',
					type: 'json',
					typeOptions: { rows: 10 },
					displayOptions: { show: { source: ['parameter'] } },
					default: '\n\n\n',
					required: true,
					description: 'The workflow JSON code to execute',
				},
				{
					displayName: 'Workflow URL',
					name: 'workflowUrl',
					type: 'string',
					displayOptions: { show: { source: ['url'] } },
					default: '',
					placeholder: 'https://example.com/workflow.json',
					required: true,
					description: 'The URL from which to load the workflow from',
				},
				{
					displayName:
						'Any data you pass into this node will be output by the Execute Workflow Trigger. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/" target="_blank">More info</a>',
					name: 'executeWorkflowNotice',
					type: 'notice',
					default: '',
					displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
				},
				{
					displayName: 'Workflow Inputs',
					name: 'workflowInputs',
					type: 'resourceMapper',
					noDataExpression: true,
					default: { mappingMode: 'defineBelow', value: null },
					required: true,
					typeOptions: {
						loadOptionsDependsOn: ['workflowId.value'],
						resourceMapper: {
							localResourceMapperMethod: 'loadSubWorkflowInputs',
							valuesLabel: 'Workflow Inputs',
							mode: 'map',
							fieldWords: { singular: 'input', plural: 'inputs' },
							addAllFields: true,
							multiKeyMatch: false,
							supportAutoMap: false,
							showTypeConversionOptions: true,
						},
					},
					displayOptions: {
						show: { source: ['database'], '@version': [{ _cnd: { gte: 1.2 } }] },
						hide: { workflowId: [''] },
					},
				},
				{
					displayName: 'Mode',
					name: 'mode',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Run once with all items',
							value: 'once',
							description: 'Pass all items into a single execution of the sub-workflow',
						},
						{
							name: 'Run once for each item',
							value: 'each',
							description: 'Call the sub-workflow individually for each item',
						},
					],
					default: 'once',
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					default: {},
					placeholder: 'Add option',
					options: [
						{
							displayName: 'Wait For Sub-Workflow Completion',
							name: 'waitForSubWorkflow',
							type: 'boolean',
							default: true,
							description:
								'Whether the main workflow should wait for the sub-workflow to complete its execution before proceeding',
						},
					],
				},
			],
			hints: [
				{
					type: 'info',
					message:
						"Note on using an expression for workflow ID: if this node is set to run once with all items, they will all be sent to the <em>same</em> workflow. That workflow's ID will be calculated by evaluating the expression for the <strong>first input item</strong>.",
					displayCondition:
						'={{ $rawParameter.workflowId.startsWith("=") && $nodeVersion >= 1.2 }}',
					whenToDisplay: 'always',
					location: 'outputPane',
				},
			],
			codex: {
				categories: ['Core Nodes'],
				subcategories: { 'Core Nodes': ['Helpers', 'Flow'] },
				alias: ['n8n', 'call', 'sub', 'workflow', 'sub-workflow', 'subworkflow'],
				resources: {
					primaryDocumentation: [
						{
							url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/',
						},
					],
				},
			},
		},
	},
	sourcePath: '',
};

const aiAgentNode: LoadedClass<INodeType> = {
	sourcePath: '',
	type: {
		description: {
			displayName: 'AI Agent',
			name: '@n8n/n8n-nodes-langchain.agent',
			icon: 'fa:robot',
			iconColor: 'black',
			group: ['transform'],
			version: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8],
			description: 'Generates an action plan and executes it. Can use external tools.',
			defaults: {
				name: 'AI Agent',
				color: '#404040',
			},
			inputs: [
				NodeConnectionTypes.Main,
				NodeConnectionTypes.AiLanguageModel,
				NodeConnectionTypes.AiTool,
				NodeConnectionTypes.AiMemory,
			],
			outputs: [NodeConnectionTypes.Main],
			properties: [],
		},
	},
};

const wikipediaTool: LoadedClass<INodeType> = {
	sourcePath: '',
	type: {
		description: {
			displayName: 'Wikipedia',
			name: '@n8n/n8n-nodes-langchain.toolWikipedia',
			icon: 'file:wikipedia.svg',
			group: ['transform'],
			version: 1,
			description: 'Search in Wikipedia',
			defaults: {
				name: 'Wikipedia',
			},
			inputs: [],
			outputs: [NodeConnectionTypes.AiTool],
			properties: [],
		},
	},
};

const calculatorTool: LoadedClass<INodeType> = {
	sourcePath: '',
	type: {
		description: {
			displayName: 'Calculator',
			name: '@n8n/n8n-nodes-langchain.toolCalculator',
			icon: 'fa:calculator',
			iconColor: 'black',
			group: ['transform'],
			version: 1,
			description: 'Make it easier for AI agents to perform arithmetic',
			defaults: {
				name: 'Calculator',
			},
			inputs: [],
			outputs: [NodeConnectionTypes.AiTool],
			properties: [],
		},
	},
};

const googleCalendarTool: LoadedClass<INodeType> = {
	sourcePath: '',
	type: {
		description: {
			displayName: 'Google Calendar',
			name: 'n8n-nodes-base.googleCalendarTool',
			icon: 'file:googleCalendar.svg',
			group: ['input'],
			version: [1, 1.1, 1.2, 1.3],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Google Calendar API',
			defaults: {
				name: 'Google Calendar',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			usableAsTool: true,
			properties: [
				{ name: 'start', type: 'dateTime', displayName: 'Start', default: '' },
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: {
						show: {
							resource: ['calendar'],
						},
					},
					options: [
						{
							name: 'Availability',
							value: 'availability',
							description: 'If a time-slot is available in a calendar',
							action: 'Get availability in a calendar',
						},
					],
					default: 'availability',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: {
						show: {
							resource: ['event'],
						},
					},
					options: [
						{
							name: 'Create',
							value: 'create',
							description: 'Add a event to calendar',
							action: 'Create an event',
						},
						{
							name: 'Delete',
							value: 'delete',
							description: 'Delete an event',
							action: 'Delete an event',
						},
						{
							name: 'Get',
							value: 'get',
							description: 'Retrieve an event',
							action: 'Get an event',
						},
						{
							name: 'Get Many',
							value: 'getAll',
							description: 'Retrieve many events from a calendar',
							action: 'Get many events',
						},
						{
							name: 'Update',
							value: 'update',
							description: 'Update an event',
							action: 'Update an event',
						},
					],
					default: 'create',
				},
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Calendar',
							value: 'calendar',
						},
						{
							name: 'Event',
							value: 'event',
						},
					],
					default: 'event',
				},
			],
		},
	},
};

export class NodeTypes implements INodeTypes {
	nodeTypes: INodeTypeData = {
		'n8n-nodes-base.stickyNote': stickyNode,
		'n8n-nodes-base.set': setNode,
		'n8n-nodes-base.code': codeNode,
		'n8n-nodes-base.html': htmlNode,
		'n8n-nodes-base.form': formNode,
		'test.googleSheets': googleSheetsNode,
		'test.set': setNode,
		'n8n-nodes-base.executeWorkflow': executeWorkflowNode,
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
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
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
		'n8n-nodes-base.manualTrigger': manualTriggerNode,
		'@n8n/n8n-nodes-langchain.agent': aiAgentNode,
		'n8n-nodes-base.googleCalendarTool': googleCalendarTool,
		'@n8n/n8n-nodes-langchain.toolCalculator': calculatorTool,
		'@n8n/n8n-nodes-langchain.toolWikipedia': wikipediaTool,
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
				name: nodeType,
				communityNodePackageVersion: undefined,
			},
		});
	}

	getKnownTypes(): IDataObject {
		throw new Error('Method not implemented.');
	}
}
