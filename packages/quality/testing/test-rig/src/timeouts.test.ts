import { licenceEnv, scaledTimeouts } from './timeouts';

describe('scaledTimeouts', () => {
	it('divides the n8n defaults by the scale', () => {
		expect(scaledTimeouts(6)).toEqual({
			QUEUE_WORKER_LOCK_DURATION: '10000',
			QUEUE_WORKER_LOCK_RENEW_TIME: '1667',
			QUEUE_WORKER_STALLED_INTERVAL: '5000',
			N8N_GRACEFUL_SHUTDOWN_TIMEOUT: '5',
		});
	});

	it('keeps the shutdown window at one second or more and lets overrides win', () => {
		expect(scaledTimeouts(100, { QUEUE_WORKER_LOCK_DURATION: '7' })).toMatchObject({
			N8N_GRACEFUL_SHUTDOWN_TIMEOUT: '1',
			QUEUE_WORKER_LOCK_DURATION: '7',
		});
	});

	it('rejects a scale below one', () => {
		expect(() => scaledTimeouts(0.5)).toThrow('scale must be 1 or more');
		expect(() => scaledTimeouts(Number.NaN)).toThrow('scale must be 1 or more');
	});
});

describe('licenceEnv', () => {
	const shell = { N8N_LICENSE_CERT: 'fake-cert' };

	it('blanks the licence for a single-main stack', () => {
		expect(licenceEnv(1, shell)).toEqual({ N8N_LICENSE_ACTIVATION_KEY: '', N8N_LICENSE_CERT: '' });
	});

	it('passes the shell licence through for multi-main', () => {
		expect(licenceEnv(2, shell)).toEqual({});
		expect(licenceEnv(2, { N8N_LICENSE_ACTIVATION_KEY: 'fake-key' })).toEqual({});
	});

	it('fails for multi-main without a licence', () => {
		expect(() => licenceEnv(3, {})).toThrow('multi-main stack needs');
	});
});
