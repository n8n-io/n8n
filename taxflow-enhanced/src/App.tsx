import { useEffect, lazy, Suspense } from 'react';
import { useWorkflowStore } from './store/workflowStore';
import { TaxWorkflow } from './core/workflow/TaxWorkflow';
import {
  ErrorBoundary,
  CanvasErrorBoundary,
  DashboardErrorBoundary,
  NodePaletteErrorBoundary,
} from './components/ErrorBoundary';
import { getTaxpayerInfo } from './utils/mockData';
import './App.css';

// Lazy load heavy components for code splitting
const NodePalette = lazy(() => import('./components/NodePalette').then(module => ({ default: module.NodePalette })));
const Canvas = lazy(() => import('./components/Canvas').then(module => ({ default: module.Canvas })));
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));

// Loading fallback component
function LoadingFallback({ componentName }: { componentName: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p className="mt-4 text-sm text-gray-600">Loading {componentName}...</p>
      </div>
    </div>
  );
}

function App() {
  const { setWorkflow } = useWorkflowStore();

  useEffect(() => {
    // Initialize an empty workflow
    const workflow = new TaxWorkflow(
      'new_workflow',
      'Tax Calculation Workflow',
      {
        taxYear: 2024,
        filingStatus: 'single',
        taxpayerInfo: getTaxpayerInfo(),
      }
    );

    setWorkflow(workflow);
  }, [setWorkflow]);

  return (
    <ErrorBoundary componentName="TaxFlow Application">
      <div className="flex h-screen bg-gray-100">
        <NodePaletteErrorBoundary>
          <Suspense fallback={<LoadingFallback componentName="Node Palette" />}>
            <NodePalette />
          </Suspense>
        </NodePaletteErrorBoundary>
        <div className="flex-1 flex flex-col">
          <CanvasErrorBoundary>
            <Suspense fallback={<LoadingFallback componentName="Canvas" />}>
              <Canvas />
            </Suspense>
          </CanvasErrorBoundary>
          <DashboardErrorBoundary>
            <Suspense fallback={<LoadingFallback componentName="Dashboard" />}>
              <Dashboard />
            </Suspense>
          </DashboardErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
