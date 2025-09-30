import { markRaw } from 'vue';
import { definePlugin } from '@n8n/extension-sdk/frontend';
import type { WorkflowExecutionFinishedEvent } from '@/event-bus/workflow';
import { workflowEventBus } from '@/event-bus/workflow';
import { usePostHog } from '@/stores/posthog.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import {
	useReadyToRunWorkflowsV2Store,
	READY_TO_RUN_V2_EXPERIMENT,
} from './stores/readyToRunWorkflowsV2.store';
import SimplifiedEmptyLayout from './components/SimplifiedEmptyLayout.vue';
import ReadyToRunV2Button from './components/ReadyToRunV2Button.vue';
import HelloWorld from './components/HelloWorld.vue';

// Re-export for backward compatibility if needed
export { ReadyToRunV2Button };

export default definePlugin({
	/**
	 * Control when plugin loads
	 * Loads when:
	 * - Feature flag is variant1 or variant2
	 * - User is trialing OR running on localhost (for development)
	 */
	shouldLoad: async () => {
		try {
			const posthog = usePostHog();
			const cloudPlan = useCloudPlanStore();

			const variant = posthog.getVariant(READY_TO_RUN_V2_EXPERIMENT.name);
			const isVariantEnabled =
				variant === READY_TO_RUN_V2_EXPERIMENT.variant1 ||
				variant === READY_TO_RUN_V2_EXPERIMENT.variant2;

			const isLocalhost =
				window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
			const userIsTrialing = cloudPlan.userIsTrialing || isLocalhost;

			console.log('[ready-to-run-v2] Load conditions:', {
				variant,
				isVariantEnabled,
				userIsTrialing: cloudPlan.userIsTrialing,
				isLocalhost,
				shouldLoad: isVariantEnabled && userIsTrialing,
			});

			return isVariantEnabled && userIsTrialing;
		} catch (error) {
			console.error('[ready-to-run-v2] Error in shouldLoad:', error);
			return false;
		}
	},

	/**
	 * Called when plugin is activated
	 * Sets up event listeners and registers experiment for tracking
	 */
	onActivate: async () => {
		const store = useReadyToRunWorkflowsV2Store();
		const posthog = usePostHog();

		// Register experiment for tracking
		// This will automatically track when feature flags are loaded (or immediately if already loaded)
		posthog.registerExperiment(READY_TO_RUN_V2_EXPERIMENT.name);
		console.log('[ready-to-run-v2] Experiment registered for tracking:', {
			name: READY_TO_RUN_V2_EXPERIMENT.name,
		});

		// Listen to workflow execution finished events
		workflowEventBus.on('executionFinished', (event: WorkflowExecutionFinishedEvent) => {
			const { templateId, status } = event;

			// Only track if it's one of our AI workflow templates
			if (
				templateId === 'ready-to-run-ai-workflow-v1' ||
				templateId === 'ready-to-run-ai-workflow-v2'
			) {
				if (status === 'success') {
					store.trackExecuteAiWorkflowSuccess();
				} else {
					store.trackExecuteAiWorkflow(status);
				}
			}
		});

		console.log('[ready-to-run-v2] Plugin activated and listening to workflow events');
	},

	components: {
		SimplifiedEmptyLayout: markRaw(SimplifiedEmptyLayout),
		ReadyToRunV2Button: markRaw(ReadyToRunV2Button),
		HelloWorld: markRaw(HelloWorld),
	},
});
