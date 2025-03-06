import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

import { utopianLabsApiRequest } from './GenericFunctions';
import { writeSequenceLeadFields } from './WriteSequenceLeadDescription';
import { qualifyLeadFields } from './QualifyLeadDescription';
import { researchLeadFields } from './ResearchLeadDescription';
import { classifyLeadFields } from './ClassifyLeadDescription';
import { timingLeadFields } from './TimingLeadDescription';
import { writeEmailLeadFields } from './WriteEmailLeadDescription';
import { additionalFields, commonFields } from './CommonFields';
import { operations } from './OperationsDescription';
import { emailDomainBlockList } from './Constants';

export class UtopianLabs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Utopian Labs',
		name: 'utopianLabs',
		icon: 'file:utopianLabs.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Use Utopian Labs AI to research and engage with leads',
		defaults: {
			name: 'Utopian Labs',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'utopianLabsApi',
				required: true,
			},
		],
		properties: [
			// Single operation selector
			operations,

			// Common fields
			...commonFields,

			// All operation-specific fields
			...researchLeadFields,
			...qualifyLeadFields,
			...timingLeadFields,
			...classifyLeadFields,
			...writeEmailLeadFields,
			...writeSequenceLeadFields,

			// Additional fields
			...additionalFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let responseData;

		const workflow = this.getWorkflow();

		// Check if this is a test run
		const isTestRun = !workflow.active;

		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				// Common parameters for all operations
				const leadCompanyWebsite = this.getNodeParameter('leadCompanyWebsite', i) as string;
				const agent = this.getNodeParameter('agent', i) as string;
				const n8nCallbackUrl = this.getNodeParameter('n8nCallbackUrl', i) as string;

				//additional fields
				const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

				// Validate email if provided
				if (additionalFields.leadEmail) {
					const email = additionalFields.leadEmail as string;
					const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
					if (email && !emailRegex.test(email)) {
						throw new NodeOperationError(this.getNode(), 'Invalid email address', {
							description: `The email address '${email}' isn't valid`,
							itemIndex: i,
						});
					}

					//validate email domain
					const emailDomain = email.split('@')[1];
					const domainBase = emailDomain.split('.')[0];
					if (emailDomainBlockList.includes(domainBase)) {
						throw new NodeOperationError(this.getNode(), 'Invalid email domain', {
							description: `The email domain '${emailDomain}' isn't valid`,
							itemIndex: i,
						});
					}
				}

				//validate company website
				if (leadCompanyWebsite) {
					const urlRegex =
						/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
					if (!urlRegex.test(leadCompanyWebsite)) {
						throw new NodeOperationError(this.getNode(), 'Invalid website URL', {
							description: `The website URL '${leadCompanyWebsite}' isn't valid`,
							itemIndex: i,
						});
					}
				}

				// check if lead full name is provided if any other lead person fields are populated
				if (
					additionalFields.leadEmail ||
					additionalFields.leadLinkedIn ||
					additionalFields.leadJobTitle
				) {
					if (!additionalFields.leadFullName) {
						throw new NodeOperationError(this.getNode(), 'Lead full name is required', {
							description:
								'The lead full name is required when any other lead information is provided',
							itemIndex: i,
						});
					}
				}

				// Prepare the request body with common fields
				const body: IDataObject = {
					operation, // Include the operation in the request body
					leadCompanyWebsite,
					agent,
					n8nCallbackUrl,
					isTestRun,
					...additionalFields,
				};

				// Add operation-specific parameters
				if (operation === 'writeEmail' || operation === 'writeEmailSequence') {
					body.language = this.getNodeParameter('language', i) as string;
				}

				if (operation === 'writeEmailSequence') {
					body.numOfSequenceSteps = this.getNodeParameter('numOfSequenceSteps', i) as number;
				}

				if (operation === 'categorizeLead') {
					// Only add parameters to body if they exist and have values
					const classificationNameOne = this.getNodeParameter(
						'classificationNameOne',
						i,
						'',
					) as string;
					if (classificationNameOne) body.classificationNameOne = classificationNameOne;

					const classificationDescriptionOne = this.getNodeParameter(
						'classificationDescriptionOne',
						i,
						'',
					) as string;
					if (classificationDescriptionOne)
						body.classificationDescriptionOne = classificationDescriptionOne;

					const classificationNameTwo = this.getNodeParameter(
						'classificationNameTwo',
						i,
						'',
					) as string;
					if (classificationNameTwo) body.classificationNameTwo = classificationNameTwo;

					const classificationDescriptionTwo = this.getNodeParameter(
						'classificationDescriptionTwo',
						i,
						'',
					) as string;
					if (classificationDescriptionTwo)
						body.classificationDescriptionTwo = classificationDescriptionTwo;

					const classificationNameThree = this.getNodeParameter(
						'classificationNameThree',
						i,
						'',
					) as string;
					if (classificationNameThree) body.classificationNameThree = classificationNameThree;

					const classificationDescriptionThree = this.getNodeParameter(
						'classificationDescriptionThree',
						i,
						'',
					) as string;
					if (classificationDescriptionThree)
						body.classificationDescriptionThree = classificationDescriptionThree;

					const classificationNameFour = this.getNodeParameter(
						'classificationNameFour',
						i,
						'',
					) as string;
					if (classificationNameFour) body.classificationNameFour = classificationNameFour;

					const classificationDescriptionFour = this.getNodeParameter(
						'classificationDescriptionFour',
						i,
						'',
					) as string;
					if (classificationDescriptionFour)
						body.classificationDescriptionFour = classificationDescriptionFour;

					const classificationNameFive = this.getNodeParameter(
						'classificationNameFive',
						i,
						'',
					) as string;
					if (classificationNameFive) body.classificationNameFive = classificationNameFive;

					const classificationDescriptionFive = this.getNodeParameter(
						'classificationDescriptionFive',
						i,
						'',
					) as string;
					if (classificationDescriptionFive)
						body.classificationDescriptionFive = classificationDescriptionFive;
				}

				// All operations use the same endpoint
				const endpoint = '/v1/n8n/runs';

				// Make the API request
				responseData = await utopianLabsApiRequest.call(this, 'POST', endpoint, body);

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
