import { useState } from 'react';
import {
  FileInput,
  FileText,
  Calculator,
  Receipt,
  AlertCircle,
  FileOutput,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface NodeCategory {
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  nodes: NodeTypeInfo[];
}

interface NodeTypeInfo {
  type: string;
  displayName: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const NODE_TYPES: NodeCategory[] = [
  {
    name: 'Input',
    icon: FileInput,
    nodes: [
      {
        type: 'manualEntry',
        displayName: 'Manual Entry',
        description: 'Manually enter tax data',
        icon: FileText,
        color: 'bg-blue-500',
      },
      {
        type: 'w2Import',
        displayName: 'W-2 Import',
        description: 'Import W-2 wage statement data',
        icon: Receipt,
        color: 'bg-blue-500',
      },
      {
        type: 'form1099Import',
        displayName: 'Form 1099 Import',
        description: 'Import Form 1099 data (INT, DIV, B, MISC, NEC)',
        icon: Receipt,
        color: 'bg-blue-500',
      },
      {
        type: 'excelImport',
        displayName: 'Excel Import',
        description: 'Import tax data from Excel files',
        icon: FileText,
        color: 'bg-blue-500',
      },
    ],
  },
  {
    name: 'Calculation',
    icon: Calculator,
    nodes: [
      {
        type: 'agiCalculator',
        displayName: 'AGI Calculator',
        description: 'Calculate Adjusted Gross Income',
        icon: Calculator,
        color: 'bg-green-500',
      },
      {
        type: 'deductionCalculator',
        displayName: 'Deduction Calculator',
        description: 'Calculate standard vs itemized deductions',
        icon: Calculator,
        color: 'bg-green-500',
      },
      {
        type: 'taxBracketCalculator',
        displayName: 'Tax Bracket Calculator',
        description: 'Calculate federal income tax using IRS brackets',
        icon: Calculator,
        color: 'bg-green-500',
      },
      {
        type: 'taxCredits',
        displayName: 'Tax Credits',
        description: 'Calculate tax credits (CTC, EITC, education)',
        icon: Calculator,
        color: 'bg-green-500',
      },
      {
        type: 'selfEmploymentTax',
        displayName: 'Self-Employment Tax',
        description: 'Calculate self-employment tax',
        icon: Calculator,
        color: 'bg-green-500',
      },
      {
        type: 'stateTaxCalculator',
        displayName: 'State Tax Calculator',
        description: 'Calculate state income tax',
        icon: Calculator,
        color: 'bg-green-500',
      },
    ],
  },
  {
    name: 'Forms',
    icon: FileText,
    nodes: [
      {
        type: 'form1040Generator',
        displayName: 'Form 1040 Generator',
        description: 'Generate Form 1040 data structure',
        icon: FileText,
        color: 'bg-purple-500',
      },
      {
        type: 'scheduleAGenerator',
        displayName: 'Schedule A Generator',
        description: 'Generate Schedule A (Itemized Deductions)',
        icon: FileText,
        color: 'bg-purple-500',
      },
      {
        type: 'scheduleCGenerator',
        displayName: 'Schedule C Generator',
        description: 'Generate Schedule C (Business Income)',
        icon: FileText,
        color: 'bg-purple-500',
      },
      {
        type: 'scheduleSEGenerator',
        displayName: 'Schedule SE Generator',
        description: 'Generate Schedule SE (Self-Employment Tax)',
        icon: FileText,
        color: 'bg-purple-500',
      },
    ],
  },
  {
    name: 'Validation',
    icon: AlertCircle,
    nodes: [
      {
        type: 'irsValidator',
        displayName: 'IRS Validator',
        description: 'Validate against IRS rules',
        icon: AlertCircle,
        color: 'bg-yellow-500',
      },
      {
        type: 'mathCheckValidator',
        displayName: 'Math Check Validator',
        description: 'Validate mathematical accuracy',
        icon: AlertCircle,
        color: 'bg-yellow-500',
      },
    ],
  },
  {
    name: 'Output',
    icon: FileOutput,
    nodes: [
      {
        type: 'pdfPackageGenerator',
        displayName: 'PDF Package Generator',
        description: 'Generate PDF package with all forms',
        icon: FileOutput,
        color: 'bg-red-500',
      },
      {
        type: 'excelReportGenerator',
        displayName: 'Excel Report Generator',
        description: 'Generate comprehensive Excel report',
        icon: FileOutput,
        color: 'bg-red-500',
      },
    ],
  },
];

export function NodePalette() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Input', 'Calculation', 'Forms', 'Validation', 'Output'])
  );

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const onDragStart = (event: React.DragEvent, nodeType: string, displayName: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('displayName', displayName);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleKeyDown = (
    event: React.KeyboardEvent,
    nodeType: string,
    displayName: string
  ) => {
    // Allow keyboard users to initiate drag with Enter or Space
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Store node info for keyboard "drag"
      // In a full implementation, this would trigger a visual picker or modal
      // For now, we'll show an instructional message
      console.log(
        `Keyboard user selected: ${displayName} (${nodeType}). In production, this would open a placement dialog.`
      );
      // TODO: Implement accessible node placement modal
    }
  };

  const filteredCategories = NODE_TYPES.map((category) => ({
    ...category,
    nodes: category.nodes.filter(
      (node) =>
        node.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.nodes.length > 0);

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Node Palette</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            aria-label="Search nodes"
          />
        </div>
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredCategories.map((category) => {
          const CategoryIcon = category.icon;
          const isExpanded = expandedCategories.has(category.name);

          return (
            <div key={category.name} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                aria-expanded={isExpanded}
                aria-label={`Toggle ${category.name} category`}
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon size={18} className="text-gray-600" />
                  <span className="font-medium text-gray-900">{category.name}</span>
                  <span className="text-xs text-gray-500">({category.nodes.length})</span>
                </div>
                {isExpanded ? (
                  <ChevronDown size={18} className="text-gray-600" />
                ) : (
                  <ChevronRight size={18} className="text-gray-600" />
                )}
              </button>

              {/* Category Nodes */}
              {isExpanded && (
                <div className="p-2 space-y-1 bg-white">
                  {category.nodes.map((node) => {
                    const NodeIcon = node.icon;

                    return (
                      <div
                        key={node.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, node.type, node.displayName)}
                        onKeyDown={(e) => handleKeyDown(e, node.type, node.displayName)}
                        className="p-3 border border-gray-200 rounded-md cursor-move hover:border-blue-400 hover:shadow-sm transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        role="button"
                        tabIndex={0}
                        aria-label={`Add ${node.displayName} node to canvas. Press Enter or Space to select.`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`${node.color} p-1.5 rounded`}>
                            <NodeIcon size={16} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900">
                              {node.displayName}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {node.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Search size={32} className="mx-auto mb-2 opacity-50" />
            <p>No nodes found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Drag nodes onto the canvas to build your workflow
        </p>
      </div>
    </div>
  );
}
