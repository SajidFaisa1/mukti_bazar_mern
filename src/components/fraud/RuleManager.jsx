import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const blankRule = () => ({ name:'', description:'', enabled:true, priority:100, conditions:[{ field:'total', op:'gt', value:50000 }], tree:null, actions:{ addRisk:20 }, status:'active' });

const ops = ['gt','gte','lt','lte','eq','neq','includes','exists'];

const RuleManager = () => {
  const { token } = useAdminAuth();
  const [rules,setRules] = useState([]);
  const [loading,setLoading] = useState(false);
  const [editing,setEditing] = useState(null);
  const [draft,setDraft] = useState(blankRule());
  const [dryContext,setDryContext] = useState('{"total":60000,"velocity":{"last1h":6},"negotiated":{"deltaPct":35}}');
  const [dryResult,setDryResult] = useState(null);
  const [previewImpact,setPreviewImpact] = useState(null);
  const [treeDraft,setTreeDraft] = useState('');
  const [showAudit,setShowAudit] = useState(false);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' };

  const load = async () => {
    if (!token) return; setLoading(true);
    try {
      const res = await fetch('http://localhost:5005/api/admin-panel/rules', { headers });
      const data = await res.json();
      if (res.ok) {
        // Hide archived rules by default in UI list
        const active = (data.rules||[]).filter(r => r.status !== 'archived');
        setRules(active);
      }
    } catch(e){ console.error(e);} finally{ setLoading(false);} }
  useEffect(()=>{ load(); },[token]);

  const startNew = () => { setEditing(null); setDraft(blankRule()); };
  const edit = (r) => { setEditing(r._id); setDraft(JSON.parse(JSON.stringify(r))); setTreeDraft(r.tree ? JSON.stringify(r.tree,null,2):''); };
  const remove = async (r, evt) => {
    const permanent = evt && evt.shiftKey; // shift+click for permanent
    const msg = permanent ? 'Permanently delete this rule? (Cannot be undone)' : (r.status==='archived' ? 'Rule already archived. Permanently delete now?' : 'Archive (soft delete) this rule?');
    if (!window.confirm(msg)) return;
    const url = `http://localhost:5005/api/admin-panel/rules/${r._id}${permanent || r.status==='archived' ? '?permanent=true':''}`;
    await fetch(url, { method:'DELETE', headers });
    load();
  };
  const save = async () => {
    let parsedTree = null;
    if (treeDraft.trim()) {
      try { parsedTree = JSON.parse(treeDraft); } catch(e){ alert('Tree JSON invalid: '+e.message); return; }
    }
    const payload = { ...draft, tree: parsedTree };
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `http://localhost:5005/api/admin-panel/rules/${editing}` : 'http://localhost:5005/api/admin-panel/rules';
    const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
    if (res.ok) { load(); startNew(); }
  };

  const updateCond = (i, patch) => {
    const next = { ...draft, conditions: draft.conditions.map((c,idx)=> idx===i ? { ...c, ...patch } : c) };
    setDraft(next);
  };
  const addCond = () => setDraft(d=> ({...d, conditions:[...d.conditions,{ field:'total', op:'gt', value:0 }]}));
  const delCond = (i) => setDraft(d=> ({...d, conditions:d.conditions.filter((_,idx)=> idx!==i)}));

  const runDry = async () => {
    try {
      const ctx = JSON.parse(dryContext||'{}');
      const res = await fetch('http://localhost:5005/api/admin-panel/rules/dry-run', { method:'POST', headers, body: JSON.stringify({ context: ctx }) });
      const data = await res.json();
      if (res.ok) setDryResult(data.result); else setDryResult({ error:data.error });
    } catch(e){ setDryResult({ error:e.message }); }
  };

  const preview = async () => {
    try {
      const res = await fetch('http://localhost:5005/api/admin-panel/rules/preview-impact', { method:'POST', headers, body: JSON.stringify({ limit: 50 }) });
      const data = await res.json();
      if (res.ok) setPreviewImpact(data); else setPreviewImpact({ error:data.error });
    } catch(e){ setPreviewImpact({ error:e.message }); }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-sm">Rule Management</h3>
        <button onClick={startNew} className="text-xs px-2 py-1 bg-gray-200 rounded">New</button>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-xs mb-2">Existing Rules</h4>
          {loading ? <div className="text-xs">Loading...</div> : (
            <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {rules.map(r => (
                <li key={r._id} className="border rounded p-2 text-xs flex flex-col gap-1">
                  <div className="flex justify-between"><span className="font-medium">{r.name}</span><span>#{r.priority}</span></div>
                  <div className="text-[10px] text-gray-600 truncate">{r.description}</div>
                  <div className="text-[10px] text-gray-500 flex gap-2 flex-wrap">v{r.version} {r.status}</div>
                  <div className="flex gap-2">
                    <span className={`px-1 rounded ${r.enabled? 'bg-green-100 text-green-700':'bg-gray-200 text-gray-600'}`}>{r.enabled? 'ENABLED':'DISABLED'}</span>
                    <button onClick={()=>edit(r)} className="px-2 py-0.5 bg-blue-500 text-white rounded">Edit</button>
                    <button title="Delete (archive). Shift+Click to permanently delete" onClick={(e)=>remove(r,e)} className="px-2 py-0.5 bg-red-500 text-white rounded">Del</button>
                    {r.auditHistory?.length>0 && <button onClick={()=>{setShowAudit(a=> a===r._id? null:r._id);}} className="px-2 py-0.5 bg-gray-300 text-gray-800 rounded">Audit</button>}
                  </div>
                  {showAudit===r._id && (
                    <div className="bg-gray-50 rounded p-1 max-h-40 overflow-y-auto mt-1">
                      {r.auditHistory.map((a,i)=>(
                        <div key={i} className="flex justify-between gap-2"><span>{a.action}</span><span className="text-[9px] text-gray-500">{new Date(a.at||a.date||a.timestamp||Date.now()).toLocaleString()}</span></div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {rules.length===0 && <li className="text-[10px] text-gray-500">No rules defined</li>}
            </ul>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-xs mb-2">{editing? 'Edit Rule':'New Rule'}</h4>
          <div className="space-y-2 text-xs">
            <input placeholder="Name" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} className="w-full border rounded px-2 py-1" />
            <textarea placeholder="Description" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} className="w-full border rounded px-2 py-1" rows={2} />
            <div className="flex gap-2">
              <label className="flex items-center gap-1"><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})} /> Enabled</label>
              <input type="number" value={draft.priority} onChange={e=>setDraft({...draft,priority:parseInt(e.target.value)||0})} className="border rounded px-2 py-1 w-24" placeholder="Priority" />
              <select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})} className="border rounded px-2 py-1 text-xs">
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="scheduled">scheduled</option>
              </select>
            </div>
            {draft.status==='scheduled' && (
              <div className="flex gap-2">
                <input type="datetime-local" className="border rounded px-2 py-1 text-xs" onChange={e=>setDraft({...draft,effectiveFrom:e.target.value? new Date(e.target.value).toISOString():undefined})} />
                <input type="datetime-local" className="border rounded px-2 py-1 text-xs" onChange={e=>setDraft({...draft,effectiveTo:e.target.value? new Date(e.target.value).toISOString():undefined})} />
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-1"><span className="font-medium">Conditions</span><button onClick={addCond} className="px-2 py-0.5 bg-gray-200 rounded">+</button></div>
              <div className="space-y-2">
                {draft.conditions.map((c,i)=>(
                  <div key={i} className="flex gap-1 items-center">
                    <input value={c.field} onChange={e=>updateCond(i,{field:e.target.value})} className="border rounded px-1 py-0.5 w-40" placeholder="field.path" />
                    <select value={c.op} onChange={e=>updateCond(i,{op:e.target.value})} className="border rounded px-1 py-0.5 text-xs">{ops.map(o=><option key={o}>{o}</option>)}</select>
                    {c.op !== 'exists' && <input value={c.value} onChange={e=>updateCond(i,{value:e.target.value})} className="border rounded px-1 py-0.5 w-32" placeholder="value" />}
                    <button onClick={()=>delCond(i)} className="px-1 py-0.5 bg-red-200 text-red-700 rounded">x</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Add Risk" value={draft.actions.addRisk||''} onChange={e=>setDraft({...draft, actions:{...draft.actions, addRisk: e.target.value? parseInt(e.target.value): undefined }})} className="border rounded px-2 py-1" />
              <input placeholder="Add Reason" value={draft.actions.addReason||''} onChange={e=>setDraft({...draft, actions:{...draft.actions, addReason:e.target.value||undefined}})} className="border rounded px-2 py-1" />
              <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={draft.actions.requireApproval||false} onChange={e=>setDraft({...draft, actions:{...draft.actions, requireApproval:e.target.checked||undefined}})} /> Require Approval</label>
            </div>
            <div className="border rounded p-2 space-y-1">
              <div className="font-medium">Add Flag</div>
              <input placeholder="Flag Type" value={draft.actions.addFlag?.type||''} onChange={e=>setDraft({...draft, actions:{...draft.actions, addFlag:{...(draft.actions.addFlag||{}), type:e.target.value||undefined}}})} className="border rounded px-2 py-1 w-full" />
              <select value={draft.actions.addFlag?.severity||''} onChange={e=>setDraft({...draft, actions:{...draft.actions, addFlag:{...(draft.actions.addFlag||{}), severity:e.target.value||undefined}}})} className="border rounded px-2 py-1 w-full">
                <option value="">Flag Severity</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
              <input placeholder="Flag Description" value={draft.actions.addFlag?.description||''} onChange={e=>setDraft({...draft, actions:{...draft.actions, addFlag:{...(draft.actions.addFlag||{}), description:e.target.value||undefined}}})} className="border rounded px-2 py-1 w-full" />
            </div>
            <div className="border rounded p-2 space-y-1">
              <div className="font-medium">Nested Logic (JSON)</div>
              <textarea rows={6} value={treeDraft} onChange={e=>setTreeDraft(e.target.value)} placeholder='{"logic":"AND","nodes":[{"field":"total","op":"gt","value":50000},{"logic":"OR","nodes":[{"field":"velocity.last1h","op":"gt","value":5},{"field":"negotiated.deltaPct","op":"gt","value":40}]}]}' className="w-full border rounded p-2 font-mono text-[11px]" />
              <div className="text-[10px] text-gray-500">Leave blank to use simple conditions only.</div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="px-3 py-1 bg-green-600 text-white rounded text-xs">{editing? 'Update':'Create'}</button>
              <button onClick={runDry} type="button" className="px-3 py-1 bg-indigo-600 text-white rounded text-xs">Dry Run</button>
              <button onClick={preview} type="button" className="px-3 py-1 bg-purple-600 text-white rounded text-xs">Preview Impact</button>
            </div>
            <div>
              <textarea rows={4} value={dryContext} onChange={e=>setDryContext(e.target.value)} className="w-full border rounded p-2 text-xs font-mono" />
              {dryResult && <pre className="bg-gray-900 text-green-300 text-[10px] p-2 rounded overflow-x-auto max-h-40">{JSON.stringify(dryResult,null,2)}</pre>}
              {previewImpact && <pre className="bg-gray-900 text-purple-300 text-[10px] p-2 rounded overflow-x-auto max-h-40 mt-2">{JSON.stringify(previewImpact,null,2)}</pre>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleManager;
