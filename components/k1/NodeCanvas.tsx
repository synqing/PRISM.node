"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Node } from "./Node"
import { type NodeData, type Wire, PORT_COLORS } from "./types"

interface NodeCanvasProps {
  nodes: NodeData[]
  wires: Wire[]
  selectedNodeId?: string
  onNodeSelect?: (nodeId: string) => void
  onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void
  onNodeDelete?: (nodeId: string) => void
  onWireCreate?: (wire: Omit<Wire, "id">) => void
  onWireDelete?: (wireId: string) => void
}

export function NodeCanvas({
  nodes,
  wires,
  selectedNodeId,
  onNodeSelect,
  onNodeMove,
  onNodeDelete,
  onWireCreate,
  onWireDelete,
}: NodeCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [connectingPort, setConnectingPort] = useState<{
    nodeId: string
    portId: string
    isOutput: boolean
    type: string
  } | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Pan with space + drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isPanning) {
        e.preventDefault()
        setIsPanning(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsPanning(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [isPanning])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPanning || e.button === 1) {
      e.preventDefault()
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      setMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      })
    }

    if (isPanning || e.buttons === 4) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }

    if (draggedNode && !connectingPort) {
      const node = nodes.find((n) => n.id === draggedNode)
      if (node && rect) {
        const newX = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x
        const newY = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y
        onNodeMove?.(draggedNode, { x: newX, y: newY })
      }
    }
  }

  const handleMouseUp = () => {
    setDraggedNode(null)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      const delta = -e.deltaY * 0.001
      setZoom((prev) => Math.max(0.25, Math.min(2, prev + delta)))
    }
  }

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isPanning && !connectingPort) {
      const node = nodes.find((n) => n.id === nodeId)
      if (node) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const clickX = (e.clientX - rect.left - pan.x) / zoom
          const clickY = (e.clientY - rect.top - pan.y) / zoom
          setDragOffset({
            x: clickX - node.position.x,
            y: clickY - node.position.y,
          })
        }
      }
      setDraggedNode(nodeId)
      onNodeSelect?.(nodeId)
    }
  }

  const handlePortMouseDown = (nodeId: string, portId: string, isOutput: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    const portList = isOutput ? node.outputs : node.inputs
    const port = portList.find((p) => p.id === portId)
    if (!port) return

    if (connectingPort) {
      // Complete connection - only allow output -> input
      if (connectingPort.isOutput !== isOutput) {
        const from = connectingPort.isOutput
          ? { nodeId: connectingPort.nodeId, portId: connectingPort.portId }
          : { nodeId, portId }
        const to = connectingPort.isOutput
          ? { nodeId, portId }
          : { nodeId: connectingPort.nodeId, portId: connectingPort.portId }

        const wireType = connectingPort.isOutput ? connectingPort.type : port.type

        onWireCreate?.({
          from,
          to,
          type: wireType as any,
        })
      }
      setConnectingPort(null)
    } else {
      // Start connection
      setConnectingPort({
        nodeId,
        portId,
        isOutput,
        type: port.type,
      })
    }
  }

  // Get port center position using actual DOM measurement
  const getPortPosition = (nodeId: string, portId: string, isOutput: boolean): { x: number; y: number } => {
    const portElement = document.querySelector(
      `[data-node-id="${nodeId}"][data-port-id="${portId}"][data-is-output="${isOutput}"]`,
    ) as HTMLElement

    if (portElement) {
      const rect = portElement.getBoundingClientRect()
      const canvasRect = canvasRef.current?.getBoundingClientRect()

      if (canvasRect) {
        // Get center of port in canvas coordinates
        const centerX = (rect.left + rect.width / 2 - canvasRect.left - pan.x) / zoom
        const centerY = (rect.top + rect.height / 2 - canvasRect.top - pan.y) / zoom
        return { x: centerX, y: centerY }
      }
    }

    // Fallback to calculation if DOM element not found
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return { x: 0, y: 0 }

    const nodeWidth = node.compact ? 180 : 240
    const portList = isOutput ? node.outputs : node.inputs
    const portIndex = portList.findIndex((p) => p.id === portId)

    // Port centers are at the node edge after accounting for margin
    const x = isOutput ? node.position.x + nodeWidth : node.position.x

    // Y calculation: header(40px) + padding(12px) + portHeight/2(8px) + portIndex * (portHeight(16px) + gap(8px))
    const y = node.position.y + 40 + 12 + 8 + portIndex * 24

    return { x, y }
  }

  // Generate wire path with bezier curve
  const getWirePath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const controlOffset = Math.min(distance * 0.3, 80)

    return `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (connectingPort && e.target === e.currentTarget) {
      setConnectingPort(null)
    }
  }

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden canvas-grid bg-[var(--k1-bg)]"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
      style={{ cursor: isPanning ? "grab" : "default" }}
    >
      {/* Transform container */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          inset: 0,
        }}
      >
        {/* SVG for wires */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Existing wires */}
          {wires.map((wire) => {
            const from = getPortPosition(wire.from.nodeId, wire.from.portId, true)
            const to = getPortPosition(wire.to.nodeId, wire.to.portId, false)
            const path = getWirePath(from, to)

            return (
              <g key={wire.id}>
                <path
                  d={path}
                  stroke="transparent"
                  strokeWidth="12"
                  fill="none"
                  onClick={(e) => {
                    e.stopPropagation()
                    onWireDelete?.(wire.id)
                  }}
                  style={{ cursor: "pointer", pointerEvents: "stroke" }}
                />
                <path
                  d={path}
                  stroke={PORT_COLORS[wire.type]}
                  strokeWidth="2.5"
                  fill="none"
                  filter="url(#glow)"
                  style={{ pointerEvents: "none" }}
                />
              </g>
            )
          })}

          {/* Active connection preview */}
          {connectingPort && (
            <path
              d={getWirePath(
                getPortPosition(connectingPort.nodeId, connectingPort.portId, connectingPort.isOutput),
                mousePos,
              )}
              stroke="var(--k1-accent)"
              strokeWidth="3"
              strokeDasharray="8 4"
              fill="none"
              opacity="0.8"
              filter="url(#glow)"
            />
          )}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div key={node.id} onMouseDown={(e) => handleNodeMouseDown(node.id, e)} style={{ position: "absolute" }}>
            <Node
              data={node}
              selected={node.id === selectedNodeId}
              onSelect={() => onNodeSelect?.(node.id)}
              onDelete={() => onNodeDelete?.(node.id)}
              onPortMouseDown={(portId, isOutput, e) => handlePortMouseDown(node.id, portId, isOutput, e)}
            />
          </div>
        ))}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 px-3 py-1.5 glass-panel glass-corners frosted-texture rounded-lg text-xs font-mono pointer-events-none">
        {Math.round(zoom * 100)}%
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 px-3 py-2 glass-panel glass-corners glass-sparkle frosted-texture rounded-lg text-[10px] text-[var(--k1-text-dim)] space-y-0.5 pointer-events-none">
        <div>
          <kbd className="px-1 py-0.5 bg-[var(--k1-bg)] rounded text-[9px]">Space</kbd> + drag to pan
        </div>
        <div>
          <kbd className="px-1 py-0.5 bg-[var(--k1-bg)] rounded text-[9px]">⌘</kbd> + scroll to zoom
        </div>
        <div className="pt-1 border-t border-[rgba(255,255,255,0.08)] mt-1">
          <div className="text-[var(--k1-accent)]">Click output → input to wire</div>
          <div className="mt-1">Click wire to delete • Click canvas to cancel</div>
        </div>
      </div>

      {/* Connection Status */}
      {connectingPort && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[var(--k1-accent)] text-black rounded-lg shadow-k1-lg font-semibold pointer-events-none"
          style={{ boxShadow: "0 0 30px rgba(110, 231, 243, 0.8), 0 12px 40px rgba(0, 0, 0, 0.6)" }}
        >
          ⚡ Click {connectingPort.isOutput ? "INPUT" : "OUTPUT"} port to complete
        </div>
      )}
    </div>
  )
}
