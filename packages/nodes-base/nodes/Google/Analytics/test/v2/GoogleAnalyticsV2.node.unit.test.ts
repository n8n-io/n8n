import { GoogleAnalyticsV2 } from '../../v2/GoogleAnalyticsV2.node';
import type { INodeTypeBaseDescription } from 'n8n-workflow';

describe('GoogleAnalyticsV2 Node Unit Tests', () => {
	let googleAnalyticsV2: GoogleAnalyticsV2;
	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'Google Analytics',
		name: 'googleAnalytics',
		group: ['transform'],
		description: 'Use the Google Analytics API',
		defaultVersion: 2,
	};

	beforeEach(() => {
		googleAnalyticsV2 = new GoogleAnalyticsV2(baseDescription);
	});

	describe('Node Description', () => {
		it('should have correct display name', () => {
			expect(googleAnalyticsV2.description.displayName).toBe('Google Analytics');
		});

		it('should have correct name', () => {
			expect(googleAnalyticsV2.description.name).toBe('googleAnalytics');
		});

		it('should have correct version', () => {
			expect(googleAnalyticsV2.description.version).toBe(2);
		});

		it('should have correct credentials', () => {
			expect(googleAnalyticsV2.description.credentials).toEqual([
				{
					name: 'googleAnalyticsOAuth2',
					required: true,
				},
			]);
		});

		it('should have usableAsTool enabled', () => {
			expect(googleAnalyticsV2.description.usableAsTool).toBe(true);
		});

		it('should have correct resources', () => {
			const resourceProperty = googleAnalyticsV2.description.properties?.find(
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

	describe('Methods', () => {
		it('should have loadOptions methods', () => {
			expect(googleAnalyticsV2.methods.loadOptions).toBeDefined();
		});

		it('should have listSearch methods', () => {
			expect(googleAnalyticsV2.methods.listSearch).toBeDefined();
		});
	});

	describe('Execute Method', () => {
		it('should have execute method', () => {
			expect(googleAnalyticsV2.execute).toBeDefined();
			expect(typeof googleAnalyticsV2.execute).toBe('function');
		});
	});
});
