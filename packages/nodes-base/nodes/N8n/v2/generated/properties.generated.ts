import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: "Resource",
		name: "resource",
		type: "options",
		noDataExpression: true,
		options: [
			{
				name: "Workflow",
				value: "workflow"
			}
		],
		default: "workflow"
	},
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				]
			}
		},
		options: [
			{
				name: "Create a Workflow",
				value: "createWorkflow",
				action: "Create a workflow",
				routing: {
					request: {
						method: "POST",
						url: "/workflows"
					}
				}
			},
			{
				name: "Delete a Workflow",
				value: "deleteWorkflow",
				action: "Delete a workflow",
				routing: {
					request: {
						method: "DELETE"
					}
				}
			},
			{
				name: "Publish a Workflow",
				value: "publishWorkflow",
				action: "Publish a workflow",
				routing: {
					request: {
						method: "POST"
					}
				}
			},
			{
				name: "Retrieve a Workflow",
				value: "getWorkflow",
				action: "Retrieve a workflow",
				routing: {
					request: {
						method: "GET"
					}
				}
			},
			{
				name: "Retrieve a Workflow Version",
				value: "getWorkflowVersion",
				action: "Retrieve a workflow version",
				routing: {
					request: {
						method: "GET"
					}
				}
			},
			{
				name: "Retrieve All Workflows",
				value: "getWorkflows",
				action: "Retrieve all workflows",
				routing: {
					request: {
						method: "GET",
						url: "/workflows"
					},
					output: {
						postReceive: [
							{
								type: "rootProperty",
								properties: {
									property: "data"
								}
							}
						]
					}
				}
			},
			{
				name: "Unpublish a Workflow",
				value: "unpublishWorkflow",
				action: "Unpublish a workflow",
				routing: {
					request: {
						method: "POST"
					}
				}
			},
			{
				name: "Update a Workflow",
				value: "updateWorkflow",
				action: "Update a workflow",
				routing: {
					request: {
						method: "PUT"
					}
				}
			}
		],
		default: "getWorkflows"
	},
	{
		displayName: "Name",
		name: "name",
		type: "string",
		default: "",
		routing: {
			send: {
				type: "body",
				property: "name"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"createWorkflow"
				]
			}
		}
	},
	{
		displayName: "Nodes",
		name: "nodes",
		type: "json",
		default: "[]",
		description: "Nodes that make up the workflow",
		routing: {
			send: {
				type: "body",
				property: "nodes",
				value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"createWorkflow"
				]
			}
		}
	},
	{
		displayName: "Connections",
		name: "connections",
		type: "json",
		default: "{}",
		description: "Connections between nodes, keyed by source node name",
		routing: {
			send: {
				type: "body",
				property: "connections",
				value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"createWorkflow"
				]
			}
		}
	},
	{
		displayName: "Settings",
		name: "settings",
		type: "json",
		default: "{}",
		routing: {
			send: {
				type: "body",
				property: "settings",
				value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"createWorkflow"
				]
			}
		}
	},
	{
		displayName: "Options",
		name: "options",
		type: "collection",
		placeholder: "Add Option",
		default: {},
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"createWorkflow"
				]
			}
		},
		options: [
			{
				displayName: "Description",
				name: "description",
				type: "string",
				default: "",
				description: "Description of the workflow",
				routing: {
					send: {
						type: "body",
						property: "description"
					}
				}
			},
			{
				displayName: "Node Groups",
				name: "nodeGroups",
				type: "json",
				default: "[]",
				description: "Visual groupings of nodes shown as frames on the canvas",
				routing: {
					send: {
						type: "body",
						property: "nodeGroups",
						value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
					}
				}
			},
			{
				displayName: "Parent Folder ID",
				name: "parentFolderId",
				type: "string",
				default: "",
				description: "ID of the folder to place the workflow in. Omit or null to place at the project root.",
				routing: {
					send: {
						type: "body",
						property: "parentFolderId"
					}
				}
			},
			{
				displayName: "Pin Data",
				name: "pinData",
				type: "json",
				default: "{}",
				description: "Pinned sample data for nodes, keyed by node name",
				routing: {
					send: {
						type: "body",
						property: "pinData",
						value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
					}
				}
			},
			{
				displayName: "Project ID",
				name: "projectId",
				type: "string",
				default: "",
				description: "Target project to create the workflow in. Defaults to the user's personal project.",
				routing: {
					send: {
						type: "body",
						property: "projectId"
					}
				}
			},
			{
				displayName: "Shared",
				name: "shared",
				type: "json",
				default: "[]",
				description: "Accepted for compatibility and ignored. The owner share is derived from the target project.",
				routing: {
					send: {
						type: "body",
						property: "shared",
						value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
					}
				}
			},
			{
				displayName: "Static Data",
				name: "staticData",
				type: "json",
				default: "{}",
				description: "Data the workflow keeps between executions",
				routing: {
					send: {
						type: "body",
						property: "staticData",
						value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
					}
				}
			}
		]
	},
	{
		displayName: "Workflow",
		name: "workflowId",
		type: "resourceLocator",
		default: {
			mode: "list",
			value: ""
		},
		description: "The ID of the workflow",
		modes: [
			{
				displayName: "From List",
				name: "list",
				type: "list",
				placeholder: "Select a Workflow...",
				initType: "workflow",
				typeOptions: {
					searchListMethod: "searchWorkflows",
					searchFilterRequired: false,
					searchable: true
				}
			},
			{
				displayName: "By URL",
				name: "url",
				type: "string",
				placeholder: "https://myinstance.app.n8n.cloud/workflow/1",
				validation: [
					{
						type: "regex",
						properties: {
							regex: ".*/workflow/([0-9a-zA-Z]{1,})",
							errorMessage: "Not a valid Workflow URL"
						}
					}
				],
				extractValue: {
					type: "regex",
					regex: ".*/workflow/([0-9a-zA-Z]{1,})"
				}
			},
			{
				displayName: "ID",
				name: "id",
				type: "string",
				validation: [
					{
						type: "regex",
						properties: {
							regex: "[0-9a-zA-Z]{1,}",
							errorMessage: "Not a valid Workflow ID"
						}
					}
				],
				placeholder: "1"
			}
		],
		routing: {
			request: {
				url: "=/workflows/{{ toPathSegment($value) }}"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"deleteWorkflow"
				]
			}
		}
	},
	{
		displayName: "Workflow",
		name: "workflowId",
		type: "resourceLocator",
		default: {
			mode: "list",
			value: ""
		},
		description: "The ID of the workflow",
		modes: [
			{
				displayName: "From List",
				name: "list",
				type: "list",
				placeholder: "Select a Workflow...",
				initType: "workflow",
				typeOptions: {
					searchListMethod: "searchWorkflows",
					searchFilterRequired: false,
					searchable: true
				}
			},
			{
				displayName: "By URL",
				name: "url",
				type: "string",
				placeholder: "https://myinstance.app.n8n.cloud/workflow/1",
				validation: [
					{
						type: "regex",
						properties: {
							regex: ".*/workflow/([0-9a-zA-Z]{1,})",
							errorMessage: "Not a valid Workflow URL"
						}
					}
				],
				extractValue: {
					type: "regex",
					regex: ".*/workflow/([0-9a-zA-Z]{1,})"
				}
			},
			{
				displayName: "ID",
				name: "id",
				type: "string",
				validation: [
					{
						type: "regex",
						properties: {
							regex: "[0-9a-zA-Z]{1,}",
							errorMessage: "Not a valid Workflow ID"
						}
					}
				],
				placeholder: "1"
			}
		],
		routing: {
			request: {
				url: "=/workflows/{{ toPathSegment($value) }}"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"getWorkflow"
				]
			}
		}
	},
	{
		displayName: "Options",
		name: "options",
		type: "collection",
		placeholder: "Add Option",
		default: {},
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"getWorkflow"
				]
			}
		},
		options: [
			{
				displayName: "Exclude Pinned Data",
				name: "excludePinnedData",
				type: "boolean",
				default: false,
				routing: {
					send: {
						type: "query",
						property: "excludePinnedData",
						value: "={{ String($value) }}"
					}
				}
			}
		]
	},
	{
		displayName: "Return All",
		name: "returnAll",
		type: "boolean",
		default: false,
		description: "Whether to return all results or only up to a given limit",
		routing: {
			send: {
				paginate: "={{ $value }}"
			},
			operations: {
				pagination: {
					type: "generic",
					properties: {
						continue: "={{ !!$response.body?.nextCursor }}",
						request: {
							qs: {
								limit: "={{ $request.qs?.[\"limit\"] }}",
								active: "={{ $request.qs?.[\"active\"] }}",
								tags: "={{ $request.qs?.[\"tags\"] }}",
								name: "={{ $request.qs?.[\"name\"] }}",
								projectId: "={{ $request.qs?.[\"projectId\"] }}",
								excludePinnedData: "={{ $request.qs?.[\"excludePinnedData\"] }}",
								includeParentFolder: "={{ $request.qs?.[\"includeParentFolder\"] }}",
								cursor: "={{ $response.body?.nextCursor }}"
							}
						}
					}
				}
			}
		},
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"getWorkflows"
				]
			}
		}
	},
	{
		displayName: "Limit",
		name: "limit",
		type: "number",
		default: 100,
		typeOptions: {
			minValue: 1,
			maxValue: 250
		},
		description: "Max number of results to return",
		routing: {
			send: {
				type: "query",
				property: "limit"
			}
		},
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"getWorkflows"
				],
				returnAll: [
					false
				]
			}
		}
	},
	{
		displayName: "Options",
		name: "options",
		type: "collection",
		placeholder: "Add Option",
		default: {},
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"getWorkflows"
				]
			}
		},
		options: [
			{
				displayName: "Active",
				name: "active",
				type: "boolean",
				default: false,
				routing: {
					send: {
						type: "query",
						property: "active",
						value: "={{ String($value) }}"
					}
				}
			},
			{
				displayName: "Exclude Pinned Data",
				name: "excludePinnedData",
				type: "boolean",
				default: false,
				routing: {
					send: {
						type: "query",
						property: "excludePinnedData",
						value: "={{ String($value) }}"
					}
				}
			},
			{
				displayName: "Include Parent Folder",
				name: "includeParentFolder",
				type: "boolean",
				default: false,
				description: "Whether to add `parentFolder` to each workflow. `parentFolder` holds the ID of the folder that contains the workflow, or is `null` at the project root.",
				routing: {
					send: {
						type: "query",
						property: "includeParentFolder",
						value: "={{ String($value) }}"
					}
				}
			},
			{
				displayName: "Name",
				name: "name",
				type: "string",
				default: "",
				routing: {
					send: {
						type: "query",
						property: "name"
					}
				}
			},
			{
				displayName: "Project ID",
				name: "projectId",
				type: "string",
				default: "",
				routing: {
					send: {
						type: "query",
						property: "projectId"
					}
				}
			},
			{
				displayName: "Tags",
				name: "tags",
				type: "string",
				default: "",
				routing: {
					send: {
						type: "query",
						property: "tags"
					}
				}
			}
		]
	},
	{
		displayName: "Workflow",
		name: "workflowId",
		type: "resourceLocator",
		default: {
			mode: "list",
			value: ""
		},
		description: "The ID of the workflow",
		modes: [
			{
				displayName: "From List",
				name: "list",
				type: "list",
				placeholder: "Select a Workflow...",
				initType: "workflow",
				typeOptions: {
					searchListMethod: "searchWorkflows",
					searchFilterRequired: false,
					searchable: true
				}
			},
			{
				displayName: "By URL",
				name: "url",
				type: "string",
				placeholder: "https://myinstance.app.n8n.cloud/workflow/1",
				validation: [
					{
						type: "regex",
						properties: {
							regex: ".*/workflow/([0-9a-zA-Z]{1,})",
							errorMessage: "Not a valid Workflow URL"
						}
					}
				],
				extractValue: {
					type: "regex",
					regex: ".*/workflow/([0-9a-zA-Z]{1,})"
				}
			},
			{
				displayName: "ID",
				name: "id",
				type: "string",
				validation: [
					{
						type: "regex",
						properties: {
							regex: "[0-9a-zA-Z]{1,}",
							errorMessage: "Not a valid Workflow ID"
						}
					}
				],
				placeholder: "1"
			}
		],
		routing: {
			request: {
				url: "=/workflows/{{ toPathSegment($value) }}/versions/{{ toPathSegment($parameter[\"workflowVersionId\"]) }}"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"getWorkflowVersion"
				]
			}
		}
	},
	{
		displayName: "Workflow Version ID",
		name: "workflowVersionId",
		type: "string",
		default: "",
		description: "The ID of the workflow version",
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"getWorkflowVersion"
				]
			}
		}
	},
	{
		displayName: "Workflow",
		name: "workflowId",
		type: "resourceLocator",
		default: {
			mode: "list",
			value: ""
		},
		description: "The ID of the workflow",
		modes: [
			{
				displayName: "From List",
				name: "list",
				type: "list",
				placeholder: "Select a Workflow...",
				initType: "workflow",
				typeOptions: {
					searchListMethod: "searchWorkflows",
					searchFilterRequired: false,
					searchable: true
				}
			},
			{
				displayName: "By URL",
				name: "url",
				type: "string",
				placeholder: "https://myinstance.app.n8n.cloud/workflow/1",
				validation: [
					{
						type: "regex",
						properties: {
							regex: ".*/workflow/([0-9a-zA-Z]{1,})",
							errorMessage: "Not a valid Workflow URL"
						}
					}
				],
				extractValue: {
					type: "regex",
					regex: ".*/workflow/([0-9a-zA-Z]{1,})"
				}
			},
			{
				displayName: "ID",
				name: "id",
				type: "string",
				validation: [
					{
						type: "regex",
						properties: {
							regex: "[0-9a-zA-Z]{1,}",
							errorMessage: "Not a valid Workflow ID"
						}
					}
				],
				placeholder: "1"
			}
		],
		routing: {
			request: {
				url: "=/workflows/{{ toPathSegment($value) }}/publish"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"publishWorkflow"
				]
			}
		}
	},
	{
		displayName: "Options",
		name: "options",
		type: "collection",
		placeholder: "Add Option",
		default: {},
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"publishWorkflow"
				]
			}
		},
		options: [
			{
				displayName: "Description",
				name: "description",
				type: "string",
				default: "",
				description: "Optional description for the workflow version during publication",
				routing: {
					send: {
						type: "body",
						property: "description"
					}
				}
			},
			{
				displayName: "Name",
				name: "name",
				type: "string",
				default: "",
				description: "Optional name for the workflow version during publication",
				routing: {
					send: {
						type: "body",
						property: "name"
					}
				}
			},
			{
				displayName: "Version ID",
				name: "versionId",
				type: "string",
				default: "",
				description: "The specific version ID to publish. If not provided, the latest version is used.",
				routing: {
					send: {
						type: "body",
						property: "versionId"
					}
				}
			}
		]
	},
	{
		displayName: "Workflow",
		name: "workflowId",
		type: "resourceLocator",
		default: {
			mode: "list",
			value: ""
		},
		description: "The ID of the workflow",
		modes: [
			{
				displayName: "From List",
				name: "list",
				type: "list",
				placeholder: "Select a Workflow...",
				initType: "workflow",
				typeOptions: {
					searchListMethod: "searchWorkflows",
					searchFilterRequired: false,
					searchable: true
				}
			},
			{
				displayName: "By URL",
				name: "url",
				type: "string",
				placeholder: "https://myinstance.app.n8n.cloud/workflow/1",
				validation: [
					{
						type: "regex",
						properties: {
							regex: ".*/workflow/([0-9a-zA-Z]{1,})",
							errorMessage: "Not a valid Workflow URL"
						}
					}
				],
				extractValue: {
					type: "regex",
					regex: ".*/workflow/([0-9a-zA-Z]{1,})"
				}
			},
			{
				displayName: "ID",
				name: "id",
				type: "string",
				validation: [
					{
						type: "regex",
						properties: {
							regex: "[0-9a-zA-Z]{1,}",
							errorMessage: "Not a valid Workflow ID"
						}
					}
				],
				placeholder: "1"
			}
		],
		routing: {
			request: {
				url: "=/workflows/{{ toPathSegment($value) }}/unpublish"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"unpublishWorkflow"
				]
			}
		}
	},
	{
		displayName: "Workflow",
		name: "workflowId",
		type: "resourceLocator",
		default: {
			mode: "list",
			value: ""
		},
		description: "The ID of the workflow",
		modes: [
			{
				displayName: "From List",
				name: "list",
				type: "list",
				placeholder: "Select a Workflow...",
				initType: "workflow",
				typeOptions: {
					searchListMethod: "searchWorkflows",
					searchFilterRequired: false,
					searchable: true
				}
			},
			{
				displayName: "By URL",
				name: "url",
				type: "string",
				placeholder: "https://myinstance.app.n8n.cloud/workflow/1",
				validation: [
					{
						type: "regex",
						properties: {
							regex: ".*/workflow/([0-9a-zA-Z]{1,})",
							errorMessage: "Not a valid Workflow URL"
						}
					}
				],
				extractValue: {
					type: "regex",
					regex: ".*/workflow/([0-9a-zA-Z]{1,})"
				}
			},
			{
				displayName: "ID",
				name: "id",
				type: "string",
				validation: [
					{
						type: "regex",
						properties: {
							regex: "[0-9a-zA-Z]{1,}",
							errorMessage: "Not a valid Workflow ID"
						}
					}
				],
				placeholder: "1"
			}
		],
		routing: {
			request: {
				url: "=/workflows/{{ toPathSegment($value) }}"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"updateWorkflow"
				]
			}
		}
	},
	{
		displayName: "Name",
		name: "name",
		type: "string",
		default: "",
		routing: {
			send: {
				type: "body",
				property: "name"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"updateWorkflow"
				]
			}
		}
	},
	{
		displayName: "Nodes",
		name: "nodes",
		type: "json",
		default: "[]",
		description: "Nodes that make up the workflow",
		routing: {
			send: {
				type: "body",
				property: "nodes",
				value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"updateWorkflow"
				]
			}
		}
	},
	{
		displayName: "Connections",
		name: "connections",
		type: "json",
		default: "{}",
		description: "Connections between nodes, keyed by source node name",
		routing: {
			send: {
				type: "body",
				property: "connections",
				value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"updateWorkflow"
				]
			}
		}
	},
	{
		displayName: "Settings",
		name: "settings",
		type: "json",
		default: "{}",
		routing: {
			send: {
				type: "body",
				property: "settings",
				value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
			}
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"updateWorkflow"
				]
			}
		}
	},
	{
		displayName: "Options",
		name: "options",
		type: "collection",
		placeholder: "Add Option",
		default: {},
		displayOptions: {
			show: {
				resource: [
					"workflow"
				],
				operation: [
					"updateWorkflow"
				]
			}
		},
		options: [
			{
				displayName: "Description",
				name: "description",
				type: "string",
				default: "",
				description: "Description of the workflow",
				routing: {
					send: {
						type: "body",
						property: "description"
					}
				}
			},
			{
				displayName: "Node Groups",
				name: "nodeGroups",
				type: "json",
				default: "[]",
				description: "Visual groupings of nodes shown as frames on the canvas",
				routing: {
					send: {
						type: "body",
						property: "nodeGroups",
						value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
					}
				}
			},
			{
				displayName: "Parent Folder ID",
				name: "parentFolderId",
				type: "string",
				default: "",
				description: "ID of the folder to move the workflow into. Pass null to move it to the project root; omit to leave its current folder unchanged.",
				routing: {
					send: {
						type: "body",
						property: "parentFolderId"
					}
				}
			},
			{
				displayName: "Pin Data",
				name: "pinData",
				type: "json",
				default: "{}",
				description: "Pinned sample data for nodes, keyed by node name",
				routing: {
					send: {
						type: "body",
						property: "pinData",
						value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
					}
				}
			},
			{
				displayName: "Publish If Active",
				name: "publishIfActive",
				type: "boolean",
				default: true,
				description: "Whether to publish the update if the workflow is currently published. Set to `false` to save the change as a draft on the existing published version instead of releasing it. Has no effect on a workflow that isn't currently published.",
				routing: {
					send: {
						type: "query",
						property: "publishIfActive",
						value: "={{ String($value) }}"
					}
				}
			},
			{
				displayName: "Shared",
				name: "shared",
				type: "json",
				default: "[]",
				description: "Accepted for compatibility and ignored. The owner share is derived from the target project.",
				routing: {
					send: {
						type: "body",
						property: "shared",
						value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
					}
				}
			},
			{
				displayName: "Static Data",
				name: "staticData",
				type: "json",
				default: "{}",
				description: "Data the workflow keeps between executions",
				routing: {
					send: {
						type: "body",
						property: "staticData",
						value: "={{ typeof $value === \"string\" ? $value.parseJson() : $value }}"
					}
				}
			}
		]
	}
];
