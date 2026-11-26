import React, { useState, useMemo, useCallback } from 'react';
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, Sparkles } from 'lucide-react';

export interface QuizOptionObject {
  text: string;
  isCorrect?: boolean;
  explanation?: string;
}

export type QuizOption = string | QuizOptionObject;

export interface QuizCardProps {
  question: string;
  options: QuizOption[];
  answer?: number; // 0-indexed correct option
  explanation?: string;
  title?: string;
  category?: string;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  options = [],
  answer,
  explanation = '',
  title,
  category,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const displayCategory = category || title || '随堂思考自测';
  const subtitle = category && title && category !== title ? title : null;

  // Normalize options whether they are strings or { text, isCorrect, explanation } objects
  const normalizedOptions = useMemo(() => {
    return options.map((opt, idx) => {
      if (typeof opt === 'string') {
        return {
          text: opt,
          isCorrect: answer !== undefined ? idx === answer : false,
          explanation,
        };
      }
      return {
        text: opt.text || '',
        isCorrect:
          opt.isCorrect !== undefined
            ? opt.isCorrect
            : answer !== undefined
            ? idx === answer
            : false,
        explanation: opt.explanation || explanation,
      };
    });
  }, [options, answer, explanation]);

  // Determine the correct option index
  const correctAnswerIdx = useMemo(() => {
    if (answer !== undefined) return answer;
    const found = normalizedOptions.findIndex((o) => o.isCorrect);
    return found !== -1 ? found : 0;
  }, [answer, normalizedOptions]);

