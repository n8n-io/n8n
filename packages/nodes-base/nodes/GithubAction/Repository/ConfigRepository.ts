import { capitalCase } from "change-case";
import { INodeProperties } from "../../../../workflow/dist/src";
import { Property } from "../Common";

export const ConfigRepository: INodeProperties = {
  displayName: capitalCase(Property.Repository),
  name: Property.Repository,
  type: 'string',
  required: true,
  default: '',
  description: capitalCase(Property.Repository)
}