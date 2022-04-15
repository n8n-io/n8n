import {getHasuraUrl, getStageFromEnv} from '../../../nodes/utils/utilities';

describe('get stage', () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		jest.resetModules(); // Most important - it clears the cache
		process.env = {...OLD_ENV}; // Make a copy
	});

	afterAll(() => {
		process.env = OLD_ENV; // Restore old environment
	});

	it('should set dev on undefined', () => {
		process.env.NODE_ENV = undefined;
		const stage = getStageFromEnv();
		expect(stage).toEqual('dev');
	});
	it('should get staging', () => {
		process.env.NODE_ENV = 'staging';
		const stage = getStageFromEnv();
		expect(stage).toEqual('staging');
	});
});

describe('get hasura url', () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		jest.resetModules(); // Most important - it clears the cache
		process.env = {...OLD_ENV}; // Make a copy
	});

	afterAll(() => {
		process.env = OLD_ENV; // Restore old environment
	});

	it('should raise error on undefined', () => {
		process.env.HASURA_URL = undefined;
		expect(getHasuraUrl).toThrow('missing HASURA_URL in env');
	});
	it('should get staging', () => {
		process.env.HASURA_URL = 'staging-hasura-svc:8080';
		const stage = getHasuraUrl();
		expect(stage).toEqual('staging-hasura-svc:8080');
	});
		it('should get production', () => {
		process.env.HASURA_URL = 'prod-hasura-svc:8080';
		const stage = getHasuraUrl();
		expect(stage).toEqual('prod-hasura-svc:8080');
	});
});
