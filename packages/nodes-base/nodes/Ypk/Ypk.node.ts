import {
	IExecuteFunctions, IHookFunctions
} from 'n8n-core';

import {
	IDataObject, ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import {
	OptionsWithUri
} from 'request';
import { ypkApiRequest } from './GenericFunctions';
import { learnerFields, learnerOperations } from './Learner';
import { speakerFields, speakerOperations } from './Speaker';
import { trainingFields, trainingOperations } from './Training';
import { trainingSessionFields, trainingSessionOperations } from './TrainingSession';
import { speakersTrainingSessionFields, speakersTrainingSessionOperations } from './SpeakersTrainingSession';
import { learnersTrainingSessionFields, learnersTrainingSessionOperations } from './LearnersTrainingSession';
import { speakersTrainingModuleFields, speakersTrainingModuleOperations } from './SpeakersTrainingModule';
import { contactFields, contactOperations } from './Contact';
import { companyFields, companyOperations } from './Company';
import { annexCostFields, annexCostOperations } from "./AnnexCost";

interface YpkSettingType {
	id: string;
	name: string;
}

export class Ypk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'YPK by Hop3team',
		name: 'ypk',
		icon: 'file:ypk.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume YPK API',
		defaults: {
			name: 'YPK',
			color: '#1A82e2',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ypkApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Apprenant',
						value: 'learner',
					},
					{
						name: 'Cout Annexe',
						value: 'annexCost',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Company',
						value: 'company',
					},
					{
						name: 'Formateur',
						value: 'speaker',
					},
          {
						name: 'Referents',
						value: 'referent',
					},
					{
						name: 'Formation',
						value: 'training',
					},
					{
						name: 'Session',
						value: 'trainingSession',
					},
					{
						name: 'SpeakersTrainingSession',
						value: 'speakersTrainingSession',
					},
					{
						name: 'LearnersTrainingSession',
						value: 'learnersTrainingSession',
					},
					{
						name: 'SpeakersTrainingModule',
						value: 'speakersTrainingModule',
					},
				],
				default: 'learner',
				required: true,
				description: 'Resource to consume',
			},

			// Operations
			...annexCostOperations,
			...contactOperations,
			...companyOperations,
			...learnerOperations,
			...learnersTrainingSessionOperations,
			...trainingOperations,
			...trainingSessionOperations,
			...speakersTrainingSessionOperations,
			...speakersTrainingModuleOperations,
			...speakerOperations,

			// Fields
			...annexCostFields,
			...contactFields,
			...companyFields,
			...learnerFields,
			...learnersTrainingSessionFields,
			...trainingFields,
			...trainingSessionFields,
			...speakersTrainingSessionFields,
			...speakersTrainingModuleFields,
			...speakerFields,
		],
	};

	methods = {
		loadOptions: {
			async getSessionLocationsOptions(this: ILoadOptionsFunctions) {
				const sessionLocations = await ypkApiRequest.call(this, 'GET', 'settings/session_locations', {}, {});
				return sessionLocations.map((sessionLocation: YpkSettingType) => ({
					name: sessionLocation.name,
					value: sessionLocation.id,
				}));
			},
			async getLearningModesOptions(this: ILoadOptionsFunctions) {
				const learningModes = await ypkApiRequest.call(this, 'GET', 'settings/learning_modes', {}, {});
				return learningModes.map((learningMode: YpkSettingType) => ({
					name: learningMode.name,
					value: learningMode.id,
				}));
			},
			async getContactStatusesOptions(this: ILoadOptionsFunctions) {
				const contactStatuses = await ypkApiRequest.call(this, 'GET', 'settings/contact_statuses', {}, {});
				return contactStatuses.map((contactStatus: YpkSettingType) => ({
					name: contactStatus.name,
					value: contactStatus.id,
				}));
			},
			async getSpeakerStatusesOptions(this: ILoadOptionsFunctions) {
				const speakerStatuses = await ypkApiRequest.call(this, 'GET', 'settings/speaker_status', {}, {});
				return speakerStatuses.map((speakerStatus: YpkSettingType) => ({
					name: speakerStatus.name,
					value: speakerStatus.id,
				}));
			},
		},
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		// @ts-ignore
		let returnData = [];
		let responseData;
		let body: IDataObject = {};
		const qs: IDataObject = {};

		let method = 'GET';
		let endpoint = '';
		let dataKey = undefined;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		//Get credentials the user provided for this node
		for (let i = 0; i < items.length; i++) {

			if (resource === 'learnersTrainingSession') {
				endpoint = 'learners_training_sessions';
				const id = this.getNodeParameter('id', i, '') as string;
				const comment = this.getNodeParameter('comment', i, '') as string;
				body = { learners_training_session: { comment } };

				if (operation === 'update') {
					endpoint = `learners_training_sessions/${id}`;
					dataKey = 'learners_training_session';
					method = 'PATCH';
				}
				if (operation === 'get') {
					endpoint = `learners_training_sessions/${id}`;
					dataKey = 'learners_training_session';
					method = 'GET';
				}
				if (operation === 'getAll') {
					const trainingSessionId = this.getNodeParameter('training_session_id', i) as string;

					endpoint = `training_session/${trainingSessionId}/learners_training_sessions`;
					dataKey = 'learners_training_sessions';
					method = 'GET';
				}
			}

			if (resource === 'learner') {
				endpoint = 'learners';
				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
				const firstName = this.getNodeParameter('first_name', i, '') as string;
				const lastName = this.getNodeParameter('last_name', i, '') as string;
				const id = this.getNodeParameter('id', i, '') as string;
				const { street,additional, zip_code, city, country, company_id } = additionalFields;
				body = { learner: { first_name: firstName,last_name: lastName, address_attributes: { street, additional, zip_code, city, country }, profile_attributes: {}, ...additionalFields, company_ids: [company_id], } };

				if (operation === 'create') {
					// get email input
					dataKey = 'learner';
					method = 'POST';
				}
				if (operation === 'update') {
					endpoint = `learners/${id}`;
					dataKey = 'learner';
					method = 'PATCH';
				}
				if (operation === 'delete') {
					endpoint = `learners/${id}`;
					dataKey = 'learner';
					method = 'DELETE';
				}
				if (operation === 'get') {
					endpoint = `learners/${id}`;
					dataKey = 'learner';
					method = 'GET';
				}
				if (operation === 'getAll') {
					const { search_lastname, search_firstname, search_email } = this.getNodeParameter('filters', i, {}) as IDataObject;

					endpoint = `learners`;
					qs['q[last_name_cont]'] = search_lastname;
					qs['q[first_name_cont]'] = search_firstname;
					qs['q[email_cont]'] = search_email;
					dataKey = 'learners';
					method = 'GET';
				}
			}

			if (resource === 'company') {
				endpoint = 'companies';
				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
				const name = this.getNodeParameter('name', i, '') as string;
				const id = this.getNodeParameter('id', i, '') as string;
				const { street, zip_code, city, country, referent_first_name, referent_last_name, referent_phone, referent_email, referent_position } = additionalFields;
				body = { company: { name, address_attributes: { street, zip_code, city, country, }, referent_attributes: { first_name: referent_first_name, last_name: referent_last_name, phone: referent_phone, email: referent_email, position: referent_position },  ...additionalFields }};

				if (operation === 'create') {
					// get email input
					dataKey = 'company';
					method = 'POST';
				}
				if (operation === 'update') {
					endpoint = `companies/${id}`;
					dataKey = 'company';
					method = 'PATCH';
				}
				if (operation === 'delete') {
					endpoint = `companies/${id}`;
					dataKey = 'company';
					method = 'DELETE';
				}
				if (operation === 'get') {
					endpoint = `companies/${id}`;
					dataKey = 'company';
					method = 'GET';
				}
				if (operation === 'getAll') {
					const { search_lastname, search_email } = this.getNodeParameter('filters', i, {}) as IDataObject;

					endpoint = `companies`;
					qs['q[last_name_cont]'] = search_lastname;
					qs['q[email_cont]'] = search_email;
					dataKey = 'companies';
					method = 'GET';
				}
			}

			if (resource === 'contact') {
				endpoint = 'contacts';
				const id = this.getNodeParameter('id', i, '') as string;

				if (operation === 'create') {
					const trainingSessionId = this.getNodeParameter('training_session_id', i, '') as string;
					const contactStatusId = this.getNodeParameter('contact_status_id', i, '') as string;
					const contactableId = this.getNodeParameter('contactable_id', i, '') as string;
					const contactableType = this.getNodeParameter('contactable_type', i, '') as string;


					body = { contact: { training_session_id: trainingSessionId, contact_status_id: contactStatusId, contactable_id: contactableId, contactable_type: contactableType } };

					// get email input
					dataKey = 'contact';
					method = 'POST';
				}
				if (operation === 'update') {
					endpoint = `contacts/${id}`;
					dataKey = 'contact';
					method = 'PATCH';
				}
				if (operation === 'delete') {
					endpoint = `contacts/${id}`;
					dataKey = 'contact';
					method = 'DELETE';
				}
				if (operation === 'get') {
					endpoint = `contacts/${id}`;
					dataKey = 'contact';
					method = 'GET';
				}
				if (operation === 'getAll') {
					const trainingSessionId = this.getNodeParameter('training_session_id', i) as string;

					endpoint = `training_sessions/${trainingSessionId}/contacts`;
					dataKey = 'contacts';
					method = 'GET';
				}
			}

			if (resource === 'speaker') {
				endpoint = 'speakers';
				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
				const firstName = this.getNodeParameter('first_name', i, '') as string;
				const lastName = this.getNodeParameter('last_name', i, '') as string;
				const id = this.getNodeParameter('id', i, '') as string;
				const { street,additional, zip_code, city, country } = additionalFields;
				body = { speaker: { first_name: firstName,last_name: lastName, address_attributes: { street,additional, zip_code, city, country }, profile_attributes: {}, ...additionalFields } };

				if (operation === 'create') {
					dataKey = 'speaker';
					method = 'POST';
				}
				if (operation === 'update') {
					endpoint = `speakers/${id}`;
					dataKey = 'speaker';
					method = 'PATCH';
				}
				if (operation === 'delete') {
					endpoint = `speakers/${id}`;
					dataKey = 'speaker';
					method = 'DELETE';
				}
				if (operation === 'get') {
					endpoint = `speakers/${id}`;
					dataKey = 'speaker';
					method = 'GET';
				}
				if (operation === 'getAll') {
					const { search_by_firstname, search_by_lastname } = this.getNodeParameter('filters', i, {}) as IDataObject;

					endpoint = `speakers`;
					qs['q[first_name_cont]'] = search_by_firstname;
					qs['q[last_name_cont]'] = search_by_lastname;
					dataKey = 'speakers';
					method = 'GET';
				}
			}

			if (resource === 'training') {
				endpoint = 'trainings';
				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
				const { ...fields } = additionalFields;
				const id = this.getNodeParameter('id', i, '') as string;
				body = { training: { ...fields } };

				if (operation === 'create') {
					// get email input
					dataKey = 'training';
					method = 'POST';
				}
				if (operation === 'update') {
					endpoint = `trainings/${id}`;
					dataKey = 'training';
					method = 'PATCH';
				}
				if (operation === 'delete') {
					endpoint = `trainings/${id}`;
					dataKey = 'training';
					method = 'DELETE';
				}
				if (operation === 'get') {
					endpoint = `trainings/${id}`;
					dataKey = 'training';
					method = 'GET';
				}
				if (operation === 'getAll') {
					const { searchByName, searchByReference } = this.getNodeParameter('filters', i, {}) as IDataObject;

					endpoint = `trainings`;
					qs['q[name_cont]'] = searchByName;
					qs['q[reference_cont]'] = searchByReference;
					dataKey = 'trainings';
					method = 'GET';
				}
			}

			if (resource === 'trainingSession') {
				endpoint = 'training_sessions';
				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
				const id = this.getNodeParameter('id', i, '') as string;
				body = { training_session: { ...additionalFields } };

				if (operation === 'create') {
					// get email input
					dataKey = 'training_session';
					method = 'POST';
				}
				if (operation === 'update') {
					endpoint = `training_sessions/${id}`;
					dataKey = 'training_session';
					method = 'PATCH';
				}
				if (operation === 'delete') {
					endpoint = `training_sessions/${id}`;
					dataKey = 'training_session';
					method = 'DELETE';
				}
				if (operation === 'get') {
					endpoint = `training_sessions/${id}`;
					dataKey = 'training_session';
					method = 'GET';
				}
				if (operation === 'getAll') {
					const { search } = this.getNodeParameter('filters', i, {}) as IDataObject;

					endpoint = `training_sessions`;
					qs['q[name_or_code_cont]'] = search;
					dataKey = 'training_sessions';
					method = 'GET';
				}
			}

			if (resource === 'speakersTrainingSession') {
				endpoint = 'speakers_training_sessions';
				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
				const trainingSessionId = this.getNodeParameter('training_session_id', i, '') as string;
				const speakerId = this.getNodeParameter('speaker_id', i, '') as string;
				const id = this.getNodeParameter('id', i, '') as string;
				const { ...fields } = additionalFields;
				body = { speakers_training_session: { training_session_id: trainingSessionId, speaker_id: speakerId, ...fields } };

				if (operation === 'create') {
					// get email input
					dataKey = 'speakers_training_session';
					method = 'POST';
				}
				if (operation === 'update') {
					endpoint = `speakers_training_sessions/${id}`;
					dataKey = 'speakers_training_session';
					method = 'PATCH';
				}
				if (operation === 'delete') {
					endpoint = `speakers_training_sessions/${id}`;
					dataKey = 'speakers_training_session';
					method = 'DELETE';
				}
				if (operation === 'get') {
					endpoint = `speakers_training_sessions/${id}`;
					dataKey = 'speakers_training_session';
					method = 'GET';
				}
				if (operation === 'getAll') {
					const { training_session_id } = this.getNodeParameter('filters', i, {}) as IDataObject;

					endpoint = `training_sessions/${training_session_id}/speakers_training_sessions`;
					dataKey = 'speakers_training_sessions';
					method = 'GET';
				}
			}

			if (resource === 'speakersTrainingModule') {
				endpoint = 'speakers_training_modules';
				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
				const id = this.getNodeParameter('id', i, '') as string;
				const { ...fields } = additionalFields;
				body = { speakers_training_session: { ...fields } };

				if (operation === 'create') {
					// get email input
					dataKey = 'speakers_training_module';
					method = 'POST';
				}
				if (operation === 'update') {
					endpoint = `speakers_training_modules/${id}`;
					dataKey = 'speakers_training_module';
					method = 'PATCH';
				}
				if (operation === 'delete') {
					endpoint = `speakers_training_modules/${id}`;
					dataKey = 'speakers_training_module';
					method = 'DELETE';
				}
				if (operation === 'get') {
					endpoint = `speakers_training_modules/${id}`;
					dataKey = 'speakers_training_session';
					method = 'GET';
				}
				if (operation === 'getAll') {
					const trainingSessionId = this.getNodeParameter('training_session_id', i, "") as string;

					endpoint = `training_sessions/${trainingSessionId}/speakers_training_modules`;
					dataKey = 'speakers_training_modules';
					method = 'GET';
				}
			}

			if (resource === 'annexCost') {
				endpoint = 'annex_costs';
				const trainingSessionId = this.getNodeParameter('training_session_id', i, '') as string;
				const type = this.getNodeParameter('type', i, '') as string;
				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
				const id = this.getNodeParameter('id', i, '') as string;
				body = { annex_cost: { ...additionalFields } };

				if (operation === 'create') {
					endpoint = `training_sessions/${trainingSessionId}/annex_costs/${type}`;
					dataKey = 'annex_cost';
					method = 'POST';
				}
				if (operation === 'update') {
					endpoint = `annex_costs/${id}`;
					dataKey = 'annex_cost';
					method = 'PATCH';
				}
				if (operation === 'delete') {
					endpoint = `annex_costs/${id}`;
					dataKey = 'annex_cost';
					method = 'DELETE';
				}
				if (operation === 'getAll') {
					endpoint = `training_sessions/${trainingSessionId}/annex_costs`;
					dataKey = 'annex_costs';
					method = 'GET';
				}
			}

			responseData = await ypkApiRequest.call(this, method, endpoint, body, qs);

				// Map data to n8n data
			if (dataKey !== undefined) responseData = responseData[dataKey];
			if (Array.isArray(responseData)) {
				// @ts-ignore
				returnData = returnData.concat(responseData);
			} else {
				returnData.push(responseData);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
