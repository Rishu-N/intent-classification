import React, { useMemo, useRef, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';
import type { HierarchicalResult, IntentTree } from '../../types';

interface Props {
  result: HierarchicalResult;
  intentTree: IntentTree | null;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 50;
const H_GAP = 20;
const V_GAP = 80;

function buildNodes(
  result: HierarchicalResult,
  intentTree: IntentTree | null
): { nodes: Node[]; edges: Edge[] } {
  if (!intentTree) return { nodes: [], edges: [] };

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const chosenDomain = result.domain;
  const chosenCategory = result.category;
  const chosenIntent = result.final_intent;

  // Row 0: all domains
  const domains = Object.keys(intentTree.tree);
  const domainY = 0;

  domains.forEach((d, i) => {
    const x = i * (NODE_WIDTH + H_GAP);
    const chosen = d === chosenDomain;
    nodes.push({
      id: `domain-${d}`,
      data: { label: d, confidence: result.steps[0]?.confidence, chosen },
      position: { x, y: domainY },
      style: {
        width: NODE_WIDTH,
        background: chosen ? '#4f46e5' : '#f1f5f9',
        color: chosen ? '#fff' : '#64748b',
        border: chosen ? '2px solid #4f46e5' : '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: chosen ? 700 : 400,
        padding: '6px 8px',
        textAlign: 'center',
      },
    });
  });

  // Row 1: categories of chosen domain
  const categories = Object.keys(intentTree.tree[chosenDomain] || {});
  const catY = domainY + NODE_HEIGHT + V_GAP;
  const catOffsetX = (domains.indexOf(chosenDomain) * (NODE_WIDTH + H_GAP)) -
    ((categories.length - 1) * (NODE_WIDTH + H_GAP)) / 2;

  categories.forEach((c, i) => {
    const x = catOffsetX + i * (NODE_WIDTH + H_GAP);
    const chosen = c === chosenCategory;
    const nodeId = `cat-${c}`;
    nodes.push({
      id: nodeId,
      data: { label: c, confidence: result.steps[1]?.confidence, chosen },
      position: { x, y: catY },
      style: {
        width: NODE_WIDTH,
        background: chosen ? '#7c3aed' : '#f8fafc',
        color: chosen ? '#fff' : '#64748b',
        border: chosen ? '2px solid #7c3aed' : '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: chosen ? 700 : 400,
        padding: '6px 8px',
        textAlign: 'center',
      },
    });
    edges.push({
      id: `e-domain-${c}`,
      source: `domain-${chosenDomain}`,
      target: nodeId,
      style: { stroke: chosen ? '#7c3aed' : '#e2e8f0', strokeWidth: chosen ? 2 : 1 },
      animated: chosen,
    });
  });

  // Row 2: intents of chosen category
  const intents = intentTree.tree[chosenDomain]?.[chosenCategory] || [];
  const intentY = catY + NODE_HEIGHT + V_GAP;
  const intOffsetX = (categories.indexOf(chosenCategory) * (NODE_WIDTH + H_GAP)) + catOffsetX -
    ((intents.length - 1) * (NODE_WIDTH + H_GAP)) / 2;

  intents.forEach((intent, i) => {
    const x = intOffsetX + i * (NODE_WIDTH + H_GAP);
    const chosen = intent === chosenIntent;
    const nodeId = `intent-${intent}`;
    nodes.push({
      id: nodeId,
      data: { label: intent, confidence: result.steps[2]?.confidence, chosen },
      position: { x, y: intentY },
      style: {
        width: NODE_WIDTH,
        background: chosen ? '#059669' : '#f8fafc',
        color: chosen ? '#fff' : '#64748b',
        border: chosen ? '2px solid #059669' : '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: chosen ? 700 : 400,
        padding: '6px 8px',
        textAlign: 'center',
      },
    });
    edges.push({
      id: `e-cat-${intent}`,
      source: `cat-${chosenCategory}`,
      target: nodeId,
      style: { stroke: chosen ? '#059669' : '#e2e8f0', strokeWidth: chosen ? 2 : 1 },
      animated: chosen,
    });
  });

  return { nodes, edges };
}

const TreeInner: React.FC<Props> = ({ result, intentTree }) => {
  const { nodes, edges } = useMemo(
    () => buildNodes(result, intentTree),
    [result, intentTree]
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  const handleDownload = useCallback(async () => {
    if (!containerRef.current) return;
    // Fit the view first so all nodes are visible in the export
    fitView({ padding: 0.15, duration: 0 });
    await new Promise((r) => setTimeout(r, 100)); // let fitView settle
    const dataUrl = await toPng(containerRef.current, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `intent-traversal-${result.final_intent.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  }, [fitView, result.final_intent]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Traversal Path Visualization</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Purple = domain · Violet = category · Green = final intent
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PNG
        </button>
      </div>
      <div ref={containerRef} style={{ height: 560 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          minZoom={0.2}
        >
          <Background color="#f1f5f9" gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
};

export const TraversalTree: React.FC<Props> = (props) => (
  <ReactFlowProvider>
    <TreeInner {...props} />
  </ReactFlowProvider>
);
