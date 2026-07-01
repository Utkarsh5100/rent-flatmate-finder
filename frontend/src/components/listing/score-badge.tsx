'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  explanation: string;
  computedVia: string;
  className?: string;
}

function getScoreColor(score: number) {
  if (score >= 75) return { ring: 'text-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Great match' };
  if (score >= 50) return { ring: 'text-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Good match' };
  if (score >= 25) return { ring: 'text-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', label: 'Fair match' };
  return { ring: 'text-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'Low match' };
}

export function ScoreBadge({ score, explanation, computedVia, className }: ScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = getScoreColor(score);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}
      onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {/* Circular score ring */}
      <div className="relative h-14 w-14">
        <svg className="h-14 w-14 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
          <circle cx="20" cy="20" r="18" fill="none" strokeWidth="3" strokeLinecap="round"
            className={cn('transition-all duration-700', colors.ring)}
            style={{ strokeDasharray: circumference, strokeDashoffset }} />
        </svg>
        <span className={cn('absolute inset-0 flex items-center justify-center text-sm font-bold', colors.text)}>
          {score}
        </span>
      </div>
      <span className={cn('mt-1 text-[10px] font-medium', colors.text)}>{colors.label}</span>

      {/* Tooltip with explanation */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-popover p-3 shadow-lg">
          <p className="text-xs text-popover-foreground">{explanation}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Scored via {computedVia}</p>
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-border bg-popover" />
        </div>
      )}
    </div>
  );
}
