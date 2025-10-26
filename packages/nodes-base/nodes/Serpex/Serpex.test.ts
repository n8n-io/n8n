import type { INodeType } from 'n8n-workflow';
import { Serpex } from './Serpex.node';
import { SerpexApi } from '../credentials/SerpexApi.credentials';

describe('Serpex Node', () => {
	let node: INodeType;

	beforeAll(() => {
		node = new Serpex();
	});

	test('Should have correct displayName', () => {
		expect(node.description.displayName).toBe('Serpex');
	});

	test('Should have correct name', () => {
		expect(node.description.name).toBe('serpex');
	});

	test('Should have correct group', () => {
		expect(node.description.group).toContain('transform');
	});

	test('Should have required credentials', () => {
		expect(node.description.credentials).toBeDefined();
		expect(node.description.credentials).toContainEqual({
			name: 'serpexApi',
			required: true,
		});
	});

	test('Should have search operation', () => {
		const properties = node.description.properties;
		const operationProperty = properties.find((p) => p.name === 'operation');
		
		expect(operationProperty).toBeDefined();
		if (operationProperty && 'options' in operationProperty) {
			const searchOption = operationProperty.options?.find((o: any) => o.value === 'search');
			expect(searchOption).toBeDefined();
		}
	});

	test('Should have searchQuery parameter', () => {
		const properties = node.description.properties;
		const searchQueryProperty = properties.find((p) => p.name === 'searchQuery');
		
		expect(searchQueryProperty).toBeDefined();
		expect(searchQueryProperty?.required).toBe(true);
	});

	test('Should have engine parameter with options', () => {
		const properties = node.description.properties;
		const engineProperty = properties.find((p) => p.name === 'engine');
		
		expect(engineProperty).toBeDefined();
		if (engineProperty && 'options' in engineProperty) {
			const options = engineProperty.options as any[];
			expect(options.length).toBeGreaterThan(0);
			expect(options.some((o) => o.value === 'auto')).toBe(true);
			expect(options.some((o) => o.value === 'google')).toBe(true);
			expect(options.some((o) => o.value === 'bing')).toBe(true);
		}
	});

	test('Should have timeRange parameter', () => {
		const properties = node.description.properties;
		const timeRangeProperty = properties.find((p) => p.name === 'timeRange');
		
		expect(timeRangeProperty).toBeDefined();
	});
});

describe('Serpex Credentials', () => {
	let credentials: any;

	beforeAll(() => {
		credentials = new SerpexApi();
	});

	test('Should have correct name', () => {
		expect(credentials.name).toBe('serpexApi');
	});

	test('Should have correct displayName', () => {
		expect(credentials.displayName).toBe('Serpex API');
	});

	test('Should have apiKey property', () => {
		expect(credentials.properties).toBeDefined();
		const apiKeyProperty = credentials.properties.find((p: any) => p.name === 'apiKey');
		expect(apiKeyProperty).toBeDefined();
		expect(apiKeyProperty.required).toBe(true);
		expect(apiKeyProperty.type).toBe('string');
		expect(apiKeyProperty.typeOptions.password).toBe(true);
	});

	test('Should have correct authentication method', () => {
		expect(credentials.authenticate).toBeDefined();
		expect(credentials.authenticate.header).toBeDefined();
		expect(credentials.authenticate.header.key).toBe('Authorization');
	});
});
