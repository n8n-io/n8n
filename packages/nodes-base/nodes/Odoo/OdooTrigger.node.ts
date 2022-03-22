import { IHookFunctions, IWebhookFunctions } from "n8n-core";

import { OptionsWithUri } from "request";

import {
  IDataObject,
  INodeType,
  INodeTypeDescription,
  IWebhookResponseData,
  NodeOperationError,
  ICredentialsDecrypted,
  ICredentialTestFunctions,
  ILoadOptionsFunctions,
  INodeCredentialTestResult,
  INodePropertyOptions,
} from "n8n-workflow";

import {
  odooCreate,
  odooDelete,
  odooGet,
  odooGetDBName,
  odooGetUserID,
  odooJSONRPCRequest,
} from "./GenericFunctionsTrigger";

export class OdooTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Odoo Trigger",
    name: "odooTrigger",
    icon: "file:odoo.svg",
    group: ["trigger"],
    version: 1,
    description: "Handle Odoo events via webhooks",
    defaults: {
      name: "Odoo-Trigger",
    },
    inputs: [],
    outputs: ["main"],
    credentials: [
      {
        name: "odooApi",
        required: true,
      },
    ],
    webhooks: [
      {
        name: "default",
        httpMethod: "POST",
        responseMode: "onReceived",
        path: "webhook",
      },
    ],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        default: "",
        typeOptions: {
          loadOptionsMethod: "getModels",
        },
        description: "The resource to operate on",
      },
      {
        displayName: "Trigger",
        name: "trigger",
        type: "options",
        default: "on_create",
        options: [
          { name: "On Create", value: "on_create" },
          { name: "On Update", value: "on_write" },
          { name: "On Create And Update", value: "on_create_or_write" },
          { name: "On Delete", value: "on_unlink" },
        ],
        description: "The method the webhook should trigger.",
      },
    ],
  };

  methods = {
    loadOptions: {
      async getModels(
        this: ILoadOptionsFunctions
      ): Promise<INodePropertyOptions[]> {
        const credentials = await this.getCredentials("odooApi");
        const url = credentials?.url as string;
        const username = credentials?.username as string;
        const password = credentials?.password as string;
        const db = odooGetDBName(credentials?.db as string, url);
        const userID = await odooGetUserID.call(
          this,
          db,
          username,
          password,
          url
        );

        const body = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute",
            args: [
              db,
              userID,
              password,
              "ir.model",
              "search_read",
              [],
              ["name", "model", "modules"],
            ],
          },
          id: Math.floor(Math.random() * 100),
        };
        const response = (await odooJSONRPCRequest.call(
          this,
          body,
          url
        )) as IDataObject[];
        // @ts-ignore
        const options = response.result.map((model) => {
          return {
            name: model.name,
            value: model.id,
            description: `model: ${model.model}<br> modules: ${model.modules}`,
          };
        });
        return options as INodePropertyOptions[];
      },
    },
    credentialTest: {
      async odooApiTest(
        this: ICredentialTestFunctions,
        credential: ICredentialsDecrypted
      ): Promise<INodeCredentialTestResult> {
        const credentials = credential.data;

        try {
          const body = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "common",
              method: "login",
              args: [
                odooGetDBName(
                  credentials?.db as string,
                  credentials?.url as string
                ),
                credentials?.username,
                credentials?.password,
              ],
            },
            id: Math.floor(Math.random() * 100),
          };

          const options: OptionsWithUri = {
            headers: {
              "User-Agent": "n8n",
              Connection: "keep-alive",
              Accept: "*/*",
              "Content-Type": "application/json",
            },
            method: "POST",
            body,
            uri: `${(credentials?.url as string).replace(/\/$/, "")}/jsonrpc`,
            json: true,
          };
          const result = await this.helpers.request!(options);
          if (result.error || !result.result) {
            return {
              status: "Error",
              message: `Credentials are not valid`,
            };
          } else if (result.error) {
            return {
              status: "Error",
              message: `Credentials are not valid: ${result.error.data.message}`,
            };
          }
        } catch (error) {
          return {
            status: "Error",
            message: `Settings are not valid: ${error}`,
          };
        }
        return {
          status: "OK",
          message: "Authentication successful!",
        };
      },
    },
  };

  // @ts-ignore (because of request)
  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData("node");

        if (webhookData.webhookId === undefined) {
          return false;
        }

        const credentials = await this.getCredentials("odooApi");
        const url = credentials?.url as string;
        const username = credentials?.username as string;
        const password = credentials?.password as string;
        const db = odooGetDBName(credentials?.db as string, url);
        const userID = await odooGetUserID.call(
          this,
          db,
          username,
          password,
          url
        );

        const response = await odooGet.call(this, db, userID, password, "base.automation", "get", url, webhookData.webhookId?.toString() as string);

        // @ts-ignore
        const exists = response.result.length > 0;

        return exists;
      },
      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl("default") as string;
        const webhookData = this.getWorkflowStaticData("node");

        if (webhookUrl.includes("%20")) {
          throw new NodeOperationError(
            this.getNode(),
            "The name of the Odoo Trigger Node is not allowed to contain any spaces!"
          );
        }

        const resource = this.getNodeParameter("resource") as string;
        const trigger = this.getNodeParameter("trigger") as string;

        const credentials = await this.getCredentials("odooApi");
        const url = credentials?.url as string;
        const username = credentials?.username as string;
        const password = credentials?.password as string;
        const db = odooGetDBName(credentials?.db as string, url);
        const userID = await odooGetUserID.call(
          this,
          db,
          username,
          password,
          url
        );

        //@ts-ignore
        const response = await odooCreate.call(
          this,
          db,
          userID,
          password,
          "base.automation",
          "create",
          url,
          {
            name: "Webhook generated by n8n",
            model_id: resource,
            state: "code",
            trigger: trigger,
            code: `make_request("POST", "${webhookUrl}", data=(json.dumps(record.read()[0], indent=4, sort_keys=True, default=str)), headers={"Content-Type": "application/json"})`,
          }
        );

        // @ts-ignore
        webhookData.webhookId = response.result;

        return true;
      },
      async delete(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData("node");

        if (webhookData.webhookId === undefined) {
          return false;
        }

        const credentials = await this.getCredentials("odooApi");
        const url = credentials?.url as string;
        const username = credentials?.username as string;
        const password = credentials?.password as string;
        const db = odooGetDBName(credentials?.db as string, url);
        const userID = await odooGetUserID.call(
          this,
          db,
          username,
          password,
          url
        );

        const response = await odooDelete.call(this, db, userID, password, "base.automation", "delete", url, webhookData.webhookId?.toString() as string);

        return response.success
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const returnData = [] as IDataObject[];
    const bodyData = this.getBodyData();

    if (Array.isArray(bodyData)) {
      returnData.push.apply(returnData, bodyData as IDataObject[]);
    } else {
      returnData.push(bodyData as IDataObject);
    }

    return {
      workflowData: [this.helpers.returnJsonArray(returnData)],
    };
  }
}
