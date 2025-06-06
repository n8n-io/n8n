# QA Automation Workflows

This directory contains workflow definitions for n8n QA automation testing. These workflows are designed to be imported into n8n and used for end-to-end testing of the platform.

## Overview

The workflows in this directory are used to test various aspects of the n8n platform, including:

- API functionality
- Workflow execution
- Node operations
- Error handling
- Authentication and authorization
- Integration with external services

## Workflow Files

### qa-e2e-workflow.json

This workflow is designed for end-to-end testing of the n8n platform. It tests the following functionality:

- Creating and executing workflows
- Testing HTTP Request nodes
- Verifying data transformation
- Testing conditional logic
- Error handling and retry mechanisms

## Usage

### Importing Workflows

To import a workflow into n8n:

1. Open your n8n instance
2. Go to the Workflows page
3. Click on "Import from File"
4. Select the workflow JSON file
5. Click "Import"

### Running Workflows for Testing

These workflows can be executed as part of automated testing using the Cypress framework. The test scripts in the `qa-automation` directory use these workflows to verify the functionality of the n8n platform.

## Creating New Test Workflows

When creating new test workflows, follow these guidelines:

1. **Naming Convention**: Use a descriptive name that indicates the purpose of the workflow, prefixed with `qa-`
2. **Documentation**: Add comments to nodes to explain their purpose
3. **Error Handling**: Include error handling nodes to catch and report issues
4. **Idempotency**: Design workflows to be idempotent (can be run multiple times without side effects)
5. **Cleanup**: Include cleanup steps to remove any test data created during execution

## Integration with Cypress Tests

These workflows are used in conjunction with Cypress tests to verify the functionality of the n8n platform. The Cypress tests can:

1. Import workflows via the n8n API
2. Execute workflows and verify results
3. Check workflow execution history
4. Validate that nodes operate as expected

Refer to the Cypress test files in the `qa-automation` directory for examples of how to use these workflows in automated tests.