import { useEffect, useRef, useState } from 'react';
import { NodeLibrary } from './NodeLibrary';
import { NodeCanvas } from './NodeCanvas';
import { NodeInspector } from './NodeInspector';
import { K1Toolbar } from './K1Toolbar';
import type { NodeData, Wire } from './types';
import { toast } from 'sonner@2.0.3';
import { stubTick, PREVIEW_SPEC, ENGINE_CONFIG, applyFrameCapRGB8 } from './engine';
import { makePutPlan, dryRunReport, sendPlanOverWs } from './transport/wsTlv';

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
        { id: 'start', label: 'Start', type: 'slider', value: 0, min: 0, max: 100, step: 1 },
        { id: 'end', label: 'End', type: 'slider', value: 100, min: 0, max: 100, step: 1 },
        { id: 'startColor', label: 'Start Color', type: 'select', value: '#000000', options: ['#000000','#ff007f','#00ffff','#ffffff'] },
        { id: 'endColor', label: 'End Color', type: 'select', value: '#ffffff', options: ['#ffffff','#00ff95','#ffea00','#000000'] },
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
  const [fps, setFps] = useState<number>(() => {
    const stored = Number(localStorage.getItem('k1.fps'));
    return [120, 60, 30].includes(stored) ? stored : PREVIEW_SPEC.fps;
  });
  const [capEnabled, setCapEnabled] = useState<boolean>(() => (localStorage.getItem('k1.capEnabled') ?? 'false') === 'true');
  const [capPercent, setCapPercent] = useState<number>(() => {
    const stored = Number(localStorage.getItem('k1.capPercent'));
    return Number.isFinite(stored) && stored >= 10 ? Math.min(100, Math.max(10, stored)) : 100;
  });
  const [lastFrameRaw, setLastFrameRaw] = useState<Uint8Array | null>(null);
  const [lastFramePreview, setLastFramePreview] = useState<Uint8Array | null>(null);
  const [sequenceEnabled, setSequenceEnabled] = useState<boolean>(() => localStorage.getItem('k1.sequenceEnabled') === 'true');
  const [sequenceFrames, setSequenceFrames] = useState<number>(() => Number(localStorage.getItem('k1.sequenceFrames') || 1));
  const [wsUrl, setWsUrl] = useState<string>(() => localStorage.getItem('k1.wsUrl') || 'ws://k1.local:80');

  const capByte = Math.max(0, Math.min(255, Math.round((capPercent / 100) * 255)));

  // UI polish: transient snap feedback for panel resizing
  const [leftSnapHint, setLeftSnapHint] = useState<number | null>(null);
  const [rightSnapHint, setRightSnapHint] = useState<number | null>(null);
  useEffect(() => {
    if (leftSnapHint == null) return;
    const id = setTimeout(() => setLeftSnapHint(null), 900);
    return () => clearTimeout(id);
  }, [leftSnapHint]);
  useEffect(() => {
    if (rightSnapHint == null) return;
    const id = setTimeout(() => setRightSnapHint(null), 900);
    return () => clearTimeout(id);
  }, [rightSnapHint]);

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
  useEffect(() => { localStorage.setItem('k1.fps', String(fps)); }, [fps]);
  useEffect(() => { localStorage.setItem('k1.capEnabled', String(capEnabled)); }, [capEnabled]);
  useEffect(() => { localStorage.setItem('k1.capPercent', String(capPercent)); }, [capPercent]);
  useEffect(() => { localStorage.setItem('k1.sequenceEnabled', String(sequenceEnabled)); }, [sequenceEnabled]);
  useEffect(() => { localStorage.setItem('k1.sequenceFrames', String(sequenceFrames)); }, [sequenceFrames]);
  useEffect(() => { localStorage.setItem('k1.wsUrl', wsUrl); }, [wsUrl]);

  const handleResetLayout = () => {
    setLeftWidth(280);
    setRightWidth(320);
    setLibraryMini(false);
    setGridOn(true);
    setMode('edit');
    setDensity('compact');
    setZoomPreset(1);
    setFps(PREVIEW_SPEC.fps);
    setCapEnabled(false);
    setCapPercent(100);
    localStorage.setItem('k1.leftWidth', '280');
    localStorage.setItem('k1.rightWidth', '320');
    localStorage.setItem('k1.libraryMini', 'false');
    localStorage.setItem('k1.grid', 'true');
    localStorage.setItem('k1.mode', 'edit');
    localStorage.setItem('k1.density', 'compact');
    localStorage.setItem('k1.zoomPreset', '1');
    localStorage.setItem('k1.fps', String(PREVIEW_SPEC.fps));
    localStorage.setItem('k1.capEnabled', 'false');
    localStorage.setItem('k1.capPercent', '100');
    toast.success('Layout reset to defaults');
  };
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

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
      lastFrameTimeRef.current = 0;
      return;
    }

    const frameInterval = 1000 / fps;
    startRef.current = null;
    lastFrameTimeRef.current = 0;

    const loop = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      if (lastFrameTimeRef.current === 0) lastFrameTimeRef.current = ts - frameInterval;

      const elapsed = ts - lastFrameTimeRef.current;
      if (elapsed >= frameInterval) {
        lastFrameTimeRef.current = ts;
        const t = ts - startRef.current;
        const { frames } = stubTick(nodes, wires, t);
        setLastFrameRaw(frames);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, nodes, wires, fps]);

  useEffect(() => {
    if (!lastFrameRaw) {
      setLastFramePreview(null);
      return;
    }
    if (!capEnabled) {
      setLastFramePreview(lastFrameRaw);
      return;
    }
    const capped = new Uint8Array(lastFrameRaw);
    applyFrameCapRGB8(capped, capByte);
    setLastFramePreview(capped);
  }, [lastFrameRaw, capEnabled, capByte]);

  // Export current graph (stub)
  const buildExportPayload = () => {
    const previewFrame = lastFramePreview ? Array.from(new Uint8Array(lastFramePreview)) : undefined;
    const meta = {
      pixelCount: ENGINE_CONFIG.pixelCount,
      colorFormat: ENGINE_CONFIG.colorFormat,
      fps,
      mapping: ENGINE_CONFIG.mapping,
      ...(capEnabled ? { brightnessCap: capByte } : {}),
    };

    const framesMeta = { ...PREVIEW_SPEC, fps };
    const payload: any = {
      nodes,
      wires,
      params: {},
      preview: previewFrame,
      framesMeta,
      meta,
      exportedAt: new Date().toISOString(),
    };

    // Optional: clamp frames array to ≤ 273 if present (future-proof)
    const MAX_FRAMES = 273;
    if (Array.isArray((payload as any).frames)) {
      const framesArr = (payload as any).frames as number[][];
      if (framesArr.length > MAX_FRAMES) {
        (payload as any).frames = framesArr.slice(0, MAX_FRAMES);
        (payload as any).meta = { ...payload.meta, note: `Frames clamped to ${MAX_FRAMES} for payload size.` };
      }
    }

    return payload;
  };

  const handleExportCopy = async () => {
    const payload = {
      ...buildExportPayload(),
    };
    const json = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      toast.success('Export JSON copied to clipboard');
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  const handleExportDownload = () => {
    const payload = buildExportPayload();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download started: graph.json');
  };

  const handleDryRunSend = () => {
    const name = 'graph.json';
    const json = JSON.stringify(buildExportPayload());
    const bytes = new TextEncoder().encode(json);
    if (bytes.length > 262144) {
      toast.error(`Payload too large (${bytes.length} bytes > 262,144)`);
      return;
    }
    const plan = makePutPlan(name, bytes);
    const report = dryRunReport(plan);
    toast.success(`Dry-run: ${report.frames} frames, CRC ${report.crcHex}, ${report.totalBytes} bytes`);
    console.log('[WS-TLV dry-run]', report);
  };

  const handleSendWs = async () => {
    try {
      const input = window.prompt('Enter ws:// or wss:// device URL', wsUrl);
      if (!input) return;
      const valid = (() => { try { const u = new URL(input); return u.protocol === 'ws:' || u.protocol === 'wss:'; } catch { return false; } })();
      if (!valid) { toast.error('Invalid URL (must use ws:// or wss://)'); return; }
      setWsUrl(input);
      const name = 'graph.json';
      const json = JSON.stringify(buildExportPayload());
      const bytes = new TextEncoder().encode(json);
      if (bytes.length > 262144) {
        toast.error(`Payload too large (${bytes.length} bytes > 262,144)`);
        return;
      }
      const plan = makePutPlan(name, bytes);
      await sendPlanOverWs(plan, { url: input });
      toast.success('Sent TLV payload over WebSocket');
    } catch (e) {
      console.error(e);
      toast.error('Send failed');
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
          onExport={handleExportDownload}
          onExportCopy={handleExportCopy}
          onExportDownload={handleExportDownload}
          onDryRun={handleDryRunSend}
          onSend={handleSendWs}
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
          capEnabled={capEnabled}
          capPercent={capPercent}
          onToggleCap={() => setCapEnabled((prev) => !prev)}
          onCapPercentChange={(value) => setCapPercent(Math.min(100, Math.max(10, value)))}
          fps={fps}
          onFpsChange={(value) => {
            if ([120, 60, 30].includes(value)) setFps(value);
          }}
          sequenceEnabled={sequenceEnabled}
          onToggleSequence={() => setSequenceEnabled(v => !v)}
          sequenceFrames={sequenceFrames}
          onSequenceFramesChange={(n) => setSequenceFrames(n)}
        />
      </div>

      {/* Left: Node Library */}
      <div className="workspace__library relative">
        <NodeLibrary
          onAddNode={handleAddNode}
          mini={libraryMini}
          onToggleMini={() => setLibraryMini((v) => !v)}
        />
        {/* Right-edge drag handle for Library width */}
        {!libraryMini && (
          <div
            className="resize-handle-y"
            style={{ right: -4 }}
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            title="Resize library"
            aria-label="Resize library"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = leftWidth;
              const onMove = (ev: MouseEvent) => {
                const dx = ev.clientX - startX;
                const raw = startW + dx;
                // snap to 240/280/320/360 range and clamp
                const snaps = [240, 280, 320, 360];
                const clamped = Math.max(240, Math.min(360, raw));
                const snapped = snaps.reduce((a, b) => (Math.abs(b - clamped) < Math.abs(a - clamped) ? b : a), snaps[0]);
                setLeftWidth(snapped);
                setLeftSnapHint(snapped);
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          />
        )}
        {leftSnapHint != null && (
          <div className="absolute top-2 right-2 px-2 py-1 glass-panel rounded text-[10px] font-mono">
            {leftSnapHint}px
          </div>
        )}
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
          showGrid={gridOn}
          orthogonal={edgeMode === 'orthogonal'}
          zoomPreset={zoomPreset}
        />
      </div>

      {/* Right: Inspector */}
      <div className="workspace__inspector relative">
        <NodeInspector
          node={selectedNode}
          onParameterChange={handleParameterChange}
          onDeleteNode={handleNodeDelete}
        />
        {/* Left-edge drag handle for Inspector width */}
        <div
          className="resize-handle-y"
          style={{ left: -4 }}
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
          title="Resize inspector"
          aria-label="Resize inspector"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startW = rightWidth;
            const onMove = (ev: MouseEvent) => {
              const dx = startX - ev.clientX;
              const raw = startW + dx;
              // snap to 280/320/360/420 range and clamp
              const snaps = [280, 320, 360, 420];
              const clamped = Math.max(280, Math.min(420, raw));
              const snapped = snaps.reduce((a, b) => (Math.abs(b - clamped) < Math.abs(a - clamped) ? b : a), snaps[0]);
              setRightWidth(snapped);
              setRightSnapHint(snapped);
            };
            const onUp = () => {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        />
        {rightSnapHint != null && (
          <div className="absolute top-2 left-2 px-2 py-1 glass-panel rounded text-[10px] font-mono">
            {rightSnapHint}px
          </div>
        )}
      </div>
    </div>
  );
}
