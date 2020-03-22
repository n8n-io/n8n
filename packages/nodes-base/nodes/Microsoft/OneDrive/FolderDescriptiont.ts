import { INodeProperties } from "n8n-workflow";

export const folderOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'folder',
				],
			},
		},
		options: [
			{
				name: 'Get Children',
				value: 'getChildren',
				description: 'Get items inside a folder',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search a folder',
			},
		],
		default: 'getChildren',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const folderFields = [

/* -------------------------------------------------------------------------- */
/*                                 folder:getChildren                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'getChildren',
				],
				resource: [
					'folder',
				],
			},
		},
		default: '',
		description: 'Folder ID',
	},
/* -------------------------------------------------------------------------- */
/*                                 folder:search                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'folder',
				],
			},
		},
		default: '',
		description: `The query text used to search for items. Values may be matched
		across several fields including filename, metadata, and file content.`,
	},
] as INodeProperties[];
