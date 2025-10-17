import { useEffect, useRef, useState } from 'react';
import { NodeLibrary } from './NodeLibrary';
import { NodeCanvas } from './NodeCanvas';
import { NodeInspector } from './NodeInspector';
import { K1Toolbar } from './K1Toolbar';
import type { NodeData, Wire, Port } from './types';
import { toast } from 'sonner@2.0.3';
import { stubTick } from './engine';

// Helper to create sample nodes
function createNode(
  id: string,
  templateId: string,
  position: { x: number; y: number }
): NodeData {
  const templates: Record<string, Partial<NodeData>> = {
    gradient: {
      title: 'Gradient',
      category: 'generator',
      icon: '🌈',
      inputs: [],
      outputs: [
        { id: 'output', label: 'Field', type: 'field' },
      ],
      parameters: [
        { id: 'angle', label: 'Angle', type: 'slider', value: 0, min: 0, max: 360, step: 1 },
        { id: 'start', label: 'Start', type: 'slider', value: 0, min: 0, max: 100, step: 1 },
        { id: 'end', label: 'End', type: 'slider', value: 100, min: 0, max: 100, step: 1 },
      ],
    },
    noise: {
      title: 'Noise',
      category: 'generator',
      icon: '⚡',
      inputs: [],
      outputs: [
        { id: 'output', label: 'Field', type: 'field' },
      ],
      parameters: [
        { id: 'scale', label: 'Scale', type: 'slider', value: 10, min: 1, max: 100, step: 1 },
        { id: 'speed', label: 'Speed', type: 'slider', value: 1, min: 0, max: 10, step: 0.1 },
        { id: 'octaves', label: 'Octaves', type: 'number', value: 3, min: 1, max: 8, step: 1 },
      ],
    },
    'hue-shift': {
      title: 'Hue Shift',
      category: 'color',
      icon: '🎨',
      inputs: [
        { id: 'input', label: 'Color', type: 'color' },
        { id: 'amount', label: 'Amount', type: 'scalar' },
      ],
      outputs: [
        { id: 'output', label: 'Color', type: 'color' },
      ],
      parameters: [
        { id: 'hue', label: 'Hue Shift', type: 'slider', value: 0, min: -180, max: 180, step: 1 },
      ],
    },
    blend: {
      title: 'Blend',
      category: 'combine',
      icon: '🔀',
      inputs: [
        { id: 'a', label: 'A', type: 'color' },
        { id: 'b', label: 'B', type: 'color' },
        { id: 'mix', label: 'Mix', type: 'scalar' },
      ],
      outputs: [
        { id: 'output', label: 'Result', type: 'color' },
      ],
      parameters: [
        { id: 'blend', label: 'Blend', type: 'slider', value: 50, min: 0, max: 100, step: 1 },
        { id: 'mode', label: 'Mode', type: 'select', value: 'mix', options: ['mix', 'add', 'multiply', 'screen'] },
      ],
    },
    'k1-output': {
      title: 'K1 Output',
      category: 'output',
      icon: '📤',
      inputs: [
        { id: 'color', label: 'Color', type: 'color' },
      ],
      outputs: [],
      parameters: [
        { id: 'brightness', label: 'Brightness', type: 'slider', value: 100, min: 0, max: 100, step: 1 },
        { id: 'edge', label: 'Edge', type: 'select', value: 'both', options: ['both', 'left', 'right'] },
      ],
    },
  };

  const template = templates[templateId] || {
    title: templateId,
    category: 'generator' as const,
    icon: '❓',
    inputs: [],
    outputs: [{ id: 'output', label: 'Output', type: 'output' as const }],
    parameters: [],
  };

  return {
    id,
    position,
    compact: false,
    ...template,
  } as NodeData;
}

