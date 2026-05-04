import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	accounts:
		| 'getAccountsList'
		| 'getAccountDetails'
		| 'createAccount'
		| 'updateAccount'
		| 'deleteAccount'
		| 'getNotificationsSettings'
		| 'configureNotificationsSettings';
	companies: 'getCompanyDetails' | 'updateCompanyDetails';
	general: 'getApiKeyDetails' | 'generateEmailVerificationCode';
	incidents:
		| 'addToBlocklist'
		| 'getBlocklistItems'
		| 'removeFromBlocklist'
		| 'createIsolateEndpointTask'
		| 'createRestoreEndpointFromIsolationTask'
		| 'createCustomRule'
		| 'getCustomRulesList'
		| 'updateCustomRule'
		| 'deleteCustomRule'
		| 'changeIncidentStatus'
		| 'updateIncidentNote'
		| 'createResponseAction'
		| 'getResponseActionStatus'
		| 'getSimilarEmails';
	integrations:
		| 'getHourlyUsageForAmazonEC2Instances'
		| 'configureAmazonEC2IntegrationUsingCrossAccountRole'
		| 'generateAmazonEC2ExternalIdForCrossAccountRole'
		| 'getAmazonEC2ExternalIdForCrossAccountRole'
		| 'disableAmazonEC2Integration'
		| 'createIntegration'
		| 'getIntegrationDetails'
		| 'updateIntegration'
		| 'getConfiguredIntegrations'
		| 'deleteIntegration'
		| 'manageIntegration';
	licensing:
		| 'getLicenseInfo'
		| 'setLicenseKey'
		| 'addProductKey'
		| 'removeProductKey'
		| 'getMonthlyUsage'
		| 'getMonthlyUsagePerProductType';
	maintenance_windows:
		| 'createPatchManagementMaintenanceWindow'
		| 'getMaintenanceWindowsList'
		| 'getMaintenanceWindowDetails'
		| 'updatePatchManagementMaintenanceWindow'
		| 'deleteMaintenanceWindow'
		| 'assignMaintenanceWindows'
		| 'unassignMaintenanceWindows'
		| 'getManuallyApprovedPatches';
	network:
		| 'assignPolicy'
		| 'getEndpointsList'
		| 'getManagedEndpointDetails'
		| 'createCustomGroup'
		| 'deleteCustomGroup'
		| 'moveCustomGroup'
		| 'getCustomGroupsList'
		| 'killProcess'
		| 'createSubmitToSandboxAnalyzerTask'
		| 'moveEndpoints'
		| 'deleteEndpoint'
		| 'setEndpointLabel'
		| 'getNetworkInventoryItems'
		| 'createScanTask'
		| 'createReconfigureClientTask'
		| 'createScanTaskByMac'
		| 'getScanTasksList'
		| 'getTaskStatus'
		| 'deleteTask'
		| 'runLiveSearchQuery'
		| 'addIntegrators'
		| 'getIntegrators'
		| 'removeIntegrators';
	packages:
		| 'getInstallationLinks'
		| 'createPackage'
		| 'getPackagesList'
		| 'deletePackage'
		| 'getPackageDetails'
		| 'updatePackage';
	patch_management: 'getMissingPatches' | 'getInstalledPatches';
	phasr:
		| 'getMonitoredRules'
		| 'getMonitoredRuleData'
		| 'editMonitoredRulesAccess'
		| 'getPhasrRecommendations'
		| 'applyRecommendations'
		| 'getRecommendationProfiles'
		| 'getAllCompanyResources'
		| 'getAllCompanyIdentities'
		| 'takeRequestAccessAction';
	policies: 'getPoliciesList' | 'getPolicyDetails' | 'setPolicyModulesState';
	push:
		| 'setPushEventSettings'
		| 'getPushEventSettings'
		| 'sendTestPushEvent'
		| 'getPushEventStats'
		| 'resetPushEventStats';
	quarantine:
		| 'getQuarantineItemsList'
		| 'createRemoveQuarantineItemTask'
		| 'createEmptyQuarantineTask'
		| 'createRestoreQuarantineItemTask'
		| 'createRestoreQuarantineExchangeItemTask'
		| 'createReleaseQuarantineExchangeItemTask'
		| 'createAddFileToQuarantineTask';
	reports: 'createReport' | 'getReportsList' | 'getDownloadLinks' | 'deleteReport';
};

export type GravityZoneType = AllEntities<NodeMap>;
