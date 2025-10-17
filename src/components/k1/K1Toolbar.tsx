import { Play, Pause, RotateCcw, Save, Upload, Download, Maximize2, Settings } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface K1ToolbarProps {
  playing?: boolean;
  onPlayPause?: () => void;
  onReset?: () => void; // legacy pattern reset
  onResetLayout?: () => void; // new layout reset
  onSave?: () => void;
  onExport?: () => void;
  onExportCopy?: () => void;
  onExportDownload?: () => void;
  onImport?: () => void;
  onFullscreen?: () => void;
  onSettings?: () => void;
  nodeCount?: number;
  wireCount?: number;
  onZoomPreset?: (z: number) => void;
  currentZoom?: number;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  orthogonal?: boolean;
  onToggleEdges?: () => void;
}

export function K1Toolbar({
  playing = false,
  onPlayPause,
  onReset,
  onResetLayout,
  onSave,
  onExport,
  onExportCopy,
  onExportDownload,
  onImport,
  onFullscreen,
  onSettings,
  nodeCount = 0,
  wireCount = 0,
  onZoomPreset,
  currentZoom,
  showGrid = true,
  onToggleGrid,
  orthogonal = false,
  onToggleEdges,
}: K1ToolbarProps) {
  return (
    <div className="h-14 glass-panel glass-corners frosted-texture border-b flex items-center justify-between px-4 relative z-20">
      {/* Left: Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[var(--k1-accent)] to-[var(--k1-accent-2)] flex items-center justify-center">
            <span className="text-black font-bold text-sm">K1</span>
          </div>
          <div>
            <h1 className="text-sm leading-none">Light Lab</h1>
            <p className="text-[10px] text-[var(--k1-text-dim)] leading-none mt-0.5">
              Node-First Instrument
            </p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-[rgba(255,255,255,0.1)]">
          <Badge variant="outline" className="font-mono text-xs">
            {nodeCount} nodes
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            {wireCount} wires
          </Badge>
        </div>
      </div>

      {/* Center: Playback + View Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetLayout ?? onReset}
          className="h-9 px-3"
          title="Reset layout"
        >
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

        <div className="w-px h-6 bg-[rgba(255,255,255,0.1)] mx-1" />

        {/* Zoom presets */}
        {[0.5, 0.75, 1, 1.5].map((z) => (
          <Button
            key={z}
            variant={currentZoom === z ? 'default' : 'outline'}
            size="sm"
            className="h-9 px-2 font-mono"
            onClick={() => onZoomPreset?.(z)}
            title={`Zoom ${Math.round(z*100)}%`}
          >
            {Math.round(z * 100)}%
          </Button>
        ))}

        <Button
          variant={showGrid ? 'default' : 'outline'}
          size="sm"
          className="h-9 px-3"
          onClick={onToggleGrid}
          title="Toggle grid"
        >
          Grid
        </Button>

        <Button
          variant={orthogonal ? 'default' : 'outline'}
          size="sm"
          className="h-9 px-3"
          onClick={onToggleEdges}
          title="Toggle orthogonal edges"
        >
          {orthogonal ? 'Ortho' : 'Bezier'}
        </Button>
        <span className="ml-2 text-xs font-mono text-[var(--k1-text-dim)]" aria-live="polite">
          edges: {orthogonal ? 'orthogonal' : 'bezier'}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onImport}
          className="h-9 px-3"
          title="Import Pattern"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          className="h-9 px-3"
          title="Save (⌘S)"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3"
              title="Export options"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportCopy}>Copy JSON</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportDownload}>Download JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-[rgba(255,255,255,0.1)] mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onFullscreen}
          className="h-9 w-9 p-0"
          title="Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onSettings}
          className="h-9 w-9 p-0"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
