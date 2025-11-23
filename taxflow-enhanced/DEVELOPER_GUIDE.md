# TaxFlow Enhanced - Developer Guide

Technical documentation for developers contributing to or extending TaxFlow Enhanced.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Core Concepts](#core-concepts)
5. [Creating Custom Nodes](#creating-custom-nodes)
6. [Testing Strategy](#testing-strategy)
7. [State Management](#state-management)
8. [Build and Deployment](#build-and-deployment)
9. [Performance Optimization](#performance-optimization)
10. [Contributing](#contributing)

## Architecture Overview

### Technology Stack

**Frontend Framework**
- React 18+ (with TypeScript)
- Vite (build tool and dev server)
- React Flow (@xyflow/react) for workflow canvas

**State Management**
- Zustand (lightweight state management)
- React Query (future: API data fetching)

**Calculations**
- Decimal.js (precision arithmetic)
- Custom IRS rules engine

**Styling**
- Tailwind CSS
- CSS Modules (where needed)

**Testing**
- Vitest (unit tests)
- React Testing Library (component tests)
- Testing integration (full workflow tests)

### Application Layers

```
┌──────────────────────────────────────┐
│         Presentation Layer           │
│  (React Components + React Flow)     │
├──────────────────────────────────────┤
│         Business Logic Layer         │
│    (Workflow Engine + Tax Nodes)     │
├──────────────────────────────────────┤
│         Data Layer                   │
│  (State Management + Local Storage)  │
├──────────────────────────────────────┤
│         Calculation Engine           │
│     (IRS Rules + Tax Formulas)       │
└──────────────────────────────────────┘
```

### Data Flow

```
User Input → React Flow Canvas → Workflow Store → Tax Workflow Execution
→ Node Processing (Topological Order) → Results → Dashboard Display
```

## Development Setup

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
git >= 2.30.0
```

### Initial Setup

```bash
# Clone repository
git clone https://github.com/yourusername/taxflow-enhanced.git
cd taxflow-enhanced

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Development Commands

```bash
# Development
npm run dev          # Start dev server with HMR
npm run dev:host     # Dev server accessible on network

# Building
npm run build        # Production build
npm run preview      # Preview production build

# Testing
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Generate coverage report

# Code Quality
npm run lint         # ESLint
npm run typecheck    # TypeScript type checking
npm run format       # Prettier formatting
```

### Environment Configuration

TaxFlow Enhanced uses environment variables for configuration across different deployment environments.

#### Environment Files

The application uses multiple environment files:

```
.env.example        # Template with all variables (committed to git)
.env.development    # Development defaults (committed to git)
.env.production     # Production defaults (committed to git)
.env.local          # Local overrides (NOT committed, gitignored)
.env                # Default environment (NOT committed, gitignored)
```

**File Priority (highest to lowest):**
1. `.env.local` - Your local overrides (create this for development)
2. `.env.[mode]` - Environment-specific (development/production)
3. `.env` - Default fallback

#### Quick Start

```bash
# Option 1: Use development defaults (no setup needed)
npm run dev

# Option 2: Create local overrides
cp .env.example .env.local
# Edit .env.local with your preferences
npm run dev

# Option 3: Use .env file
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

#### Available Environment Variables

**API Configuration:**
```env
# API base URL (optional - for future backend integration)
VITE_API_URL=

# API timeout in milliseconds (default: 30000)
VITE_API_TIMEOUT=30000
```

**Feature Flags:**
```env
# Enable/disable features (values: 'true' or 'false')
VITE_ENABLE_ANALYTICS=false      # Analytics tracking
VITE_ENABLE_PDF_EXPORT=true      # PDF export functionality
VITE_ENABLE_EXCEL_EXPORT=true    # Excel export functionality
VITE_ENABLE_STATE_TAX=false      # State tax calculations (beta)
```

**Logging:**
```env
# Console log level (debug | info | warn | error)
VITE_LOG_LEVEL=info
```

**Application Limits:**
```env
# Maximum workflow nodes (10-1000, default: 100)
VITE_MAX_WORKFLOW_NODES=100

# Max file upload size in MB (1-100, default: 10)
VITE_MAX_FILE_SIZE_MB=10
```

**Development:**
```env
# Use mock data instead of real backend (default: true)
VITE_USE_MOCK_DATA=true
```

#### Environment-Specific Recommendations

**Development:**
```env
VITE_LOG_LEVEL=debug
VITE_USE_MOCK_DATA=true
VITE_ENABLE_ANALYTICS=false
```

**Staging:**
```env
VITE_API_URL=https://staging-api.taxflow.example.com
VITE_LOG_LEVEL=info
VITE_USE_MOCK_DATA=false
VITE_ENABLE_ANALYTICS=true
```

**Production:**
```env
VITE_API_URL=https://api.taxflow.example.com
VITE_LOG_LEVEL=error
VITE_USE_MOCK_DATA=false
VITE_ENABLE_ANALYTICS=true
```

#### Validation

All environment variables are validated at startup using Zod schemas in `src/config/environment.ts`. Invalid values will cause the application to fail with helpful error messages.

**Example validation error:**
```
Environment validation error:
VITE_LOG_LEVEL: Invalid enum value. Expected 'debug' | 'info' | 'warn' | 'error', received 'trace'
```

#### Using Environment Variables in Code

```typescript
import { env, isProduction, isFeatureEnabled } from '@/config/environment';

// Check mode
if (isProduction) {
  // Production-specific logic
}

// Access validated env vars
const apiUrl = env.VITE_API_URL;
const logLevel = env.VITE_LOG_LEVEL;

// Check feature flags
if (isFeatureEnabled('VITE_ENABLE_PDF_EXPORT')) {
  // Enable PDF export button
}
```

#### Security Notes

⚠️ **NEVER commit sensitive data to version control:**
- API keys
- Secrets
- Tokens
- Credentials

✅ **For production deployments:**
- Set environment variables in your deployment platform (Vercel, Netlify, etc.)
- Use secret management services for sensitive values
- Never hardcode secrets in .env files that are committed

See `.env.example` for complete documentation of all available variables.

## Project Structure

```
taxflow-enhanced/
├── src/
│   ├── components/          # React components
│   │   ├── Canvas.tsx       # Workflow canvas
│   │   ├── NodePalette.tsx  # Node selection panel
│   │   ├── Dashboard.tsx    # Results display
│   │   └── ErrorBoundary.tsx
│   │
│   ├── core/                # Core business logic
│   │   ├── workflow/
│   │   │   ├── TaxWorkflow.ts      # Workflow execution engine
│   │   │   ├── TaxNode.ts          # Node interfaces
│   │   │   └── TopologicalSort.ts  # Dependency resolution
│   │   └── rules/
│   │       └── IRSRulesEngine.ts   # Tax calculation rules
│   │
│   ├── nodes/               # Tax calculation nodes
│   │   ├── base/
│   │   │   └── BaseTaxNode.ts      # Abstract base class
│   │   ├── input/           # Data input nodes
│   │   ├── calculation/     # Tax calculation nodes
│   │   ├── forms/           # Form generator nodes
│   │   ├── validation/      # Validation nodes
│   │   └── output/          # Export nodes
│   │
│   ├── store/               # State management
│   │   └── workflowStore.ts # Zustand store
│   │
│   ├── models/              # TypeScript interfaces
│   │   └── TaxData.ts
│   │
│   ├── constants/           # Constants and configurations
│   │   └── taxBrackets.ts
│   │
│   ├── utils/               # Utility functions
│   │   ├── logger.ts
│   │   └── mockData.ts
│   │
│   ├── test/                # Test utilities
│   │   ├── utils.tsx        # Test helpers
│   │   ├── setup.ts         # Test configuration
│   │   └── integration/     # Integration tests
│   │
│   ├── config/              # Application configuration
│   │   └── environment.ts
│   │
│   └── types/               # Global TypeScript types
│       └── index.ts
│
├── public/                  # Static assets
├── dist/                    # Build output
├── docs/                    # Additional documentation
│
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Test configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── package.json            # Dependencies and scripts
```

### Key Files

- **`src/main.tsx`**: Application entry point
- **`src/App.tsx`**: Root component
- **`src/core/workflow/TaxWorkflow.ts`**: Workflow execution engine
- **`src/store/workflowStore.ts`**: Global state management
- **`src/core/rules/IRSRulesEngine.ts`**: Tax calculation rules

## Core Concepts

### 1. Tax Workflow

A workflow is a directed acyclic graph (DAG) of tax calculation nodes.

```typescript
import { TaxWorkflow } from './core/workflow/TaxWorkflow';

const workflow = new TaxWorkflow('wf-1', 'My Tax Return', {
  taxYear: 2024,
  filingStatus: 'single',
  taxpayerInfo: { firstName: 'John', lastName: 'Doe', ssn: '123-45-6789' }
});

// Add nodes
workflow.addNode('input', new ManualEntryNode());
workflow.addNode('agi', new AGICalculatorNode());

// Connect nodes
workflow.addConnection({
  sourceNode: 'input',
  sourceOutput: 0,
  targetNode: 'agi',
  targetInput: 0
});

// Execute
const result = await workflow.execute();
```

### 2. Tax Nodes

All nodes extend `BaseTaxNode` and implement the `ITaxNode` interface:

```typescript
interface ITaxNode {
  description: ITaxNodeDescription;
  execute(context: TaxExecutionContext, inputs: TaxData[][]): Promise<TaxData[]>;
}
```

**Node Lifecycle:**
1. Workflow calls `execute()` with context and inputs
2. Node validates inputs
3. Node performs calculations
4. Node returns outputs as `TaxData[]`

### 3. Execution Context

Every node receives a context with taxpayer information:

```typescript
interface TaxExecutionContext {
  workflowId: string;
  taxYear: number;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
  taxpayerInfo: {
    firstName: string;
    lastName: string;
    ssn: string;
  };
  getNodeData: (nodeId: string) => TaxData[][] | undefined;
}
```

### 4. Tax Data

Data flows between nodes as `TaxData` objects:

```typescript
interface TaxData {
  json: Record<string, any>;  // Flexible data structure
  binary?: Uint8Array;          // For PDFs/files
}
```

### 5. Topological Sorting

Workflow execution order is determined by topological sort:

```typescript
const sortedNodeIds = TopologicalSort.sort(
  Array.from(nodes.keys()),
  connections
);
// Returns: ['input', 'agi', 'deduction', 'tax', 'form1040', 'pdf']
```

## Creating Custom Nodes

### Step 1: Define Node Class

```typescript
// src/nodes/calculation/MyCustomNode.ts

import { BaseTaxNode } from '../base/BaseTaxNode';
import type { ITaxNodeDescription, TaxExecutionContext } from '../../core/workflow/TaxNode';
import type { TaxData } from '../../models/TaxData';
import Decimal from 'decimal.js';

export class MyCustomNode extends BaseTaxNode {
  description: ITaxNodeDescription = {
    name: 'myCustomNode',
    displayName: 'My Custom Calculator',
    group: 'calculation',
    version: 1,
    description: 'Performs custom tax calculation',
    inputs: ['Income Data'],
    outputs: ['Calculated Result'],
    properties: {
      multiplier: { type: 'number', default: 1.0 },
    },
  };

  async execute(
    context: TaxExecutionContext,
    inputData: TaxData[][]
  ): Promise<TaxData[]> {
    // Validate inputs
    this.validateInput(inputData);

    // Extract input data
    const incomeData = inputData[0]?.[0]?.json;

    // Perform calculation
    const result = new Decimal(incomeData.amount).times(
      this.description.properties.multiplier.default
    );

    // Return output
    return [
      this.createOutput({
        customCalculation: result,
        timestamp: new Date().toISOString(),
      }),
    ];
  }
}
```

### Step 2: Add to Node Palette

Update `src/components/NodePalette.tsx`:

```typescript
const NODE_TYPES: NodeCategory[] = [
  // ... existing categories
  {
    name: 'Calculation',
    icon: Calculator,
    nodes: [
      // ... existing nodes
      {
        type: 'myCustomNode',
        displayName: 'My Custom Calculator',
        description: 'Performs custom tax calculation',
        icon: Calculator,
        color: 'bg-green-500',
      },
    ],
  },
];
```

### Step 3: Write Tests

```typescript
// src/nodes/calculation/MyCustomNode.test.ts

import { describe, it, expect } from 'vitest';
import { MyCustomNode } from './MyCustomNode';
import { createMockExecutionContext } from '../../test/utils';

describe('MyCustomNode', () => {
  it('should perform custom calculation', async () => {
    const node = new MyCustomNode();
    const context = createMockExecutionContext();
    const inputData = [[
      { json: { amount: 1000 } }
    ]];

    const result = await node.execute(context, inputData);

    expect(result[0].json.customCalculation.toNumber()).toBe(1000);
  });
});
```

### Step 4: Document

Add JSDoc comments to your node class and update USER_GUIDE.md with usage instructions.

## Testing Strategy

### Test Pyramid

```
        ┌────────────┐
        │     E2E    │  (Integration Tests)
        │            │   - Full workflow execution
        ├────────────┤
        │ Component  │  (Component Tests)
        │   Tests    │   - Canvas, Dashboard, NodePalette
        ├────────────┤
        │Unit Tests  │  (Unit Tests)
        │            │   - Nodes, Rules, Utils
        └────────────┘
```

### Unit Tests

Test individual nodes and utilities:

```typescript
describe('AGICalculatorNode', () => {
  it('should calculate AGI from W-2 income', async () => {
    const node = new AGICalculatorNode();
    const context = createMockExecutionContext();
    const inputData = [[
      { json: { type: 'w2', wages: new Decimal(75000) } }
    ]];

    const result = await node.execute(context, inputData);

    expect(result[0].json.agi.toNumber()).toBe(75000);
  });
});
```

### Component Tests

Test React components with user interactions:

```typescript
describe('Canvas', () => {
  it('should render control buttons', () => {
    render(<Canvas />);

    expect(screen.getByLabelText(/Execute workflow/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Save workflow/i)).toBeInTheDocument();
  });
});
```

### Integration Tests

Test complete workflow execution:

```typescript
describe('Workflow Execution', () => {
  it('should execute complete tax workflow', async () => {
    const workflow = new TaxWorkflow('test', 'Test', settings);

    workflow.addNode('input', new ManualEntryNode());
    workflow.addNode('agi', new AGICalculatorNode());
    workflow.addConnection({ sourceNode: 'input', sourceOutput: 0, targetNode: 'agi', targetInput: 0 });

    const result = await workflow.execute();

    expect(result.agi).toBeInstanceOf(Decimal);
  });
});
```

### Test Coverage Goals

- **Unit Tests**: >80% coverage
- **Component Tests**: All user-facing components
- **Integration Tests**: Critical user workflows
- **Overall**: >75% code coverage

### Running Tests

```bash
# Watch mode (development)
npm run test

# Single run (CI)
npm run test:run

# Coverage report
npm run test:coverage

# Specific file
npm run test:run AGICalculatorNode
```

## State Management

### Zustand Store

Global state managed with Zustand:

```typescript
// src/store/workflowStore.ts

interface WorkflowState {
  currentWorkflow: TaxWorkflow | null;
  result: TaxReturn | null;
  error: Error | null;
  isExecuting: boolean;

  setWorkflow: (workflow: TaxWorkflow) => void;
  executeWorkflow: () => Promise<void>;
  clearError: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  currentWorkflow: null,
  result: null,
  error: null,
  isExecuting: false,

  setWorkflow: (workflow) => set({ currentWorkflow: workflow }),

  executeWorkflow: async () => {
    const { currentWorkflow } = get();
    if (!currentWorkflow) return;

    set({ isExecuting: true, error: null });

    try {
      const result = await currentWorkflow.execute();
      set({ result, isExecuting: false });
    } catch (error) {
      set({ error: error as Error, isExecuting: false });
    }
  },

  clearError: () => set({ error: null }),
}));
```

### Using the Store

```typescript
// In a component
function MyComponent() {
  const { result, executeWorkflow, isExecuting } = useWorkflowStore();

  return (
    <button onClick={executeWorkflow} disabled={isExecuting}>
      {isExecuting ? 'Executing...' : 'Execute'}
    </button>
  );
}
```

### Local Storage

Workflows automatically persist to IndexedDB:

```typescript
// Auto-save on changes
useEffect(() => {
  if (currentWorkflow) {
    saveToIndexedDB(currentWorkflow);
  }
}, [currentWorkflow]);

// Load on mount
useEffect(() => {
  loadFromIndexedDB().then(setWorkflow);
}, []);
```

## Build and Deployment

### Production Build

```bash
# Build for production
npm run build

# Output in dist/
# - index.html
# - assets/index-[hash].js
# - assets/index-[hash].css
```

### Build Optimization

Vite automatically:
- Minifies JavaScript and CSS
- Tree-shakes unused code
- Chunks code for optimal loading
- Generates source maps
- Optimizes images

### Deployment Options

#### Static Hosting (Vercel, Netlify)

```bash
# Build
npm run build

# Deploy
vercel deploy --prod
# or
netlify deploy --prod
```

#### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-p", "3000"]
EXPOSE 3000
```

#### Nginx

```nginx
server {
  listen 80;
  server_name taxflow.example.com;
  root /var/www/taxflow/dist;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /assets {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

### Environment-Specific Builds

```bash
# Development
npm run build --mode development

# Staging
npm run build --mode staging

# Production
npm run build --mode production
```

## Performance Optimization

### Code Splitting

Implemented with React.lazy():

```typescript
const Canvas = lazy(() => import('./components/Canvas'));
const Dashboard = lazy(() => import('./components/Dashboard'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Canvas />
      <Dashboard />
    </Suspense>
  );
}
```

### Memoization

Prevent unnecessary re-renders:

```typescript
const MemoizedNode = memo(({ data }) => {
  return <div>{data.label}</div>;
}, (prevProps, nextProps) => {
  return prevProps.data.label === nextProps.data.label;
});
```

### Virtualization

For large node lists (future optimization):

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function NodeList({ nodes }) {
  const virtualizer = useVirtualizer({
    count: nodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
  });

  // Render only visible nodes
}
```

### Bundle Size

Monitor with `rollup-plugin-visualizer`:

```bash
npm run build
open dist/stats.html
```

See BUNDLE_ANALYSIS.md for detailed recommendations.

## Contributing

### Development Workflow

1. **Fork and Clone**
```bash
git clone https://github.com/yourusername/taxflow-enhanced.git
cd taxflow-enhanced
git remote add upstream https://github.com/original/taxflow-enhanced.git
```

2. **Create Feature Branch**
```bash
git checkout -b feature/my-new-feature
```

3. **Make Changes**
- Write code
- Add tests
- Update documentation
- Run linter and type checker

4. **Commit**
```bash
git add .
git commit -m "feat: add new tax credit calculator"
```

5. **Push and PR**
```bash
git push origin feature/my-new-feature
# Create pull request on GitHub
```

### Code Style

- **TypeScript**: Strict mode, no `any` types
- **React**: Functional components with hooks
- **Naming**: camelCase for variables, PascalCase for components
- **Imports**: Absolute imports preferred (`@/components/...`)
- **Comments**: JSDoc for public APIs

### Commit Messages

Follow Conventional Commits:

```
feat: add new feature
fix: bug fix
docs: documentation changes
test: add/update tests
chore: build/tooling changes
refactor: code refactoring
perf: performance improvements
```

### Pull Request Checklist

- [ ] Tests pass (`npm run test:run`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if applicable)
- [ ] Screenshots/demos for UI changes

### Code Review Process

1. Automated checks run (GitHub Actions)
2. Maintainer reviews code
3. Address feedback
4. Final approval
5. Merge to main

## Advanced Topics

### Custom Tax Brackets

Add new tax year brackets in `src/constants/taxBrackets.ts`:

```typescript
export const TAX_BRACKETS_2025 = {
  single: [
    { min: new Decimal(0), max: new Decimal(11900), rate: new Decimal(0.10) },
    // ... more brackets
  ],
};
```

### Multi-State Support

Extend State Tax Calculator:

```typescript
const STATE_TAX_RATES = {
  CA: { rate: 0.093, brackets: [...] },
  NY: { rate: 0.0685, brackets: [...] },
  // ... more states
};
```

### PDF Generation

Using jsPDF for form generation:

```typescript
import jsPDF from 'jspdf';

export function generateForm1040(taxReturn: TaxReturn): Uint8Array {
  const doc = new jsPDF();

  doc.text('Form 1040', 10, 10);
  doc.text(`AGI: ${taxReturn.agi}`, 10, 20);
  // ... more form fields

  return doc.output('arraybuffer');
}
```

### Real-Time Collaboration (Future)

Using WebSockets for multi-user workflows:

```typescript
const socket = new WebSocket('wss://api.taxflow.com');

socket.onmessage = (event) => {
  const update = JSON.parse(event.data);
  updateWorkflow(update);
};
```

## Resources

### Documentation
- [React Flow Docs](https://reactflow.dev/)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [Decimal.js API](https://mikemcl.github.io/decimal.js/)
- [Vitest Docs](https://vitest.dev/)

### Tax Resources
- [IRS Publication 17](https://www.irs.gov/pub/irs-pdf/p17.pdf)
- [IRS Tax Brackets](https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2024)
- [Tax Foundation](https://taxfoundation.org/)

### Tools
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

---

**Questions?** Open an issue on GitHub or join our Discord community.

**Happy coding! 🚀**
