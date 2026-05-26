import { test as base, expect as baseExpect } from '../../../../fixtures/base';
import {
	InstanceAiDriver,
	type InstanceAiDriverConfig,
} from '../../../../utils/benchmark/instance-ai-driver';

type InstanceAiMemoryFixtures = {
	instanceAiDriver: InstanceAiDriver;
};

export const instanceAiTestConfig = {
	capability: {
		env: {
			TEST_ISOLATION: 'bench-mem-instanceai',
		},
	},
} as const;

export const test = base.extend<InstanceAiMemoryFixtures>({
	instanceAiDriver: async ({ n8n, backendUrl }, use) => {
		const config: InstanceAiDriverConfig = {
			n8n,
			baseUrl: backendUrl,
		};

		const driver = new InstanceAiDriver(config);

		await use(driver);

		// Cleanup: close tabs + delete any threads created during the test
		await driver.cleanup();
	},
});

export const expect = baseExpect;
