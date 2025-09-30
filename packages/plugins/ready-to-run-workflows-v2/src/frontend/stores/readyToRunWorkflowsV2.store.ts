import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { usePostHog } from '@/stores/posthog.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useI18n } from '@n8n/i18n';
import { useLocalStorage } from '@vueuse/core';
import { OPEN_AI_API_CREDENTIAL_TYPE, deepCopy } from 'n8n-workflow';
import type { WorkflowDataCreate } from '@n8n/rest-api-client';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRouter, type RouteLocationNormalized } from 'vue-router';
import { READY_TO_RUN_WORKFLOW_V1 } from '../workflows/ai-workflow';
import { READY_TO_RUN_WORKFLOW_V2 } from '../workflows/ai-workflow-v2';
import { useEmptyStateDetection } from '../composables/useEmptyStateDetection';

// Plugin-local constants
const STORE_NAME = 'readyToRunWorkflowsV2';
const LOCAL_STORAGE_CREDENTIAL_KEY = 'N8N_READY_TO_RUN_V2_OPENAI_CREDENTIAL_ID';

export const READY_TO_RUN_V2_EXPERIMENT = {
	name: '042_ready-to-run-worfklow_v2',
	control: 'control',
	variant1: 'variant-1-singlebox',
	variant2: 'variant-2-twoboxes',
};

export const useReadyToRunWorkflowsV2Store = defineStore(STORE_NAME, () => {
	const telemetry = useTelemetry();
	const i18n = useI18n();
	const toast = useToast();
	const router = useRouter();
	const credentialsStore = useCredentialsStore();
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const posthogStore = usePostHog();
	const cloudPlanStore = useCloudPlanStore();
	const workflowsStore = useWorkflowsStore();

	const isFeatureEnabled = computed(() => {
		const variant = posthogStore.getVariant(READY_TO_RUN_V2_EXPERIMENT.name);
		return (
			(variant === READY_TO_RUN_V2_EXPERIMENT.variant1 ||
				variant === READY_TO_RUN_V2_EXPERIMENT.variant2) &&
			cloudPlanStore.userIsTrialing
		);
	});

	const claimedCredentialIdRef = useLocalStorage(LOCAL_STORAGE_CREDENTIAL_KEY, '');

	const claimingCredits = ref(false);

	const userHasOpenAiCredentialAlready = computed(
		() =>
			!!credentialsStore.allCredentials.filter(
				(credential) => credential.type === OPEN_AI_API_CREDENTIAL_TYPE,
			).length,
	);

	const userHasClaimedAiCreditsAlready = computed(
		() => !!usersStore.currentUser?.settings?.userClaimedAiCredits,
	);

	const userCanClaimOpenAiCredits = computed(() => {
		return (
			settingsStore.isAiCreditsEnabled &&
			!userHasOpenAiCredentialAlready.value &&
			!userHasClaimedAiCreditsAlready.value
		);
	});

	const getCurrentVariant = () => {
		return posthogStore.getVariant(READY_TO_RUN_V2_EXPERIMENT.name);
	};

	const trackExecuteAiWorkflow = (status: string) => {
		const variant = getCurrentVariant();
		telemetry.track('User executed ready to run AI workflow', {
			status,
			variant,
		});
	};

	const trackExecuteAiWorkflowSuccess = () => {
		const variant = getCurrentVariant();
		telemetry.track('User executed ready to run AI workflow successfully', {
			variant,
		});
	};

	const claimFreeAiCredits = async (projectId?: string) => {
		claimingCredits.value = true;

		try {
			const credential = await credentialsStore.claimFreeAiCredits(projectId);

			if (usersStore?.currentUser?.settings) {
				usersStore.currentUser.settings.userClaimedAiCredits = true;
			}

			claimedCredentialIdRef.value = credential.id;

			telemetry.track('User claimed OpenAI credits');
			return credential;
		} catch (e) {
			toast.showError(
				e,
				i18n.baseText('freeAi.credits.showError.claim.title'),
				i18n.baseText('freeAi.credits.showError.claim.message'),
			);
			throw e;
		} finally {
			claimingCredits.value = false;
		}
	};

	const createAndOpenAiWorkflow = async (source: 'card' | 'button', parentFolderId?: string) => {
		const variant = getCurrentVariant();
		telemetry.track('User opened ready to run AI workflow', {
			source,
			variant,
		});

		const workflowTemplate =
			variant === READY_TO_RUN_V2_EXPERIMENT.variant2
				? READY_TO_RUN_WORKFLOW_V2
				: READY_TO_RUN_WORKFLOW_V1;

		try {
			let workflowToCreate: WorkflowDataCreate = {
				...workflowTemplate,
				parentFolderId,
			};

			const credentialId = claimedCredentialIdRef.value;
			if (credentialId && workflowToCreate.nodes) {
				const clonedWorkflow = deepCopy(workflowToCreate);
				const openAiNode = clonedWorkflow.nodes?.find((node) => node.name === 'OpenAI Model');
				if (openAiNode) {
					openAiNode.credentials ??= {};
					openAiNode.credentials[OPEN_AI_API_CREDENTIAL_TYPE] = {
						id: credentialId,
						name: '',
					};
				}
				workflowToCreate = clonedWorkflow;
			}

			const createdWorkflow = await workflowsStore.createNewWorkflow(workflowToCreate);

			await router.push({
				name: VIEWS.WORKFLOW,
				params: { name: createdWorkflow.id },
			});

			return createdWorkflow;
		} catch (error) {
			toast.showError(error, i18n.baseText('generic.error'));
			throw error;
		}
	};

	const claimCreditsAndOpenWorkflow = async (
		source: 'card' | 'button',
		parentFolderId?: string,
		projectId?: string,
	) => {
		await claimFreeAiCredits(projectId);
		await createAndOpenAiWorkflow(source, parentFolderId);
	};

	const getCardVisibility = (
		canCreate: boolean | undefined,
		readOnlyEnv: boolean,
		loading: boolean,
	) => {
		return (
			!loading &&
			// userCanClaimOpenAiCredits.value &&
			!readOnlyEnv &&
			canCreate
		);
	};

	const getButtonVisibility = (
		hasWorkflows: boolean,
		canCreate: boolean | undefined,
		readOnlyEnv: boolean,
	) => {
		return (
			// userCanClaimOpenAiCredits.value &&
			!readOnlyEnv && canCreate && hasWorkflows
		);
	};

	const { shouldShowSimplifiedLayout } = useEmptyStateDetection();

	const getSimplifiedLayoutVisibility = (route: RouteLocationNormalized, loading: boolean) => {
		return shouldShowSimplifiedLayout(route, loading);
	};

	return {
		isFeatureEnabled,
		claimingCredits,
		userCanClaimOpenAiCredits,
		claimFreeAiCredits,
		createAndOpenAiWorkflow,
		claimCreditsAndOpenWorkflow,
		getCardVisibility,
		getButtonVisibility,
		getSimplifiedLayoutVisibility,
		trackExecuteAiWorkflow,
		trackExecuteAiWorkflowSuccess,
	};
});
