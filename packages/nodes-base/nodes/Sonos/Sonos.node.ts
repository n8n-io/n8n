import { IHookFunctions } from 'n8n-core';
import {
    IExecuteFunctions,
} from 'n8n-core';

import {
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    ILoadOptionsFunctions,
    INodePropertyOptions,
    NodePropertyTypes
} from 'n8n-workflow';

import {
    OptionsWithUri,
} from 'request';

export class Sonos implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Sonos',
        name: 'sonos',
        icon: 'file:Sonos.svg',
        group: ['transform'],
        version: 1,
        description: 'Play alarms on your Sonos system.',
        defaults: {
            name: 'Sonos',
            color: '#1A82e2',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'sonosApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Household',
                name: 'household',
                type: 'options' as NodePropertyTypes,
                options: [],
                default: [],
                required: true,
                typeOptions: {
                    loadOptionsMethod: 'loadHouseholds'
                }
            },
            {
                displayName: 'Player',
                name: 'player',
                type: 'options' as NodePropertyTypes,
                options: [],
                default: [],
                required: true,
                typeOptions: {
                    loadOptionsMethod: 'loadPlayers',
                    loadOptionsDependsOn: [
                        'household',
                    ],
                }
            },
            {
                displayName: 'Volume',
                name: 'volume',
                type: 'number' as NodePropertyTypes,
                default: 50,
                required: true,
                typeOptions: {
                    maxValue: 100,
                    minValue: 1,
                    numberStepSize: 1
                }
            },
            {
                displayName: 'Soundfile',
                name: 'url',
                type: 'string' as NodePropertyTypes,
                default: 'http://www.moviesoundclips.net/effects/animals/wolf-howls.mp3',
                required: true,
            }
        ],
    };

    methods = {
		loadOptions: {
			async loadHouseholds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				let data;
				try {
					data = await callSonosApi.call(this, 'GET', '/households');
				} catch (err: any) {
                    if (err.message = "No credentials got returned!") {
                        return returnData;
                    }
					throw new Error(`SONOS Error: ${err}`);
				}

				for (const household of data.households!) {
					returnData.push({
						name: household.id as string,
						value: household.id as string,
					});
				}
				return returnData;
			},
            async loadPlayers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				let data;
				try {
		            const household = this.getNodeParameter('household', 0);
					data = await callSonosApi.call(this, 'GET', `/households//${household}/groups`);
				} catch (err: any) {
                    if (err.message = "No credentials got returned!") {
                        return returnData;
                    }
					throw new Error(`SONOS Error: ${err}`);
				}

				for (const player of data.players!) {
					returnData.push({
						name: player.name as string,
						value: player.id as string,
					});
				}
				return returnData;
			}
		},
	};

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const credentials = this.getCredentials('sonosApi');
        const returnData: IDataObject[] = [];
        try {
            if (credentials === undefined) {
                throw new Error('No credentials got returned!');
            }
            const player = this.getNodeParameter('player', 0);
            const options: OptionsWithUri = {
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'POST',
                body: JSON.stringify({
                    name: "n8n",
                    appId: "com.n8n.sonos",
                    streamUrl: this.getNodeParameter('url', 0),
                    clipType: "CUSTOM",
                    volume: this.getNodeParameter('volume', 0),
                }),
                uri: 'https://api.ws.sonos.com/control/api/v1/players/' + player + '/audioClip',
            };
            await this.helpers.requestOAuth2.call(this, 'sonosApi', options);
            returnData.push({message: 'ok'});
        } catch (error: any) {
            if (this.continueOnFail()) {
                returnData.push({ error: error.message });
            } else {
                throw error;
            }
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}

async function callSonosApi(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, path: string): Promise<any> {
    const credentials = this.getCredentials('sonosApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

    const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		uri: 'https://api.ws.sonos.com/control/api/v1/' + path,
	};

    //@ts-ignore
    return JSON.parse(await this.helpers.requestOAuth2.call(this, 'sonosApi', options));
}