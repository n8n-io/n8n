import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { versionDescription } from './actions/versionDescription';
import { loadOptions, validateCredentials } from './methods'
import { router } from './actions/router';

export class MailerSendV1 implements INodeType {

	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		}
	}

	methods = {
		loadOptions,
		credentialTest: validateCredentials
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
