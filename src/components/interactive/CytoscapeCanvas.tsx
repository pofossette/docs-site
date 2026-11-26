import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import cytoscapeDagre from 'cytoscape-dagre';

// Safely register cytoscape-dagre extension once
let dagreRegistered = false;
export function registerDagreExtension() {
  if (!dagreRegistered && typeof cytoscape === 'function') {
    try {
      cytoscape.use(cytoscapeDagre);
      dagreRegistered = true;
    } catch {
      // Ignored if already registered
      dagreRegistered = true;
    }
  }
}
registerDagreExtension();

export interface CytoscapeNode {
  id: string | number;
  label?: string;
  isAccept?: boolean;
  isStart?: boolean;
  color?: string;
  bgColor?: string;
  textColor?: string;
  shape?: string;
  [key: string]: any;
}

export interface CytoscapeEdge {
  id?: string;
  source: string | number;
  target: string | number;
  label?: string;
  color?: string;
  isUndirected?: boolean;
  [key: string]: any;
}

export interface CytoscapeCanvasProps {
  elements:
    | cytoscape.ElementsDefinition
    | cytoscape.ElementDefinition[]
    | { nodes: CytoscapeNode[]; edges: CytoscapeEdge[] };
  layout?: cytoscape.LayoutOptions;
  layoutName?: 'dagre' | 'cose' | 'breadthfirst' | 'circle' | 'grid' | string;
  stylesheet?: cytoscape.StylesheetStyle[];
  className?: string;
  style?: React.CSSProperties;
  height?: string | number;
  onNodeClick?: (nodeId: string, nodeData: any) => void;
  cyRef?: React.MutableRefObject<cytoscape.Core | null> | ((cy: cytoscape.Core | null) => void);
  framed?: boolean;
  // Convenience properties for backwards-compatibility
  activeNodes?: (string | number)[];
  activeEdges?: Array<{ source: string | number; target: string | number } | string>;
  nodeColorMap?: Record<string | number, string>;
}

/**
 * Compute readable foreground text color (#171717 or #ffffff) from a hex or rgb(a) background color.
 * Prevents low-contrast text on custom dark/light node fills across Light and Dark modes.
 */
export function pickContrastTextColor(hex?: string, fallback = '#171717'): string {
  if (!hex || typeof hex !== 'string') return fallback;
  const trimmed = hex.trim();
  let r: number;
  let g: number;
  let b: number;

  if (trimmed.startsWith('#')) {
    const raw = trimmed.slice(1);
    if (raw.length === 3 || raw.length === 4) {
      r = parseInt(raw[0] + raw[0], 16);
      g = parseInt(raw[1] + raw[1], 16);
      b = parseInt(raw[2] + raw[2], 16);
    } else if (raw.length === 6 || raw.length === 8) {
      r = parseInt(raw.slice(0, 2), 16);
      g = parseInt(raw.slice(2, 4), 16);
      b = parseInt(raw.slice(4, 6), 16);
    } else {
      return fallback;
    }
  } else {
    const match = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!match) return fallback;
    r = Number(match[1]);
    g = Number(match[2]);
    b = Number(match[3]);
  }

  if ([r, g, b].some((v) => Number.isNaN(v))) return fallback;

  const toLinear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.34 ? '#171717' : '#ffffff';
}

/**
 * Detect whether current document theme is dark.
 * Supports Starlight ('data-theme="dark"'), Tailwind ('class="dark"'), and system media query.
 */
function checkIsDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  const root = document.documentElement;
  const dataTheme = root.getAttribute('data-theme');
  if (dataTheme === 'dark') return true;
  if (dataTheme === 'light') return false;
  if (root.classList.contains('dark')) return true;
  if (root.classList.contains('light')) return false;
  return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
}

/**
 * Build default Vercel/Geist theme-aware Cytoscape stylesheet.
 */
