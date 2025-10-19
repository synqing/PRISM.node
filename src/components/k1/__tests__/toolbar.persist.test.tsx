/* @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    const sixty = screen.getByRole("button", { name: "60" });
    fireEvent.click(sixty);
    expect(onFpsChange).toHaveBeenCalledWith(60);
  });

  it.skip("toggles brightness cap", async () => {
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
    const capToggle = (screen.getAllByRole("button").find(btn => btn.textContent === "Cap") as HTMLButtonElement);
    const user = userEvent.setup();
    await user.click(capToggle);
    expect(onToggleCap).toHaveBeenCalled();
  });

  it.skip("clamps frames count to 273", async () => {
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
    const input = (screen.getAllByRole("spinbutton").find(el => (el as HTMLInputElement).title.includes("frames")) as HTMLInputElement);
    input.focus();
    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, "999");
    input.blur();
    expect(onFrames).toHaveBeenCalledWith(273);
  });
});
