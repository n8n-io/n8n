import { INSTANCE_AI_DISABLED } from './ai-assistant-fixtures';
import type { TestRequirements } from '../Types';

/**
 * Enable the legacy workflow builder with Instance AI disabled.
 * Tests that generate workflows configure their API fixtures separately.
 */
export const workflowBuilderEnabledRequirements: TestRequirements = {
	config: {
		settings: {
			aiAssistant: { enabled: true, setup: true, cloudUbbEnabled: false },
			aiBuilder: { enabled: true, setup: true },
		},
		moduleSettings: INSTANCE_AI_DISABLED,
		features: {
			aiAssistant: true,
			aiBuilder: true,
		},
	},
};