export function buildDefaultStylesheet(isDark: boolean): cytoscape.StylesheetStyle[] {
  const accent = isDark ? '#3291ff' : '#0070f3';
  const accentBorder = isDark ? '#60a5fa' : '#0051b3';
  const activeBg = isDark ? '#fbbf24' : '#f59e0b';
  const activeBorder = isDark ? '#f59e0b' : '#d97706';
  const visitedBorder = isDark ? '#10b981' : '#059669';

  return [
    {
      selector: 'node',
      style: {
        'color': isDark ? '#ededed' : '#171717',
        'background-color': isDark ? '#111111' : '#ffffff',
        'border-width': 1.5,
        'border-color': isDark ? '#333333' : '#d4d4d8',
        'font-family': 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        'font-size': '12.5px',
        'font-weight': 500,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '140px',
        'width': 'label',
        'height': 'label',
        'padding': '12px',
        'shape': 'round-rectangle',
        'transition-property': 'background-color, border-color, color, opacity',
        'transition-duration': 200,
      } as any,
    },
    {
      selector: 'node[label]',
      style: {
        'label': 'data(label)',
      },
    },
    {
      selector: 'edge',
      style: {
        'color': isDark ? '#a1a1aa' : '#52525b',
        'font-family': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        'font-size': '11px',
        'text-rotation': 'autorotate',
        'text-margin-y': 0,
        'width': 1.75,
        'line-color': isDark ? '#52525b' : '#a1a1aa',
        'target-arrow-color': isDark ? '#52525b' : '#a1a1aa',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 1.0,
        'transition-property': 'line-color, target-arrow-color, width, opacity',
        'transition-duration': 200,
      } as any,
    },
    {
      selector: 'edge[label][label != ""]',
      style: {
        'label': 'data(label)',
        'text-background-opacity': 0.9,
        'text-background-color': isDark ? '#0a0a0a' : '#fafafa',
        'text-background-padding': '3px',
        'text-background-shape': 'roundrectangle',
      } as any,
    },
    {
      selector: 'edge[curveStyle]',
      style: {
        'curve-style': 'data(curveStyle)' as any,
      },
    },
    {
      selector: 'edge[?isUndirected], edge[?undirected], edge[?_isUndirected]',
      style: {
        'target-arrow-shape': 'none',
      },
    },
    // DFD and Requirements Modeling semantic defaults (placed before custom data overrides)
    {
      selector: 'node[type = "process"], .dfd-process',
      style: {
        'shape': 'round-rectangle',
        'border-color': isDark ? '#38bdf8' : '#0284c7',
        'border-width': 2,
        'background-color': isDark ? '#082f49' : '#f0f9ff',
        'color': isDark ? '#e0f2fe' : '#0c4a6e',
      } as any,
    },
    {
      selector: 'node[type = "datastore"], .dfd-datastore',
      style: {
        'shape': 'barrel',
        'border-color': isDark ? '#10b981' : '#059669',
        'border-width': 2,
        'background-color': isDark ? '#052e16' : '#f0fdf4',
        'color': isDark ? '#d1fae5' : '#064e3b',
      } as any,
    },
    {
      selector: 'node[type = "entity"], .dfd-entity',
      style: {
        'shape': 'rectangle',
        'border-color': isDark ? '#fbbf24' : '#d97706',
        'border-width': 2,
        'background-color': isDark ? '#451a03' : '#fffbeb',
        'color': isDark ? '#fef3c7' : '#78350f',
      } as any,
    },
    {
      selector: 'node[type = "decision"], .dfd-decision',
      style: {
        'shape': 'diamond',
        'border-color': isDark ? '#a78bfa' : '#7c3aed',
        'border-width': 2,
        'background-color': isDark ? '#2e1065' : '#faf5ff',
        'color': isDark ? '#ede9fe' : '#4c1d95',
      } as any,
    },
    // Explicit per-node attributes override DFD defaults
    {
      selector: 'node[shape]',
      style: {
        'shape': 'data(shape)' as any,
      },
    },
    {
      selector: 'node[bgColor]',
      style: {
        'background-color': 'data(bgColor)',
      },
    },
    {
      selector: 'node[color]',
      style: {
        'background-color': 'data(color)',
      },
    },
    {
      selector: 'node[_autoTextColor]',
      style: {
        'color': 'data(_autoTextColor)',
      },
    },
    {
      selector: 'node[textColor]',
      style: {
        'color': 'data(textColor)',
      },
    },
    {
      selector: 'node[?isStart]',
      style: {
        'border-width': 2.5,
        'border-color': visitedBorder,
      } as any,
    },
    {
      selector: 'node[?isAccept]',
      style: {
        'border-width': 4,
        'border-style': 'double',
        'border-color': accent,
      } as any,
    },
    {
      selector: 'node[borderColor]',
      style: {
        'border-color': 'data(borderColor)',
      },
    },
    // Step & interaction state classes ([id] raises specificity above node[bgColor]/node[textColor])
    {
      selector: 'node.inactive[id], edge.inactive[id]',
      style: {
        'opacity': 0.22,
      },
    },
    {
      selector: 'node.visited[id], node.success[id]',
      style: {
        'border-color': visitedBorder,
        'border-width': 2.5,
      } as any,
    },
    {
      selector: 'edge.visited[id], edge.success[id]',
      style: {
        'line-color': visitedBorder,
        'target-arrow-color': visitedBorder,
        'width': 2.5,
      } as any,
    },
    {
      selector: 'edge.active-edge[id]',
      style: {
        'line-color': accent,
        'target-arrow-color': accent,
        'width': 2.75,
        'z-index': 998,
      } as any,
    },
    {
      selector: 'node.highlighted[id]',
      style: {
        'background-color': accent,
        'border-color': accentBorder,
        'border-width': 2.5,
        'color': '#ffffff',
        'z-index': 999,
      } as any,
    },
    {
      selector: 'edge.highlighted[id]',
      style: {
        'line-color': accent,
        'target-arrow-color': accent,
        'width': 3,
        'z-index': 999,
      } as any,
    },
    {
      selector: 'node[?isAccept].highlighted[id]',
      style: {
        'border-width': 4,
      } as any,
    },
    {
      selector: 'node.active[id], node.active-node[id]',
      style: {
        'background-color': activeBg,
        'border-color': activeBorder,
        'border-width': 2.5,
        'color': '#171717',
        'z-index': 1000,
      } as any,
    },
    {
      selector: 'edge.active[id], edge.active-node[id]',
      style: {
        'line-color': activeBg,
        'target-arrow-color': activeBg,
        'width': 3,
        'z-index': 1000,
      } as any,
    },
    {
      selector: 'node:selected[id]',
      style: {
        'border-color': accent,
        'border-width': 3,
        'underlay-color': accent,
        'underlay-padding': 4,
        'underlay-opacity': 0.2,
        'z-index': 1001,
      } as any,
    },
  ];
}

