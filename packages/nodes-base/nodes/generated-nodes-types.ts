const GoogleCloudStorageType = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Bucket', value: 'bucket' },
			{ name: 'Object', value: 'object' },
		],
		default: 'bucket',
	},
];
