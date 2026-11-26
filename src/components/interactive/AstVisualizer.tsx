import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Info,
  Maximize2,
  Minimize2,
  Code2,
  X,
} from 'lucide-react';

export interface TreeNode {
  id: string;
  name: string;
  type?: string;
  value?: string;
  children?: TreeNode[];
}

export interface AstVisualizerProps {
  treeData: TreeNode;
  title?: string;
}

// Dual-theme syntax badge styling based on node type
function getNodeStyle(type?: string) {
  if (!type) {
    return {
      badge:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/70',
      dot: 'bg-slate-400 dark:bg-slate-500',
    };
  }
  const t = type.toLowerCase();
  if (t.includes('binop') || t.includes('unary') || t.includes('op')) {
    return {
      badge:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
      dot: 'bg-amber-500 dark:bg-amber-400',
    };
  }
  if (t.includes('id') || t.includes('var') || t.includes('ident')) {
    return {
      badge:
        'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
      dot: 'bg-sky-500 dark:bg-sky-400',
    };
  }
  if (
    t.includes('literal') ||
    t.includes('num') ||
    t.includes('string') ||
    t.includes('const')
  ) {
    return {
      badge:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
      dot: 'bg-emerald-500 dark:bg-emerald-400',
    };
  }
  if (t.includes('expr')) {
    return {
      badge:
        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
      dot: 'bg-blue-500 dark:bg-blue-400',
    };
  }
  if (
    t.includes('stmt') ||
    t.includes('statement') ||
    t.includes('if') ||
    t.includes('while') ||
    t.includes('return')
  ) {
    return {
      badge:
        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
      dot: 'bg-rose-500 dark:bg-rose-400',
    };
  }
  if (
    t.includes('prog') ||
    t.includes('func') ||
    t.includes('block') ||
    t.includes('decl')
  ) {
    return {
      badge:
        'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
      dot: 'bg-indigo-500 dark:bg-indigo-400',
    };
  }
  if (t.includes('type') || t.includes('key')) {
    return {
      badge:
        'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
      dot: 'bg-purple-500 dark:bg-purple-400',
    };
  }
  return {
    badge:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/70',
    dot: 'bg-slate-400 dark:bg-slate-500',
  };
}

function collectNonLeafIds(node: TreeNode): string[] {
  const ids: string[] = [];
  if (node.children && node.children.length > 0) {
    ids.push(node.id);
    for (const child of node.children) {
      ids.push(...collectNonLeafIds(child));
    }
  }
  return ids;
}

function countSubtreeNodes(node: TreeNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countSubtreeNodes(child);
    }
  }
  return count;
}

function getSubtreeDepth(node: TreeNode): number {
  if (!node.children || node.children.length === 0) return 1;
  let maxChildDepth = 0;
  for (const child of node.children) {
    maxChildDepth = Math.max(maxChildDepth, getSubtreeDepth(child));
  }
  return 1 + maxChildDepth;
}

function countMatches(node: TreeNode, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  let count =
    node.name.toLowerCase().includes(q) ||
    Boolean(node.type && node.type.toLowerCase().includes(q)) ||
    Boolean(node.value && node.value.toLowerCase().includes(q))
      ? 1
      : 0;
  if (node.children) {
    for (const child of node.children) {
      count += countMatches(child, q);
    }
  }
  return count;
}

interface TreeItemProps {
  node: TreeNode;
  collapsedSet: Set<string>;
  onToggleCollapse: (id: string) => void;
  selectedId: string | null;
  hoveredId: string | null;
  onSelectNode: (node: TreeNode) => void;
  onHoverNode: (node: TreeNode | null) => void;
  searchQuery: string;
}

