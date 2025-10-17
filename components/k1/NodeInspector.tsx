"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { NodeData } from "./types"

interface NodeInspectorProps {
  selectedNode: NodeData | null
  onUpdateNode: (id: string, updates: Partial<NodeData>) => void
  onDeleteNode: (id: string) => void
}

export function NodeInspector({ selectedNode, onUpdateNode, onDeleteNode }: NodeInspectorProps) {
  if (!selectedNode) {
    return (
      <aside className="w-80 border-l border-border/50 glass-panel flex items-center justify-center shrink-0">
        <p className="text-sm text-muted-foreground">Inspector</p>
      </aside>
    )
  }

  return (
    <aside className="w-80 border-l border-border/50 glass-panel flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{selectedNode.label}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedNode.inputs.length} Input{selectedNode.inputs.length !== 1 ? "s" : ""} ·{" "}
            {selectedNode.outputs.length} Output{selectedNode.outputs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDeleteNode(selectedNode.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Parameters */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Parameters</h3>
            <div className="space-y-4">
              {Object.entries(selectedNode.params).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`param-${key}`} className="text-xs capitalize">
                      {key}
                    </Label>
                    {typeof value === "number" && <span className="text-xs text-muted-foreground">{value}</span>}
                  </div>

                  {typeof value === "number" && (
                    <Slider
                      id={`param-${key}`}
                      value={[value]}
                      onValueChange={([newValue]) => {
                        onUpdateNode(selectedNode.id, {
                          params: { ...selectedNode.params, [key]: newValue },
                        })
                      }}
                      min={0}
                      max={key === "brightness" ? 200 : 100}
                      step={1}
                      className="w-full"
                    />
                  )}

                  {typeof value === "string" && key !== "edge" && (
                    <Input
                      id={`param-${key}`}
                      value={value}
                      onChange={(e) => {
                        onUpdateNode(selectedNode.id, {
                          params: { ...selectedNode.params, [key]: e.target.value },
                        })
                      }}
                      className="h-8 text-xs"
                    />
                  )}

                  {key === "edge" && (
                    <Select
                      value={value as string}
                      onValueChange={(newValue) => {
                        onUpdateNode(selectedNode.id, {
                          params: { ...selectedNode.params, [key]: newValue },
                        })
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Input/Output Ports */}
          <div>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Input Ports</h3>
            <div className="space-y-2">
              {selectedNode.inputs.map((input) => (
                <div key={input.id} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full bg-${input.color}-500`} />
                  <span className="capitalize">{input.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Output Ports</h3>
            <div className="space-y-2">
              {selectedNode.outputs.map((output) => (
                <div key={output.id} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full bg-${output.color}-500`} />
                  <span className="capitalize">{output.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}
