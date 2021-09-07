import {
    IExecuteFunctions,
} from 'n8n-core';

import {
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodePropertyTypes,
} from 'n8n-workflow';

import {
    OptionsWithUri,
} from 'request';

import {
    scrapingBeeApiRequest,
} from './GenericFunctions';

export class ScrapingBee implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'ScrapingBee',
        name: 'scrapingBee',
        icon: 'file:logo.svg',
        group: ['input'],
        version: 1,
        description: 'Consume ScrapingBee API',
        subtitle: 'A simple subtitle',
        defaults: {
            name: 'ScrapingBee',
            color: '#f26c23',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'scrapingBeeApi',
                required: true
            }
        ],
        properties: [
            // Node properties which the user gets displayed and
            // can change on the node.
            {
                displayName: 'Target URL',
                name: 'url',
                type: 'string',
                default: '',
                required: true,
                description: 'The URL of the page you want to scrape'
            },
            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                options: [
                    {
                        displayName: 'Block Ads',
                        name: 'blockAds',
                        type: 'boolean',
                        default: false,
                        description: 'Block ads on the page you want to scrape'
                    },
                    {
                        displayName: 'Block Resources',
                        name: 'blockResources',
                        type: 'boolean',
                        default: true,
                        description: 'Block images and CSS on the page you want to scrape'
                    },
                    {
                        displayName: 'Cookies',
                        name: 'cookies',
                        type: 'string',
                        default: '',
                        description: 'Pass custom cookies to the webpage you want to scrape'
                    },
                    {
                        displayName: 'Country Code',
                        name: 'countryCode',
                        type: 'string',
                        default: '',
                        description: 'Premium proxy geolocation'
                    },
                    {
                        displayName: 'Custom Google',
                        name: 'customGoogle',
                        type: 'boolean',
                        default: false,
                        description: 'Set to true to scrape Google'
                    },
                    {
                        displayName: 'Device',
                        name: 'device',
                        type: 'string',
                        default: 'desktop',
                        description: 'Control the device the request will be sent from'
                    },
                    {
                        displayName: 'Extract Rules',
                        name: 'extractRules',
                        type: 'string',
                        default: '',
                        description: 'Data extraction from CSS selectors'
                    },
                    {
                        displayName: 'Forward Headers',
                        name: 'forwardHeaders',
                        type: 'boolean',
                        default: false,
                        description: 'Forward particular headers to the webpage'
                    },
                    {
                        displayName: 'JS Scroll',
                        name: 'jsScroll',
                        type: 'boolean',
                        default: false,
                        description: 'Scrolling to the end of the page before returning your results'
                    },
                    {
                        displayName: 'JS Scroll Count',
                        name: 'jsScrollCount',
                        type: 'number',
                        default: 1,
                        description: 'The number of scrolls you want to make'
                    },
                    {
                        displayName: 'JS Scroll Wait',
                        name: 'jsScrollWait',
                        type: 'number',
                        default: 1000,
                        description: 'The time to wait between each scroll'
                    },
                    {
                        displayName: 'JS Snippet',
                        name: 'jsSnippet',
                        type: 'string',
                        default: '',
                        description: 'JavaScript snippet to execute (clicking on a button, scrolling ...)'
                    },
                    {
                        displayName: 'JSON Response',
                        name: 'jsonResponse',
                        type: 'boolean',
                        default: false,
                        description: 'Wrap response in JSON'
                    },
                    {
                        displayName: 'Premium Proxy',
                        name: 'premiumProxy',
                        type: 'boolean',
                        default: false,
                        description: 'Use premium proxies to bypass difficult to scrape websites (10-25 credits/request)'
                    },
                    {
                        displayName: 'Render JS',
                        name: 'renderJs',
                        type: 'boolean',
                        default: true,
                        description: 'Render the JavaScript on the page with a headless browser (5 credits/request)'
                    },
                    {
                        displayName: 'Return Page Source',
                        name: 'returnPageSource',
                        type: 'boolean',
                        default: false,
                        description: 'Return the original HTML before the JavaScript rendering'
                    },
                    {
                        displayName: 'Screenshot',
                        name: 'screenshot',
                        type: 'boolean',
                        default: false,
                        description: 'Return a screenshot of the page you want to scrape'
                    },
                    {
                        displayName: 'Screenshot Full Page',
                        name: 'screenshotFullPage',
                        type: 'boolean',
                        default: false,
                        description: 'Return a screenshot of the full page you want to scrape'
                    },
                    {
                        displayName: 'Transparent Status Code',
                        name: 'transparentStatusCode',
                        type: 'boolean',
                        default: false,
                        description: 'Transparently return the same HTTP code of the page requested'
                    },
                    {
                        displayName: 'Wait',
                        name: 'wait',
                        type: 'number',
                        default: 0,
                        description: 'Additional time in ms for JavaScript to render'
                    },
                    {
                        displayName: 'Wait For',
                        name: 'waitFor',
                        type: 'string',
                        default: '',
                        description: 'CSS selector to wait for in the DOM'
                    },
                    {
                        displayName: 'Window Height',
                        name: 'windowHeight',
                        type: 'number',
                        default: 1080,
                        description: 'Height, in pixel, of the viewport used to render the page you want to scrape'
                    },
                    {
                        displayName: 'Window Width',
                        name: 'windowWidth',
                        type: 'number',
                        default: 1920,
                        description: 'Width, in pixel, of the viewport used to render the page you want to scrape'
                    }
                ]
            }
        ]
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const url = this.getNodeParameter('url', 0) as string;
        let returnData: INodeExecutionData[] = [];
        try {
            let queryString: IDataObject = {};
            queryString['url'] = url;
            returnData = await scrapingBeeApiRequest.call(this, 'GET', queryString);
        } catch (error) {
            if (this.continueOnFail()) {
                returnData.push({json:{ error: error}});
            }
            throw error;
        }

        return [this.helpers.returnJsonArray(returnData)];
    }
}