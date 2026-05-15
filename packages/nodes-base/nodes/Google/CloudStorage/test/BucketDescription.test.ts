import type { INodeProperties, INodePropertyCollection, INodePropertyOptions } from 'n8n-workflow';

import { bucketFields, bucketOperations } from '../BucketDescription';

function findProperty(properties: INodeProperties[], name: string): INodeProperties {
	const property = properties.find((candidate) => candidate.name === name);

	if (!property) {
		throw new Error(`Expected to find property "${name}"`);
	}

	return property;
}

function isPropertyOption(
	option: INodeProperties | INodePropertyCollection | INodePropertyOptions,
): option is INodePropertyOptions {
	return 'value' in option;
}

function getOperation(value: string): INodePropertyOptions {
	const operationProperty = findProperty(bucketOperations, 'operation');
	const options = operationProperty.options ?? [];
	const operation = options.find(
		(option): option is INodePropertyOptions => isPropertyOption(option) && option.value === value,
	);

	if (!operation) {
		throw new Error(`Expected to find operation "${value}"`);
	}

	return operation;
}

describe('Google Cloud Storage Bucket description', () => {
	describe('Project resource locator', () => {
		it('routes the extracted project value for bucket create and get many', () => {
			const projectRLC = findProperty(bucketFields, 'projectRLC');

			expect(projectRLC.type).toBe('resourceLocator');
			expect(projectRLC.displayOptions?.show).toEqual({
				resource: ['bucket'],
				operation: ['create', 'getAll'],
				'@version': [{ _cnd: { gte: 1.1 } }],
			});
			expect(projectRLC.routing?.request?.qs).toEqual({
				project: '={{$value}}',
			});
		});

		it('keeps the legacy project ID field available only for version 1', () => {
			const projectId = findProperty(bucketFields, 'projectId');

			expect(projectId.displayOptions?.show).toEqual({
				resource: ['bucket'],
				operation: ['create', 'getAll'],
				'@version': [1],
			});
			expect(projectId.routing?.request?.qs).toEqual({
				project: '={{$value}}',
			});
		});
	});

	describe('Update operation', () => {
		it('does not require a project parameter', () => {
			const updateOperation = getOperation('update');

			expect(updateOperation.routing?.request?.qs).toEqual({});
		});
	});
});
