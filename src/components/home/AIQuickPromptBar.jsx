import React, { useState } from 'react';

const AIQuickPromptBar = ({ onPrompt, defaultPrompt = 'Suggest best bulk deals' }) => {
  const [value, setValue] = useState(defaultPrompt);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!value.trim()) return;
    setLoading(true); setError(null); setResponse(null);
    try {
      const res = await fetch('http://localhost:5005/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'AI request failed');
      setResponse(data.message);
      onPrompt?.(value, data.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Ask marketplace AI..."
          className="flex-1 rounded-xl border border-primary-200 bg-white/70 backdrop-blur-sm px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 disabled:from-primary-400 disabled:to-primary-400 text-white px-5 py-2.5 text-sm font-semibold shadow hover:shadow-md transition"
        >
          {loading ? 'Thinking...' : 'Ask AI'}
        </button>
      </div>
      {error && <div className="text-xs text-rose-600 font-medium">{error}</div>}
      {response && (
        <div className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap bg-white/60 backdrop-blur rounded-lg border border-primary-100 p-3 shadow-inner">
          {response}
        </div>
      )}
    </div>
  );
};

export default AIQuickPromptBar;
