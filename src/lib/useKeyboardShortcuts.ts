/**
 * Keyboard Shortcuts Hook
 * Video-editor style controls (Space, J/K/L, I/O, arrows, etc.)
 */

import { useEffect } from 'react';
import { useAppState } from './appState';
import { toast } from 'sonner';

export function useKeyboardShortcuts() {
  const {
    isPlaying,
    setPlaying,
    currentTime,
    setCurrentTime,
    playbackSpeed,
    setPlaybackSpeed,
    setLoopPoints,
    loopIn,
    loopOut,
    toggleLoop,
    setShowShortcuts,
    selectedSegmentIds,
    removeSegment,
  } = useAppState?.() ?? ({} as ReturnType<typeof useAppState>);

  useEffect(() => {
    if (!useAppState) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const stop = () => {
        e.preventDefault();
        e.stopPropagation();
      };

      switch (e.key.toLowerCase()) {
        // Space — Play/Pause
        case ' ': {
          stop();
          setPlaying(!isPlaying);
          toast.success(isPlaying ? 'Paused' : 'Playing');
          break;
        }

        // J — Reverse (1x)
        case 'j': {
          stop();
          setPlaybackSpeed(-1);
          setPlaying(true);
          toast.success('Reverse playback');
          break;
        }

        // K — Pause
        case 'k': {
          stop();
          setPlaying(false);
          setPlaybackSpeed(1);
          toast.success('Paused');
          break;
        }

        // L — Forward (1x→2x→4x→1x)
        case 'l': {
          stop();
          const next = playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1;
          setPlaybackSpeed(next);
          setPlaying(true);
          toast.success(next === 1 ? 'Normal speed' : `${next}x speed`);
          break;
        }

        // I/O — Loop points
        case 'i': {
          stop();
          setLoopPoints(currentTime, loopOut);
          toast.success(`In point: ${(currentTime / 1000).toFixed(2)}s`);
          break;
        }
        case 'o': {
          stop();
          setLoopPoints(loopIn, currentTime);
          toast.success(`Out point: ${(currentTime / 1000).toFixed(2)}s`);
          break;
        }

        // Arrows — step or jump with Shift
        case 'arrowleft': {
          stop();
          const delta = e.shiftKey ? 1000 : 16.67;
          setCurrentTime(Math.max(0, currentTime - delta));
          break;
        }
        case 'arrowright': {
          stop();
          const delta = e.shiftKey ? 1000 : 16.67;
          setCurrentTime(currentTime + delta);
          break;
        }

        // Home/End — boundaries
        case 'home': {
          stop();
          setCurrentTime(0);
          toast.success('Jumped to start');
          break;
        }
        case 'end': {
          stop();
          setCurrentTime(loopOut);
          toast.success('Jumped to end');
          break;
        }

        // M — Toggle loop
        case 'm': {
          stop();
          toggleLoop();
          toast.success('Loop toggled');
          break;
        }

        // Delete/Backspace — remove selected
        case 'delete':
        case 'backspace': {
          if (selectedSegmentIds?.length > 0) {
            stop();
            selectedSegmentIds.forEach((id) => removeSegment(id));
            toast.success(`Deleted ${selectedSegmentIds.length} segment(s)`);
          }
          break;
        }

        // Save/Export/Duplicate (mock)
        case 's': {
          if (e.metaKey || e.ctrlKey) {
            stop();
            toast.success('Pattern saved to library');
          }
          break;
        }
        case 'e': {
          if (e.metaKey || e.ctrlKey) {
            stop();
            toast.success('Exported to .prism format');
          }
          break;
        }
        case 'd': {
          if (e.metaKey || e.ctrlKey) {
            stop();
            if (selectedSegmentIds?.length > 0) {
              toast.success('Segment duplicated');
            }
          }
          break;
        }

        // ? — Show shortcuts
        case '?': {
          if (e.shiftKey) {
            stop();
            setShowShortcuts(true);
          }
          break;
        }

        // Escape — Hide shortcuts
        case 'escape': {
          stop();
          setShowShortcuts(false);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    setPlaying,
    currentTime,
    setCurrentTime,
    playbackSpeed,
    setPlaybackSpeed,
    setLoopPoints,
    loopIn,
    loopOut,
    toggleLoop,
    setShowShortcuts,
    selectedSegmentIds,
    removeSegment,
  ]);
}

