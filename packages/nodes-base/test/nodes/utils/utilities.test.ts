import {getStageFromEnv} from '../../../nodes/utils/utilities';

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
