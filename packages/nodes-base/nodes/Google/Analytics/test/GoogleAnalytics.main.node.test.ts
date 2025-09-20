import { GoogleAnalytics } from '../GoogleAnalytics.node';

describe('GoogleAnalytics Main Node Tests', () => {
	let googleAnalytics: GoogleAnalytics;

	beforeEach(() => {
		googleAnalytics = new GoogleAnalytics();
	});

	describe('Node Construction', () => {
		it('should initialize correctly', () => {
			expect(googleAnalytics).toBeInstanceOf(GoogleAnalytics);
		});

		it('should have correct base description', () => {
			expect(googleAnalytics.description.displayName).toBe('Google Analytics');
			expect(googleAnalytics.description.name).toBe('googleAnalytics');
			expect(googleAnalytics.description.group).toContain('transform');
			expect(googleAnalytics.description.description).toBe('Use the Google Analytics API');
			expect(googleAnalytics.description.defaultVersion).toBe(2);
		});

		it('should have correct node versions', () => {
			expect(googleAnalytics.nodeVersions).toBeDefined();
			expect(googleAnalytics.nodeVersions[1]).toBeDefined();
			expect(googleAnalytics.nodeVersions[2]).toBeDefined();
		});

		it('should have version 1 node', () => {
			const v1Node = googleAnalytics.nodeVersions[1];
			expect(v1Node.description.version).toBe(1);
			expect(v1Node.description.displayName).toBe('Google Analytics');
		});

		it('should have version 2 node', () => {
			const v2Node = googleAnalytics.nodeVersions[2];
			expect(v2Node.description.version).toBe(2);
			expect(v2Node.description.displayName).toBe('Google Analytics');
			expect(v2Node.description.usableAsTool).toBe(true);
		});
	});

	describe('Version Properties', () => {
		it('should have different properties between versions', () => {
			const v1Properties = googleAnalytics.nodeVersions[1].description.properties;
			const v2Properties = googleAnalytics.nodeVersions[2].description.properties;

			expect(v1Properties).toBeDefined();
			expect(v2Properties).toBeDefined();

			// Both should have resource property
			const v1ResourceProp = v1Properties?.find((prop: any) => prop.name === 'resource');
			const v2ResourceProp = v2Properties?.find((prop: any) => prop.name === 'resource');

			expect(v1ResourceProp).toBeDefined();
			expect(v2ResourceProp).toBeDefined();
		});

		it('should have oldVersionNotice in v1', () => {
			const v1Properties = googleAnalytics.nodeVersions[1].description.properties;
			// The oldVersionNotice is the first property in the array
			expect(v1Properties?.[0]).toBeDefined();
			expect(v1Properties?.[0].type).toBe('notice');
		});
	});
});
