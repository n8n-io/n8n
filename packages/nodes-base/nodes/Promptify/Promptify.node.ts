/* eslint-disable n8n-nodes-base/node-param-description-missing-from-dynamic-options */
/* eslint-disable n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options */
import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	ResourceMapperValue,
} from 'n8n-workflow';
import { getTemplates, getInputs } from './GenericFunctions';
import { Templates } from './types';
import { EventSourceMessage, fetchEventSource } from '@fortaine/fetch-event-source';

export class Promptify implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Promptify',
		name: 'promptify',
		group: ['transform'],
		version: 1,
		description: 'Basic Promptify Node',
		icon: 'file:promptify.svg',
		defaults: {
			name: 'Promptify',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'promptifyApi',
				required: true,
			},
		],
		documentationUrl: 'https://github.com/ysfbsf/promptify-n8n/blob/main/README.md',
		properties: [
			{
				displayName: 'Templates',
				name: 'template',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getTemplates'
				},
				required: true
			},
			{
				displayName: 'Inputs',
				name: 'inputs',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['template'],
					resourceMapper: {
						resourceMapperMethod: 'getInputs',
						mode: 'update',
						fieldWords: {
							singular: 'input',
							plural: 'inputs',
						},
						addAllFields: true,
						multiKeyMatch: true,
					},
				},
			},
		],
	};


	methods = {
		loadOptions: {
			getTemplates
		},
		resourceMapping: {
			getInputs
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const templateId = this.getNodeParameter('template', 0) as string;
		const inputs = this.getNodeParameter('inputs', 0) as ResourceMapperValue;

		const values = inputs.value || {};
		const requiredInvalid = inputs.schema.filter(field => field.required && !(field.id in values));
		if (requiredInvalid.length > 0) {
			const invalids = requiredInvalid.map(field => field.displayName).join(", ");
			throw Error(`Enter or map all required fields: ${invalids}`);
		}

		let generatedContent: string = "";

		const options = {
			method: "GET",
			headers: {
				"x-lf-source": "n8n"
			},
			uri: `https://promptify.adtitan.io/api/meta/templates/${templateId}`,
			json: true
		};
		const template: Templates = await this.helpers.requestWithAuthentication.call(this, 'promptifyApi', options);
		const inputsData = template.prompts?.map(prompt => ({
			prompt: prompt.id,
			contextual_overrides: [],
			prompt_params: inputs.value
		}))

		const credentials = await this.getCredentials('promptifyApi')

		await fetchEventSource(`https://promptify.adtitan.io/api/meta/templates/${templateId}/execute/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${credentials.apiToken as string}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inputsData),
			onopen: async (res: Response) => {
        if (res.ok && res.status === 200) {
          this.logger.info(`[SPARK_GENERATE]: ${template.title}`)
        } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw Error(res.statusText);
        }
			},
			onmessage: (event: EventSourceMessage) => {
				let message = "";
				let prompt = "";
				try {
          const eventData = JSON.parse(event.data.replace(/'/g, '"'));
					message = eventData.message;
					prompt = eventData.prompt_id;
				} catch {
					this.logger.warn(`Error parsing event data: ${event.data}`);
				}

				if (message?.includes("[ERROR]")) {
					const err = message.replace("[ERROR]", "");
					this.logger.error(`[SPARK_ERROR]: ${err}`)
					throw Error(err);
				}

				if (event.event === "infer" && event.data) {
					generatedContent += message || "";

				} else {
					if (message === "[INITIALIZING]") {
						this.logger.info(`[SPARK_PROMPT_INIT]: ${prompt}`)
					}

					if (message === "[C OMPLETED]" || message === "[COMPLETED]") {
						this.logger.info(`[SPARK_PROMPT_COMPLETED]: ${prompt}`)
					}
				}
			},
			onerror: (err) => {
				this.logger.error(`[SPARK_ERROR]: ${err}`)
				throw Error("Server issue, Please try again");
			}
		})

		const promptifyGenerated = {
			template: {
				slug: template.slug,
				title: template.title,
				description: template.description,
			},
			content: generatedContent
		}
		return this.prepareOutputData([{
			json: promptifyGenerated
		}]);
	}
}
