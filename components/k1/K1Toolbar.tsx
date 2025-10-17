"use client"

import { Play, Pause, RotateCcw, Save, Upload, Download, Maximize2, Settings } from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"

interface K1ToolbarProps {
  playing?: boolean
  onPlayPause?: () => void
  onReset?: () => void
  onSave?: () => void
  onExport?: () => void
  onImport?: () => void
  onFullscreen?: () => void
  onSettings?: () => void
  nodeCount?: number
  wireCount?: number
}

export function K1Toolbar({
  playing = false,
  onPlayPause,
  onReset,
  onSave,
  onExport,
  onImport,
  onFullscreen,
  onSettings,
  nodeCount = 0,
  wireCount = 0,
}: K1ToolbarProps) {
  return (
    <div className="h-14 glass-panel glass-corners frosted-texture border-b border-[rgba(255,255,255,0.12)] flex items-center justify-between px-4 relative z-20">
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[var(--k1-accent)] to-[var(--k1-accent-2)] flex items-center justify-center shadow-k1-sm">
            <span className="text-black font-bold text-sm">K1</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none">Light Lab</h1>
            <p className="text-[10px] text-[var(--k1-text-dim)] leading-none mt-0.5">Node Patch Instrument</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-[rgba(255,255,255,0.1)]">
          <Badge variant="outline" className="font-mono text-xs bg-black/20 border-[rgba(255,255,255,0.1)]">
            {nodeCount} nodes
          </Badge>
          <Badge variant="outline" className="font-mono text-xs bg-black/20 border-[rgba(255,255,255,0.1)]">
            {wireCount} wires
          </Badge>
        </div>
      </div>

      {/* Center: Playback Controls */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onReset} className="h-9 px-3" title="Reset (R)">
          <RotateCcw className="w-4 h-4" />
        </Button>

        <Button
          variant={playing ? "default" : "outline"}
          size="sm"
          onClick={onPlayPause}
          className="h-9 px-4"
          title={playing ? "Pause (Space)" : "Play (Space)"}
        >
          {playing ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Play
            </>
          )}
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onImport} className="h-9 px-3" title="Import Pattern">
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>

        <Button variant="ghost" size="sm" onClick={onSave} className="h-9 px-3" title="Save (⌘S)">
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>

        <Button variant="ghost" size="sm" onClick={onExport} className="h-9 px-3" title="Export to K1">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>

        <div className="w-px h-6 bg-[rgba(255,255,255,0.1)] mx-1" />

        <Button variant="ghost" size="sm" onClick={onFullscreen} className="h-9 w-9 p-0" title="Fullscreen">
          <Maximize2 className="w-4 h-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onSettings} className="h-9 w-9 p-0" title="Settings">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
