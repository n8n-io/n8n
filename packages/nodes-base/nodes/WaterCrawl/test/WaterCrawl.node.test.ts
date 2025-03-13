// import { IExecuteFunctions } from 'n8n-workflow';
import { WaterCrawl } from '../WaterCrawl.node';
// import { mock } from 'jest-mock-extended';

jest.mock('n8n-workflow', () => {
	const original = jest.requireActual('n8n-workflow');
	return {
		...original,
		NodeApiError: jest.fn(),
	};
});

describe('WaterCrawl', () => {
	let waterCrawl: WaterCrawl;

	beforeEach(() => {
		waterCrawl = new WaterCrawl();
		// We'll use these imports in future tests when implementing actual execution tests
		// import { IExecuteFunctions } from 'n8n-workflow';
		// import { mock } from 'jest-mock-extended';
		// const mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	describe('description', () => {
		it('should have correct properties', () => {
			expect(waterCrawl.description).toHaveProperty('displayName', 'WaterCrawl');
			expect(waterCrawl.description).toHaveProperty('name', 'waterCrawl');
			expect(waterCrawl.description.properties).toContainEqual(
				expect.objectContaining({
					displayName: 'Operation',
					name: 'operation',
				}),
			);
		});

		it('should support all operations', () => {
			const operations = waterCrawl.description.properties.find(
				(prop: any) => prop.name === 'operation',
			);
			expect(operations).toBeDefined();
			if (operations && operations.options) {
				const operationNames = operations.options.map((op: any) => op.value);
				expect(operationNames).toContain('scrapeUrl');
				expect(operationNames).toContain('create');
				expect(operationNames).toContain('get');
				expect(operationNames).toContain('getMany');
				expect(operationNames).toContain('getResults');
				expect(operationNames).toContain('stop');
			}
		});

		it('should have correct operation display names', () => {
			const operations = waterCrawl.description.properties.find(
				(prop: any) => prop.name === 'operation',
			);
			expect(operations).toBeDefined();
			if (operations && operations.options) {
				const opMap = operations.options.reduce((acc: any, op: any) => {
					acc[op.value] = op.name;
					return acc;
				}, {});

				expect(opMap).toMatchObject({
					create: 'Create',
					get: 'Get',
					getMany: 'Get Crawl Requests',
					getResults: 'Get Crawl Results',
					scrapeUrl: 'Scrape URL',
					stop: 'Stop',
				});
			}
		});
	});

	describe('parameters', () => {
		it('should have correct scrapeUrl parameters', () => {
			const properties = waterCrawl.description.properties;

			// Check main parameters
			expect(properties).toContainEqual(
				expect.objectContaining({
					name: 'url',
					displayName: 'URL',
					type: 'string',
					required: true,
				}),
			);

			expect(properties).toContainEqual(
				expect.objectContaining({
					name: 'sync',
					displayName: 'Wait for Results',
					type: 'boolean',
				}),
			);

			expect(properties).toContainEqual(
				expect.objectContaining({
					name: 'download',
					displayName: 'Download Results',
					type: 'boolean',
				}),
			);

			// Check page options
			const pageOptions = properties.find((prop: any) => prop.name === 'pageOptions');
			expect(pageOptions).toBeDefined();
			expect(pageOptions).toHaveProperty('type', 'collection');

			if (pageOptions && pageOptions.options) {
				const optionNames = pageOptions.options.map((op: any) => op.name);
				expect(optionNames).toContain('wait_time');
				expect(optionNames).toContain('timeout');
				expect(optionNames).toContain('include_html');
				expect(optionNames).toContain('include_links');
				expect(optionNames).toContain('only_main_content');
				expect(optionNames).toContain('screenshot');
				expect(optionNames).toContain('pdf');
				expect(optionNames).toContain('include_tags');
				expect(optionNames).toContain('exclude_tags');
			}

			// Check plugin options
			const pluginOptions = properties.find((prop: any) => prop.name === 'pluginOptions');
			expect(pluginOptions).toBeDefined();
			expect(pluginOptions).toHaveProperty('type', 'json');
		});

		it('should have correct pagination for getResults and getMany', () => {
			const properties = waterCrawl.description.properties;

			// Check pagination parameters
			expect(properties).toContainEqual(
				expect.objectContaining({
					name: 'limit',
					displayName: 'Limit',
					type: 'number',
				}),
			);

			expect(properties).toContainEqual(
				expect.objectContaining({
					name: 'page',
					displayName: 'Page',
					type: 'number',
				}),
			);
		});
	});

	// Add more detailed tests for each operation when needed
});
