/**
 * SliderField — reusable slider used on Playground, Load Test, and any future page.
 *
 * Layout (top → bottom):
 *   [LABEL ···················· VALUE + UNIT]
 *   [═══════════●═══════════════════════════]  ← range input (thumb centred via global CSS)
 *   [minLabel ·················· maxLabel  ]   ← optional hint row
 *   [optional warnLabel in centre           ]
 */
interface SliderFieldProps {
  label:     string
  value:     number
  unit?:     string
  min:       number
  max:       number
  step?:     number
  disabled?: boolean
  minLabel?: string
  maxLabel?: string
  warnLabel?: string
  onChange:  (v: number) => void
}

export function SliderField({
  label, value, unit = '', min, max, step = 1,
  disabled = false, minLabel, maxLabel, warnLabel,
  onChange,
}: SliderFieldProps) {
  return (
    <div className="flex flex-col gap-0">
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider select-none">
          {label}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-[15px] font-bold text-berry leading-none tabular-nums">{value}</span>
          {unit && <span className="text-[11px] text-txt-secondary">{unit}</span>}
        </div>
      </div>

      {/*
        Slider wrapper.
        - `relative` + `flex items-center` ensures the input fills the row.
        - The global CSS in index.css handles all thumb / track / moz styling.
        - We deliberately DO NOT set height on this wrapper — the input's own
          height:20px creates the correct tap target without pushing siblings.
      */}
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          /* accentColor is a fallback for browsers that don't support the
             pseudo-element overrides above (very old ones). */
          style={{ accentColor: '#7352C7' }}
        />
      </div>

      {/* Hint row — min/max labels flush to track edges */}
      {(minLabel || maxLabel || warnLabel) && (
        <div className="flex items-start justify-between mt-1.5">
          <span className="text-[10px] text-txt-secondary font-medium leading-tight">
            {minLabel ?? min}
          </span>
          {warnLabel && (
            <span className="text-[10px] text-berry-red font-semibold leading-tight text-center flex-1 px-2">
              {warnLabel}
            </span>
          )}
          <span className="text-[10px] text-txt-secondary font-medium leading-tight">
            {maxLabel ?? max}
          </span>
        </div>
      )}
    </div>
  )
}
