import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from "n8n-core";
import { OptionsWithUri } from "request";
import { INodePropertyOptions } from "n8n-workflow";

export async function playAudioClip(this: IExecuteFunctions): Promise<void> {
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
}

export async function groupAll(this: IExecuteFunctions): Promise<void> {
    const household = this.getNodeParameter('household', 0);
    const players = await loadPlayers.call(this);
    const playerIds = players.map(player => player.value);
    const options: OptionsWithUri = {
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
            playerIds,
        }),
        uri: 'https://api.ws.sonos.com/control/api/v1/households/' + household + '/groups/createGroup',
    };
    await this.helpers.requestOAuth2.call(this, 'sonosApi', options);
}

export async function executeGroupAction(this: IExecuteFunctions, action: string): Promise<void> {
    const firstGroupId = await getFirstGroup.call(this);
    const options: OptionsWithUri = {
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        uri: 'https://api.ws.sonos.com/control/api/v1/groups/' + firstGroupId + '/playback/' + action,
    };
    await this.helpers.requestOAuth2.call(this, 'sonosApi', options);
}

export async function playFavorite(this: IExecuteFunctions): Promise<void> {
    const firstGroupId = await getFirstGroup.call(this);
    const options: OptionsWithUri = {
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: "replace",
            playOnCompletion: true,
            favoriteId: this.getNodeParameter("favorite", 0),
            playModes: {
                shuffle: this.getNodeParameter("shuffle", 0),
                repeat: this.getNodeParameter("repeat", 0),
                crossfade: this.getNodeParameter("crossfade", 0),
            }
        }),
        method: 'POST',
        uri: 'https://api.ws.sonos.com/control/api/v1/groups/' + firstGroupId + '/favorites',
    };
    await this.helpers.requestOAuth2.call(this, 'sonosApi', options);
}

export async function setGroupVolume(this: IExecuteFunctions): Promise<void> {
    const firstGroupId = await getFirstGroup.call(this);
    const options: OptionsWithUri = {
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            volume: this.getNodeParameter("volume", 0),
        }),
        method: 'POST',
        uri: 'https://api.ws.sonos.com/control/api/v1/groups/' + firstGroupId + '/groupVolume',
    };
    await this.helpers.requestOAuth2.call(this, 'sonosApi', options);
}

export async function callSonosApi(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, path: string): Promise<any> {
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

export async function loadPlayers(this: ILoadOptionsFunctions | IExecuteFunctions): Promise<INodePropertyOptions[]> {
    const returnData: INodePropertyOptions[] = [];

    let data;
    try {
        const household = this.getNodeParameter('household', 0);
        data = await callSonosApi.call(this, 'GET', `/households/${household}/groups`);
    } catch (err: any) {
        if (err.message === "No credentials got returned!") {
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

export async function getFirstGroup(this: ILoadOptionsFunctions | IExecuteFunctions): Promise<string> {
    let data;
    try {
        const household = this.getNodeParameter('household', 0);
        data = await callSonosApi.call(this, 'GET', `/households//${household}/groups`);
    } catch (err: any) {
        throw new Error(`SONOS Error: ${err}`);
    }

    return data.groups[0].id;
}

export async function loadHouseholds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    const returnData: INodePropertyOptions[] = [];

    let data;
    try {
        data = await callSonosApi.call(this, 'GET', '/households');
    } catch (err: any) {
        if (err.message === "No credentials got returned!") {
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
}

export async function loadFavorites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    const returnData: INodePropertyOptions[] = [];
    const household = this.getNodeParameter('household', 0);

    let data;
    try {
        data = await callSonosApi.call(this, 'GET', '/households/' + household + '/favorites');
    } catch (err: any) {
        if (err.message === "No credentials got returned!") {
            return returnData;
        }
        throw new Error(`SONOS Error: ${err}`);
    }

    for (const favorite of data.items!) {
        returnData.push({
            name: favorite.name as string,
            description: favorite.description as string,
            value: favorite.id as string,
        });
    }
    return returnData;
}