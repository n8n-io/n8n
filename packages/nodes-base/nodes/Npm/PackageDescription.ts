import { valid as isValidSemver } from 'semver';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

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
							async function (this, items) {
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
];
