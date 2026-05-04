import type { INodeProperties } from 'n8n-workflow';

import * as applyRecommendations from './applyRecommendations.operation';
import * as editMonitoredRulesAccess from './editMonitoredRulesAccess.operation';
import * as getAllCompanyIdentities from './getAllCompanyIdentities.operation';
import * as getAllCompanyResources from './getAllCompanyResources.operation';
import * as getMonitoredRuleData from './getMonitoredRuleData.operation';
import * as getMonitoredRules from './getMonitoredRules.operation';
import * as getPhasrRecommendations from './getPhasrRecommendations.operation';
import * as getRecommendationProfiles from './getRecommendationProfiles.operation';
import * as takeRequestAccessAction from './takeRequestAccessAction.operation';

export {
	getMonitoredRules,
	getMonitoredRuleData,
	editMonitoredRulesAccess,
	getPhasrRecommendations,
	applyRecommendations,
	getRecommendationProfiles,
	getAllCompanyResources,
	getAllCompanyIdentities,
	takeRequestAccessAction,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { category: ['phasr'] } },
		options: [
			{
				name: 'Apply Recommendations',
				value: 'applyRecommendations',
				action: 'Apply recommendations by ID',
			},
			{
				name: 'Edit Monitored Rules Access',
				value: 'editMonitoredRulesAccess',
				action: 'Restrict or allow access for behavioral profiles',
			},
			{
				name: 'Get All Company Identities',
				value: 'getAllCompanyIdentities',
				action: 'Get all detected identities for a company',
			},
			{
				name: 'Get All Company Resources',
				value: 'getAllCompanyResources',
				action: 'Get all detected resources for a company',
			},
			{
				name: 'Get Monitored Rule Data',
				value: 'getMonitoredRuleData',
				action: 'Get detailed info for a specific PHASR rule',
			},
			{
				name: 'Get Monitored Rules',
				value: 'getMonitoredRules',
				action: 'Get all monitored PHASR rules for a company',
			},
			{
				name: 'Get PHASR Recommendations',
				value: 'getPhasrRecommendations',
				action: 'Get PHASR recommendations for a company',
			},
			{
				name: 'Get Recommendation Profiles',
				value: 'getRecommendationProfiles',
				action: 'Get behavioral profiles for a recommendation',
			},
			{
				name: 'Take Request Access Action',
				value: 'takeRequestAccessAction',
				action: 'Allow or deny access request recommendations',
			},
		],
		default: 'getMonitoredRules',
	},
	...getMonitoredRules.description,
	...getMonitoredRuleData.description,
	...editMonitoredRulesAccess.description,
	...getPhasrRecommendations.description,
	...applyRecommendations.description,
	...getRecommendationProfiles.description,
	...getAllCompanyResources.description,
	...getAllCompanyIdentities.description,
	...takeRequestAccessAction.description,
];
