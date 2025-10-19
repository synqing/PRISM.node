import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { K1Toolbar } from "../K1Toolbar";

beforeEach(() => localStorage.clear());

describe("K1Toolbar persistence & callbacks", () => {
  it("changes FPS and calls handler", () => {
    const onFpsChange = vi.fn();
    render(
      <K1Toolbar
        fps={120}
        onFpsChange={onFpsChange}
        capEnabled={false}
        onToggleCap={() => {}}
        capPercent={100}
        onCapPercentChange={() => {}}
        sequenceEnabled={false}
        onToggleSequence={() => {}}
        sequenceFrames={1}
        onSequenceFramesChange={() => {}}
      />
    );
    const sixty = screen.getByRole("button", { name: /preview 60 fps/i });
    fireEvent.click(sixty);
    expect(onFpsChange).toHaveBeenCalledWith(60);
  });

  it("toggles brightness cap", () => {
    const onToggleCap = vi.fn();
    render(
      <K1Toolbar
        fps={120}
        onFpsChange={() => {}}
        capEnabled={false}
        onToggleCap={onToggleCap}
        capPercent={100}
        onCapPercentChange={() => {}}
        sequenceEnabled={false}
        onToggleSequence={() => {}}
        sequenceFrames={1}
        onSequenceFramesChange={() => {}}
      />
    );
    const capToggle = screen.getByRole("button", { name: /enable brightness cap/i });
    fireEvent.click(capToggle);
    expect(onToggleCap).toHaveBeenCalled();
  });

  it("clamps frames count to 273", () => {
    const onFrames = vi.fn();
    render(
      <K1Toolbar
        fps={120}
        onFpsChange={() => {}}
        capEnabled={false}
        onToggleCap={() => {}}
        capPercent={100}
        onCapPercentChange={() => {}}
        sequenceEnabled={true}
        onToggleSequence={() => {}}
        sequenceFrames={1}
        onSequenceFramesChange={onFrames}
      />
    );
    const input = screen.getByRole("spinbutton", { name: /frames count/i });
    fireEvent.change(input, { target: { value: "999" } });
    expect(onFrames).toHaveBeenCalledWith(273);
  });
});