  // Client-safe, reduced-motion-aware dynamic confetti launcher
  const fireFireworks = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    try {
      const confettiModule = await import('canvas-confetti');
      const confetti = confettiModule.default || confettiModule;
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.75 },
        disableForReducedMotion: true,
        colors: ['#0070f3', '#10b981', '#6366f1', '#f59e0b'],
      });
    } catch {
      // Ignore if canvas-confetti is unavailable
    }
  }, []);

  const handleSelectOption = useCallback(
    (idx: number) => {
      if (submitted) return;
      setSelectedIdx(idx);
      setSubmitted(true);
      setHoveredIdx(null);

      if (idx === correctAnswerIdx) {
        fireFireworks();
      }
    },
    [submitted, correctAnswerIdx, fireFireworks]
  );

  const handleRetry = useCallback(() => {
    setSelectedIdx(null);
    setSubmitted(false);
    setHoveredIdx(null);
  }, []);

  const isCorrect = submitted && selectedIdx === correctAnswerIdx;
  const currentExplanation =
    selectedIdx !== null
      ? normalizedOptions[selectedIdx]?.explanation || explanation
      : explanation;

  return (
    <div className="vz-shell not-content my-6 rounded-2xl border border-[var(--vz-border)] bg-[var(--vz-surface)] text-[var(--vz-ink)] overflow-hidden transition-colors">
      {/* Header Bar */}
      <div className="vz-header px-5 py-3.5 bg-[var(--vz-surface-subtle)] border-b border-[var(--vz-border)] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="w-6 h-6 rounded-md border border-[var(--vz-border)] bg-[var(--vz-surface)] text-[var(--vz-ink-muted)] inline-flex items-center justify-center shrink-0">
            <HelpCircle className="w-3.5 h-3.5" />
          </span>
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border border-[var(--vz-border)] bg-[var(--vz-surface)] text-[var(--vz-ink-muted)]">
            {displayCategory}
          </span>
          {subtitle && (
            <span className="text-xs font-medium text-[var(--vz-ink-subtle)] truncate">
              {subtitle}
            </span>
          )}
        </div>

        {/* Status Pill */}
        {submitted ? (
          isCorrect ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
              <Sparkles className="w-3 h-3" />
              <span>+1 掌握</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-medium bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60">
              <XCircle className="w-3 h-3" />
              <span>再想想</span>
            </span>
          )
        ) : (
          <span className="text-[11px] font-mono text-[var(--vz-ink-subtle)]">
            单选自测
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="p-5">
        {/* Question Body */}
        <h4 className="m-0 text-[15px] font-semibold text-[var(--vz-ink)] mb-4 leading-relaxed tracking-tight">
          {question}
        </h4>

        {/* Options List */}
        <div className="space-y-2.5" role="group" aria-label={displayCategory}>
          {normalizedOptions.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const isOptionCorrect = idx === correctAnswerIdx;
            const isHovered = !submitted && hoveredIdx === idx;
            const letter = String.fromCharCode(65 + idx);

            let buttonStateClasses =
              'bg-[var(--vz-surface)] border-[var(--vz-border)] text-[var(--vz-ink)] hover:border-[var(--vz-accent-border)] hover:bg-[var(--vz-accent-bg)] cursor-pointer active:scale-[0.995]';

            if (submitted) {
              if (isOptionCorrect) {
                buttonStateClasses =
                  'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium dark:bg-emerald-950/40 dark:border-emerald-700/70 dark:text-emerald-100';
              } else if (isSelected && !isOptionCorrect) {
                buttonStateClasses =
                  'bg-rose-50/80 border-rose-300 text-rose-950 dark:bg-rose-950/40 dark:border-rose-700/70 dark:text-rose-100';
              } else {
                buttonStateClasses =
                  'opacity-50 border-[var(--vz-border)] bg-[var(--vz-surface-subtle)] text-[var(--vz-ink-muted)] cursor-not-allowed';
              }
            }

            let keycapClasses =
              'vz-keycap bg-[var(--vz-surface-muted)] border-[var(--vz-border)] text-[var(--vz-ink-muted)]';

            if (submitted) {
              if (isOptionCorrect) {
                keycapClasses =
                  'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500 dark:text-slate-950';
              } else if (isSelected && !isOptionCorrect) {
                keycapClasses =
                  'bg-rose-600 border-rose-600 text-white dark:bg-rose-500 dark:border-rose-500 dark:text-slate-950';
              } else {
                keycapClasses =
                  'bg-[var(--vz-surface-muted)] border-[var(--vz-border)] text-[var(--vz-ink-subtle)]';
              }
            } else if (isHovered) {
              keycapClasses =
                'bg-[var(--vz-accent)] border-[var(--vz-accent)] text-white';
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(idx)}
                onMouseEnter={() => !submitted && setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx((prev) => (prev === idx ? null : prev))}
                disabled={submitted}
                aria-pressed={isSelected}
                className={`group w-full text-left px-3.5 py-3 rounded-xl border text-[13px] leading-relaxed transition-all flex items-center justify-between gap-3 ${buttonStateClasses}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-md border font-mono text-[11px] font-semibold shrink-0 mt-0.5 transition-colors ${keycapClasses}`}
                  >
                    {letter}
                  </span>
                  <span className="break-words">{opt.text}</span>
                </div>

                {submitted && isOptionCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                {submitted && isSelected && !isOptionCorrect && (
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Callout */}
        {submitted && (
          <div
            className={`mt-4 p-4 rounded-xl border transition-all ${
              isCorrect
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-100'
                : 'bg-rose-50/70 border-rose-200 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800/60 dark:text-rose-100'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold flex items-center gap-1.5">
                {isCorrect ? (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-emerald-800 dark:text-emerald-300">
                      回答正确 · 要点解析
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="text-rose-800 dark:text-rose-300">
                      暂未命中 · 思路解析
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--vz-border)] bg-[var(--vz-surface)] text-[var(--vz-ink-muted)] hover:text-[var(--vz-ink)] hover:border-[var(--vz-border-strong)] active:scale-95 transition-all text-[11px] font-medium cursor-pointer"
                title="清空选项并重新作答"
              >
                <RotateCcw className="w-3 h-3" />
                <span>重新作答</span>
              </button>
            </div>

            {currentExplanation && (
              <p className="m-0 mt-2.5 text-[13px] text-[var(--vz-ink-muted)] leading-relaxed">
                {currentExplanation}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizCard;
