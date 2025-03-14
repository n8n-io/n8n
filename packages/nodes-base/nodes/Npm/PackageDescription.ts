import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { valid as isValidSemver } from 'semver';

interface PackageJson {
	name: string;
	version: string;
	description: string;
}

export const packageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getMetadata',
		displayOptions: {
			show: {
				resource: ['package'],
			},
		},
		options: [
			{
				name: 'Get Metadata',
				value: 'getMetadata',
				action: 'Returns all the metadata for a package at a specific version',
				description: 'Returns all the metadata for a package at a specific version',
				routing: {
					request: {
						method: 'GET',
						url: '=/{{ encodeURIComponent($parameter.packageName) }}/{{ $parameter.packageVersion }}',
					},
				},
			},
			{
				name: 'Get Versions',
				value: 'getVersions',
				action: 'Returns all the versions for a package',
				description: 'Returns all the versions for a package',
				routing: {
					request: {
						method: 'GET',
						url: '=/{{ encodeURIComponent($parameter.packageName) }}',
					},
					output: {
						postReceive: [
							async function (items) {
								const allVersions: INodeExecutionData[] = [];
								for (const { json } of items) {
									const itemVersions = json.time as Record<string, string>;
									Object.keys(itemVersions).forEach((version) => {
										if (isValidSemver(version)) {
											allVersions.push({
												json: {
													version,
													published_at: itemVersions[version],
												},
											});
										}
									});
								}
								allVersions.sort(
									(a, b) =>
										new Date(b.json.published_at as string).getTime() -
										new Date(a.json.published_at as string).getTime(),
								);
								return allVersions;
							},
						],
					},
				},
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search for packages',
				description: 'Search for packages',
				routing: {
					request: {
						method: 'GET',
						url: '/-/v1/search',
						qs: {
							text: '={{$parameter.query}}',
							size: '={{$parameter.limit}}',
							from: '={{$parameter.offset}}',
							popularity: 0.99,
						},
					},
					output: {
						postReceive: [
							async function (items) {
								return items.flatMap(({ json }) =>
									(json.objects as Array<{ package: PackageJson }>).map(
										({ package: { name, version, description } }) =>
											({ json: { name, version, description } }) as INodeExecutionData,
									),
								);
							},
						],
					},
				},
			},
		],
	},
];

export const packageFields: INodeProperties[] = [
	{
		displayName: 'Package Name',
		name: 'packageName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['getMetadata', 'getVersions'],
			},
		},
	},
	{
		displayName: 'Package Version',
		name: 'packageVersion',
		type: 'string',
		required: true,
		default: 'latest',
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['getMetadata'],
			},
		},
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['search'],
			},
		},
		default: '',
		description: 'The query text used to search for packages',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['search'],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		typeOptions: {
			minValue: 0,
		},
		displayOptions: {
			show: {
				resource: ['package'],
				operation: ['search'],
			},
		},
		description: 'Offset to return results from',
	},
];
