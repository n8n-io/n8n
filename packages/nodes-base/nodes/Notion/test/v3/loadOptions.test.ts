import { Container } from '@n8n/di';
import { InstanceSettings, LoadOptionsContext } from 'n8n-core';
import type {
	ILoadOptionsFunctions,
	INode,
	INodeParameters,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { requestPath, Workflow } from 'n8n-workflow';
import { rmSync } from 'node:fs';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { Notion } from '../../Notion.node';
import {
	getDataSourceOptionsFromPage,
	getDataSourcePropertiesFromPage,
	getPropertySelectValues,
} from '../../v3/methods/loadOptions';
import * as Transport from '../../v3/transport';

const userFolder = await vi.hoisted(async () => {
	const { mkdtempSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const folder = mkdtempSync(join(tmpdir(), 'n8n-notion-v3-load-options-test-'));
	vi.stubEnv('N8N_USER_FOLDER', folder);
	return folder;
});

vi.mock('../../v3/transport', async () => ({
	...(await vi.importActual<typeof Transport>('../../v3/transport')),
	getDataSourceProperties: vi.fn(),
	notionApiRequestV3: vi.fn(),
}));

const mockGetDataSourceProperties = Transport.getDataSourceProperties as Mock;
const mockNotionApiRequest = Transport.notionApiRequestV3 as Mock;

function createLoadOptionsContext(parameters: Record<string, unknown>): ILoadOptionsFunctions {
	return {
		getCurrentNodeParameter: vi.fn((name: string) => parameters[name]),
	} as unknown as ILoadOptionsFunctions;
}

function createNotionV3LoadOptionsContext(
	currentNodeParameters: INodeParameters,
	path = 'parameters.propertiesUi.propertyValues[0].key',
): LoadOptionsContext {
	const notionV3 = new Notion().getNodeType(3);
	const nodeTypes = mock<INodeTypes>();
	nodeTypes.getByNameAndVersion.mockReturnValue(notionV3);

	const node: INode = {
		id: 'notion-node',
		name: 'Notion',
		type: 'n8n-nodes-base.notion',
		typeVersion: 3,
		position: [0, 0],
		parameters: currentNodeParameters,
	};

	const workflow = new Workflow({
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes,
	});

	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	// Assign directly so vitest-mock-extended does not wrap parameter objects in mock proxies.
	additionalData.currentNodeParameters = currentNodeParameters;

	return new LoadOptionsContext(workflow, node, additionalData, path);
}

describe('Notion V3 load options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(InstanceSettings, mock<InstanceSettings>());
	});

	afterEach(() => {
		Container.reset();
	});

	afterAll(() => {
		vi.unstubAllEnvs();
		rmSync(userFolder, { recursive: true, force: true });
	});

	it('returns no options when property select values are requested before choosing a property', async () => {
		const context = createLoadOptionsContext({ '&key': '' });

		const result = await getPropertySelectValues.call(context);

		expect(result).toEqual([]);
	});

	it('returns no options when page property options are requested before choosing a property', async () => {
		const context = createLoadOptionsContext({ '&key': '' });

		const result = await getDataSourceOptionsFromPage.call(context);

		expect(result).toEqual([]);
	});

	it('returns no options when page data source properties are requested without a page', async () => {
		const context = createLoadOptionsContext({ pageId: null });

		const result = await getDataSourcePropertiesFromPage.call(context);

		expect(result).toEqual([]);
		expect(mockNotionApiRequest).not.toHaveBeenCalled();
	});

	it('uses only the last key segment as the property type for selected data source options', async () => {
		mockGetDataSourceProperties.mockResolvedValueOnce({
			'Stage | Owner': {
				type: 'select',
				select: {
					options: [{ name: 'Ready' }],
				},
			},
		});
		const context = createLoadOptionsContext({
			'&key': 'Stage | Owner|select',
			dataSourceId: 'data-source-id',
		});

		const result = await getPropertySelectValues.call(context);

		expect(result).toEqual([{ name: 'Ready', value: 'Ready' }]);
	});

	it('uses only the last key segment as the property type for page data source options', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({
			parent: {
				type: 'data_source_id',
				data_source_id: 'data-source-id',
			},
		});
		mockGetDataSourceProperties.mockResolvedValueOnce({
			'Tags | Segment': {
				type: 'multi_select',
				multi_select: {
					options: [{ name: 'Enterprise' }],
				},
			},
		});
		const context = createLoadOptionsContext({
			'&key': 'Tags | Segment|multi_select',
			pageId: 'page-id',
		});

		const result = await getDataSourceOptionsFromPage.call(context);

		expect(result).toEqual([{ name: 'Enterprise', value: 'Enterprise' }]);
	});

	it('does not use a page parent database ID as a data source ID', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({
			parent: {
				type: 'database_id',
				database_id: 'database-id',
			},
		});
		const context = createLoadOptionsContext({
			pageId: 'page-id',
		});

		const result = await getDataSourcePropertiesFromPage.call(context);

		expect(result).toEqual([]);
		expect(mockNotionApiRequest).toHaveBeenCalledWith('GET', requestPath`/pages/page-id`);
		expect(mockGetDataSourceProperties).not.toHaveBeenCalled();
	});

	it.each([
		['incomplete url resourceLocator object', { __rl: true, mode: 'url' }],
		['incomplete id resourceLocator object', { __rl: true, mode: 'id' }],
		['null value', null],
		['numeric value', 12345],
		['empty string', ''],
	])(
		'returns no page data source properties when pageId resolves to %s',
		async (_label, pageId) => {
			const context = createNotionV3LoadOptionsContext({
				resource: 'databasePage',
				operation: 'update',
				pageId,
			});

			const result = await getDataSourcePropertiesFromPage.call(context);

			expect(result).toEqual([]);
			expect(mockNotionApiRequest).not.toHaveBeenCalled();
			expect(mockGetDataSourceProperties).not.toHaveBeenCalled();
		},
	);

	it.each([
		['incomplete url resourceLocator object', { __rl: true, mode: 'url' }],
		['incomplete id resourceLocator object', { __rl: true, mode: 'id' }],
		['null value', null],
		['numeric value', 12345],
		['empty string', ''],
	])('returns no page data source options when pageId resolves to %s', async (_label, pageId) => {
		const context = createNotionV3LoadOptionsContext(
			{
				resource: 'databasePage',
				operation: 'update',
				pageId,
				propertiesUi: {
					propertyValues: [{ key: 'Status|select', type: 'select' }],
				},
			},
			'parameters.propertiesUi.propertyValues[0].selectValue',
		);

		const result = await getDataSourceOptionsFromPage.call(context);

		expect(result).toEqual([]);
		expect(mockNotionApiRequest).not.toHaveBeenCalled();
		expect(mockGetDataSourceProperties).not.toHaveBeenCalled();
	});
});
