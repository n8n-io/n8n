import {
	GenericContainer,
	Wait,
	type StartedNetwork,
	type StartedTestContainer,
} from 'testcontainers';
import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
	vi.restoreAllMocks();
});

test('waits for MockServer status without a followed log stream', async () => {
	const httpWait = vi.spyOn(Wait, 'forHttp');
	const logWait = vi.spyOn(Wait, 'forLogMessage');
	const withWaitStrategy = vi.spyOn(GenericContainer.prototype, 'withWaitStrategy');
	const withLogConsumer = vi.spyOn(GenericContainer.prototype, 'withLogConsumer');
	vi.spyOn(GenericContainer.prototype, 'start').mockResolvedValue({} as StartedTestContainer);
	const { proxy } = await import('../services/proxy.js');
	const network = { getName: () => 'test-network' } as StartedNetwork;

	const result = await proxy.start(network, 'test-project');

	expect(result.meta.internalUrl).toBe('http://proxyserver:1080');
	expect(httpWait).toHaveBeenCalledWith('/mockserver/status', 1080);
	// DEVP-1269: Log waits and consumers leave followed Docker streams attached to the worker.
	expect(logWait).not.toHaveBeenCalled();
	expect(withWaitStrategy).toHaveBeenCalledWith(httpWait.mock.results[0].value);
	expect(withLogConsumer).not.toHaveBeenCalled();
});
