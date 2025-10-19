import { useEffect, useRef, useState } from 'react';
import { NodeLibrary } from './NodeLibrary';
import { NodeCanvas } from './NodeCanvas';
import { NodeInspector } from './NodeInspector';
import { K1Toolbar } from './K1Toolbar';
import type { NodeData, Wire } from './types';
import { toast } from 'sonner@2.0.3';
import { stubTick, PREVIEW_SPEC, ENGINE_CONFIG, applyFrameCapRGB8 } from './engine';
import { makePutPlan, dryRunReport, sendPlanOverWs, serializeTLV } from './transport/wsTlv';

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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const backoffMsRef = useRef<number>(500);
  const pingTimerRef = useRef<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);
  const [statusText, setStatusText] = useState<string>("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastAck, setLastAck] = useState<string | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const [deviceVer, setDeviceVer] = useState<string | null>(null);
  const [deviceLedCount, setDeviceLedCount] = useState<number | null>(null);
  const [deviceAvail, setDeviceAvail] = useState<number | null>(null);
  const [deviceMaxChunk, setDeviceMaxChunk] = useState<number | null>(null);
  const [deviceCaps, setDeviceCaps] = useState<number | null>(null);
  const [deviceBrightness, setDeviceBrightness] = useState<number>(() => Number(localStorage.getItem('k1.devBri') ?? 100));
  const cancelSeqRef = useRef<boolean>(false);
  // Frame meter
  const [avgMsPerFrame, setAvgMsPerFrame] = useState<number | null>(null);
  const [droppedInWindow, setDroppedInWindow] = useState<number | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const dropCountRef = useRef<number>(0);
  const [patterns, setPatterns] = useState<{ name: string; size: number; mtime: number }[]>([]);
  const [deviceGamma, setDeviceGamma] = useState<number>(() => Number(localStorage.getItem('k1.devGamma') ?? 2.2));
  useEffect(() => { localStorage.setItem('k1.devGamma', String(deviceGamma)); }, [deviceGamma]);

  function interpretAck(ev: MessageEvent): {
    ok: boolean;
    message: string;
    code?: string;
    bytes?: number;
    crcOk?: boolean;
    seq?: number;
  } {
    const raw = ev.data;
    // If string: try JSON first
    if (typeof raw === 'string') {
      const s = raw.trim();
      try {
        const obj = JSON.parse(s);
        const ok = Boolean(obj.ok ?? /ok|ack/i.test(String(obj.status ?? '')));
        const code = String(obj.code ?? obj.status ?? (ok ? 'OK' : 'ERR'));
        const bytes = typeof obj.bytes === 'number' ? obj.bytes : undefined;
        const crcOk = typeof obj.crcOk === 'boolean' ? obj.crcOk : undefined;
        const seq = typeof obj.seq === 'number' ? obj.seq : undefined;
        const msg = obj.message ?? obj.msg ?? code;
        return { ok, message: String(msg), code, bytes, crcOk, seq };
      } catch {}
      // key=value tokens: e.g., "OK BYTES=4096 CRC=OK" or "ERR CODE=CRC_BAD"
      const upper = s.toUpperCase();
      const ok = upper.startsWith('OK') || upper.includes(' ACK');
      const codeMatch = upper.match(/CODE=([A-Z0-9_\-]+)/);
      const bytesMatch = upper.match(/BYTES=(\d+)/);
      const crcOk = upper.includes('CRC=OK') || upper.includes('CRC_OK');
      const seqMatch = upper.match(/SEQ=(\d+)/);
      const code = codeMatch?.[1] ?? (ok ? 'OK' : (upper.startsWith('ERR') ? 'ERR' : undefined));
      const bytes = bytesMatch ? Number(bytesMatch[1]) : undefined;
      const seq = seqMatch ? Number(seqMatch[1]) : undefined;
      const human = mapDeviceCode(code, ok, crcOk);
      return { ok, message: human, code, bytes, crcOk, seq };
    }
    // If binary: parse TLV [TYPE:1][LEN_BE:2][PAYLOAD:LEN][CRC32_BE:4]
    if (raw instanceof ArrayBuffer) {
      const u8 = new Uint8Array(raw);
      if (u8.length >= 7) {
        const type = u8[0];
        const len = (u8[1] << 8) | u8[2];
        const total = 1 + 2 + len + 4;
        if (u8.length >= total) {
          const payload = u8.subarray(3, 3 + len);
          if (type === 0xFF) {
            // ERROR: payload = [code:u8][ascii_msg]
            const codeByte = payload[0];
            const msg = new TextDecoder().decode(payload.subarray(1));
            const codeMap: Record<number, string> = {
              0x01: 'ERR_INVALID_FRAME',
              0x02: 'ERR_CRC_MISMATCH',
              0x03: 'ERR_SIZE_EXCEEDED',
              0x04: 'ERR_STORAGE_FULL',
              0x05: 'ERR_NOT_FOUND',
            };
            const code = codeMap[codeByte] || `ERR_${codeByte.toString(16)}`;
            return { ok: false, message: mapDeviceCode(code, false), code };
          }
          if (type === 0x30) {
            // STATUS: two shapes used by firmware
            // a) General status: [verlen:u32le][ver][led:u16][avail:u32][maxChunk:u16]...
            // b) PUT_END ack: [name_len:u8][name]
            if (len >= 5) {
              const verlen = payload[0] | (payload[1] << 8) | (payload[2] << 16) | (payload[3] << 24);
              if (verlen > 0 && verlen + 4 <= len) {
                const ver = new TextDecoder().decode(payload.subarray(4, 4 + verlen));
                return { ok: true, message: `STATUS ${ver}` };
              }
            }
            const nameLen = payload[0] ?? 0;
            const name = new TextDecoder().decode(payload.subarray(1, 1 + nameLen));
            return { ok: true, message: `Uploaded ${name || 'pattern'}` };
          }
          return { ok: true, message: `ACK 0x${type.toString(16)}` };
        }
      }
      return { ok: true, message: `ACK [${u8.byteLength}B]`, code: 'ACK_BIN' };
    }
    // Fallback
    return { ok: true, message: 'ACK', code: 'ACK' };
  }

  function mapDeviceCode(code: string | undefined, ok: boolean, crcOk?: boolean): string {
    const c = (code ?? (ok ? 'OK' : 'ERR')).toUpperCase();
    switch (c) {
      case 'OK':
      case 'ACK':
        return crcOk === false ? 'ACK (CRC mismatch)' : 'ACK OK';
      case 'CRC_OK':
        return 'ACK OK (CRC verified)';
      case 'CRC_BAD':
        return 'Error: CRC mismatch';
      case 'TIMEOUT':
        return 'Error: Device timeout';
      case 'BUSY':
        return 'Device busy';
      case 'INVALID':
      case 'BAD_REQUEST':
        return 'Error: Invalid request';
      default:
        return ok ? `ACK ${c}` : `Error: ${c}`;
    }
  }

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
  useEffect(() => { localStorage.setItem('k1.devBri', String(deviceBrightness)); }, [deviceBrightness]);

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
      frameTimesRef.current = [];
      dropCountRef.current = 0;
      setAvgMsPerFrame(null);
      setDroppedInWindow(null);
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
        // Frame meter update
        frameTimesRef.current.push(elapsed);
        if (elapsed > frameInterval * 1.5) dropCountRef.current += 1;
        const WINDOW = 60; // last 60 frames (~0.5–2s depending on fps)
        if (frameTimesRef.current.length > WINDOW) frameTimesRef.current.shift();
        const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        setAvgMsPerFrame(avg);
        setDroppedInWindow(dropCountRef.current);
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
    const plan = makePutPlan(name, bytes, deviceMaxChunk ?? undefined);
    const report = dryRunReport(plan);
    toast.success(`Dry-run: ${report.frames} frames, CRC ${report.crcHex}, ${report.totalBytes} bytes`);
    console.log('[WS-TLV dry-run]', report);
  };

  const validateWs = (url: string) => {
    try { const u = new URL(url); return u.protocol === 'ws:' || u.protocol === 'wss:'; } catch { return false; }
  };

  const handleConnectWs = () => {
    if (!validateWs(wsUrl)) { toast.error('Invalid URL (use ws:// or wss://)'); return; }
    localStorage.setItem('k1.wsUrl', wsUrl);
    // establish or re-establish persistent socket
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    setStatusText('Connecting…');
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      setWsConnected(true);
      setStatusText('Connected');
      toast.success('Connected to WebSocket');
      // reset backoff on successful connect
      backoffMsRef.current = 500;
      // start keepalive ping
      if (pingTimerRef.current) window.clearInterval(pingTimerRef.current);
      pingTimerRef.current = window.setInterval(() => {
        try {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send('ping');
          }
        } catch {}
      }, 30000);
      // Probe STATUS (0x30) and then poll periodically
      const requestStatus = () => {
        try {
          const statusFrame = serializeTLV(tlv(0x30 as any, new Uint8Array(0)));
          const tStart = performance.now();
          ws.send(statusFrame);
          const handler = (ev: MessageEvent) => {
            try {
              if (!(ev.data instanceof ArrayBuffer)) return;
              const u8 = new Uint8Array(ev.data);
              if (u8.length >= 7 && u8[0] === 0x30) {
                const len = (u8[1] << 8) | u8[2];
                const payload = u8.subarray(3, 3 + len);
                if (payload.length >= 4) {
                  const verlen = payload[0] | (payload[1] << 8) | (payload[2] << 16) | (payload[3] << 24);
                  let off = 4 + Math.max(0, Math.min(verlen, payload.length - 4));
                  const ver = verlen > 0 ? new TextDecoder().decode(payload.subarray(4, 4 + verlen)) : undefined;
                  if (payload.length >= off + 2 + 4 + 2) {
                    const ledCount = payload[off] | (payload[off + 1] << 8); off += 2;
                    const avail = payload[off] | (payload[off + 1] << 8) | (payload[off + 2] << 16) | (payload[off + 3] << 24); off += 4;
                    const maxChunk = payload[off] | (payload[off + 1] << 8);
                    if (maxChunk && maxChunk > 0) setDeviceMaxChunk(maxChunk);
                    if (ver) setDeviceVer(ver);
                    setDeviceLedCount(ledCount);
                    setDeviceAvail(avail);
                    // Optional caps u32 after maxChunk
                    if (payload.length >= off + 2 + 4) {
                      const capsIdx = off + 2;
                      const caps = payload[capsIdx] | (payload[capsIdx+1]<<8) | (payload[capsIdx+2]<<16) | (payload[capsIdx+3]<<24);
                      setDeviceCaps(caps >>> 0);
                    }
                    const mb = (avail / (1024 * 1024)).toFixed(1);
                    setStatusText(`v${ver ?? '?'} · free ${mb}MB · chunk ${maxChunk}`);
                  }
                }
                ws.removeEventListener('message', handler as any);
                setLatencyMs(Math.round(performance.now() - tStart));
              }
            } catch {}
          };
          ws.addEventListener('message', handler as any);
        } catch {}
      };
      setStatusText('Connected (probing)');
      requestStatus();
      if (statusTimerRef.current) window.clearInterval(statusTimerRef.current);
      statusTimerRef.current = window.setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) requestStatus();
      }, 15000);
    };
    ws.onerror = () => { setWsConnected(false); setStatusText('Error'); };
    ws.onclose = () => {
      setWsConnected(false);
      setStatusText('Disconnected');
      // stop ping
      if (pingTimerRef.current) { window.clearInterval(pingTimerRef.current); pingTimerRef.current = null; }
      if (statusTimerRef.current) { window.clearInterval(statusTimerRef.current); statusTimerRef.current = null; }
      // schedule auto-reconnect with backoff + jitter
      const base = backoffMsRef.current;
      const jitter = Math.floor(Math.random() * Math.min(1000, base / 2));
      const delay = Math.min(15000, base + jitter);
      backoffMsRef.current = Math.min(15000, Math.floor(base * 2));
      toast.info(`Reconnecting in ${Math.round(delay/1000)}s…`);
      // live countdown in status
      let remaining = Math.round(delay / 1000);
      setStatusText(`Reconnecting in ${remaining}s…`);
      const countdown = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) { window.clearInterval(countdown); return; }
        setStatusText(`Reconnecting in ${remaining}s…`);
      }, 1000);
      if (!reconnectTimerRef.current) {
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          handleConnectWs();
        }, delay);
      }
    };
    ws.onmessage = (ev) => {
      const data = ev.data;
      const text = typeof data === 'string' ? data : `[${(data as ArrayBuffer).byteLength}B]`;
      setLastAck(String(text).slice(0, 120));
    };
    wsRef.current = ws;
    toast.success('Connecting to WebSocket…');
  };

  const sendSingle = async () => {
    const name = 'graph.json';
    const json = JSON.stringify(buildExportPayload());
    const bytes = new TextEncoder().encode(json);
    if (bytes.length > 262144) {
      throw new Error(`Payload too large (${bytes.length} bytes > 262,144)`);
    }
    const plan = makePutPlan(name, bytes, deviceMaxChunk ?? undefined);
    if (wsRef.current) {
      // wait for open
      if (wsRef.current.readyState !== WebSocket.OPEN) {
        await new Promise<void>((resolve, reject) => {
          const start = performance.now();
          const tick = () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return resolve();
            if (performance.now() - start > 5000) return reject(new Error('WS connect timeout'));
            setTimeout(tick, 50);
          };
          tick();
        });
      }
      const ws = wsRef.current;
      const sendOnceAndAwaitAck = async (): Promise<{ ok: boolean; code?: string; message: string }> => {
        const ackPromise = new Promise<MessageEvent>((resolve) => {
          const handler = (ev: MessageEvent) => {
            ws!.removeEventListener('message', handler as any);
            resolve(ev);
          };
          ws!.addEventListener('message', handler as any);
        });
        const t0 = performance.now();
        for (const tl of plan.tlvs) ws!.send(serializeTLV(tl));
        try {
          const ack = await Promise.race([
            ackPromise,
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('ACK timeout')), 3000)),
          ]);
          const t1 = performance.now();
          setLatencyMs(Math.round(t1 - t0));
          const parsed = interpretAck(ack);
          setLastAck(parsed.message);
          return { ok: parsed.ok, code: parsed.code, message: parsed.message };
        } catch (e) {
          setLatencyMs(null);
          return { ok: false, code: 'TIMEOUT', message: 'ACK timeout' };
        }
      };
      const retryable = new Set(['ERR_BUSY', 'ERR_CRC_MISMATCH', 'CRC_BAD', 'TIMEOUT']);
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await sendOnceAndAwaitAck();
        if (res.ok) break;
        if (!res.code || !retryable.has(res.code)) { setStatusText(res.message); break; }
        if (attempt < maxAttempts) {
          setStatusText(`Retry ${attempt}/${maxAttempts - 1}: ${res.message}`);
          await new Promise((r) => setTimeout(r, 300 * attempt));
        } else {
          setStatusText(`Failed: ${res.message}`);
        }
      }
    } else {
      await sendPlanOverWs(wsUrl, plan);
    }
  };

  const handleSendWs = async () => {
    try {
      if (!validateWs(wsUrl)) { toast.error('Invalid URL (use ws:// or wss://)'); return; }
      setSending(true);
      setStatusText('Sending…');
      await sendSingle();
      setStatusText('Sent');
      toast.success('Sent TLV payload over WebSocket');
    } catch (e) {
      console.error(e);
      setStatusText('Error');
      toast.error('Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleSendSequence = async () => {
    try {
      if (!validateWs(wsUrl)) { toast.error('Invalid URL (use ws:// or wss://)'); return; }
      const total = Math.max(1, Math.min(273, sequenceEnabled ? sequenceFrames : 1));
      const intervalMs = Math.max(1, Math.round(1000 / Math.max(1, fps)));
      setSending(true);
      setSendProgress({ current: 0, total });
      setStatusText('Streaming…');
      cancelSeqRef.current = false;
      for (let i = 1; i <= total; i++) {
        if (cancelSeqRef.current) { setStatusText('Canceled'); break; }
        await sendSingle();
        setSendProgress({ current: i, total });
        await new Promise(res => setTimeout(res, intervalMs));
      }
      setStatusText('Done');
      toast.success(`Streamed ${total} frame(s)`);
    } catch (e) {
      console.error(e);
      setStatusText('Error');
      toast.error('Sequence failed');
    } finally {
      setSending(false);
      setTimeout(() => setSendProgress(null), 1500);
    }
  };

  const requestPatterns = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) handleConnectWs();
    try {
      const frame = serializeTLV(tlv(0x22 as any, new Uint8Array(0)));
      wsRef.current!.send(frame);
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => { wsRef.current?.removeEventListener('message', handler as any); reject(new Error('LIST timeout')); }, 1500);
        const handler = (ev: MessageEvent) => {
          try {
            if (!(ev.data instanceof ArrayBuffer)) return;
            const u8 = new Uint8Array(ev.data);
            if (u8.length >= 7 && u8[0] === 0x30) {
              const len = (u8[1] << 8) | u8[2];
              const payload = u8.subarray(3, 3 + len);
              if (payload.length >= 2) {
                const count = (payload[0] << 8) | payload[1];
                let off = 2;
                const list: { name: string; size: number; mtime: number }[] = [];
                for (let i = 0; i < count; i++) {
                  if (payload.length < off + 2) break;
                  const nameLen = (payload[off] << 8) | payload[off+1]; off += 2;
                  const name = new TextDecoder().decode(payload.subarray(off, off + nameLen)); off += nameLen;
                  const size = payload[off] | (payload[off+1]<<8) | (payload[off+2]<<16) | (payload[off+3]<<24); off += 4;
                  const mtime = payload[off] | (payload[off+1]<<8) | (payload[off+2]<<16) | (payload[off+3]<<24); off += 4;
                  list.push({ name, size, mtime });
                }
                setPatterns(list);
              }
              window.clearTimeout(timeout);
              wsRef.current?.removeEventListener('message', handler as any);
              resolve();
            }
          } catch {}
        };
        wsRef.current!.addEventListener('message', handler as any);
      });
    } catch {}
  };

  const handleSaveProject = () => {
    try {
      const project = {
        kind: 'PRISM.k1-project',
        version: 1,
        savedAt: new Date().toISOString(),
        graph: buildExportPayload(),
        ui: {
          leftWidth,
          rightWidth,
          libraryMini,
          gridOn,
          mode,
          density,
          zoomPreset,
          edgeMode,
          fps,
          capEnabled,
          capPercent,
          sequenceEnabled,
          sequenceFrames,
        },
        device: {
          wsUrl,
          deviceVer,
          deviceLedCount,
          deviceAvail,
          deviceMaxChunk,
          deviceCaps,
          deviceBrightness,
          deviceGamma,
        },
      };
      const json = JSON.stringify(project, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `project-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Project saved');
    } catch {
      toast.error('Save failed');
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
          onPlayPause={async () => {
            const next = !playing;
            setPlaying(next);
            try {
              if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) handleConnectWs();
              const cmd = next ? 0x01 : 0x02; // PLAY/STOP
              const frame = serializeTLV(tlv(0x20 as any, new Uint8Array([cmd])));
              wsRef.current?.send(frame);
            } catch {}
          }}
          onResetLayout={handleResetLayout}
          onSave={handleSaveProject}
          onExport={handleExportDownload}
          onExportCopy={handleExportCopy}
          onExportDownload={handleExportDownload}
          onDryRun={handleDryRunSend}
          onSend={sequenceEnabled ? handleSendSequence : handleSendWs}
          wsUrl={wsUrl}
          onWsUrlChange={setWsUrl}
          onConnectWs={handleConnectWs}
          onDisconnectWs={() => { try { wsRef.current?.close(); } catch {} wsRef.current = null; setWsConnected(false); setStatusText('Disconnected'); }}
          connected={wsConnected}
          sending={sending}
          sendProgress={sendProgress}
          statusText={statusText}
          latencyMs={latencyMs}
          lastAck={lastAck}
          deviceVer={deviceVer}
          deviceLedCount={deviceLedCount}
          deviceAvail={deviceAvail ?? null}
          deviceMaxChunk={deviceMaxChunk ?? null}
          deviceCaps={deviceCaps ?? null}
          patterns={patterns}
          onRefreshPatterns={requestPatterns}
          onPlayPattern={async (name) => {
            try {
              if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) handleConnectWs();
              const nb = new TextEncoder().encode(name);
              const payload = new Uint8Array(2 + nb.length);
              payload[0] = 0x01; // PLAY
              payload[1] = nb.length & 0xFF;
              payload.set(nb, 2);
              const frame = serializeTLV(tlv(0x20 as any, payload));
              wsRef.current?.send(frame);
              toast.success(`Playing ${name}`);
            } catch { toast.error('Play failed'); }
          }}
          deviceBrightness={deviceBrightness}
          onDeviceBrightnessChange={async (pct) => {
            setDeviceBrightness(pct);
            try {
              const target = Math.max(0, Math.min(255, Math.round((pct / 100) * 255)));
              const payload = new Uint8Array([0x10, target, 0x01, 0x2C]); // BRIGHTNESS cmd + 300ms
              const frame = serializeTLV(tlv(0x20 as any, payload));
              if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) handleConnectWs();
              wsRef.current?.send(frame);
            } catch {}
          }}
          deviceGamma={deviceGamma}
          onDeviceGammaChange={async (gamma) => {
            setDeviceGamma(gamma);
            try {
              const g = Math.max(1, Math.min(3, gamma));
              const gx100 = Math.round(g * 100);
              const payload = new Uint8Array([0x11, (gx100 >> 8) & 0xFF, gx100 & 0xFF, 0x01, 0x2C]); // GAMMA + 300ms
              const frame = serializeTLV(tlv(0x20 as any, payload));
              if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) handleConnectWs();
              wsRef.current?.send(frame);
            } catch {}
          }}
          avgMsPerFrame={avgMsPerFrame}
          droppedInWindow={droppedInWindow}
          onCancelSend={() => { cancelSeqRef.current = true; }}
          onImport={async () => {
            try {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'application/json';
              await new Promise<void>((resolve) => {
                input.onchange = () => resolve();
                input.click();
              });
              const file = input.files?.[0];
              if (!file) return;
              const text = await file.text();
              const data = JSON.parse(text);
              if (Array.isArray(data.nodes) && Array.isArray(data.wires)) {
                setNodes(data.nodes);
                setWires(data.wires);
                setSelectedNodeId(data.nodes[0]?.id ?? null);
                toast.success(`Loaded project (${file.name})`);
              } else {
                toast.error('Invalid project file');
              }
            } catch (e) { toast.error('Load failed'); }
          }}
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
