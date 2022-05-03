import { INodeProperties } from 'n8n-workflow';
import { languages } from '../ressources/languages';

export const storageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['storage'],
			},
		},
		options: [
			{
				name: 'JSON Bin Storage',
				value: 'json',
				description: 'Store JSONs online and access them on different szenarios through our api.',
			},
			{
				name: 'Global Variables',
				value: 'globalvariables',
				description:
					'Store global variables online and access them on different szenarios through our api.',
			},
			{
				name: 'Temporary Storage',
				value: 'temp',
				description: 'Store files temporary for 24 hours',
			},
			{
				name: 'Permanent Storage for simple files',
				value: 'perm',
				description: 'Store files up to 50MB online and access them through our api.',
			},
		],
		default: 'json',
	},
] as INodeProperties[];

export const storageFields = [
	// storage: json
	{
		displayName: 'Choose a JSON bin operation',
		name: 'jsonop',
		type: 'options',
		options: [
			{
				name: 'Add a new JSON bin',
				value: 'add',
			},
			{
				name: 'Get a JSON',
				value: 'get',
			},
			{
				name: 'Delete a stored JSON bin',
				value: 'del',
			},
			{
				name: 'Update a JSON bin',
				value: 'put',
			},
			{
				name: 'List all your JSON bins',
				value: 'list',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: ['json'],
				resource: ['storage'],
			},
		},
		default: 'add',
	},
	{
		displayName: 'JSON or JSON string',
		name: 'json',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				operation: ['json'],
				resource: ['storage'],
				jsonop: ['add', 'put'],
			},
		},
		default: '',
	},
	{
		displayName: 'Bin ID of the JSON',
		name: 'binId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['json'],
				resource: ['storage'],
				jsonop: ['get', 'del', 'put'],
			},
		},
		default: '',
	},
	// storage: globalvariables
	{
		displayName: 'Choose a JSON bin operation',
		name: 'globalvariablesop',
		type: 'options',
		options: [
			{
				name: 'Add a new global variable',
				value: 'add',
			},
			{
				name: 'Get a global variable',
				value: 'get',
			},
			{
				name: 'Delete a global variable',
				value: 'del',
			},
			{
				name: 'List all your global variables',
				value: 'list',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: ['globalvariables'],
				resource: ['storage'],
			},
		},
		default: 'add',
	},
	// storage: globalvariables: add
	{
		displayName: 'Variable Name',
		name: 'variableName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['globalvariables'],
				resource: ['storage'],
				globalvariablesop: ['add', 'get'],
			},
		},
		default: '',
	},
	{
		displayName: 'Variable Value',
		name: 'variableValue',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['globalvariables'],
				resource: ['storage'],
				globalvariablesop: ['add'],
			},
		},
		default: '',
	},
	// storage: globalvariables: del
	{
		displayName: 'Variable ID',
		name: 'variableId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['globalvariables'],
				resource: ['storage'],
				globalvariablesop: ['del'],
			},
		},
		default: '',
		description:
			'Global variables can only be deleted with the matching variableId. You can list them with the "list" operation.',
	},
	// storage: tempfiles
	{
		displayName: 'Binary file data',
		name: 'buffer',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['temp'],
				resource: ['storage'],
			},
		},
		default: '',
		description: 'Binary file data in base64 format.',
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['temp'],
				resource: ['storage'],
			},
		},
		default: 'Test.txt',
		description: 'Important: If you want to keep the filetype. Add the extension to the filename.',
	},
	// storage: permfiles
	{
		displayName: 'Choose a file storage operation',
		name: 'permfilesop',
		type: 'options',
		options: [
			{
				name: 'Add a new file',
				value: 'add',
			},
			{
				name: 'Get a gstored file',
				value: 'get',
			},
			{
				name: 'Delete a stored file',
				value: 'del',
			},
			{
				name: 'List all your files',
				value: 'list',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: ['perm'],
				resource: ['storage'],
			},
		},
		default: 'add',
	},
	// ai: permfiles: add
	{
		displayName: 'Binary file data',
		name: 'fileBuffer',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['perm'],
				resource: ['storage'],
				permfilesop: ['add'],
			},
		},
		default: '',
		description: 'Binary file data in base64 format.',
	},
	{
		displayName: 'File Name',
		name: 'uploadName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['temp'],
				resource: ['storage'],
				permfilesop: ['add'],
			},
		},
		default: 'Test.txt',
		description: 'Important: If you want to keep the filetype. Add the extension to the filename.',
	},
	// ai: permfiles: del
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['perm'],
				resource: ['storage'],
				permfilesop: ['del', 'get'],
			},
		},
		default: '',
		description: 'You can list your files and file ids with the "list" operation.',
	},
	// ai: permfiles: get
	{
		displayName: 'URL',
		name: 'getAsUrl',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				operation: ['perm'],
				resource: ['storage'],
				permfilesop: ['get'],
			},
		},
		default: false,
		description: 'Get the result back as an url.',
	},
] as INodeProperties[];
