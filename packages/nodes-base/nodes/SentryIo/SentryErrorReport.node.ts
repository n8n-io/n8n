import {IExecuteFunctions,} from 'n8n-core';

import {
	GenericValue,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';


const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
import { Severity, Transaction } from '@sentry/types';
import { RewriteFrames } from "@sentry/integrations";

export class SentryErrorReport implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sentry.io Error Report',
		name: 'sentryIoErrorReport',
		icon: 'file:sentryio.svg',
		group: ['output'],
		version: 1,
		description: 'Report Error into Sentry.io',
		defaults: {
			name: 'Sentry.io Error Report',
			color: '#362d59',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items:IDataObject[] = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;

		
		Sentry.init({
			dsn: "http://59131fb3409749e5a6feba4e57b2d2b7@sentry.cgpo2o.cn/3",
			tracesSampleRate: 1.0,
			integrations: [
				new RewriteFrames({
					root: global.__dirname,
				}),
			],
		});

		const transaction = Sentry.startTransaction({ // @ts-ignore
			op: items[0].json.execution.lastNodeExecuted, // @ts-ignore
			name: items[0].json.workflow.name,
		});

		//@ts-ignore
		Sentry.configureScope(scope => {
			scope.setSpan(transaction);
		});

		// @ts-ignore
		const id = Sentry.captureException(items[0].json);
		transaction.finish();
		return [this.helpers.returnJsonArray([])];
	};
};
