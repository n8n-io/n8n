import {
  INodeProperties,
} from "n8n-workflow";

import {
  isoCountryCodes,
} from "../utils";

export const scrapeAdditionalFields: INodeProperties = {
  displayName: 'Additional Fields',
  name: 'additionalFields',
  type: 'collection',
  placeholder: 'Add Field',
  default: {},
  displayOptions: {
    show: {
      operation: [
        'scrape',
      ],
    },
  },
  options: [
    {
      displayName: 'Block Targets',
      name: 'block_targets',
      type: 'multiOptions',
      default: [],
      options: [
        {
          name: 'Ads',
          value: 'block_ads'
        },
        {
          name: 'Images and CSS',
          value: 'block_resources'
        },
      ],
      description: 'Block ads on the page to scrape'
    },
    {
      displayName: 'Cookies',
      name: 'cookies',
      type: 'string',
      placeholder: 'cookie_name_1=cookie_value_1',
      default: '',
      description: 'Cookies to send to to the page to scrape'
    },
    {
      displayName: 'Country',
      name: 'country_code',
      type: 'options',
      default: 'DE',
      options: isoCountryCodes,
      description: 'Country to send the request from',
    },
    {
      displayName: 'CSS Extraction Rules',
      name: 'extract_rules',
      type: 'json',
      typeOptions: {
        alwaysOpenEditWindow: true,
      },
      default: '',
      placeholder: '{ "title" : "h1", "subtitle" : "#subtitle" }',
      description: 'Rules to extract data using CSS selectors. <a href="https://www.scrapingbee.com/documentation/#json_css">Learn more</a>.'
    },
    {
      displayName: 'Device Type',
      name: 'device',
      type: 'options',
      default: 'desktop',
      options: [
        {
          name: 'Desktop',
          value: 'desktop'
        },
        {
          name: 'Mobile',
          value: 'mobile'
        },
      ],
      description: 'Device type to send the request from'
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
      description: 'Headers to forward to the page to scrape',
      options: [
        {
          displayName: 'Header',
          name: 'headerValues',
          values: [
            {
              displayName: 'Key',
              name: 'key',
              type: 'string',
              default: '',
              description: 'Key of the header to add to the request',
            },
            {
              displayName: 'Value',
              name: 'value',
              type: 'string',
              default: '',
              description: 'Value to set for the header key',
            },
          ],
        },
      ],
    },
    {
      displayName: 'JavaScript Code Snippet',
      name: 'js_scenario',
      type: 'json',
      default: '',
      typeOptions: {
        alwaysOpenEditWindow: true,
      },
      placeholder: '{ "instructions": [ {"click": "#buttonId"} ] }',
      description: 'Snippet of JavaScript code to execute, e.g. to click on a button. <a href="https://www.scrapingbee.com/documentation/js-scenario">Learn more</a>.'
    },
    {
      displayName: 'JSON Response',
      name: 'json_response',
      type: 'boolean',
      default: false,
    },
    {
      displayName: 'Method',
      name: 'method',
      type: 'options',
      description: 'Method to use to scrape the page',
      options: [
        {
          name: 'GET',
          value: 'get',
        },
        {
          name: 'POST',
          value: 'post',
        },
      ],
      default: 'get',
      required: true,
    },
    {
      displayName: 'Premium Proxy',
      name: 'premium_proxy',
      type: 'boolean',
      default: false,
      description: 'Whether to use a premium (residential) proxy, when needed for some hard-to-scrape websites. These proxies are rarely blocked and we recommend trying premium proxies when you receive error codes or difficult to scrape websites, like search engines, social networks, or hard to scrape E-commerce websites.'
    },
    {
      displayName: 'Render JavaScript',
      name: 'render_js',
      type: 'boolean',
      default: true,
      description: 'Whether to render JavaScript on the page via a headless browser. This is the default behavior and costs 5 credits per request.'
    },
    {
      displayName: 'Return Original HTML',
      name: 'return_page_source',
      type: 'boolean',
      default: false,
      description: 'Whether to return the original HTML sent by the server before alteration by the browser, i.e. before JavaScript execution'
    },
    {
      displayName: 'Transparent Status Code',
      name: 'transparent_status_code',
      type: 'boolean',
      default: false,
      description: 'Whether to get same body and status code as the requested URL in any circumstances. By default, ScrapingBee will return an HTTP 500 whenever the requested URL returns something other than: a 200-299 or a 404.'
    },
    {
      displayName: 'Viewport Height',
      name: 'window_height',
      type: 'number',
      default: 1080,
      description: 'Height of the viewport, in pixels, used to render the page to scrape'
    },
    {
      displayName: 'Viewport Width',
      name: 'window_width',
      type: 'number',
      default: 1920,
      description: 'Width, in pixels, used to render the page to scrape'
    },
    {
      displayName: 'Wait',
      name: 'wait',
      type: 'number',
      default: 0,
      description: 'Time to wait for JavaScript code to execute, in milliseconds'
    },
    {
      displayName: 'Wait For',
      name: 'wait_for',
      type: 'string',
      default: '',
      placeholder: 'h1',
      description: 'CSS selector to wait for in the DOM'
    },
  ],
};
