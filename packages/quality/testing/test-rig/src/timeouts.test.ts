import { licenceEnv, scaledTimeouts } from './timeouts';

describe('scaledTimeouts', () => {
	it('keeps n8n defaults at scale 1', () => {
		expect(scaledTimeouts(1)).toEqual({
			QUEUE_WORKER_LOCK_DURATION: '60000',
			QUEUE_WORKER_LOCK_RENEW_TIME: '10000',
			QUEUE_WORKER_STALLED_INTERVAL: '30000',
			N8N_GRACEFUL_SHUTDOWN_TIMEOUT: '30',
		});
	});

	it('divides and rounds every timeout', () => {
		expect(scaledTimeouts(7)).toEqual({
			QUEUE_WORKER_LOCK_DURATION: '8571',
			QUEUE_WORKER_LOCK_RENEW_TIME: '1429',
			QUEUE_WORKER_STALLED_INTERVAL: '4286',
			N8N_GRACEFUL_SHUTDOWN_TIMEOUT: '4',
		});
	});

	it('keeps the shutdown timeout at 1 second or more', () => {
		expect(scaledTimeouts(1000).N8N_GRACEFUL_SHUTDOWN_TIMEOUT).toBe('1');
	});

	it.each([0, 0.5, -1, Number.NaN])('rejects the scale %d', (scale) => {
		expect(() => scaledTimeouts(scale)).toThrow('scale must be 1 or more');
	});
});

describe('licenceEnv', () => {
	const licensed = { N8N_LICENSE_CERT: 'cert' };

	it.each([0, 1])('blanks the licence for %d mains', (mains) => {
		expect(licenceEnv(mains, licensed)).toEqual({
			N8N_LICENSE_ACTIVATION_KEY: '',
			N8N_LICENSE_CERT: '',
		});
	});

	it.each([{ N8N_LICENSE_CERT: 'cert' }, { N8N_LICENSE_ACTIVATION_KEY: 'key' }])(
		'adds nothing for a multi-main stack when the shell has %j',
		(shell) => {
			expect(licenceEnv(2, shell)).toEqual({});
		},
	);

	it('fails for a multi-main stack without a licence', () => {
		expect(() => licenceEnv(3, { N8N_LICENSE_CERT: '' })).toThrow(
			'a multi-main stack needs N8N_LICENSE_ACTIVATION_KEY or N8N_LICENSE_CERT in the environment',
		);
	});
});
