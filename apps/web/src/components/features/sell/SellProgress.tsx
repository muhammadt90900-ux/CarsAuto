'use client';
// apps/web/src/components/features/sell/SellProgress.tsx
// 3-step progress bar for the sell form.

interface SellProgressProps {
  step: number; // 1 | 2 | 3
}

const STEPS = [
  { n: 1, label: 'Basics' },
  { n: 2, label: 'Details' },
  { n: 3, label: 'Photos' },
];

export function SellProgress({ step }: SellProgressProps) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          {/* Step circle */}
          <div className="flex flex-col items-center flex-1">
            <div
              className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                transition-all duration-300 border-2
                ${step > s.n
                  ? 'bg-[var(--gold)] border-[var(--gold)] text-[var(--ink-900)]'
                  : step === s.n
                    ? 'bg-transparent border-[var(--gold)] text-[var(--gold)] shadow-[0_0_12px_rgba(201,168,76,0.3)]'
                    : 'bg-transparent border-[rgba(255,255,255,0.12)] text-[var(--text-faint)]'}
              `}
            >
              {step > s.n ? '✓' : s.n}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium uppercase tracking-wider transition-colors duration-200
                ${step >= s.n ? 'text-[var(--gold)]' : 'text-[var(--text-faint)]'}`}
            >
              {s.label}
            </span>
          </div>

          {/* Connector line */}
          {i < STEPS.length - 1 && (
            <div className="flex-1 mx-1 h-px relative" style={{ maxWidth: '100%' }}>
              <div className="absolute inset-0 bg-[rgba(255,255,255,0.08)] rounded" />
              <div
                className="absolute inset-0 rounded transition-all duration-500"
                style={{
                  background: 'linear-gradient(90deg, var(--gold), #9e6e1e)',
                  transformOrigin: 'left',
                  transform: `scaleX(${step > s.n ? 1 : 0})`,
                  transition: 'transform 0.4s ease',
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
