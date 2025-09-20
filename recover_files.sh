#!/bin/bash

# Script to recover missing files from previous commits

echo "Recovering missing files from previous commits..."

# Recover the credentials file
git show 3f0509bfd7:packages/@n8n/nodes-langchain/credentials/AzureAiSearchApi.credentials.ts > packages/@n8n/nodes-langchain/credentials/AzureAiSearchApi.credentials.ts

# Recover the test file
git show 3f0509bfd7:packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreAzureAISearch/VectorStoreAzureAISearch.node.test.ts > packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreAzureAISearch/VectorStoreAzureAISearch.node.test.ts

# Recover the SVG icon
git show 3f0509bfd7:packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreAzureAISearch/azure-aisearch.svg > packages/@n8n/nodes-langchain/nodes/vector_store/VectorStoreAzureAISearch/azure-aisearch.svg

# Recover package.json changes
git show 3f0509bfd7:packages/@n8n/nodes-langchain/package.json > packages/@n8n/nodes-langchain/package.json

# Recover pnpm-lock.yaml changes
git show 3f0509bfd7:pnpm-lock.yaml > pnpm-lock.yaml

echo "Files recovered. Run 'git status' to see the changes."
echo "Then run 'git add .' and 'git commit --amend --no-edit' to add them to your current commit."