import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

// Simple force-directed layout placeholder (no external libs) using SVG; minimal for now.
function GraphView({ graph, filters, onExpandNode, fetchEdgeDetail }) {
  const { minWeight=1, typesEnabled={ uid:true, vendor:true, device:true, ip:true, phone:true } } = filters;
  const svgRef = React.useRef(null);
  const [state,setState] = useState(()=> ({ nodes:[], edges:[] }));
  const [drag,setDrag] = useState(null);

  useEffect(()=> {
    if(!graph) { setState({ nodes:[], edges:[] }); return; }
    // Initialize with previous positions if exist
    const prevMap = new Map(state.nodes.map(n=> [n.id,n]));
    const nodes = graph.nodes.filter(n=> typesEnabled[n.type]).map((n,i)=> ({ ...n, x: prevMap.get(n.id)?.x || 210 + 160*Math.cos((2*Math.PI*i)/graph.nodes.length), y: prevMap.get(n.id)?.y || 210 + 160*Math.sin((2*Math.PI*i)/graph.nodes.length), vx:0, vy:0 }));
    const edges = graph.edges.filter(e=> e.count >= minWeight && typesEnabled[e.a.type] && typesEnabled[e.b.type]);
    setState({ nodes, edges });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, minWeight, typesEnabled.uid, typesEnabled.vendor, typesEnabled.device, typesEnabled.ip, typesEnabled.phone]);

  useEffect(()=> {
    if(!state.nodes.length) return;
    let frame;
    const center = 210;
    const nodeMap = new Map(state.nodes.map(n=>[n.id,n]));
    const step = () => {
      for(const e of state.edges){
        const a = nodeMap.get(`${e.a.type}:${e.a.value}`); const b = nodeMap.get(`${e.b.type}:${e.b.value}`); if(!a||!b) continue;
        const dx = b.x - a.x; const dy = b.y - a.y; const dist = Math.max(4, Math.sqrt(dx*dx+dy*dy));
        const desired = 50 + 6*Math.log(e.count+1) + (a.layer===0||b.layer===0 ? 15:0);
        const diff = (dist - desired)/dist;
        const fx = dx * diff * 0.02; const fy = dy * diff * 0.02;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
      for(let i=0;i<state.nodes.length;i++){
        for(let j=i+1;j<state.nodes.length;j++){
          const a=state.nodes[i], b=state.nodes[j];
            let dx = b.x - a.x; let dy = b.y - a.y; let d2 = dx*dx+dy*dy;
            if(d2 < 1) { dx= (Math.random()-0.5); dy=(Math.random()-0.5); d2=1; }
            const rep = 800/(d2+80);
            const dist = Math.sqrt(d2);
            const fx = (dx/dist)*rep; const fy = (dy/dist)*rep;
            a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
        }
      }
      for(const n of state.nodes){
        if(drag && drag.id===n.id){ n.vx = 0; n.vy = 0; n.x = drag.x; n.y = drag.y; }
        n.vx += (center - n.x)*0.0005; n.vy += (center - n.y)*0.0005;
        n.x += n.vx; n.y += n.vy; n.vx*=0.9; n.vy*=0.9;
      }
      setState(s=> ({ ...s }));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return ()=> cancelAnimationFrame(frame);
  }, [state.nodes.length, state.edges, drag]);

  const onMouseDown = (e,n) => {
    const pt = getSvgPoint(e); setDrag({ id:n.id, x:pt.x, y:pt.y });
  };
  const onMouseMove = (e) => { if(!drag) return; const pt = getSvgPoint(e); setDrag(d=> d? { ...d, x:pt.x, y:pt.y }:null); };
  const onMouseUp = () => setDrag(null);
  const getSvgPoint = (evt) => {
    const svg = svgRef.current; const rect = svg.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };
  return (
    <svg ref={svgRef} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} viewBox="0 0 420 420" className="w-full h-96 bg-white border rounded cursor-default select-none">
      {state.edges.map((e,i)=>{ const a = state.nodes.find(n=> n.type===e.a.type && n.value===e.a.value); const b = state.nodes.find(n=> n.type===e.b.type && n.value===e.b.value); if(!a||!b) return null; const weight=Math.min(6,1+Math.log(e.count+1)); return <g key={i} className="edge" onClick={()=> fetchEdgeDetail && fetchEdgeDetail(e)}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#475569" strokeWidth={weight} strokeOpacity="0.5" />
        <title>{`${e.a.type}:${e.a.value} ↔ ${e.b.type}:${e.b.value}\norders:${e.count}`}</title>
      </g>; })}
      {state.nodes.map(n => (
        <g key={n.id} className="node" onMouseDown={(e)=>onMouseDown(e,n)} onDoubleClick={()=> onExpandNode && onExpandNode(n)} style={{ cursor:'grab' }}>
          <circle cx={n.x} cy={n.y} r={14} fill={colorForType(n.type)} stroke={n.layer>0? '#111':'#fff'} strokeWidth={n.layer>0?1.5:2.5} />
          <text x={n.x} y={n.y+3} textAnchor="middle" fontSize="8" fill="#fff">{abbr(n)}</text>
          <title>{`${n.type}:${n.value}\ncount:${n.count} layer:${n.layer}`}</title>
        </g>
      ))}
    </svg>
  );
}

function colorForType(t){
  switch(t){
    case 'uid': return '#2563eb';
    case 'device': return '#7c3aed';
    case 'ip': return '#db2777';
    case 'vendor': return '#059669';
    default: return '#6b7280';
  }
}
function abbr(n){
  if(n.type==='ip') return n.value.split('.').slice(0,2).join('.')+'*';
  return n.value.toString().substring(0,4);
}

const TagEditor = ({ caseObj, headers, onUpdated }) => {
  const [tagInput,setTagInput] = useState('');
  if(!caseObj) return null;
  const addTag = async () => { if(!tagInput.trim()) return; const res = await fetch(`http://localhost:5005/api/admin-panel/cases/${caseObj._id}/tags`, { method:'POST', headers, body: JSON.stringify({ tag: tagInput.trim() }) }); const data = await res.json(); if(res.ok){ onUpdated({ ...caseObj, tags:data.tags }); setTagInput(''); } };
  const removeTag = async (tag) => { const res = await fetch(`http://localhost:5005/api/admin-panel/cases/${caseObj._id}/tags/${encodeURIComponent(tag)}`, { method:'DELETE', headers }); const data = await res.json(); if(res.ok){ onUpdated({ ...caseObj, tags:data.tags }); } };
  return (
    <div className="mb-2">
      <div className="flex flex-wrap gap-1 mb-1">{(caseObj.tags||[]).map(t=> <span key={t} className="px-1.5 py-0.5 bg-gray-300 rounded text-[10px] flex items-center gap-1">{t}<button onClick={()=>removeTag(t)} className="text-[9px] text-red-600">✕</button></span>)}</div>
      <div className="flex gap-2">
        <input value={tagInput} onChange={e=>setTagInput(e.target.value)} placeholder="Add tag" className="border rounded px-2 py-1 text-[10px] flex-1" />
        <button onClick={addTag} className="px-2 py-1 bg-gray-700 text-white rounded text-[10px]">Add</button>
      </div>
    </div>
  );
};

const CaseManager = ({ selectedOrderEntities = [] }) => {
  const { token } = useAdminAuth();
  const [cases,setCases] = useState([]);
  const [loading,setLoading] = useState(false);
  const [title,setTitle] = useState('');
  const [entityInput,setEntityInput] = useState(''); // format type:value per line
  const [graph,setGraph] = useState(null);
  const [graphSeeds,setGraphSeeds] = useState(''); // type:value comma separated seeds
  const [graphDepth,setGraphDepth] = useState(1);
  const [graphLimit,setGraphLimit] = useState(400);
  const [minWeight,setMinWeight] = useState(1);
  const [typeFilters,setTypeFilters] = useState({ uid:true, vendor:true, device:true, ip:true });
  const [edgeDetail,setEdgeDetail] = useState(null);
  const [edgeOrders,setEdgeOrders] = useState([]);
  const [loadingEdge,setLoadingEdge] = useState(false);
  const [allTags,setAllTags] = useState([]);
  const [tagFilter2,setTagFilter2] = useState('');
  const [cachedToggle,setCachedToggle] = useState(true); // request includeOrderIds only when needed
  const [selectedCase,setSelectedCase] = useState(null);
  const [note,setNote] = useState('');
  const [search,setSearch] = useState('');
  const [tagFilter,setTagFilter] = useState('');
  const [exporting,setExporting] = useState(false);
  const [newEntityType,setNewEntityType] = useState('user');
  const [newEntityValue,setNewEntityValue] = useState('');
  const [statusFilter,setStatusFilter] = useState('');
  const [priorityFilter,setPriorityFilter] = useState('');
  const [bulkEntities,setBulkEntities] = useState('');
  const [timeline,setTimeline] = useState([]);
  const [loadingTimeline,setLoadingTimeline] = useState(false);
  const [normalizeTimeline,setNormalizeTimeline] = useState(false);
  const [timelineHover,setTimelineHover] = useState(null);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' };

  const exportTimelineCSV = () => {
    if(!timeline.length) return;
    const rows = [['orderNumber','timestamp','score','reasons']].concat(timeline.map(p=> [p.orderNumber, new Date(p.t).toISOString(), p.score, (p.reasons||[]).join('|')]));
    const csv = rows.map(r=> r.map(val=> '"'+String(val).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`case_timeline_${selectedCase?._id||'unknown'}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const loadCases = async () => {
    if(!token) return; setLoading(true);
    const params = new URLSearchParams();
    if(search) params.append('q', search);
    if(statusFilter) params.append('status', statusFilter);
    if(priorityFilter) params.append('priority', priorityFilter);
    try { const res = await fetch(`http://localhost:5005/api/admin-panel/cases?${params.toString()}`, { headers:{ 'Authorization':`Bearer ${token}` } }); const data = await res.json(); if(res.ok) setCases(data.cases||[]); } catch(e){ console.error(e);} finally{ setLoading(false);} }
  useEffect(()=>{ loadCases(); },[token]);
  useEffect(()=>{ const t = setTimeout(()=> loadCases(), 400); return ()=> clearTimeout(t); }, [search, statusFilter, priorityFilter]);
  useEffect(()=>{ // collect tags
    setAllTags(Array.from(new Set(cases.flatMap(c=> c.tags||[]))));
  }, [cases]);

  // Auto-populate entity input when selectedOrderEntities changes
  useEffect(()=>{
    if(selectedOrderEntities.length){
      const lines = Array.from(new Set(selectedOrderEntities.map(e=>`${e.type}:${e.value}`)));
      setEntityInput(lines.join('\n'));
      if(!title) setTitle('Case from selection');
    }
  },[selectedOrderEntities]);

  const createCase = async () => {
    if(!title.trim()) return alert('Title required');
    const entities = entityInput.split(/\n|,/).map(s=>s.trim()).filter(Boolean).map(s=>{ const [type,...rest]=s.split(':'); return { type:type.trim(), value:rest.join(':').trim() }; }).filter(e=>e.type && e.value);
    const res = await fetch('http://localhost:5005/api/admin-panel/cases', { method:'POST', headers, body: JSON.stringify({ title, entities }) });
    const data = await res.json();
    if(res.ok){ setTitle(''); setEntityInput(''); loadCases(); setSelectedCase(data.case); }
    else alert(data.error||'Create failed');
  };

  const selectCase = async (id) => {
    setSelectedCase(null);
    try { const res = await fetch(`http://localhost:5005/api/admin-panel/cases/${id}`, { headers:{ 'Authorization':`Bearer ${token}` } }); const data = await res.json(); if(res.ok) setSelectedCase(data.case); } catch(e){ console.error(e); }
  };

  const updateCase = async (patch) => {
    if(!selectedCase) return; const body = { ...patch }; if(note.trim()) body.note = note.trim();
    const res = await fetch(`http://localhost:5005/api/admin-panel/cases/${selectedCase._id}`, { method:'PATCH', headers, body: JSON.stringify(body) }); const data= await res.json(); if(res.ok){ setSelectedCase(data.case); setNote(''); loadCases(); } else alert(data.error||'Update failed');
  };

  const loadTimeline = async (caseId) => {
    if(!caseId) return; setLoadingTimeline(true); setTimeline([]);
    try { const res = await fetch(`http://localhost:5005/api/admin-panel/cases/${caseId}/risk-timeline`, { headers:{ 'Authorization':`Bearer ${token}` } }); const data = await res.json(); if(res.ok) setTimeline(data.points||[]); } catch(e){ console.error(e);} finally{ setLoadingTimeline(false);} }

  useEffect(()=>{ if(selectedCase?._id) loadTimeline(selectedCase._id); }, [selectedCase?._id]);

  const buildGraph = async (extraSeeds=[]) => {
    const seeds = graphSeeds.split(/\n|,/).map(s=>s.trim()).filter(Boolean).map(s=>{ const [type,...rest]=s.split(':'); return { type:type.trim(), value:rest.join(':').trim() }; });
    const all = [...seeds, ...extraSeeds];
  const payload = { uids: all.filter(s=>s.type==='user'||s.type==='uid').map(s=>s.value), devices: all.filter(s=>s.type==='device').map(s=>s.value), ips: all.filter(s=>s.type==='ip').map(s=>s.value), vendors: all.filter(s=>s.type==='vendor').map(s=>s.value), phones: all.filter(s=>s.type==='phone').map(s=>s.value), depth: graphDepth, limit: graphLimit, includeOrderIds:false };
    const res = await fetch('http://localhost:5005/api/admin-panel/linkage/graph', { method:'POST', headers, body: JSON.stringify(payload) }); const data = await res.json(); if(res.ok) setGraph(data.graph); else alert(data.error||'Graph build failed');
  };

  // Fetch orders connecting two entities for edge detail modal
  const fetchEdgeOrders = async (edge) => {
    if(!edge) return;
    setEdgeDetail(edge); setLoadingEdge(true); setEdgeOrders([]);
    try {
      const params = new URLSearchParams({ aType:edge.a.type, aValue:edge.a.value, bType:edge.b.type, bValue:edge.b.value, limit:'50' });
      const res = await fetch(`http://localhost:5005/api/admin-panel/linkage/edge-detail?${params.toString()}`, { headers:{ 'Authorization':`Bearer ${token}` } });
      const data = await res.json();
      if(res.ok) setEdgeOrders(data.orders||[]); else console.warn('Edge detail error', data.error);
    } catch(e){ console.error(e); }
    finally { setLoadingEdge(false); }
  };

  const exportGraph = () => {
    if(!graph) return; setExporting(true);
    try {
      const blob = new Blob([JSON.stringify(graph,null,2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `linkage_graph_${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mt-6">
      <h3 className="font-semibold text-sm mb-4">Case Management & Entity Linkage</h3>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-3">
          <div>
            <h4 className="text-xs font-semibold mb-1 flex justify-between items-center">Create Case <span className="text-[10px] text-gray-400">Auto-fill from selection</span></h4>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Case title" className="w-full border rounded px-2 py-1 text-xs mb-2" />
            <textarea value={entityInput} onChange={e=>setEntityInput(e.target.value)} rows={3} placeholder="Entities (type:value per line)\nuid:U123\nip:1.2.3.4" className="w-full border rounded px-2 py-1 text-xs font-mono" />
            <button onClick={createCase} className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-xs">Create</button>
          </div>
          <div>
            <h4 className="text-xs font-semibold mb-1 flex flex-wrap items-center gap-2">Cases ({cases.length}) <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="border rounded px-1 py-0.5 text-[10px]" />
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border rounded px-1 py-0.5 text-[10px]">
                <option value="">All Status</option>
                {['open','investigating','resolved','closed'].map(s=> <option key={s}>{s}</option>)}
              </select>
              <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className="border rounded px-1 py-0.5 text-[10px]">
                <option value="">All Priority</option>
                {['low','medium','high','critical'].map(p=> <option key={p}>{p}</option>)}
              </select>
              {allTags.length>0 && (
                <select value={tagFilter} onChange={e=>setTagFilter(e.target.value)} className="border rounded px-1 py-0.5 text-[10px]">
                  <option value="">All Tags</option>
                  {allTags.map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </h4>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {cases.filter(c=> !tagFilter || (c.tags||[]).includes(tagFilter)).map(c=> (
                <div key={c._id} className={`border rounded p-2 text-[11px] cursor-pointer ${selectedCase?._id===c._id?'bg-indigo-50 border-indigo-400':'bg-gray-50'}`} onClick={()=>selectCase(c._id)}>
                  <div className="font-medium truncate">{c.title}</div>
                  <div className="flex gap-2 text-[10px] text-gray-600 flex-wrap"><span>{c.status}</span><span>{c.priority}</span>{(c.tags||[]).slice(0,3).map(t=> <span key={t} className="px-1 bg-gray-200 rounded">{t}</span>)}</div>
                </div>
              ))}
              {!cases.length && <div className="text-[10px] text-gray-500">No cases</div>}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold mb-1">Linkage Seeds</h4>
            <textarea value={graphSeeds} onChange={e=>setGraphSeeds(e.target.value)} rows={4} placeholder="uid:U123, device:abc..., ip:1.1.1.1, phone:+15551234567" className="w-full border rounded px-2 py-1 text-xs font-mono" />
            <div className="flex gap-2 mt-2 items-center">
              <input type="number" min={1} max={4} value={graphDepth} onChange={e=>setGraphDepth(parseInt(e.target.value)||1)} className="w-16 border rounded px-2 py-1 text-[10px]" title="Depth (hops)" />
              <input type="number" min={50} max={1000} value={graphLimit} onChange={e=>setGraphLimit(parseInt(e.target.value)||200)} className="w-20 border rounded px-2 py-1 text-[10px]" title="Per-layer order limit" />
              <button onClick={()=>buildGraph()} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Build Graph</button>
            </div>
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
      {selectedCase && (
            <div className="border rounded p-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-semibold">Case Detail</h4>
                <div className="flex gap-2">
                  <select value={selectedCase.status} onChange={e=>updateCase({ status:e.target.value })} className="border rounded px-2 py-1 text-[10px]">
                    {['open','investigating','resolved','closed'].map(s=> <option key={s}>{s}</option>)}
                  </select>
                  <select value={selectedCase.priority} onChange={e=>updateCase({ priority:e.target.value })} className="border rounded px-2 py-1 text-[10px]">
                    {['low','medium','high','critical'].map(p=> <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-[11px] text-gray-700 mb-2 flex flex-wrap gap-1">
                {selectedCase.entities.map((e,i)=>(
                  <span key={i} className="px-1.5 py-0.5 bg-gray-200 rounded flex items-center gap-1">
                    {e.type}:{e.value}
                    <button onClick={()=>{
                      updateCase({ removeEntities:[{ type:e.type, value:e.value }] });
                    }} title="Remove" className="text-[9px] text-red-600 hover:text-red-800">✕</button>
                  </span>
                ))}
                {!selectedCase.entities.length && <span className="text-gray-400">No entities</span>}
              </div>
              <div className="flex gap-2 mb-3 items-center">
                <select value={newEntityType} onChange={e=>setNewEntityType(e.target.value)} className="border rounded px-2 py-1 text-[10px]">
                  {['user','vendor','device','ip','phone','email','address','order'].map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={newEntityValue} onChange={e=>setNewEntityValue(e.target.value)} placeholder="Value" className="border rounded px-2 py-1 text-[10px] flex-1" />
                <button onClick={()=>{ if(!newEntityValue.trim()) return; updateCase({ entities:[{ type:newEntityType, value:newEntityValue.trim() }] }); setNewEntityValue(''); }} className="px-2 py-1 bg-gray-700 text-white rounded text-[10px]">Add</button>
              </div>
              <details className="mb-3">
                <summary className="cursor-pointer text-[10px] font-semibold">Bulk Add Entities</summary>
                <textarea value={bulkEntities} onChange={e=>setBulkEntities(e.target.value)} rows={3} placeholder="user:U123\nip:1.2.3.4\ndevice:abc" className="w-full border rounded px-2 py-1 text-[10px] font-mono mt-1" />
                <div className="flex justify-end mt-1">
                  <button onClick={()=>{
                    const parsed = bulkEntities.split(/\n|,/).map(s=>s.trim()).filter(Boolean).map(line=>{ const [type,...rest]=line.split(':'); return { type:type.trim(), value:rest.join(':').trim() }; }).filter(e=>e.type && e.value);
                    if(!parsed.length) return;
                    const unique = parsed.filter(e=> !selectedCase.entities.find(x=> x.type===e.type && x.value===e.value));
                    if(!unique.length) return alert('No new entities');
                    updateCase({ entities: unique }); setBulkEntities('');
                  }} className="px-2 py-0.5 bg-gray-700 text-white rounded text-[10px]">Add All</button>
                </div>
              </details>
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <h5 className="text-[10px] font-semibold">Risk Score Timeline</h5>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-1 text-[9px]"><input type="checkbox" checked={normalizeTimeline} onChange={e=>setNormalizeTimeline(e.target.checked)} /> Normalize</label>
                    <button onClick={()=> exportTimelineCSV()} disabled={!timeline.length} className="px-2 py-0.5 bg-gray-200 rounded text-[9px] disabled:opacity-50">CSV</button>
                  </div>
                </div>
                {loadingTimeline ? <div className="text-[10px] text-gray-500">Loading...</div> : timeline.length ? (
                  <TimelineSparkline points={timeline} normalize={normalizeTimeline} hover={timelineHover} setHover={setTimelineHover} />
                ) : <div className="text-[10px] text-gray-400">No linked orders yet</div>}
                {timelineHover && (
                  <div className="mt-1 text-[9px] bg-gray-100 rounded p-1 border">
                    <div><span className="font-semibold">{timelineHover.orderNumber}</span> @ {new Date(timelineHover.t).toLocaleString()}</div>
                    <div>Score: {timelineHover.score}{normalizeTimeline && ` (norm ${Math.round(timelineHover.norm)} )`}</div>
                    {timelineHover.reasons?.length>0 && <div className="truncate">Reasons: {timelineHover.reasons.join(', ')}</div>}
                  </div>
                )}
              </div>
        <TagEditor caseObj={selectedCase} headers={headers} onUpdated={c=> setSelectedCase(c)} />
              {selectedOrderEntities.length>0 && (
                <button onClick={()=> {
                  const newEntities = selectedOrderEntities.filter(e => !selectedCase.entities.find(x=> x.type===e.type && x.value===e.value));
                  if(!newEntities.length) return alert('No new entities from selection');
                  updateCase({ entities:newEntities });
                }} className="mb-2 px-2 py-1 bg-emerald-600 text-white rounded text-[10px]">Add Selected Entities</button>
              )}
              <div className="mb-2">
                <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Add note" className="w-full border rounded px-2 py-1 text-xs" />
                <button onClick={()=>updateCase({})} className="mt-1 px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px]">Add Note</button>
              </div>
              <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-[10px] space-y-1">
                {selectedCase.notes.slice().reverse().map((n,i)=>(<div key={i} className="flex justify-between"><span>{n.text}</span><span className="text-gray-500">{new Date(n.at).toLocaleString()}</span></div>))}
              </div>
            </div>
          )}
          <div className="border rounded p-3">
            <h4 className="text-xs font-semibold mb-2">Entity Linkage Graph</h4>
            {graph ? (
              <>
                <div className="flex flex-wrap gap-2 mb-2 items-center text-[10px]">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={typeFilters.uid} onChange={e=>setTypeFilters(t=>({...t,uid:e.target.checked}))} /> UID</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={typeFilters.vendor} onChange={e=>setTypeFilters(t=>({...t,vendor:e.target.checked}))} /> Vendor</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={typeFilters.device} onChange={e=>setTypeFilters(t=>({...t,device:e.target.checked}))} /> Device</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={typeFilters.ip} onChange={e=>setTypeFilters(t=>({...t,ip:e.target.checked}))} /> IP</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={typeFilters.phone} onChange={e=>setTypeFilters(t=>({...t,phone:e.target.checked}))} /> Phone</label>
                  <label className="flex items-center gap-1">Min Weight <input type="number" min={1} value={minWeight} onChange={e=>setMinWeight(parseInt(e.target.value)||1)} className="w-14 border rounded px-1 py-0.5" /></label>
                  <button onClick={()=> buildGraph()} className="px-2 py-0.5 bg-gray-200 rounded">Refresh Layout</button>
                </div>
                <GraphView graph={graph} filters={{ minWeight, typesEnabled:typeFilters }} onExpandNode={(n)=> buildGraph([{ type:n.type, value:n.value }])} fetchEdgeDetail={(e)=> fetchEdgeOrders(e)} />
                <div className="text-[10px] text-gray-500 mt-2 flex flex-wrap gap-4 items-center">Nodes: {graph.nodes.length} | Edges: {graph.edges.length} | Orders analyzed: {graph.orderCount} {graph.truncated && <span className="text-red-500">(TRUNCATED)</span>}
                  <button onClick={exportGraph} disabled={exporting} className="px-2 py-0.5 bg-gray-200 rounded text-[10px] disabled:opacity-50">{exporting?'Exporting...':'Export JSON'}</button>
                </div>
              </>
            ) : <div className="text-[11px] text-gray-400">Enter seed entities and build to view graph.</div>}
          </div>
        </div>
      </div>
      {edgeDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=> setEdgeDetail(null)}>
          <div className="bg-white rounded shadow max-w-md w-full p-4 text-xs" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Edge Detail</h4>
              <button onClick={()=> setEdgeDetail(null)} className="px-2 py-0.5 bg-gray-200 rounded">Close</button>
            </div>
            <div className="mb-2 break-all">{edgeDetail.a.type}:{edgeDetail.a.value} ↔ {edgeDetail.b.type}:{edgeDetail.b.value}</div>
            {loadingEdge ? <div>Loading orders...</div> : (
              <ul className="max-h-48 overflow-y-auto space-y-1">
                {edgeOrders.map(o=> <li key={o.id} className="border rounded px-2 py-1">{o.orderNumber}</li>)}
                {!edgeOrders.length && <li className="text-gray-400">No orders (possibly filtered)</li>}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseManager;

// Enhanced sparkline with thresholds, normalization toggle, hover
const TimelineSparkline = ({ points, normalize=false, hover, setHover }) => {
  if(!points.length) return null;
  const w=260, h=60; const scores = points.map(p=>p.score); const minRaw=Math.min(...scores), maxRaw=Math.max(...scores); const spanRaw=(maxRaw-minRaw)||1;
  // Normalized scores 0-100 scale
  const norm = (s)=> ((s-minRaw)/spanRaw)*100;
  const yFor = (s)=> {
    const val = normalize ? norm(s) : s; const maxVal = normalize?100:maxRaw; const minVal = normalize?0:minRaw; const span=(maxVal-minVal)||1; return h-5 - ((val-minVal)/span)*(h-15);
  };
  const path = points.map((p,i)=>{ const x = (i/(points.length-1))* (w-10) +5; const y = yFor(p.score); return `${i?'L':'M'}${x},${y}`; }).join(' ');
  const thresholds = [25,50,75];
  const colorFor = (score)=> score>=75?'#dc2626':score>=50?'#f59e0b':score>=25?'#2563eb':'#10b981';
  const handleMove = (e)=>{
    const rect = e.currentTarget.getBoundingClientRect(); const relX = e.clientX - rect.left -5; const ratio = Math.max(0, Math.min(1, relX/(w-10))); const idx = Math.round(ratio*(points.length-1)); const p = points[idx]; if(p) setHover && setHover({ ...p, norm: norm(p.score) }); };
  const handleLeave = ()=> setHover && setHover(null);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16 bg-gray-50 border rounded" onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {/* Threshold bands */}
      {thresholds.map(t=> t<maxRaw && !normalize && <line key={t} x1={0} x2={w} y1={yFor(t)} y2={yFor(t)} stroke="#e2e8f0" strokeDasharray="2 3" />)}
      <path d={path} fill="none" stroke="#334155" strokeWidth="1" />
      {points.map((p,i)=>{ const x = (i/(points.length-1))* (w-10) +5; const y = yFor(p.score); return <circle key={i} cx={x} cy={y} r={hover && hover.orderNumber===p.orderNumber ? 3 : 2} fill={colorFor(p.score)} />; })}
      {hover && (()=>{ const i = points.findIndex(pp=> pp.orderNumber===hover.orderNumber); if(i<0) return null; const x = (i/(points.length-1))* (w-10) +5; return <line x1={x} x2={x} y1={0} y2={h} stroke="#94a3b8" strokeDasharray="3 3" />; })()}
      <text x={4} y={10} fontSize="8" fill="#475569">{normalize?0:minRaw}</text>
      <text x={w-20} y={10} fontSize="8" fill="#475569">{normalize?100:maxRaw}</text>
    </svg>
  );
};

// Export timeline CSV helper
function exportTimelineCSV(){
  const caseContainer = document.querySelector('[data-case-manager-root]'); // optional anchor
  // Find React state indirectly: timeline kept in closure; easier to attach export via window? Instead implement inside component scope.
}
