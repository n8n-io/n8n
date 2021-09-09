import { kebabCase } from 'lodash';
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
import { type } from 'os';

import {
    OptionsWithUri,
} from 'request';

import {
    processHeaders,
    processParams,
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
                displayName: 'Method',
                name: 'method',
                type: 'options',
                options: [
                    {
                        name: 'GET',
                        value: 'GET',
                    },
                    {
                        name: 'POST',
                        value: 'POST',
                    },
                ],
                default: 'GET',
                required: true,
                description: 'Method to use',
            },
            {
                displayName: 'Target URL',
                name: 'url',
                type: 'string',
                default: '',
                required: true,
                description: 'The URL of the page you want to scrape'
            },
            {
                displayName: 'Headers',
                name: 'headers',
                placeholder: 'Add Header',
                type: 'fixedCollection',
                default: '',
                typeOptions: {
                    multipleValues: true,
                },
                description: 'Headers to forward',
                options: [
                    {
                        name: 'headerValues',
                        displayName: 'Header',
                        values: [
                            {
                                displayName: 'Key',
                                name: 'key',
                                type: 'string',
                                default: '',
                                description: 'Key of the header to add.',
                            },
                            {
                                displayName: 'Value',
                                name: 'value',
                                type: 'string',
                                default: '',
                                description: 'Value to set for the header key.',
                            },
                        ],
                    },
                ],
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
                        displayName: 'Extract Rules (JSON)',
                        name: 'extractRules',
                        type: 'json',
                        default: '',
                        description: 'Data extraction from CSS selectors'
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
        const items = this.getInputData();
        let returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            const method: string = this.getNodeParameter('method', i) as string;
            const url: string = this.getNodeParameter('url', i) as string;
            let headers: IDataObject = processHeaders(this.getNodeParameter('headers', i) as IDataObject);
            let queryString: IDataObject = processParams(this.getNodeParameter('additionalFields', i) as IDataObject);

            if (Object.keys(headers).length > 1) {
                queryString['forward_headers'] = true;
            }
            queryString['url'] = url;

            try {
                returnData.push(await scrapingBeeApiRequest.call(this, method, headers, queryString));            
            } catch (error: any) {
                if (this.continueOnFail()) {
                    returnData.push({json:{ error: error.message }});
                    continue;
                }
                throw error;
            }
        }

        return [this.helpers.returnJsonArray(returnData)];
    }
}