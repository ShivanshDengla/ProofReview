import { useState } from 'react';

function Star({ filled, half, size }) {
  const px = size === 'lg' ? 22 : size === 'md' ? 18 : 14;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={`half-${px}`}>
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.97 6.02 6.65.97-4.81 4.69 1.13 6.62L12 17.77l-5.94 3.03 1.13-6.62L2.38 9.49l6.65-.97L12 2.5z"
        fill={filled ? '#f59e0b' : half ? `url(#half-${px})` : 'currentColor'}
        fillOpacity={filled || half ? 1 : 0.25}
        stroke="#f59e0b"
        strokeWidth={filled || half ? 0 : 1}
      />
    </svg>
  );
}

export default function StarRating({
  value = 0,
  size = 'sm',
  interactive = false,
  onChange,
}) {
  const [hover, setHover] = useState(0);
  const display = interactive && hover ? hover : value;

  return (
    <div
      className={`flex items-center gap-0.5 text-ink-300 ${
        interactive ? 'cursor-pointer' : ''
      }`}
      onMouseLeave={() => interactive && setHover(0)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Rate this listing' : `${value.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = display >= n;
        const half = !filled && display >= n - 0.5;
        const StarEl = (
          <Star key={n} filled={filled} half={half} size={size} />
        );
        if (!interactive) return StarEl;
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange?.(n)}
            className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            {StarEl}
          </button>
        );
      })}
    </div>
  );
}
