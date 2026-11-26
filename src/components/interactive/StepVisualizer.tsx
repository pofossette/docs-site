import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Layers,
  Code2,
  Terminal,
} from 'lucide-react';

export interface StepItem {
  title: string;
  description: string;
  badge?: string;
  render?: React.ReactNode;
  stateView?: React.ReactNode;
  code?: string;
}

export interface StepVisualizerProps {
  steps: StepItem[];
  title?: string;
  algorithmName?: string;
}

const SPEED_OPTIONS = [
  { label: '0.8s', value: 800 },
  { label: '1.5s', value: 1500 },
  { label: '2.5s', value: 2500 },
];

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

function getStepBadgeTone(badge: string): string {
  const b = badge.toLowerCase();
  if (
    b.includes('accept') ||
    b.includes('成功') ||
    b.includes('pass') ||
    b.includes('完成') ||
    b.includes('合规') ||
    b.includes('闭环')
  ) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
  }
  if (
    b.includes('致命') ||
    b.includes('error') ||
    b.includes('拦截') ||
    b.includes('exception') ||
    b.includes('fail')
  ) {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60';
  }
  if (
    b.includes('reduce') ||
    b.includes('归约') ||
    b.includes('match') ||
    b.includes('匹配') ||
    b.includes('pop') ||
    b.includes('backpatch') ||
    b.includes('回填')
  ) {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
  }
  return 'bg-[var(--vz-accent-bg)] text-[var(--vz-accent)] border-[var(--vz-accent-border)]';
}

