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

export class ScrapingBee implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'ScrapingBee',
        name: 'scrapingBee',
        icon: 'file:logo.svg',
        group: ['input'],
        version: 1,
        description: 'Consume ScrapingBee API',
        defaults: {
            name: 'ScrapingBee',
            color: '#f26c23',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'scrapingBeeApi',
                required: true,
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
                description: 'The URL of the page you want to scrape',
            },
            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                options: [
                    {
                        displayName: 'Block ads',
                        name: 'block_ads',
                        type: 'boolean',
                        default: false,
                        description: 'Block ads on the page you want to scrape',        
                    },
                    {
                        displayName: 'Block resources',
                        name: 'block_resources',
                        type: 'boolean',
                        default: true,
                        description: 'Block images and CSS on the page you want to scrape',        
                    },
                    {
                        displayName: 'Cookies',
                        name: 'cookies',
                        type: 'string',
                        default: '',
                        description: 'Pass custom cookies to the webpage you want to scrape',        
                    },
                    {
                        displayName: 'Country code',
                        name: 'country_code',
                        type: 'string',
                        default: '',
                        description: 'Premium proxy geolocation',        
                    },
                    {
                        displayName: 'Custom Google',
                        name: 'custom_google',
                        type: 'boolean',
                        default: false,
                        description: 'Set to true to scrape Google',        
                    },
                    {
                        displayName: 'Device',
                        name: 'device',
                        type: 'string',
                        default: 'desktop',
                        description: 'Control the device the request will be sent from',        
                    },
                    {
                        displayName: 'Extract rules',
                        name: 'extract_rules',
                        type: 'string',
                        default: '',
                        description: 'Data extraction from CSS selectors',        
                    },
                    {
                        displayName: 'Forward headers',
                        name: 'forward_headers',
                        type: 'boolean',
                        default: false,
                        description: 'Forward particular headers to the webpage',        
                    },
                    {
                        displayName: 'JSON response',
                        name: 'json_response',
                        type: 'boolean',
                        default: false,
                        description: 'Wrap response in JSON',        
                    },
                    {
                        displayName: 'JS snippet',
                        name: 'js_snippet',
                        type: 'string',
                        default: '',
                        description: 'JavaScript snippet to execute (clicking on a button, scrolling ...)',        
                    },
                    {
                        displayName: 'JS scroll',
                        name: 'js_scroll',
                        type: 'boolean',
                        default: false,
                        description: 'Scrolling to the end of the page before returning your results',        
                    },
                    {
                        displayName: 'JS scroll wait',
                        name: 'js_scroll_wait',
                        type: 'number',
                        default: 1000,
                        description: 'The time to wait between each scroll',        
                    },
                    {
                        displayName: 'JS scroll count',
                        name: 'js_scroll_count',
                        type: 'number',
                        default: 1,
                        description: 'The number of scrolls you want to make',        
                    },
                    {
                        displayName: 'Premium proxy',
                        name: 'premium_proxy',
                        type: 'boolean',
                        default: false,
                        description: 'Use premium proxies to bypass difficult to scrape websites (10-25 credits/request)',        
                    },
                    {
                        displayName: 'Render JS',
                        name: 'render_js',
                        type: 'boolean',
                        default: true,
                        description: 'Render the JavaScript on the page with a headless browser (5 credits/request)',        
                    },
                    {
                        displayName: 'Return page source',
                        name: 'return_page_source',
                        type: 'boolean',
                        default: false,
                        description: 'Return the original HTML before the JavaScript rendering',        
                    },
                    {
                        displayName: 'Screenshot',
                        name: 'screenshot',
                        type: 'boolean',
                        default: false,
                        description: 'Return a screenshot of the page you want to scrape',        
                    },
                    {
                        displayName: 'Screenshot full page',
                        name: 'screenshot_full_page',
                        type: 'boolean',
                        default: false,
                        description: 'Return a screenshot of the full page you want to scrape',        
                    },
                    {
                        displayName: 'Transparent status code',
                        name: 'transparent_status_code',
                        type: 'boolean',
                        default: false,
                        description: 'Transparently return the same HTTP code of the page requested',        
                    },
                    {
                        displayName: 'Wait',
                        name: 'wait',
                        type: 'number',
                        default: 0,
                        description: 'Additional time in ms for JavaScript to render',        
                    },
                    {
                        displayName: 'Wait for',
                        name: 'wait_for',
                        type: 'string',
                        default: '',
                        description: 'CSS selector to wait for in the DOM',        
                    },
                    {
                        displayName: 'Window height',
                        name: 'window_height',
                        type: 'number',
                        default: 1080,
                        description: 'Height, in pixel, of the viewport used to render the page you want to scrape',        
                    },
                    {
                        displayName: 'Window width',
                        name: 'window_width',
                        type: 'number',
                        default: 1920,
                        description: 'Width, in pixel, of the viewport used to render the page you want to scrape',        
                    },
                ]
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        //Get credentials the user provided for this node
    	const credentials = await this.getCredentials('scrapingBeeApi') as IDataObject;
        const url = this.getNodeParameter('url', 0) as string;

        return [this.helpers.returnJsonArray(credentials)];
    }
}