export function LightLab() {
  const [nodes, setNodes] = useState<NodeData[]>([
    createNode('node-1', 'gradient', { x: 100, y: 100 }),
    createNode('node-2', 'hue-shift', { x: 400, y: 150 }),
    createNode('node-3', 'k1-output', { x: 700, y: 180 }),
  ]);

  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-1');
  const [playing, setPlaying] = useState(false);
  // Layout prefs (persisted)
  const [leftWidth, setLeftWidth] = useState<number>(() => Number(localStorage.getItem('k1.leftWidth')) || 280);
  const [rightWidth, setRightWidth] = useState<number>(() => Number(localStorage.getItem('k1.rightWidth')) || 320);
  const [libraryMini, setLibraryMini] = useState<boolean>(() => localStorage.getItem('k1.libraryMini') === 'true');
  const [gridOn, setGridOn] = useState<boolean>(() => (localStorage.getItem('k1.grid') ?? 'true') === 'true');
  const [mode, setMode] = useState<'edit' | 'perform'>(() => (localStorage.getItem('k1.mode') as any) || 'edit');
  const [density, setDensity] = useState<'compact' | 'cozy'>(() => (localStorage.getItem('k1.density') as any) || 'compact');
  const [zoomPreset, setZoomPreset] = useState<number>(() => Number(localStorage.getItem('k1.zoomPreset')) || 1);
  const [edgeMode, setEdgeMode] = useState<'bezier' | 'orthogonal'>(() => (localStorage.getItem('k1.edges') as any) || 'bezier');

  // apply widths to CSS variables
  useEffect(() => {
    const lib = libraryMini ? 72 : leftWidth;
    document.documentElement.style.setProperty('--lib-w', `${lib}px`);
  }, [leftWidth, libraryMini]);
  useEffect(() => {
    document.documentElement.style.setProperty('--insp-w', `${rightWidth}px`);
  }, [rightWidth]);

  // persist prefs
  useEffect(() => { localStorage.setItem('k1.leftWidth', String(leftWidth)); }, [leftWidth]);
  useEffect(() => { localStorage.setItem('k1.rightWidth', String(rightWidth)); }, [rightWidth]);
  useEffect(() => { localStorage.setItem('k1.libraryMini', String(libraryMini)); }, [libraryMini]);
  useEffect(() => { localStorage.setItem('k1.grid', String(gridOn)); }, [gridOn]);
  useEffect(() => { localStorage.setItem('k1.mode', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('k1.density', density); }, [density]);
  useEffect(() => { localStorage.setItem('k1.zoomPreset', String(zoomPreset)); }, [zoomPreset]);

  const handleResetLayout = () => {
    setLeftWidth(280);
    setRightWidth(320);
    setLibraryMini(false);
    setGridOn(true);
    setMode('edit');
    setDensity('compact');
    setZoomPreset(1);
    localStorage.setItem('k1.leftWidth', '280');
    localStorage.setItem('k1.rightWidth', '320');
    localStorage.setItem('k1.libraryMini', 'false');
    localStorage.setItem('k1.grid', 'true');
    localStorage.setItem('k1.mode', 'edit');
    localStorage.setItem('k1.density', 'compact');
    localStorage.setItem('k1.zoomPreset', '1');
    toast.success('Layout reset to defaults');
  };
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const [lastFrame, setLastFrame] = useState<Uint8Array | Float32Array | null>(null);

  const handleAddNode = (templateId: string) => {
    const newNode = createNode(
      `node-${Date.now()}`,
      templateId,
      { x: 300, y: 200 + nodes.length * 50 }
    );
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    toast.success(`Added ${newNode.title} node`);
  };

  const handleNodeMove = (nodeId: string, position: { x: number; y: number }) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, position } : node))
    );
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setWires((prev) =>
      prev.filter((wire) => wire.from.nodeId !== nodeId && wire.to.nodeId !== nodeId)
    );
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    toast.success('Node deleted');
  };

  const handleWireCreate = (wire: Omit<Wire, 'id'>) => {
    const fromNode = nodes.find((n) => n.id === wire.from.nodeId);
    const fromPort = fromNode?.outputs.find((p) => p.id === wire.from.portId);

    if (fromPort) {
      const newWire: Wire = {
        id: `wire-${Date.now()}`,
        ...wire,
        type: fromPort.type,
      };
      setWires([...wires, newWire]);
      toast.success('Connection created');
    }
  };

  const handleWireDelete = (wireId: string) => {
    setWires((prev) => prev.filter((wire) => wire.id !== wireId));
    toast.success('Connection deleted');
  };

  const handleParameterChange = (
    nodeId: string,
    parameterId: string,
    value: number | string | boolean
  ) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              parameters: node.parameters?.map((param) =>
                param.id === parameterId ? { ...param, value } : param
              ),
            }
          : node
      )
    );
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // Simple playback loop using stubTick
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startRef.current = null;
      return;
    }

    const loop = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const t = ts - startRef.current;
      const { frames } = stubTick(nodes, wires, t);
      setLastFrame(frames);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, nodes, wires]);

  // Export current graph (stub)
  const handleExport = async () => {
    const payload = {
      nodes,
      wires,
      params: {},
      preview: lastFrame ? Array.from(lastFrame as Uint8Array) : undefined,
      framesMeta: { length: 64, fps: 60 },
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      toast.success('Graph JSON copied to clipboard');
    } catch {
      toast.info('Download graph.json');
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'graph.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="workspace bg-[var(--k1-bg)]">
      {/* Background decoration */}
      <div className="workspace__canvas absolute inset-0 pointer-events-none opacity-60" aria-hidden>
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-gradient-to-bl from-[var(--k1-accent)]/40 via-[var(--k1-accent-2)]/30 to-transparent blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 left-0 w-[900px] h-[900px] bg-gradient-to-tr from-[var(--k1-accent-2)]/35 via-purple-500/25 to-transparent blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-pink-500/20 via-orange-500/20 to-transparent blur-[120px] animate-pulse" style={{ animationDuration: '15s', animationDelay: '4s' }} />
      </div>

      {/* Top: Toolbar */}
      <div className="workspace__toolbar">
        <K1Toolbar
          playing={playing}
          onPlayPause={() => setPlaying(!playing)}
          onResetLayout={handleResetLayout}
          onSave={() => toast.success('Pattern saved')}
          onExport={handleExport}
          onImport={() => toast.info('Import pattern')}
          onFullscreen={() => document.documentElement.requestFullscreen()}
          onSettings={() => toast.info('Settings')}
          nodeCount={nodes.length}
          wireCount={wires.length}
          showGrid={gridOn}
          onToggleGrid={() => setGridOn((v) => !v)}
          onZoomPreset={(z) => setZoomPreset(z)}
          currentZoom={zoomPreset}
          orthogonal={edgeMode === 'orthogonal'}
          onToggleEdges={() => {
            const next = edgeMode === 'orthogonal' ? 'bezier' : 'orthogonal';
            setEdgeMode(next);
            localStorage.setItem('k1.edges', next);
          }}
        />
      </div>

      {/* Left: Node Library */}
      <div className="workspace__library">
        <NodeLibrary onAddNode={handleAddNode} />
      </div>
      
      {/* Center: Canvas */}
      <div className="workspace__canvas">
        <NodeCanvas
          nodes={nodes}
          wires={wires}
          selectedNodeId={selectedNodeId || undefined}
          onNodeSelect={setSelectedNodeId}
          onNodeMove={handleNodeMove}
          onNodeDelete={handleNodeDelete}
          onWireCreate={handleWireCreate}
          onWireDelete={handleWireDelete}
<<<<<<< HEAD
          showGrid={gridOn}
=======
>>>>>>> origin/v0-friendly
        />
      </div>

      {/* Right: Inspector */}
      <div className="workspace__inspector">
        <NodeInspector
          node={selectedNode}
          onParameterChange={handleParameterChange}
          onDeleteNode={handleNodeDelete}
        />
      </div>
    </div>
  );
}
