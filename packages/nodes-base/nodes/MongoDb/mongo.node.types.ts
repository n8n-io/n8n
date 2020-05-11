import { CredentialInformation } from 'n8n-workflow';

/**
 * Credentials object for Mongo, if using individual parameters
 */
export interface IMongoParametricCredentials {
	/**
	 * Whether to allow overriding the parametric credentials with a connection string
	 */
	configurationType: 'values';

	host: string;
	database: string;
	user: string;
	password: string;
	port?: number;
}

/**
 * Credentials object for Mongo, if using override connection string
 */
export interface IMongoOverrideCredentials {
	/**
	 * Whether to allow overriding the parametric credentials with a connection string
	 */
	configurationType: 'connectionString';
	/**
	 * If using an override connection string, this is where it will be.
	 */
	connectionString: string;
	database: string;
}

/**
 * Unified credential object type (whether params are overridden with a connection string or not)
 */
export type IMongoCredentialsType =
	| IMongoParametricCredentials
	| IMongoOverrideCredentials;

/**
 * Resolve the database and connection string from input credentials
 */
export type IMongoCredentials = {
	/**
	 * Database name (used to create the Mongo client)
	 */
	database: string;
	/**
	 * Generated connection string (after validating and figuring out overrides)
	 */
	connectionString: string;
};