/**
 * Format layout options based on algorithm name and custom layout options.
 */
function resolveLayoutOptions(
  layoutProp?: cytoscape.LayoutOptions,
  layoutNameProp?: string
): cytoscape.LayoutOptions {
  const name = layoutProp?.name || layoutNameProp || 'dagre';

  let defaults: any = {
    name,
    padding: 30,
    animate: false,
  };

  switch (name) {
    case 'dagre':
      defaults = {
        name: 'dagre',
        rankDir: 'LR',
        rankSep: 64,
        nodeSep: 46,
        edgeSep: 22,
        padding: 46,
        animate: false,
      };
      break;
    case 'cose':
      defaults = {
        name: 'cose',
        animate: false,
        padding: 44,
        nodeRepulsion: () => 6500,
        idealEdgeLength: () => 70,
        edgeElasticity: () => 100,
        nodeOverlap: 20,
        numIter: 1000,
      };
      break;
    case 'breadthfirst':
      defaults = {
        name: 'breadthfirst',
        directed: true,
        padding: 44,
        spacingFactor: 1.25,
        animate: false,
      };
      break;
    case 'circle':
      defaults = {
        name: 'circle',
        padding: 44,
        animate: false,
      };
      break;
    case 'grid':
      defaults = {
        name: 'grid',
        padding: 44,
        animate: false,
      };
      break;
  }

  return { ...defaults, ...(layoutProp || {}) };
}

/**
 * Attach computed contrast text color when a node defines custom bgColor/color without textColor.
 */
function enrichNodeData(rawData: Record<string, any>): Record<string, any> {
  const idStr = String(rawData.id ?? '');
  const labelStr = rawData.label !== undefined ? String(rawData.label) : idStr;
  const customFill = rawData.bgColor || rawData.color;
  const enriched: Record<string, any> = {
    ...rawData,
    id: idStr,
    label: labelStr,
  };
  if (customFill && !rawData.textColor) {
    enriched._autoTextColor = pickContrastTextColor(String(customFill));
  }
  return enriched;
}