const TreeItem: React.FC<TreeItemProps> = ({
  node,
  collapsedSet,
  onToggleCollapse,
  selectedId,
  hoveredId,
  onSelectNode,
  onHoverNode,
  searchQuery,
}) => {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const isCollapsed = collapsedSet.has(node.id);
  const isSelected = selectedId === node.id;
  const isHovered = hoveredId === node.id;

  const style = getNodeStyle(node.type);

  const isMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return false;
    return (
      node.name.toLowerCase().includes(q) ||
      Boolean(node.type && node.type.toLowerCase().includes(q)) ||
      Boolean(node.value && node.value.toLowerCase().includes(q))
    );
  }, [searchQuery, node]);

  return (
    <div className="flex flex-col select-none">
      <div
        role="treeitem"
        aria-expanded={hasChildren ? !isCollapsed : undefined}
        aria-selected={isSelected}
        tabIndex={0}
        onClick={() => onSelectNode(node)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectNode(node);
          } else if (hasChildren && e.key === 'ArrowRight' && isCollapsed) {
            e.preventDefault();
            onToggleCollapse(node.id);
          } else if (hasChildren && e.key === 'ArrowLeft' && !isCollapsed) {
            e.preventDefault();
            onToggleCollapse(node.id);
          }
        }}
        onMouseEnter={() => onHoverNode(node)}
        onMouseLeave={() => onHoverNode(null)}
        className={`group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vz-accent)] ${
          isSelected
            ? 'bg-[var(--vz-accent-bg)] ring-1 ring-[var(--vz-accent-border)] text-[var(--vz-ink)]'
            : isHovered
            ? 'bg-[var(--vz-surface-subtle)] text-[var(--vz-ink)]'
            : 'hover:bg-[var(--vz-surface-subtle)] text-[var(--vz-ink)]'
        } ${
          isMatch
            ? 'ring-1 ring-amber-400/80 bg-amber-50/80 dark:bg-amber-950/35 dark:ring-amber-500/60'
            : ''
        }`}
      >
        {/* Expand / Collapse toggle or Leaf dot */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(node.id);
            }}
            className="w-5 h-5 inline-flex items-center justify-center rounded-md hover:bg-[var(--vz-surface-muted)] text-[var(--vz-ink-muted)] hover:text-[var(--vz-ink)] transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? '展开子树' : '折叠子树'}
            aria-label={isCollapsed ? '展开子树' : '折叠子树'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          </div>
        )}

        {/* Node Name */}
        <span
          className={`text-xs font-semibold tracking-tight ${
            isSelected ? 'text-[var(--vz-accent)]' : 'text-[var(--vz-ink)]'
          }`}
        >
          {node.name}
        </span>

        {/* Node Type Badge */}
        {node.type && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border font-medium leading-none ${style.badge}`}
          >
            {node.type}
          </span>
        )}

        {/* Node Value (for literals / tokens) */}
        {node.value !== undefined && (
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50 leading-none">
            &quot;{node.value}&quot;
          </span>
        )}

        {/* Collapsed Children Counter */}
        {hasChildren && isCollapsed && (
          <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full border border-[var(--vz-border)] bg-[var(--vz-surface-muted)] text-[var(--vz-ink-muted)] leading-none">
            +{node.children!.length} 子节点
          </span>
        )}
      </div>

      {/* Recursive Children Container with Hairline Guide */}
      {hasChildren && !isCollapsed && (
        <div className="relative flex flex-col border-l border-[var(--vz-border)] ml-[18px] pl-2.5 mt-0.5 space-y-0.5">
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              collapsedSet={collapsedSet}
              onToggleCollapse={onToggleCollapse}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelectNode={onSelectNode}
              onHoverNode={onHoverNode}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const AstVisualizer: React.FC<AstVisualizerProps> = ({
  treeData,
  title = '抽象语法树 (AST) 结构检视器',
}) => {
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(treeData);
  const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const allNonLeafIds = useMemo(() => collectNonLeafIds(treeData), [treeData]);

  const handleExpandAll = useCallback(() => {
    setCollapsedSet(new Set());
  }, []);

  const handleCollapseAll = useCallback(() => {
    const ids = allNonLeafIds.filter((id) => id !== treeData.id);
    setCollapsedSet(new Set(ids));
  }, [allNonLeafIds, treeData.id]);

  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const activeNode = hoveredNode || selectedNode || treeData;

  const nodeStats = useMemo(() => {
    if (!activeNode) return null;
    return {
      subtreeSize: countSubtreeNodes(activeNode),
      maxDepth: getSubtreeDepth(activeNode),
      childrenCount: activeNode.children?.length ?? 0,
    };
  }, [activeNode]);

  const totalTreeNodes = useMemo(() => countSubtreeNodes(treeData), [treeData]);
  const matchCount = useMemo(
    () => (searchQuery.trim() ? countMatches(treeData, searchQuery) : 0),
    [treeData, searchQuery]
  );

  const isAllExpanded = collapsedSet.size === 0;
  const isAllCollapsed =
    allNonLeafIds.length > 1 &&
    collapsedSet.size >= allNonLeafIds.filter((id) => id !== treeData.id).length;

  return (
    <div className="vz-shell not-content my-6 rounded-2xl border border-[var(--vz-border)] bg-[var(--vz-surface)] text-[var(--vz-ink)] overflow-hidden transition-colors">
      {/* Header Bar */}
      <div className="vz-header px-4 py-3 sm:px-5 bg-[var(--vz-surface-subtle)] border-b border-[var(--vz-border)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <div className="w-7 h-7 rounded-lg border border-[var(--vz-border)] bg-[var(--vz-surface)] flex items-center justify-center text-[var(--vz-ink-muted)] shrink-0">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <h4 className="m-0 text-sm font-semibold text-[var(--vz-ink)] tracking-tight">
            {title}
          </h4>
          <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-[var(--vz-surface)] border border-[var(--vz-border)] text-[var(--vz-ink-muted)]">
            {totalTreeNodes} 节点
          </span>
          {searchQuery.trim() && (
            <span
              className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md border ${
                matchCount > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60'
              }`}
            >
              匹配 {matchCount} 项
            </span>
          )}
        </div>

        {/* Actions: Search with Clear & Segmented Expand/Collapse */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--vz-ink-subtle)] pointer-events-none" />
            <input
              type="text"
              placeholder="过滤节点 (名称/类型/值)..."
              aria-label="过滤语法树节点"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 py-1.5 text-xs bg-[var(--vz-surface)] border border-[var(--vz-border)] rounded-lg text-[var(--vz-ink)] placeholder:text-[var(--vz-ink-subtle)] focus:outline-none focus:border-[var(--vz-accent)] w-48 sm:w-52 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 p-0.5 rounded text-[var(--vz-ink-subtle)] hover:text-[var(--vz-ink)] hover:bg-[var(--vz-surface-muted)] transition-colors cursor-pointer"
                title="清除过滤"
                aria-label="清除过滤"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            className="inline-flex items-center rounded-lg border border-[var(--vz-border)] bg-[var(--vz-surface)] p-0.5 text-xs"
            role="group"
            aria-label="树节点展开与折叠控制"
          >
            <button
              type="button"
              onClick={handleExpandAll}
              className={`px-2.5 py-1 rounded-md inline-flex items-center gap-1 transition-colors text-[11px] cursor-pointer ${
                isAllExpanded
                  ? 'bg-[var(--vz-surface-muted)] text-[var(--vz-ink)] font-medium shadow-2xs'
                  : 'text-[var(--vz-ink-muted)] hover:text-[var(--vz-ink)]'
              }`}
              title="全部展开"
            >
              <Maximize2 className="w-3 h-3" />
              <span>全部展开</span>
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className={`px-2.5 py-1 rounded-md inline-flex items-center gap-1 transition-colors text-[11px] cursor-pointer ${
                isAllCollapsed
                  ? 'bg-[var(--vz-surface-muted)] text-[var(--vz-ink)] font-medium shadow-2xs'
                  : 'text-[var(--vz-ink-muted)] hover:text-[var(--vz-ink)]'
              }`}
              title="全部折叠"
            >
              <Minimize2 className="w-3 h-3" />
              <span>全部折叠</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tree Canvas Area */}
      <div
        role="tree"
        aria-label={title}
        className="p-4 sm:p-5 bg-[var(--vz-surface)] min-h-[280px] max-h-[480px] overflow-auto"
      >
        <TreeItem
          node={treeData}
          collapsedSet={collapsedSet}
          onToggleCollapse={handleToggleCollapse}
          selectedId={selectedNode?.id ?? null}
          hoveredId={hoveredNode?.id ?? null}
          onSelectNode={setSelectedNode}
          onHoverNode={setHoveredNode}
          searchQuery={searchQuery}
        />
      </div>

      {/* 4-Cell Tabular Inspector Footer */}
      {activeNode && (
        <div className="px-4 py-3.5 sm:px-5 bg-[var(--vz-surface-subtle)] border-t border-[var(--vz-border)] flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-[var(--vz-ink-muted)]">
              <Info className="w-3.5 h-3.5 text-[var(--vz-accent)] shrink-0" />
              <span>当前检视节点属性</span>
            </div>
            <span className="font-mono text-[11px] text-[var(--vz-ink-subtle)] tabular-nums">
              ID: {activeNode.id}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded-xl border border-[var(--vz-border)] bg-[var(--vz-surface)] px-3 py-2">
              <div className="text-[10px] text-[var(--vz-ink-subtle)] mb-0.5">
                节点名称
              </div>
              <div className="font-semibold text-[var(--vz-ink)] truncate">
                {activeNode.name}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--vz-border)] bg-[var(--vz-surface)] px-3 py-2">
              <div className="text-[10px] text-[var(--vz-ink-subtle)] mb-0.5">
                语法类型 (Type)
              </div>
              <div className="font-mono text-[var(--vz-accent)] truncate">
                {activeNode.type || '未指定'}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--vz-border)] bg-[var(--vz-surface)] px-3 py-2">
              <div className="text-[10px] text-[var(--vz-ink-subtle)] mb-0.5">
                词法值 (Value)
              </div>
              <div className="font-mono text-amber-700 dark:text-amber-300 truncate">
                {activeNode.value !== undefined ? `"${activeNode.value}"` : '无'}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--vz-border)] bg-[var(--vz-surface)] px-3 py-2">
              <div className="text-[10px] text-[var(--vz-ink-subtle)] mb-0.5">
                子树规模
              </div>
              <div className="font-mono tabular-nums text-emerald-700 dark:text-emerald-300 truncate">
                {nodeStats?.subtreeSize} 节点 · 深度 {nodeStats?.maxDepth}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AstVisualizer;
