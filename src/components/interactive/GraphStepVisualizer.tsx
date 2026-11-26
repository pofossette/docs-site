import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Gauge,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  X,
  Info,
} from 'lucide-react';
import type cytoscape from 'cytoscape';
import CytoscapeCanvas, {
  pickContrastTextColor,
  type CytoscapeNode,
  type CytoscapeEdge,
} from './CytoscapeCanvas';

export interface GraphStep {
  title: string;
  description: string;
  badge?: string;
  activeNodes?: (string | number)[];
  activeEdges?: Array<{ source: string | number; target: string | number } | string>;
  nodeColors?: Record<string | number, string>; // nodeId -> color (e.g. for graph coloring)
  stateInfo?: Record<string, string>; // auxiliary key-value pairs (e.g. active subset, queue)
  customRender?: React.ReactNode;
  nodeColorMap?: Record<string | number, string>; // backwards-compatibility alias
}

export interface GraphStepVisualizerProps {
  initialGraph:
    | cytoscape.ElementsDefinition
    | cytoscape.ElementDefinition[]
    | { nodes: CytoscapeNode[]; edges: CytoscapeEdge[] };
  layoutName?: 'dagre' | 'cose' | 'breadthfirst' | 'circle' | 'grid' | string;
  steps: GraphStep[];
  title?: string;
  algorithmName?: string;
  height?: number | string;
  className?: string;
}

/**
 * Helper to recursively transform Astro internal JSX objects ({ 'astro:jsx': true, type, props })
 * into standard React elements during SSR / client hydration.
 */
function renderCustomNode(node: any): React.ReactNode {
  if (!node) return null;
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={i}>{renderCustomNode(child)}</React.Fragment>
    ));
  }
  if (React.isValidElement(node)) {
    return node;
  }
  if (typeof node === 'object' && ('astro:jsx' in node || node['astro:jsx'])) {
    const { type, props } = node;
    const { children, ...restProps } = props || {};
    return React.createElement(
      type,
      restProps,
      children ? renderCustomNode(children) : undefined
    );
  }
  return null;
}

