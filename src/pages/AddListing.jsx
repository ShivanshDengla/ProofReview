import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createListing } from '../lib/db.js';
import { CATEGORIES } from '../lib/format.js';
import VerifyButton from '../components/VerifyButton.jsx';

export default function AddListing() {
  const { isVerified } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isVerified) {
      setError('Please verify with World ID before posting a listing.');
      return;
    }
    if (name.trim().length < 2) {
      setError('Please add a name.');
      return;
    }
    if (description.trim().length < 8) {
      setError('Add a short description so people understand what this is.');
      return;
    }
    setBusy(true);
    try {
      const created = await createListing({ name, category, description });
      navigate(`/listings/${created.id}`);
    } catch (err) {
      setError(err?.message || 'Could not create listing. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-app space-y-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
          Add a listing
        </h1>
        <p className="text-sm text-ink-500">
          Post your business, service, or product. Verified humans can review it.
        </p>
      </div>

      {!isVerified && (
        <div className="card flex flex-col items-start gap-3 border-dashed">
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Only verified humans can post listings. Verify once — review, vote, and
            post forever.
          </p>
          <VerifyButton label="Verify with World ID" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="input"
            placeholder="e.g. Acme Roasters"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isVerified || busy}
            maxLength={80}
          />
        </div>

        <div>
          <span className="label">Category</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                disabled={!isVerified || busy}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  category === c
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="label">
            Description
          </label>
          <textarea
            id="description"
            rows={5}
            maxLength={400}
            className="input resize-y"
            placeholder="What is it? Who is it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isVerified || busy}
          />
          <div className="mt-1 text-right text-[11px] text-ink-400">
            {description.length}/400
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate(-1)}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!isVerified || busy}
          >
            {busy ? 'Publishing…' : 'Publish listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
