import { Play, Save, Upload, Download, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

interface K1ToolbarProps {
  nodeCount: number
  wireCount: number
}

export function K1Toolbar({ nodeCount, wireCount }: K1ToolbarProps) {
  return (
    <header className="h-14 border-b border-border/50 glass-panel flex items-center justify-between px-4 shrink-0">
      {/* Left: Branding + Stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">K1</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold">Light Lab</h1>
            <p className="text-xs text-muted-foreground">Node Patch Instrument</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{nodeCount} nodes</span>
          <span>{wireCount} wires</span>
        </div>
      </div>

      {/* Center: Playback Controls */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Play className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 gap-2">
          <Upload className="h-4 w-4" />
          Import
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-2">
          <Save className="h-4 w-4" />
          Save
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