export const GraphStepVisualizer: React.FC<GraphStepVisualizerProps> = ({
  initialGraph,
  layoutName = 'dagre',
  steps = [],
  title,
  algorithmName = '图算法演练',
  height = '360px',
  className = '',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1200); // ms per step
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<{ id: string; data: any } | null>(null);
  const [themeTick, setThemeTick] = useState(0);

  const cyRef = useRef<cytoscape.Core | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Keep currentStepIndex within bounds if steps length changes
  useEffect(() => {
    if (steps.length > 0 && currentStepIndex >= steps.length) {
      setCurrentStepIndex(steps.length - 1);
    }
  }, [steps.length, currentStepIndex]);

  // Re-apply step styles when document theme changes so bypass colors stay synchronized
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new MutationObserver(() => {
      setThemeTick((t) => t + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  // Playback timer loop
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying && steps.length > 1) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, playbackSpeed, steps.length]);

  const safeStepIndex = steps.length > 0 ? Math.min(currentStepIndex, steps.length - 1) : 0;
  const currentStep: GraphStep | undefined = steps[safeStepIndex];

  // Apply step classes and styles to Cytoscape instance
  const applyStepToGraph = useCallback((step: GraphStep | undefined) => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed() || !step) return;

    cy.batch(() => {
      // 1. Reset all previous step highlight classes and inline styles
      cy.elements().removeClass('highlighted active active-node active-edge inactive visited');
      cy.nodes().removeStyle('background-color border-color color opacity');
      cy.edges().removeStyle('line-color target-arrow-color width opacity');

      const activeNodesList = step.activeNodes || [];
      const activeEdgesList = step.activeEdges || [];
      const hasActiveNodes = activeNodesList.length > 0;
      const hasActiveEdges = activeEdgesList.length > 0;

      // 2. Dim inactive elements if active sets are provided
      if (hasActiveNodes || hasActiveEdges) {
        if (hasActiveNodes) {
          const activeNodeSet = new Set(activeNodesList.map((id) => String(id)));
          cy.nodes().forEach((node) => {
            if (!activeNodeSet.has(node.id())) {
              node.addClass('inactive');
            }
          });
        }
        if (hasActiveEdges) {
          const activeEdgeSet = new Set(
            activeEdgesList.map((e) => (typeof e === 'string' ? e : `${e.source}->${e.target}`))
          );
          cy.edges().forEach((edge) => {
            const edgeId = edge.id();
            const s = edge.source().id();
            const t = edge.target().id();
            const isMatch =
              activeEdgeSet.has(edgeId) ||
              activeEdgeSet.has(`${s}->${t}`) ||
              activeEdgeSet.has(`${t}->${s}`) ||
              activeEdgeSet.has(`${s}-${t}`) ||
              activeEdgeSet.has(`${t}-${s}`);
            if (!isMatch) {
              edge.addClass('inactive');
            }
          });
        }
      }

      // 3. Highlight active nodes
      if (hasActiveNodes) {
        activeNodesList.forEach((nodeId) => {
          const node = cy.getElementById(String(nodeId));
          if (node.length > 0) {
            node.addClass('highlighted');
            node.removeClass('inactive');
          }
        });
      }

      // 4. Highlight active edges
      if (hasActiveEdges) {
        activeEdgesList.forEach((edgeSpec) => {
          if (typeof edgeSpec === 'string') {
            let edge: any = cy.getElementById(edgeSpec);
            if (edge.length === 0) {
              const parts = edgeSpec.includes('->')
                ? edgeSpec.split('->')
                : edgeSpec.includes('-')
                  ? edgeSpec.split('-')
                  : null;
              if (parts && parts.length === 2) {
                const [s, t] = parts;
                edge = cy.edges(
                  `[source = "${s}"][target = "${t}"], [source = "${t}"][target = "${s}"]`
                );
              }
            }
            if (edge.length > 0) {
              edge.addClass('highlighted');
              edge.removeClass('inactive');
            }
          } else {
            const s = String(edgeSpec.source);
            const t = String(edgeSpec.target);
            const edge: any = cy.edges(
              `[source = "${s}"][target = "${t}"], [source = "${t}"][target = "${s}"]`
            );
            if (edge.length > 0) {
              edge.addClass('highlighted');
              edge.removeClass('inactive');
            }
          }
        });
      }

      // 5. Apply dynamic node coloring with automatic contrast foreground
      const colors = step.nodeColors || step.nodeColorMap;
      if (colors) {
        Object.entries(colors).forEach(([nodeId, colorHex]) => {
          const node = cy.getElementById(String(nodeId));
          if (node.length > 0) {
            node.style({
              'background-color': colorHex,
              'border-color': colorHex,
              'color': pickContrastTextColor(colorHex),
            });
          }
        });
      }
    });
  }, []);

  // Trigger styling updates whenever current step, graph, or theme changes
  useEffect(() => {
    applyStepToGraph(currentStep);
  }, [safeStepIndex, currentStep, applyStepToGraph, initialGraph, layoutName, themeTick]);

  // Keep active step pill centered horizontally without vertical viewport scroll jumps
  useEffect(() => {
    const container = scrubberRef.current;
    if (!container) return;
    if (safeStepIndex === 0) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    const activeBtn = container.children[safeStepIndex] as HTMLElement | undefined;
    if (!activeBtn) return;
    const left = activeBtn.offsetLeft - container.clientWidth / 2 + activeBtn.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [safeStepIndex]);

  const handleNext = useCallback(() => {
    setCurrentStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
  }, [steps.length]);

  const handlePrev = useCallback(() => {
    setCurrentStepIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    if (cyRef.current && !cyRef.current.destroyed()) {
      cyRef.current.fit(undefined, 46);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (steps.length <= 1) return;
    if (!isPlaying && safeStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [isPlaying, safeStepIndex, steps.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        handleNext();
      } else if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A') {
        e.preventDefault();
        togglePlay();
      }
    },
    [handlePrev, handleNext, togglePlay]
  );

  const handleZoomIn = () => {
    if (cyRef.current && !cyRef.current.destroyed()) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.25);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current && !cyRef.current.destroyed()) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleFit = () => {
    if (cyRef.current && !cyRef.current.destroyed()) {
      cyRef.current.fit(undefined, 46);
    }
  };

  const handleNodeClick = useCallback((nodeId: string, nodeData: any) => {
    setSelectedNodeInfo({ id: nodeId, data: nodeData });
  }, []);

  if (!steps || steps.length === 0 || !currentStep) {
    return (
      <div
        className={`not-content vz-shell my-6 rounded-xl border border-dashed border-[var(--vz-border-strong)] p-8 text-center text-sm text-[var(--vz-ink-subtle)] ${className}`}
      >
        无可用演算步骤
      </div>
    );
  }

  const progressPercentage = ((safeStepIndex + 1) / steps.length) * 100;

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      className={`not-content vz-shell my-6 overflow-hidden rounded-2xl border border-[var(--vz-border)] bg-[var(--vz-surface)] text-[var(--vz-ink)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--vz-accent)] ${className}`}
      aria-label={title || algorithmName || '图算法交互推演器'}
    >
      {/* Header Bar */}
      <div className="vz-header flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vz-border)] bg-[var(--vz-surface-subtle)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--vz-border)] bg-[var(--vz-surface-subtle)] text-[var(--vz-ink-muted)]">
              <GitBranch className="h-3.5 w-3.5" />
            </span>
            <h4 className="m-0 text-sm font-semibold tracking-tight text-[var(--vz-ink)]">
              {title || '图算法交互推演'}
            </h4>
            {algorithmName && (
              <span className="inline-flex items-center rounded-md border border-[var(--vz-border)] bg-[var(--vz-surface-subtle)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--vz-ink-muted)]">
                {algorithmName}
              </span>
            )}
          </div>
        </div>

        {/* Playback Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden items-center gap-1 text-[11px] text-[var(--vz-ink-subtle)] xl:flex">
            <kbd className="vz-keycap">←</kbd>
            <kbd className="vz-keycap">→</kbd>
            <kbd className="vz-keycap">Space</kbd>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-[var(--vz-border)] bg-[var(--vz-surface)] p-1">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md p-1.5 text-[var(--vz-ink-muted)] transition-colors hover:bg-[var(--vz-surface-subtle)] hover:text-[var(--vz-ink)]"
              title="重置到第一步"
              aria-label="重置"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={handlePrev}
              disabled={safeStepIndex === 0}
              className="rounded-md p-1.5 text-[var(--vz-ink-muted)] transition-colors hover:bg-[var(--vz-surface-subtle)] hover:text-[var(--vz-ink)] disabled:pointer-events-none disabled:opacity-35"
              title="上一步"
              aria-label="上一步"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={steps.length <= 1}
              className="flex items-center gap-1.5 rounded-md bg-[var(--vz-btn-primary-bg)] px-2.5 py-1 text-xs font-medium text-[var(--vz-btn-primary-fg)] transition-opacity hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              aria-label={isPlaying ? '暂停' : '自动播放'}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>暂停</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>播放</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={safeStepIndex === steps.length - 1}
              className="rounded-md p-1.5 text-[var(--vz-ink-muted)] transition-colors hover:bg-[var(--vz-surface-subtle)] hover:text-[var(--vz-ink)] disabled:pointer-events-none disabled:opacity-35"
              title="下一步"
              aria-label="下一步"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {/* Compact Hairline Speed Selector */}
            <div className="ml-0.5 flex items-center border-l border-[var(--vz-border)] pl-1.5">
              <Gauge className="mr-1 h-3.5 w-3.5 text-[var(--vz-ink-subtle)]" />
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="cursor-pointer rounded-md border border-transparent bg-transparent py-1 pr-1 font-mono text-[11px] tabular-nums text-[var(--vz-ink-muted)] transition-colors hover:border-[var(--vz-border)] hover:text-[var(--vz-ink)] focus:border-[var(--vz-accent)] focus:outline-none"
                title="演算速度"
                aria-label="演算速度"
              >
                <option value={2000}>0.5x</option>
                <option value={1200}>1.0x</option>
                <option value={800}>1.5x</option>
                <option value={500}>2.0x</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Step Scrubber Bar */}
      <div
        ref={scrubberRef}
        className="vz-header relative flex items-center gap-1.5 overflow-x-auto border-b border-[var(--vz-border)] bg-[var(--vz-surface-subtle)] px-4 py-2 sm:px-5"
      >
        {steps.map((s, idx) => {
          const isCurrent = safeStepIndex === idx;
          const isVisited = idx < safeStepIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(idx);
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs tabular-nums transition-colors ${
                isCurrent
                  ? 'border-[var(--vz-accent-border)] bg-[var(--vz-accent-bg)] font-semibold text-[var(--vz-accent)]'
                  : isVisited
                    ? 'border-transparent text-[var(--vz-ink-muted)] hover:border-[var(--vz-border)] hover:bg-[var(--vz-surface-subtle)] hover:text-[var(--vz-ink)]'
                    : 'border-transparent text-[var(--vz-ink-subtle)] hover:border-[var(--vz-border)] hover:bg-[var(--vz-surface-subtle)] hover:text-[var(--vz-ink-muted)]'
              }`}
              title={`跳转到第 ${idx + 1} 步: ${s.title}`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                  isCurrent
                    ? 'bg-[var(--vz-accent)]'
                    : isVisited
                      ? 'bg-emerald-500'
                      : 'bg-[var(--vz-border-strong)]'
                }`}
              />
              <span>步骤 {idx + 1}</span>
              {s.badge && (
                <span className="hidden font-sans text-[10px] opacity-75 sm:inline">
                  · {s.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2px Hairline Progress Bar */}
      <div className="h-[2px] w-full overflow-hidden bg-[var(--vz-surface-muted)]">
        <div
          className="h-full bg-[var(--vz-accent)] transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Main Interactive Stage */}
      <div className="space-y-4 bg-[var(--vz-surface)] p-4 sm:p-5">
        {/* Step Explanation Card */}
        <div className="vz-stage rounded-xl border border-[var(--vz-border)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className="m-0 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--vz-ink)]">
              <span className="rounded-md border border-[var(--vz-accent-border)] bg-[var(--vz-accent-bg)] px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-[var(--vz-accent)]">
                步骤 {safeStepIndex + 1} / {steps.length}
              </span>
              <span>{currentStep.title}</span>
            </h5>
            {currentStep.badge && (
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                {currentStep.badge}
              </span>
            )}
          </div>

          <p className="mt-2 mb-0 text-[13px] leading-relaxed text-[var(--vz-ink-muted)]">
            {currentStep.description}
          </p>

          {currentStep.stateInfo && Object.keys(currentStep.stateInfo).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--vz-border)] pt-3">
              {Object.entries(currentStep.stateInfo).map(([key, val]) => (
                <div
                  key={key}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vz-border)] bg-[var(--vz-surface-subtle)] px-2.5 py-1 text-xs"
                >
                  <span className="text-[var(--vz-ink-subtle)]">{key}:</span>
                  <span className="font-mono font-medium tabular-nums text-[var(--vz-ink)]">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cytoscape Canvas Stage with Floating Tools */}
        <div className="relative">
          <CytoscapeCanvas
            elements={initialGraph}
            layoutName={layoutName}
            height={height}
            cyRef={cyRef}
            onNodeClick={handleNodeClick}
          />

          {/* Translucent Floating Zoom Toolbar */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 rounded-lg border border-[var(--vz-border)] bg-white/90 p-1 shadow-sm backdrop-blur-md dark:bg-[#0a0a0a]/90">
            <button
              type="button"
              onClick={handleZoomIn}
              className="rounded-md p-1.5 text-[var(--vz-ink-muted)] transition-colors hover:bg-[var(--vz-surface-subtle)] hover:text-[var(--vz-ink)]"
              title="放大图谱"
              aria-label="放大"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="rounded-md p-1.5 text-[var(--vz-ink-muted)] transition-colors hover:bg-[var(--vz-surface-subtle)] hover:text-[var(--vz-ink)]"
              title="缩小图谱"
              aria-label="缩小"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFit}
              className="rounded-md p-1.5 text-[var(--vz-ink-muted)] transition-colors hover:bg-[var(--vz-surface-subtle)] hover:text-[var(--vz-ink)]"
              title="自适应画布居中"
              aria-label="自适应居中"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Floating Node Inspector Card */}
          {selectedNodeInfo && (
            <div className="absolute bottom-3 left-3 z-20 w-64 max-w-[calc(100%-1.5rem)] rounded-xl border border-[var(--vz-border-strong)] bg-white/90 p-3 shadow-lg backdrop-blur-md dark:bg-[#111111]/90">
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-[var(--vz-border)] pb-2">
                <div className="flex min-w-0 items-center gap-1.5 font-mono text-xs font-semibold text-[var(--vz-accent)]">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">节点详情: {selectedNodeInfo.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNodeInfo(null)}
                  className="rounded-md p-0.5 text-[var(--vz-ink-subtle)] transition-colors hover:bg-[var(--vz-surface-subtle)] hover:text-[var(--vz-ink)]"
                  title="关闭"
                  aria-label="关闭节点详情"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-36 space-y-1.5 overflow-y-auto font-mono text-[11px]">
                {Object.entries(selectedNodeInfo.data).map(([k, v]) => {
                  if (typeof v === 'object' || v === undefined || k.startsWith('_')) return null;
                  return (
                    <div key={k} className="flex items-start justify-between gap-3">
                      <span className="shrink-0 text-[var(--vz-ink-subtle)]">{k}:</span>
                      <span className="break-all whitespace-pre-wrap text-right font-medium text-[var(--vz-ink)]">
                        {String(v)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Optional Custom Render */}
        {currentStep.customRender && (
          <div className="vz-stage rounded-xl border border-[var(--vz-border)] p-4 text-[var(--vz-ink)]">
            {renderCustomNode(currentStep.customRender)}
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphStepVisualizer;
