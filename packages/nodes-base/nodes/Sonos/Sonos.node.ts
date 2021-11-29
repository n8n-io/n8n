import {
    IExecuteFunctions,
} from 'n8n-core';

import {
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodePropertyTypes
} from 'n8n-workflow';
import { executeGroupAction, groupAll, groupVolume, playAudioClip, playFavorite, loadPlayers, loadHouseholds, loadFavorites } from './GenericFunctions';

export class Sonos implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Sonos',
        name: 'sonos',
        icon: 'file:Sonos.svg',
        group: ['output'],
        version: 1,
        description: 'Control your Sonos system.',
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
                default: "",
                required: true,
                typeOptions: {
                    loadOptionsMethod: 'loadHouseholds'
                }
            },
            {
                displayName: 'Action',
                name: 'action',
                type: 'options' as NodePropertyTypes,
                options: [
                    {name: "Play Audio Clip", value: "playAudioClip", description: "Plays an audio file from a URL on one of your players."},
                    {name: "Play", value: "play", description: "Starts the music on the first group found in your Sonos system."},
                    {name: "Play Favorite", value: "playFavorite", description: "Loads a Sonos favorite and plays it on the first group found in your Sonos system."},
                    {name: "Pause", value: "pause", description: "Stops the music on the first group found in your Sonos system."},
                    {name: "Toggle Play/Pause", value: "togglePlayPause", description: "Toggles the music on the first group found in your Sonos system."},
                    {name: "Skip Song", value: "skipToNextTrack", description: "Skips the song on the first group found in your Sonos system."},
                    {name: "Previous Song", value: "skipToPreviousTrack", description: "Jumps to previous song on the first group found in your Sonos system."},
                    {name: "Group All Players", value: "groupAll", description: "Groups all players in your system."},
                    {name: "Set Group Volume", value: "groupVolume", description: "Sets the volume of the first group in your system."},
                ],
                default: "",
                required: true,
            },
            {
                displayName: 'Player',
                name: 'player',
                type: 'options' as NodePropertyTypes,
                options: [],
                default: "",
                required: true,
                displayOptions: {
                    show: {
                        action: [
                            'playAudioClip',
                        ],
                    },
                },
                typeOptions: {
                    loadOptionsMethod: 'loadPlayers',
                    loadOptionsDependsOn: [
                        'household',
                    ],
                }
            },
            {
                displayName: 'Favorite',
                name: 'favorite',
                type: 'options' as NodePropertyTypes,
                options: [],
                default: "",
                required: true,
                displayOptions: {
                    show: {
                        action: [
                            'playFavorite',
                        ],
                    },
                },
                typeOptions: {
                    loadOptionsMethod: 'loadFavorites',
                    loadOptionsDependsOn: [
                        'household',
                    ],
                }
            },
            {
                displayName: 'Shuffe',
                name: 'shuffle',
                type: 'boolean' as NodePropertyTypes,
                default: true,
                required: true,
                displayOptions: {
                    show: {
                        action: [
                            'playFavorite',
                        ],
                    },
                },
            },
            {
                displayName: 'Repeat',
                name: 'repeat',
                type: 'boolean' as NodePropertyTypes,
                default: true,
                required: true,
                displayOptions: {
                    show: {
                        action: [
                            'playFavorite',
                        ],
                    },
                },
            },
            {
                displayName: 'Crossfade',
                name: 'crossfade',
                type: 'boolean' as NodePropertyTypes,
                default: true,
                required: true,
                displayOptions: {
                    show: {
                        action: [
                            'playFavorite',
                        ],
                    },
                },
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
                },
                displayOptions: {
                    show: {
                        action: [
                            'playAudioClip',
                            'groupVolume',
                        ],
                    },
                },
            },
            {
                displayName: 'Soundfile',
                name: 'url',
                type: 'string' as NodePropertyTypes,
                default: 'http://www.moviesoundclips.net/effects/animals/wolf-howls.mp3',
                required: true,
                displayOptions: {
                    show: {
                        action: [
                            'playAudioClip',
                        ],
                    },
                },
            }
        ],
    };

    methods = {
		loadOptions: {
			loadHouseholds,
            loadFavorites,
            loadPlayers,
		},
	};

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const credentials = this.getCredentials('sonosApi');
        const returnData: IDataObject[] = [];
        try {
            if (credentials === undefined) {
                throw new Error('No credentials got returned!');
            }
            const action = this.getNodeParameter('action', 0);
            switch (action) {
                case "playAudioClip":
                    await playAudioClip.call(this);
                    break;
                case "groupAll":
                    await groupAll.call(this);
                    break;
                case "play":
                case "pause":
                case "togglePlayPause":
                case "skipToNextTrack":
                case "skipToPreviousTrack":
                    await executeGroupAction.call(this, action);
                    break;
                case "playFavorite":
                    await playFavorite.call(this);
                    break;
                case "groupVolume":
                    await groupVolume.call(this);
                    break;
                default:
                    throw new Error("Unknown method or not implemented");
            }
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