function enrichEdgeData(rawData: Record<string, any>, fallbackId: string): Record<string, any> {
  const isUndirected =
    rawData.directed === false || rawData.undirected === true || rawData.isUndirected === true;
  return {
    ...rawData,
    id: rawData.id !== undefined ? String(rawData.id) : fallbackId,
    source: String(rawData.source),
    target: String(rawData.target),
    label: rawData.label !== undefined ? String(rawData.label) : '',
    ...(isUndirected ? { _isUndirected: true } : {}),
  };
}

/**
 * Normalize Cytoscape elements to standard ElementDefinition format.
 */
function normalizeElements(
  elements:
    | cytoscape.ElementsDefinition
    | cytoscape.ElementDefinition[]
    | { nodes: CytoscapeNode[]; edges: CytoscapeEdge[] }
): cytoscape.ElementDefinition[] | cytoscape.ElementsDefinition {
  if (Array.isArray(elements)) {
    return elements.map((item, idx) => {
      if (!item.data) {
        const { group, ...rest } = item as any;
        const resolvedGroup =
          group || (rest.source !== undefined && rest.target !== undefined ? 'edges' : 'nodes');
        return {
          group: resolvedGroup,
          data:
            resolvedGroup === 'edges'
              ? enrichEdgeData(rest, `e_${rest.source}_${rest.target}_${idx}`)
              : enrichNodeData(rest),
        };
      }
      const isEdge =
        item.group === 'edges' ||
        (item.data.source !== undefined && item.data.target !== undefined);
      return {
        ...item,
        data: isEdge
          ? enrichEdgeData(item.data as Record<string, any>, `e_${idx}`)
          : enrichNodeData(item.data as Record<string, any>),
      };
    });
  }

  if (
    elements &&
    (('nodes' in elements && Array.isArray(elements.nodes)) ||
      ('edges' in elements && Array.isArray(elements.edges)))
  ) {
    const rawNodes = (elements.nodes || []) as any[];
    const rawEdges = (elements.edges || []) as any[];

    const normNodes = rawNodes.map((n) => {
      if (!n.data) {
        return {
          group: 'nodes' as const,
          data: enrichNodeData(n),
        };
      }
      return {
        ...n,
        data: enrichNodeData(n.data),
      };
    });

    const normEdges = rawEdges.map((e, idx) => {
      if (!e.data) {
        return {
          group: 'edges' as const,
          data: enrichEdgeData(e, `e_${e.source}_${e.target}_${idx}`),
        };
      }
      return {
        ...e,
        data: enrichEdgeData(e.data, `e_${idx}`),
      };
    });

    return { nodes: normNodes, edges: normEdges };
  }

  return elements as cytoscape.ElementsDefinition;
}

