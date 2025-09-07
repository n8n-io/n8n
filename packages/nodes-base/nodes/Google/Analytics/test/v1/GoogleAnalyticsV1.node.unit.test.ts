import { GoogleAnalyticsV1 } from '../../v1/GoogleAnalyticsV1.node';
import type { INodeTypeBaseDescription } from 'n8n-workflow';

describe('GoogleAnalyticsV1 Node Unit Tests', () => {
	let googleAnalyticsV1: GoogleAnalyticsV1;
	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'Google Analytics',
		name: 'googleAnalytics',
		group: ['transform'],
		description: 'Use the Google Analytics API',
		defaultVersion: 1,
	};

	beforeEach(() => {
		googleAnalyticsV1 = new GoogleAnalyticsV1(baseDescription);
	});

	describe('Node Description', () => {
		it('should have correct display name', () => {
			expect(googleAnalyticsV1.description.displayName).toBe('Google Analytics');
		});

		it('should have correct name', () => {
			expect(googleAnalyticsV1.description.name).toBe('googleAnalytics');
		});

		it('should have correct version', () => {
			expect(googleAnalyticsV1.description.version).toBe(1);
		});

		it('should have correct credentials', () => {
			expect(googleAnalyticsV1.description.credentials).toEqual([
				{
					name: 'googleAnalyticsOAuth2',
					required: true,
				},
			]);
		});

		it('should have correct resources', () => {
			const resourceProperty = googleAnalyticsV1.description.properties?.find(
				(prop: any) => prop.name === 'resource',
			);
			expect(resourceProperty?.options).toEqual([
				{
					name: 'Report',
					value: 'report',
				},
				{
					name: 'User Activity',
					value: 'userActivity',
				},
			]);
		});
	});

	describe('Load Options Methods', () => {
		it('should have getDimensions method', () => {
			expect(googleAnalyticsV1.methods?.loadOptions?.getDimensions).toBeDefined();
			expect(typeof googleAnalyticsV1.methods.loadOptions.getDimensions).toBe('function');
		});

		it('should have getViews method', () => {
			expect(googleAnalyticsV1.methods?.loadOptions?.getViews).toBeDefined();
			expect(typeof googleAnalyticsV1.methods.loadOptions.getViews).toBe('function');
		});
	});

	describe('Execute Method', () => {
		it('should have execute method', () => {
			expect(googleAnalyticsV1.execute).toBeDefined();
			expect(typeof googleAnalyticsV1.execute).toBe('function');
		});
	});
});