export const StepVisualizer: React.FC<StepVisualizerProps> = ({
  steps = [],
  title,
  algorithmName,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1500);
  const [showCode, setShowCode] = useState(false);

  const totalSteps = steps.length;

  // Handle boundary updates if steps change
  useEffect(() => {
    if (currentStep >= totalSteps && totalSteps > 0) {
      setCurrentStep(totalSteps - 1);
    }
  }, [totalSteps, currentStep]);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying || totalSteps <= 1) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, totalSteps]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setIsPlaying(false);
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setIsPlaying(false);
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  const togglePlay = useCallback(() => {
    if (totalSteps <= 1) return;
    if (!isPlaying && currentStep >= totalSteps - 1) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [isPlaying, currentStep, totalSteps]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === ' ' || e.code === 'Space') {
        if (target && (target.tagName === 'BUTTON' || target.tagName === 'A')) {
          return;
        }
        e.preventDefault();
        togglePlay();
      }
    },
    [handlePrev, handleNext, togglePlay]
  );

  const current = useMemo(() => {
    if (totalSteps === 0) return null;
    return steps[currentStep] || steps[0];
  }, [steps, currentStep, totalSteps]);

  if (totalSteps === 0 || !current) {
    return (
      <div className="vz-shell not-content my-6 rounded-2xl border border-dashed border-[var(--vz-border-strong)] bg-[var(--vz-surface-subtle)] p-8 text-center text-xs text-[var(--vz-ink-muted)]">
        暂无演示步骤数据
      </div>
    );
  }

  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const padWidth = totalSteps >= 100 ? 3 : 2;
  const stepCounter = `${String(currentStep + 1).padStart(padWidth, '0')} / ${String(
    totalSteps
  ).padStart(padWidth, '0')}`;

  const visualNode = current.render ?? current.stateView ?? null;
  const hasVisual = Boolean(visualNode);
  const hasCode = Boolean(current.code);

  const renderCodeBlock = (codeText: string) => (
    <div className="w-full rounded-xl border border-[var(--vz-border)] bg-[var(--vz-surface-subtle)] overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--vz-border)] bg-[var(--vz-surface-muted)]/60">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--vz-ink-muted)]">
          <Terminal className="w-3.5 h-3.5 text-[var(--vz-accent)]" />
          <span>执行轨迹 / Trace</span>
        </div>
        <span className="font-mono text-[10px] text-[var(--vz-ink-subtle)] tabular-nums">
          Step {String(currentStep + 1).padStart(padWidth, '0')}
        </span>
      </div>
      <pre className="m-0 bg-transparent p-4 overflow-x-auto font-mono text-xs leading-relaxed text-[var(--vz-ink)]">
        <code>{codeText}</code>
      </pre>
    </div>
  );

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label={title ? `${title} 交互步进器` : '交互演练步进器'}
      className="vz-shell not-content my-6 rounded-2xl border border-[var(--vz-border)] bg-[var(--vz-surface)] text-[var(--vz-ink)] overflow-hidden transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vz-accent)]"
    >
      {/* Geist Workbench Header */}
      <div className="vz-header px-4 py-3 sm:px-5 bg-[var(--vz-surface-subtle)] border-b border-[var(--vz-border)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg border border-[var(--vz-border)] bg-[var(--vz-surface)] flex items-center justify-center text-[var(--vz-ink-muted)] shrink-0 mt-0.5">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-[var(--vz-ink-muted)]">
                交互演练工作台
              </span>
              {algorithmName && (
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[var(--vz-surface)] border border-[var(--vz-border)] text-[var(--vz-ink-muted)]">
                  {algorithmName}
                </span>
              )}
            </div>
            {title && (
              <h4 className="m-0 text-sm font-semibold text-[var(--vz-ink)] tracking-tight leading-snug">
                {title}
              </h4>
            )}
          </div>
        </div>

        {/* Speed Selector & Playback Pill Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="inline-flex items-center rounded-lg border border-[var(--vz-border)] bg-[var(--vz-surface)] p-0.5"
            role="group"
            aria-label="播放速度"
          >
            <Gauge className="w-3.5 h-3.5 mx-1.5 text-[var(--vz-ink-subtle)]" />
            {SPEED_OPTIONS.map((opt) => {
              const active = playbackSpeed === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlaybackSpeed(opt.value)}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono tabular-nums transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--vz-surface-muted)] text-[var(--vz-ink)] font-semibold shadow-2xs'
                      : 'text-[var(--vz-ink-muted)] hover:text-[var(--vz-ink)]'
                  }`}
                  title={`自动播放间隔 ${opt.label}`}
                  aria-pressed={active}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--vz-border)] bg-[var(--vz-surface)] p-1">
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-lg text-[var(--vz-ink-muted)] hover:text-[var(--vz-ink)] hover:bg-[var(--vz-surface-muted)] active:scale-95 transition-all cursor-pointer"
              title="重置到第一步"
              aria-label="重置到第一步"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="p-1.5 rounded-lg text-[var(--vz-ink-muted)] hover:text-[var(--vz-ink)] hover:bg-[var(--vz-surface-muted)] disabled:opacity-35 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
              title="上一步 (←)"
              aria-label="上一步"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={totalSteps <= 1}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300'
                  : 'bg-[var(--vz-btn-primary-bg)] text-[var(--vz-btn-primary-fg)] hover:opacity-90'
              }`}
              title={isPlaying ? '暂停自动播放 (Space)' : '开始自动播放 (Space)'}
              aria-label={isPlaying ? '暂停自动播放' : '开始自动播放'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>暂停</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>播放</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentStep === totalSteps - 1}
              className="p-1.5 rounded-lg text-[var(--vz-ink-muted)] hover:text-[var(--vz-ink)] hover:bg-[var(--vz-surface-muted)] disabled:opacity-35 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
              title="下一步 (→)"
              aria-label="下一步"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Dot-Grid Interactive Stage */}
      <div className="vz-stage vz-dot-grid relative p-4 sm:p-6 min-h-[240px] flex flex-col justify-center gap-4 overflow-x-auto bg-[var(--vz-surface)] text-[var(--vz-ink)]">
        {hasVisual ? (
          <>
            <div className="w-full">{renderCustomNode(visualNode)}</div>
            {hasCode && showCode && renderCodeBlock(current.code!)}
          </>
        ) : hasCode ? (
          renderCodeBlock(current.code!)
        ) : null}
      </div>

      {/* 2px Hairline Progress Bar */}
      <div className="w-full h-[2px] bg-[var(--vz-border)] relative overflow-hidden">
        <div
          className="h-full bg-[var(--vz-accent)] transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Interactive Step Footer */}
      <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-[var(--vz-surface)] border-t border-[var(--vz-border)] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Step Counter, Title & Semantic Badge */}
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <span className="font-mono text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md border border-[var(--vz-border)] bg-[var(--vz-surface-subtle)] text-[var(--vz-ink-muted)] shrink-0">
              {stepCounter}
            </span>
            <span className="text-sm font-semibold text-[var(--vz-ink)] tracking-tight">
              {current.title}
            </span>
            {current.badge && (
              <span
                className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border ${getStepBadgeTone(
                  current.badge
                )}`}
              >
                {current.badge}
              </span>
            )}
          </div>

          {/* Inline Code Toggle (when both visual & code exist) + Clickable Step Scrubber */}
          <div className="flex items-center gap-2.5 flex-wrap max-w-full">
            {hasVisual && hasCode && (
              <button
                type="button"
                onClick={() => setShowCode((prev) => !prev)}
                aria-expanded={showCode}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                  showCode
                    ? 'bg-[var(--vz-accent-bg)] border-[var(--vz-accent-border)] text-[var(--vz-accent)]'
                    : 'bg-[var(--vz-surface-subtle)] border-[var(--vz-border)] text-[var(--vz-ink-muted)] hover:text-[var(--vz-ink)] hover:border-[var(--vz-border-strong)]'
                }`}
                title={showCode ? '收起日志与代码' : '查看当前步骤日志与代码'}
              >
                <Code2 className="w-3 h-3" />
                <span>{showCode ? '收起日志/代码' : '查看日志/代码'}</span>
              </button>
            )}

            <div
              className="flex items-center gap-1.5 max-w-full overflow-x-auto py-1"
              role="tablist"
              aria-label="步骤快速跳转"
            >
              {steps.map((step, idx) => {
                const isActive = idx === currentStep;
                const isVisited = idx < currentStep;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`步骤 ${idx + 1}: ${step.title}`}
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStep(idx);
                    }}
                    className={`h-2 rounded-full transition-all flex-shrink-0 cursor-pointer ${
                      isActive
                        ? 'w-6 bg-[var(--vz-accent)]'
                        : isVisited
                        ? 'w-2 bg-[var(--vz-accent)]/45 hover:bg-[var(--vz-accent)]/75'
                        : 'w-2 bg-[var(--vz-border-strong)] hover:bg-[var(--vz-ink-subtle)]'
                    }`}
                    title={`步骤 ${idx + 1}: ${step.title}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Description Callout */}
        {current.description && (
          <div className="text-[13px] leading-relaxed text-[var(--vz-ink-muted)] bg-[var(--vz-surface-subtle)] px-3.5 py-2.5 rounded-xl border border-[var(--vz-border)] whitespace-pre-line">
            {current.description}
          </div>
        )}
      </div>
    </div>
  );
};

export default StepVisualizer;