export const CytoscapeCanvas: React.FC<CytoscapeCanvasProps> = ({
  elements,
  layout,
  layoutName = 'dagre',
  stylesheet,
  className = '',
  style,
  height = '380px',
  onNodeClick,
  cyRef,
  framed = true,
  activeNodes,
  activeEdges,
  nodeColorMap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyInstanceRef = useRef<cytoscape.Core | null>(null);
  const hasUsedActivePropsRef = useRef(false);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Monitor theme changes on documentElement
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsDark(checkIsDarkMode());

    const observer = new MutationObserver(() => {
      setIsDark(checkIsDarkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => setIsDark(checkIsDarkMode());
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      observer.disconnect();
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  // Update Cytoscape theme stylesheet when isDark or stylesheet changes
  useEffect(() => {
    if (!cyInstanceRef.current || cyInstanceRef.current.destroyed()) return;

    const baseStyles = buildDefaultStylesheet(isDark);
    const combinedStyles = stylesheet ? [...baseStyles, ...stylesheet] : baseStyles;

    cyInstanceRef.current.style().fromJson(combinedStyles).update();
  }, [isDark, stylesheet]);

  // Main Cytoscape lifecycle effect (SSR-safe, client-only)
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    registerDagreExtension();

    if (cyInstanceRef.current && !cyInstanceRef.current.destroyed()) {
      cyInstanceRef.current.destroy();
      cyInstanceRef.current = null;
    }

    const normElements = normalizeElements(elements);
    const resolvedLayout = resolveLayoutOptions(layout, layoutName);
    const baseStyles = buildDefaultStylesheet(checkIsDarkMode());
    const combinedStyles = stylesheet ? [...baseStyles, ...stylesheet] : baseStyles;

    const cy = cytoscape({
      container: containerRef.current,
      elements: normElements,
      style: combinedStyles,
      minZoom: 0.2,
      maxZoom: 3.5,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cyInstanceRef.current = cy;

    let userInteracted = false;
    cy.on('zoom pan', (evt) => {
      if (evt.originalEvent) {
        userInteracted = true;
      }
    });

    cy.one('layoutstop', () => {
      if (!cy.destroyed() && !userInteracted) {
        cy.resize();
        cy.fit(undefined, 46);
      }
    });

    cy.layout(resolvedLayout).run();

    if (cyRef) {
      if (typeof cyRef === 'function') {
        cyRef(cy);
      } else {
        cyRef.current = cy;
      }
    }

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      onNodeClick?.(node.id(), node.data());
    });

    cy.on('mouseover', 'node', () => {
      if (containerRef.current) containerRef.current.style.cursor = 'pointer';
    });

    cy.on('mouseout', 'node', () => {
      if (containerRef.current) containerRef.current.style.cursor = 'default';
    });

    let resizeObserver: ResizeObserver | null = null;
    let firstResize = true;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (cyInstanceRef.current && !cyInstanceRef.current.destroyed()) {
          cyInstanceRef.current.resize();
          if (firstResize && !userInteracted) {
            firstResize = false;
            cyInstanceRef.current.fit(undefined, 46);
          }
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (cyInstanceRef.current && !cyInstanceRef.current.destroyed()) {
        cyInstanceRef.current.destroy();
        cyInstanceRef.current = null;
      }
      if (cyRef) {
        if (typeof cyRef === 'function') {
          cyRef(null);
        } else {
          cyRef.current = null;
        }
      }
    };
  }, [elements, layout, layoutName]);

  // Support backwards-compatible active state properties
  useEffect(() => {
    const cy = cyInstanceRef.current;
    if (!cy || cy.destroyed()) return;

    if (!activeNodes && !activeEdges && !nodeColorMap && !hasUsedActivePropsRef.current) {
      return;
    }
    hasUsedActivePropsRef.current = true;

    cy.batch(() => {
      cy.nodes().removeClass('active-node highlighted');
      cy.edges().removeClass('active-edge highlighted');
      cy.nodes().removeStyle('background-color border-color color');

      if (activeNodes && activeNodes.length > 0) {
        activeNodes.forEach((nodeId) => {
          const n = cy.getElementById(String(nodeId));
          if (n.length > 0) {
            n.addClass('highlighted');
          }
        });
      }

      if (nodeColorMap) {
        Object.entries(nodeColorMap).forEach(([nodeId, col]) => {
          const n = cy.getElementById(String(nodeId));
          if (n.length > 0) {
            n.style({
              'background-color': col,
              'border-color': col,
              'color': pickContrastTextColor(col),
            });
          }
        });
      }

      if (activeEdges && activeEdges.length > 0) {
        activeEdges.forEach((edge) => {
          if (typeof edge === 'string') {
            cy.getElementById(edge).addClass('highlighted');
          } else {
            cy.edges(
              `[source = "${String(edge.source)}"][target = "${String(edge.target)}"]`
            ).addClass('highlighted');
          }
        });
      }
    });
  }, [activeNodes, activeEdges, nodeColorMap, isDark, elements, layout, layoutName]);

  const computedHeight = typeof height === 'number' ? `${height}px` : height;
  const frameClasses = framed
    ? 'rounded-xl border border-[var(--vz-border)]'
    : '';

  return (
    <div
      className={`not-content vz-dot-grid relative w-full overflow-hidden bg-[var(--vz-surface)] ${frameClasses} ${className}`}
      style={style}
    >
      <div
        ref={containerRef}
        style={{ height: computedHeight, width: '100%' }}
        className="touch-none select-none"
      />
      <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-10 rounded-md border border-[var(--vz-border)] bg-[var(--vz-surface-subtle)] px-2 py-0.5 font-mono text-[10px] tracking-tight text-[var(--vz-ink-subtle)]">
        滚轮缩放 · 拖拽平移 · 点击节点检视
      </div>
    </div>
  );
};

export default CytoscapeCanvas;
