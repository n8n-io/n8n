import { OptionsWithUri } from "request";

import {
  IExecuteFunctions,
  IExecuteSingleFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
} from "n8n-core";

import { IDataObject, JsonObject, NodeApiError } from "n8n-workflow";

const serviceJSONRPC = "object";
const methodJSONRPC = "execute";

export const mapOperationToJSONRPC = {
  create: "create",
  get: "read",
  getAll: "search_read",
  update: "write",
  delete: "unlink",
};

export const mapOdooResources: { [key: string]: string } = {
  contact: "res.partner",
  opportunity: "crm.lead",
  note: "note.note",
};

export const mapFilterOperationToJSONRPC = {
  equal: "=",
  notEqual: "!=",
  greaterThen: ">",
  lesserThen: "<",
  greaterOrEqual: ">=",
  lesserOrEqual: "<=",
  like: "like",
  in: "in",
  notIn: "not in",
  childOf: "child_of",
};

type FilterOperation =
  | "equal"
  | "notEqual"
  | "greaterThen"
  | "lesserThen"
  | "greaterOrEqual"
  | "lesserOrEqual"
  | "like"
  | "in"
  | "notIn"
  | "childOf";

export interface IOdooFilterOperations {
  filter: Array<{
    fieldName: string;
    operator: string;
    value: string;
  }>;
}

export interface IOdooNameValueFields {
  fields: Array<{
    fieldName: string;
    fieldValue: string;
  }>;
}

export interface IOdooResponceFields {
  fields: Array<{
    field: string;
    fromList?: boolean;
  }>;
}

type OdooCRUD = "create" | "update" | "delete" | "get" | "getAll";

export function odooGetDBName(databaseName: string | undefined, url: string) {
  if (databaseName) return databaseName;
  const odooURL = new URL(url);
  const hostname = odooURL.hostname;
  if (!hostname) return "";
  return odooURL.hostname.split(".")[0];
}

export async function odooJSONRPCRequest(
  this:
    | IHookFunctions
    | IExecuteFunctions
    | IExecuteSingleFunctions
    | ILoadOptionsFunctions,
  body: IDataObject,
  url: string
): Promise<IDataObject | IDataObject[]> {
  try {
    const options: OptionsWithUri = {
      headers: {
        "User-Agent": "n8n",
        Connection: "keep-alive",
        Accept: "*/*",
        "Content-Type": "application/json",
      },
      method: "POST",
      body,
      uri: `${url}/jsonrpc`,
      json: true,
    };

    const responce = await this.helpers.request!(options);

    if (responce.error) {
      throw new NodeApiError(this.getNode(), responce.error.data, {
        message: responce.error.data.message,
      });
    }
    return responce;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}

export async function odooCreate(
  this:
    | IHookFunctions
    | IExecuteFunctions
    | IExecuteSingleFunctions
    | ILoadOptionsFunctions,
  db: string,
  userID: number,
  password: string,
  resource: string,
  operation: OdooCRUD,
  url: string,
  newItem: IDataObject
) {
  try {
    const body = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: serviceJSONRPC,
        method: methodJSONRPC,
        args: [
          db,
          userID,
          password,
          mapOdooResources[resource] || resource,
          mapOperationToJSONRPC[operation],
          newItem || {},
        ],
      },
      id: Math.floor(Math.random() * 100),
    };
	
    const result = await odooJSONRPCRequest.call(this, body, url);
	
    return result;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}

export async function odooGet(
  this:
    | IHookFunctions
    | IExecuteFunctions
    | IExecuteSingleFunctions
    | ILoadOptionsFunctions,
  db: string,
  userID: number,
  password: string,
  resource: string,
  operation: OdooCRUD,
  url: string,
  itemsID: string,
  fieldsToReturn?: IDataObject[]
) {
  try {
    if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
      throw new NodeApiError(this.getNode(), {
        status: "Error",
        message: `Please specify a valid ID: ${itemsID}`,
      });
    }
    const body = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: serviceJSONRPC,
        method: methodJSONRPC,
        args: [
          db,
          userID,
          password,
          mapOdooResources[resource] || resource,
          mapOperationToJSONRPC[operation],
          [+itemsID] || [],
          fieldsToReturn || [],
        ],
      },
      id: Math.floor(Math.random() * 100),
    };

    const result = await odooJSONRPCRequest.call(this, body, url);
    return result;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}

export async function odooDelete(
  this:
    | IHookFunctions
    | IExecuteFunctions
    | IExecuteSingleFunctions
    | ILoadOptionsFunctions,
  db: string,
  userID: number,
  password: string,
  resource: string,
  operation: OdooCRUD,
  url: string,
  itemsID: string
) {
  if (!/^\d+$/.test(itemsID) || !parseInt(itemsID, 10)) {
    throw new NodeApiError(this.getNode(), {
      status: "Error",
      message: `Please specify a valid ID: ${itemsID}`,
    });
  }
  try {
    const body = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: serviceJSONRPC,
        method: methodJSONRPC,
        args: [
          db,
          userID,
          password,
          mapOdooResources[resource] || resource,
          mapOperationToJSONRPC[operation],
          [+itemsID] || [],
        ],
      },
      id: Math.floor(Math.random() * 100),
    };

    await odooJSONRPCRequest.call(this, body, url);
    return { success: true };
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}

export async function odooGetUserID(
  this:
    | IHookFunctions
    | IExecuteFunctions
    | IExecuteSingleFunctions
    | ILoadOptionsFunctions,
  db: string,
  username: string,
  password: string,
  url: string
): Promise<number> {
  try {
    const body = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "login",
        args: [db, username, password],
      },
      id: Math.floor(Math.random() * 100),
    };
    // @ts-ignore
    const response = await odooJSONRPCRequest.call(this, body, url);
	
	// @ts-ignore
    return response.result as unknown as number;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}
