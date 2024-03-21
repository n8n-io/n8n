import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type { IDataObject, IWebhookFunctions, INodeExecutionData } from 'n8n-workflow';

export const getResponseCode = (parameters: IDataObject) => {
	if (parameters.responseCode) {
		return parameters.responseCode;
	}
	const { responseCode } = parameters.options as IDataObject;
	if (responseCode && (responseCode as IDataObject).values) {
		const { resposeCode, customCode } = (responseCode as IDataObject).values as IDataObject;

		if (customCode) {
			return customCode;
		}

		return resposeCode;
	}
	return 200;
};

export const getResponseData = (parameters: IDataObject) => {
	const { responseData, responseMode, options } = parameters;
	if (responseData) return responseData;

	if (responseMode === 'onReceived') {
		const data = (options as IDataObject)?.responseData as string;
		if (data) return data;
	}

	if ((options as IDataObject)?.noResponseBody) return 'noData';

	return undefined;
};

export const configuredOutputs = (parameters: IDataObject) => {
	const httpMethod = parameters.httpMethod as string;

	return [
		{
			type: `${NodeConnectionType.Main}`,
			displayName: httpMethod,
		},
	];
};

export const setupOutputConnection = (
	ctx: IWebhookFunctions,
	additionalData: {
		jwtPayload?: IDataObject;
	},
) => {
	let webhookUrl = ctx.getNodeWebhookUrl('default') as string;
	const executionMode = ctx.getMode() === 'manual' ? 'test' : 'production';

	if (executionMode === 'test') {
		webhookUrl = webhookUrl.replace('/webhook/', '/webhook-test/');
	}

	return (outputData: INodeExecutionData): INodeExecutionData[][] => {
		outputData.json.webhookUrl = webhookUrl;
		outputData.json.executionMode = executionMode;
		if (additionalData?.jwtPayload) {
			outputData.json.jwtPayload = additionalData.jwtPayload;
		}
		return [[outputData]];
	};
};

export const isIpWhitelisted = (
	whitelist: string | string[] | undefined,
	ips: string[],
	ip?: string,
) => {
	if (whitelist === undefined || whitelist === '') {
		return true;
	}

	if (!Array.isArray(whitelist)) {
		whitelist = whitelist.split(',').map((entry) => entry.trim());
	}

	for (const address of whitelist) {
		if (ip && ip.includes(address)) {
			return true;
		}

		if (ips.some((entry) => entry.includes(address))) {
			return true;
		}
	}

	return false;
};

export const checkResponseModeConfiguration = (context: IWebhookFunctions) => {
	const responseMode = context.getNodeParameter('responseMode', 'onReceived') as string;
	const connectedNodes = context.getConnectedNodes(context.getNode().name, 'children');

	const isRespondToWebhookConnected = connectedNodes.some(
		(node) => node.type === 'n8n-nodes-base.respondToWebhook',
	);

	if (!isRespondToWebhookConnected && responseMode === 'responseNode') {
		throw new NodeOperationError(
			context.getNode(),
			new Error('No Respond to Webhook node found in the workflow'),
			{
				description:
					'Insert a Respond to Webhook node to your workflow to respond to the webhook or choose another option for the “Respond” parameter',
			},
		);
	}

	if (isRespondToWebhookConnected && responseMode !== 'responseNode') {
		throw new NodeOperationError(
			context.getNode(),
			new Error('Webhook node not correctly configured'),
			{
				description:
					'Set the “Respond” parameter of the Webhook node to “Using Respond to Webhook Node” ',
			},
		);
	}
};
