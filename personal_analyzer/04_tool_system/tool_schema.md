# Tool Schema - Node Type Definition

## TL;DR
n8n nodes được định nghĩa qua interface `INodeType` với `description` (metadata, inputs, outputs, properties) và `execute` function. Properties define node parameters với types (string, number, options, etc.) và display conditions. Declarative nodes dùng `routing` config thay vì code.

---

## Node Type Interface

```typescript
// packages/workflow/src/interfaces.ts

export interface INodeType {
  // Metadata và configuration
  description: INodeTypeDescription;

  // Execution methods (chọn 1)
  execute?(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
  poll?(this: IPollFunctions): Promise<INodeExecutionData[][] | null>;
  trigger?(this: ITriggerFunctions): Promise<ITriggerResponse>;
  webhook?(this: IWebhookFunctions): Promise<IWebhookResponseData>;

  // Methods used during node configuration
  methods?: {
    loadOptions?: ILoadOptionsFunctions;
    listSearch?: IListSearchMethods;
    credentialTest?: ICredentialTestFunctions;
  };
}
```

---

## Node Description Schema

```typescript
// packages/workflow/src/interfaces.ts

export interface INodeTypeDescription {
  // ===== IDENTIFICATION =====
  displayName: string;           // "HTTP Request"
  name: string;                  // "httpRequest"
  icon: string;                  // "file:http.svg" or "fa:icon"
  group: string[];               // ["transform", "output"]
  version: number | number[];    // 1 or [1, 2, 3]

  // ===== DESCRIPTION =====
  description: string;
  subtitle?: string;             // Dynamic subtitle expression

  // ===== DEFAULTS =====
  defaults: {
    name: string;                // Default node name
    color?: string;
  };

  // ===== INPUTS/OUTPUTS =====
  inputs: NodeConnectionType[] | string;   // ['main'] or expression
  outputs: NodeConnectionType[] | string;
  inputNames?: string[];         // Custom input labels
  outputNames?: string[];        // Custom output labels

  // ===== CREDENTIALS =====
  credentials?: INodeCredentialDescription[];

  // ===== PROPERTIES (Parameters) =====
  properties: INodeProperties[];

  // ===== DECLARATIVE HTTP =====
  requestDefaults?: IHttpRequestOptions;
  requestOperations?: INodeRequestOperations;
}
```

---

## Property Types

### Basic Types

```typescript
// packages/workflow/src/interfaces.ts

export interface INodeProperties {
  displayName: string;
  name: string;
  type: NodePropertyTypes;
  default?: NodeParameterValue;
  description?: string;
  required?: boolean;
  placeholder?: string;

  // Conditional display
  displayOptions?: IDisplayOptions;

  // Type-specific options
  typeOptions?: INodePropertyTypeOptions;

  // For options/multiOptions type
  options?: INodePropertyOptions[];

  // Declarative HTTP routing
  routing?: INodePropertyRouting;
}

// Available types
type NodePropertyTypes =
  | 'string'
  | 'number'
  | 'boolean'
  | 'options'           // Dropdown
  | 'multiOptions'      // Multi-select
  | 'collection'        // Key-value pairs
  | 'fixedCollection'   // Structured array
  | 'resourceLocator'   // ID/URL/List picker
  | 'resourceMapper'    // Field mapping
  | 'filter'            // Condition builder
  | 'json'              // JSON editor
  | 'notice'            // Info text
  | 'hidden';           // Hidden value
```

### Property Examples

```typescript
// String input
{
  displayName: 'URL',
  name: 'url',
  type: 'string',
  default: '',
  required: true,
  placeholder: 'https://api.example.com/endpoint',
  description: 'The URL to make the request to',
}

// Options dropdown
{
  displayName: 'Method',
  name: 'method',
  type: 'options',
  options: [
    { name: 'GET', value: 'GET' },
    { name: 'POST', value: 'POST' },
    { name: 'PUT', value: 'PUT' },
    { name: 'DELETE', value: 'DELETE' },
  ],
  default: 'GET',
}

// Collection (key-value pairs)
{
  displayName: 'Headers',
  name: 'headers',
  type: 'collection',
  placeholder: 'Add Header',
  default: {},
  options: [
    {
      displayName: 'Header',
      name: 'header',
      values: [
        { displayName: 'Name', name: 'name', type: 'string', default: '' },
        { displayName: 'Value', name: 'value', type: 'string', default: '' },
      ],
    },
  ],
}

// Fixed Collection (structured array)
{
  displayName: 'Fields',
  name: 'fields',
  type: 'fixedCollection',
  typeOptions: { multipleValues: true },
  default: {},
  options: [
    {
      displayName: 'Field',
      name: 'field',
      values: [
        { displayName: 'Name', name: 'name', type: 'string', default: '' },
        { displayName: 'Type', name: 'type', type: 'options', options: [...] },
      ],
    },
  ],
}

// Resource Locator
{
  displayName: 'Spreadsheet',
  name: 'spreadsheet',
  type: 'resourceLocator',
  default: { mode: 'list', value: '' },
  modes: [
    {
      displayName: 'From List',
      name: 'list',
      type: 'list',
      typeOptions: {
        searchListMethod: 'searchSpreadsheets',
      },
    },
    {
      displayName: 'By URL',
      name: 'url',
      type: 'string',
      placeholder: 'https://docs.google.com/spreadsheets/d/...',
    },
    {
      displayName: 'By ID',
      name: 'id',
      type: 'string',
    },
  ],
}
```

