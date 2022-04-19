import {getHasuraAdminSecret, getHasuraUrl, getStageFromEnv} from '../../../nodes/utils/utilities';
import {DEFAULT_DEV_HASURA_URL} from '../../../nodes/utils/constants';

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

	it('should use default url on undefined', () => {
		expect(getHasuraUrl()).toEqual(DEFAULT_DEV_HASURA_URL);
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

describe('get hasura admin secret', () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		jest.resetModules(); // Most important - it clears the cache
		process.env = {...OLD_ENV}; // Make a copy
	});

	afterAll(() => {
		process.env = OLD_ENV; // Restore old environment
	});

	it('should return empty string on undefined', () => {
		expect(getHasuraAdminSecret()).toEqual('');
	});

	it('should return key on has', ()=>{
		const key = 'admin-secret-key';
		process.env.X_HASURA_ADMIN_SECRET = key;
		expect(getHasuraAdminSecret()).toEqual(key);
	});
});
