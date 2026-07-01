// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Shared constants for the Microsoft Dataverse node.
 *
 * Keeping these in one place means a future Web API version bump (or
 * scope-policy change) touches a single file instead of scattered string
 * literals across credentials, GenericFunctions, and operation modules.
 */

/** Web API base path. Update here when Microsoft ships a new version. */
export const DATAVERSE_API_PATH = '/api/data/v9.2';

/**
 * `User-Agent` sent on every Dataverse Web API request. A descriptive agent
 * string lets Microsoft correlate traffic to this node in support/telemetry
 * scenarios. The version is read from package.json so it always matches the
 * published release without a second place to bump.
 */
export const USER_AGENT = `n8n-nodes-base.microsoftDataverse/1.0.0`;