---

## Display Options (Conditional Visibility)

```typescript
// packages/workflow/src/interfaces.ts

export interface IDisplayOptions {
  show?: {
    [key: string]: NodeParameterValue[] | undefined;
  };
  hide?: {
    [key: string]: NodeParameterValue[] | undefined;
  };
}

// Example: Show body field only for POST/PUT
{
  displayName: 'Body',
  name: 'body',
  type: 'json',
  displayOptions: {
    show: {
      method: ['POST', 'PUT', 'PATCH'],
    },
  },
  default: '{}',
}

// Example: Hide for specific resource
{
  displayName: 'Advanced Options',
  name: 'advanced',
  type: 'collection',
  displayOptions: {
    hide: {
      resource: ['simple'],
    },
  },
}
```

---

## Declarative HTTP Routing

```typescript
// packages/workflow/src/interfaces.ts

export interface INodePropertyRouting {
  // Request configuration
  request?: {
    method?: IHttpRequestMethods;
    url?: string;
    headers?: IDataObject;
    body?: IDataObject;
    qs?: IDataObject;
  };

  // Send parameter as
  send?: {
    type: 'body' | 'query' | 'header';
    property?: string;
    propertyInDotNotation?: boolean;
    value?: string;
    preSend?: INodeRequestSend[];
  };

  // Output processing
  output?: {
    postReceive?: INodeRequestOutput[];
  };
}

// Example: Declarative Slack node
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  options: [
    {
      name: 'Send Message',
      value: 'sendMessage',
      action: 'Send a message',
      routing: {
        request: {
          method: 'POST',
          url: '/chat.postMessage',
        },
      },
    },
  ],
},
{
  displayName: 'Channel',
  name: 'channel',
  type: 'string',
  required: true,
  routing: {
    send: {
      type: 'body',
      property: 'channel',
    },
  },
},
{
  displayName: 'Text',
  name: 'text',
  type: 'string',
  routing: {
    send: {
      type: 'body',
      property: 'text',
    },
  },
}
```

---

## Complete Node Example

```typescript
// packages/nodes-base/nodes/HttpRequest/HttpRequest.node.ts

import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  INodeExecutionData,
} from 'n8n-workflow';

export class HttpRequest implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'HTTP Request',
    name: 'httpRequest',
    icon: 'file:httpRequest.svg',
    group: ['output'],
    version: [1, 2, 3],
    subtitle: '={{$parameter["method"]}} {{$parameter["url"]}}',
    description: 'Make HTTP requests',

    defaults: {
      name: 'HTTP Request',
    },

    inputs: ['main'],
    outputs: ['main'],

    credentials: [
      {
        name: 'httpBasicAuth',
        required: false,
        displayOptions: {
          show: { authentication: ['basicAuth'] },
        },
      },
      {
        name: 'httpHeaderAuth',
        required: false,
        displayOptions: {
          show: { authentication: ['headerAuth'] },
        },
      },
    ],

    properties: [
      {
        displayName: 'Method',
        name: 'method',
        type: 'options',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' },
        ],
        default: 'GET',
      },
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
      },
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: 'options',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Basic Auth', value: 'basicAuth' },
          { name: 'Header Auth', value: 'headerAuth' },
        ],
        default: 'none',
      },
      {
        displayName: 'Body',
        name: 'body',
        type: 'json',
        displayOptions: {
          show: { method: ['POST', 'PUT', 'PATCH'] },
        },
        default: '{}',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const method = this.getNodeParameter('method', i) as string;
      const url = this.getNodeParameter('url', i) as string;

      const response = await this.helpers.httpRequest({
        method,
        url,
        body: method !== 'GET'
          ? this.getNodeParameter('body', i)
          : undefined,
      });

      returnData.push({ json: response });
    }

    return [returnData];
  }
}
```

---

## File References

| Component | File Path |
|-----------|-----------|
| INodeType Interface | `packages/workflow/src/interfaces.ts` |
| HTTP Request Node | `packages/nodes-base/nodes/HttpRequest/HttpRequest.node.ts` |
| Code Node | `packages/nodes-base/nodes/Code/Code.node.ts` |
| If Node | `packages/nodes-base/nodes/If/If.node.ts` |

---

## Key Takeaways

1. **Declarative Schema**: Node definition tách riêng metadata (description) và logic (execute).

2. **Rich Property Types**: Nhiều property types cho different input needs - từ simple string đến complex resource locator.

3. **Display Options**: Conditional visibility giữ UI clean, chỉ show relevant options.

4. **Routing Config**: Declarative HTTP nodes avoid code entirely, chỉ cần config.

5. **Versioning**: Nodes support multiple versions, allowing breaking changes without migration.

6. **Credential Integration**: Credentials declared in schema, auto-injected at runtime.
