import { PegaLaunchpad } from '../PegaLaunchpad.node';
import { normalizeETagForIfMatch } from '../GenericFunctions';

describe('PegaLaunchpad Node', () => {
	const node = new PegaLaunchpad();

	it('should have correct node description', () => {
		expect(node.description.displayName).toBe('Launchpad by Pegasystems');
		expect(node.description.name).toBe('pegaLaunchpad');
	});

	it('should have all required resources', () => {
		const resourceProperty = node.description.properties.find((p) => p.name === 'resource');
		expect(resourceProperty).toBeDefined();

		const options = resourceProperty?.options as Array<{ value: string }>;
		const resourceValues = options?.map((o) => o.value) ?? [];

		expect(resourceValues).toContain('agent');
		expect(resourceValues).toContain('case');
		expect(resourceValues).toContain('attachment');
		expect(resourceValues).toContain('pulse');
		expect(resourceValues).toContain('assignment');
		expect(resourceValues).toContain('user');
	});

	it('should have OAuth2 credentials configured', () => {
		const credentials = node.description.credentials;
		expect(credentials).toBeDefined();
		expect(credentials?.[0]?.name).toBe('pegaOAuth2Api');
	});
});

describe('normalizeETagForIfMatch', () => {
	it('should pass through lowercase weak ETag: w/"2"', () => {
		expect(normalizeETagForIfMatch('w/"2"')).toBe('w/"2"');
	});

	it('should pass through lowercase multi-digit weak ETag: w/"123"', () => {
		expect(normalizeETagForIfMatch('w/"123"')).toBe('w/"123"');
	});

	it('should normalise uppercase weak ETag to lowercase: W/"3" → w/"3"', () => {
		expect(normalizeETagForIfMatch('W/"3"')).toBe('w/"3"');
	});

	it('should normalise single-digit uppercase weak ETag: W/"1" → w/"1"', () => {
		expect(normalizeETagForIfMatch('W/"1"')).toBe('w/"1"');
	});

	it('should normalise multi-digit uppercase weak ETag: W/"123" → w/"123"', () => {
		expect(normalizeETagForIfMatch('W/"123"')).toBe('w/"123"');
	});

	it('should trim whitespace around lowercase value', () => {
		expect(normalizeETagForIfMatch('  w/"2"  ')).toBe('w/"2"');
	});

	it('should trim whitespace and normalise uppercase: "  W/\\"3\\"  " → w/"3"', () => {
		expect(normalizeETagForIfMatch('  W/"3"  ')).toBe('w/"3"');
	});

	it('should pass through lowercase alphanumeric weak ETag: w/"abc123"', () => {
		expect(normalizeETagForIfMatch('w/"abc123"')).toBe('w/"abc123"');
	});

	it('should normalise uppercase alphanumeric weak ETag: W/"abc123" → w/"abc123"', () => {
		expect(normalizeETagForIfMatch('W/"abc123"')).toBe('w/"abc123"');
	});
});
