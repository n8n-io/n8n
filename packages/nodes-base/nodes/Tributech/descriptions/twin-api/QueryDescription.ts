import {
	INodeProperties,
} from 'n8n-workflow';

export const queryOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		description: 'The operation that should be executed',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'query',
				],
			},
		},
		options: [
			{
				name: 'Get Twin Graph By Cypher Query',
				description: 'Get Twin Graph By Cypher Query',
				value: 'getTwinGraphByCypherQuery',
			},
			{
				name: 'Get Twin Graph By Subgraph Query',
				description: 'Get Twin Graph By Subgraph Query',
				value: 'getTwinGraphBySubgraphQuery',
			},
		],
		default: 'getTwinGraphByCypherQuery',
	},
] as INodeProperties[];

export const queryFields = [
	{
		displayName: 'Match',
		name: 'match',
		description: 'Cypher query <a href="https://neo4j.com/docs/cypher-manual/current/clauses/match/" target="_blank">MATCH</a> part. e.g. "(twin:Twin)", "(stream:Twin:BaseStreamTributechIoV1)", "(stream:Twin:BaseStreamTributechIoV1)-[relationship:Options]->(option:Twin:BaseOptionsTributechIoV1)",...',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'query',
				],
				operation: [
					'getTwinGraphByCypherQuery',
				],
			},
		},
	},
	{
		displayName: 'Where',
		name: 'where',
		description: '(Optional) Cypher query <a href="https://neo4j.com/docs/cypher-manual/current/clauses/where/" target="_blank">WHERE</a> part. e.g. "stream.ValueMetadataId = \'6e02502-bfc5-4182-aa3b-891965020e14\'", "stream.MerkleTreeDepth IS NOT NULL", "option:PersistenceOptionsTributechIoV1",...',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'query',
				],
				operation: [
					'getTwinGraphByCypherQuery',
				],
			},
		},
	},
	{
		displayName: 'With',
		name: 'with',
		description: 'Cypher query <a href="https://neo4j.com/docs/cypher-manual/current/clauses/with/" target="_blank">WITH</a> part. The result must be projected to lists named "nodes" and "relationships" to be returned which can be done at the WITH part. To return an empty list for one of them you can use "[] AS relationships". e.g. "stream AS nodes, [] AS relationships", "collect(distinct stream) + collect(distinct option) AS nodes, collect(relationship) AS relationships"),...',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'query',
				],
				operation: [
					'getTwinGraphByCypherQuery',
				],
			},
		},
	},

	// ----------------------------------------
	//        Query: GetTwinGraphByQuery
	// ----------------------------------------
	{
		displayName: 'Root Node ID',
		name: 'startNodeDtId',
		description: 'The start node identified by its DT ID.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'query',
				],
				operation: [
					'getTwinGraphBySubgraphQuery',
				],
			},
		},
	},
	{
		displayName: 'Relationship Filter',
		name: 'relationshipFilter',
		description: 'Filter used for relationships.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'query',
				],
				operation: [
					'getTwinGraphBySubgraphQuery',
				],
			},
		},
	},
	{
		displayName: 'Label Filter',
		name: 'labelFilter',
		description: 'Filter used for labels.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'query',
				],
				operation: [
					'getTwinGraphBySubgraphQuery',
				],
			},
		},
	},
	{
		displayName: 'Max Depth',
		name: 'maxDepth',
		description: 'The max depth of the subgraph.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'query',
				],
				operation: [
					'getTwinGraphBySubgraphQuery',
				],
			},
		},
	},
] as INodeProperties[];
