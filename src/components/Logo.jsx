export default function Logo({ className = '', size = 'md', showWordmark = true }) {
  const dim = size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const text =
    size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <span className={`inline-flex items-center gap-2 font-bold ${className}`}>
      <img
        src="/logo.png"
        alt="ProofReview"
        className={`${dim} shrink-0 select-none`}
        draggable="false"
      />
      {showWordmark && (
        <span className={`${text} tracking-tight`}>ProofReview</span>
      )}
    </span>
  );
}
