import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

import * as mqtt from 'mqtt';

import {
	IClientOptions,
} from 'mqtt';

export class MqttTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mqtt Trigger',
    name: 'mqttTrigger',
    icon: 'file:mqtt.png',
		group: ['trigger'],
		version: 1,
		description: 'Listens to MQTT events',
		defaults: {
			name: 'Mqtt Trigger',
			color: '#00FF00',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [{
			name: 'mqtt',
			required: true,
		}],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Topics',
				name: 'topics',
				type: 'string',
				default: '',
				description: `Topics to subscribe to, multiple can be defined with comma.<br/>
				wildcard characters are supported (+ - for single level and # - for multi level)`,
			},
		]
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {

		const credentials = this.getCredentials('mqtt');
		if (!credentials) {
		  throw new Error('Credentials are mandatory!');
		}

		const topics = (this.getNodeParameter('topics') as string).split(',');
		if (!topics) {
			throw new Error('Topics are mandatory!');
		}

		const protocol = credentials.protocol as string || 'mqtt';
    const host = credentials.host as string || 'localhost';
    const brokerUrl = `${protocol}://${host}`
		const port = credentials.port as number || 1883;

		const clientOptions: IClientOptions = {
			port,
		};

		if (credentials.username && credentials.password) {
			clientOptions.username = credentials.username as string;
			clientOptions.password = credentials.password as string;
		}

		const container = mqtt.connect(`${brokerUrl}`, clientOptions);

		const self = this;

    container.on('connect', () => {
      
      container.subscribe(topics, (err: Error) => {
        console.log(`MQTT Node Connected : ${brokerUrl}`);
				if (!err) {
					console.log(`MQTT Node Subscription Success : ${topics}`);
				} else {
					console.log(`MQTT Node Subscription Fail : ${topics} (${err.toString()})`);
				}
			});
		});
		
		container.on('message', (topic: string, message: Buffer) => { // tslint:disable-line:no-any
			self.emit([self.helpers.returnJsonArray([{ message: message.toString(), topic }])]);
			console.log(`MQTT Node Message (${topic}) : ${message.toString()}`);
		});


		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
			container.end();
		}

		return {
			closeFunction,
		};

	}
}
