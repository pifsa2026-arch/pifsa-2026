import { useState, useEffect } from 'react';
import { useLeads } from '../../lib/LeadsContext.jsx';
import { STAGES, TRAINING_DURATIONS, peso, leadTotalDue, isFullyPaid } from '../../lib/config.js';
import LeadModal from './LeadModal.jsx';

export default function CRMDashboard({ initialStage = null }) {
  const { leads, loading, connected, error, updateLead, addLead, deleteLeads } = useLeads();
  const [view, setView] = useState('kanban');
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [openLead, setOpenLead] = useState(null);
  const [creating, setCreating] = useState(false);
  const [payFilter, setPayFilter] = useState('all');
  const [year, setYear] = useState('2027');
  const [durFilter, setDurFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState(initialStage);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [bulkStage, setBulkStage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // {ids} or null

  useEffect(() => { setStageFilter(initialStage); }, [initialStage]);
  useEffect(() => { setPage(1); setSelected([]); }, [search, payFilter, stageFilter, pageSize]);

  if (loading) return <div className="panel-loading">Loading leads…</div>;

  const matchPay = (l) => {
    if (payFilter === 'all') return true;
    const due = leadTotalDue(l), paidAmt = Number(l.amount_paid || 0);
    if (payFilter === 'paid') return isFullyPaid(l);
    if (payFilter === 'partial') return paidAmt > 0 && paidAmt < due;
    if (payFilter === 'unpaid') return paidAmt === 0;
    return true;
  };
  const matchSearch = (l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [l.full_name, l.email, l.contact_number, l.current_work, l.location, l.bs_degree, (l.programs || []).join(' ')]
      .filter(Boolean).some((v) => v.toLowerCase().includes(q));
  };
  const matchYearDur = (l) => {
    if (durFilter !== 'all') return l.training_duration === durFilter;
    if (year && l.training_duration) return l.training_duration.includes(year);
    return true;
  };
  const baseLeads = leads.filter(matchPay).filter(matchSearch).filter(matchYearDur);
  const shownLeads = baseLeads.filter((l) => (stageFilter ? l.stage === stageFilter : true));

  // Pagination (table view)
  const totalPages = Math.max(1, Math.ceil(shownLeads.length / pageSize));
  const pageLeads = shownLeads.slice((page - 1) * pageSize, page * pageSize);

  const onDrop = (stage) => { if (dragId != null) { updateLead(dragId, { stage }); setDragId(null); setDragOver(null); } };

  const payTag = (l) => {
    const due = leadTotalDue(l), paidAmt = Number(l.amount_paid || 0);
    if (isFullyPaid(l)) return <span className="pay-tag pay-full">Paid</span>;
    if (paidAmt > 0) return <span className="pay-tag pay-partial">₱{(paidAmt/1000)}k / ₱{(due/1000)}k</span>;
    return <span className="pay-tag pay-none">Unpaid</span>;
  };

  const toggleSelect = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const allOnPageSelected = pageLeads.length > 0 && pageLeads.every((l) => selected.includes(l.id));
  const toggleSelectAll = () => {
    if (allOnPageSelected) setSelected((s) => s.filter((id) => !pageLeads.some((l) => l.id === id)));
    else setSelected((s) => [...new Set([...s, ...pageLeads.map((l) => l.id)])]);
  };

  const applyBulkStage = () => {
    if (!bulkStage) return;
    selected.forEach((id) => updateLead(id, { stage: bulkStage }));
    setSelected([]); setBulkStage('');
  };
  const doDelete = () => {
    if (confirmDelete) { deleteLeads(confirmDelete.ids); setSelected([]); setConfirmDelete(null); if (confirmDelete.fromModal) setOpenLead(null); }
  };

  return (
    <div>
      {!connected && <div className="notice">Preview mode — sample leads. Connect Supabase to manage live web-form submissions.</div>}
      {error && <div className="notice" style={{ background: '#fdecea', borderColor: '#f5b7b1', color: '#a33' }}>Could not read leads: <strong>{error}</strong></div>}

      {stageFilter && (
        <div className="active-filter-chip">
          Filtered by stage: <strong>{stageFilter}</strong>
          <button onClick={() => setStageFilter(null)}>clear ×</button>
        </div>
      )}

      <div className="filter-bar">
        <div className="filter-group">
          <label>Academic Year</label>
          <select className="portal-field sm" value={year} onChange={(e) => { setYear(e.target.value); setDurFilter('all'); }}>
            <option value="2027">AY 2027</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Training Duration</label>
          <select className="portal-field sm" value={durFilter} onChange={(e) => setDurFilter(e.target.value)}>
            <option value="all">All durations</option>
            {TRAINING_DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="filter-scope">{durFilter === 'all' ? `All Durations · AY ${year}` : durFilter.replace(', 2027', '').replace(' – ', '–')}</div>
      </div>

      <div className="crm-toolbar">
        <div className="view-toggle">
          <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>Kanban</button>
          <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button>
        </div>
        <div className="toolbar-right">
          <input className="portal-field sm crm-search" placeholder="🔍 Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="portal-field sm pay-filter" value={payFilter} onChange={(e) => setPayFilter(e.target.value)}>
            <option value="all">All payments</option>
            <option value="paid">Fully paid</option>
            <option value="partial">Partial (staggered)</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <button className="portal-btn sm add-lead-btn" onClick={() => setCreating(true)}>＋ Add Lead</button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="kanban">
          {STAGES.map((stage) => {
            const col = shownLeads.filter((l) => l.stage === stage);
            return (
              <div key={stage}
                className={'kanban-col' + (dragOver === stage ? ' drag-over' : '')}
                onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => onDrop(stage)}>
                <div className="kanban-head"><span>{stage}</span><span className="kanban-count">{col.length}</span></div>
                <div className="kanban-cards">
                  {col.map((l) => (
                    <div key={l.id} className="kanban-card" draggable
                      onDragStart={() => setDragId(l.id)} onClick={() => setOpenLead(l)}>
                      <div className="kc-name">{l.full_name}</div>
                      <div className="kc-programs">{(l.programs || []).length} program{(l.programs||[]).length !== 1 ? 's' : ''} · {peso(leadTotalDue(l))}</div>
                      <div className="kc-foot">{payTag(l)}<span className="kc-source">{l.source}</span></div>
                    </div>
                  ))}
                  {col.length === 0 && <div className="kanban-empty">Drop here</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* Bulk action bar */}
          {selected.length > 0 && (
            <div className="bulk-bar">
              <span className="bulk-count">{selected.length} selected</span>
              <select className="portal-field sm" value={bulkStage} onChange={(e) => setBulkStage(e.target.value)}>
                <option value="">Move to stage…</option>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="portal-btn sm" onClick={applyBulkStage} disabled={!bulkStage}>Apply</button>
              <button className="bulk-del" onClick={() => setConfirmDelete({ ids: selected })}>Delete selected</button>
              <button className="bulk-clear" onClick={() => setSelected([])}>Clear</button>
            </div>
          )}

          <div className="table-wrap">
            <table className="crm-table sm">
              <thead>
                <tr>
                  <th className="col-check"><input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} /></th>
                  <th>Name</th><th>Work</th><th>Location</th><th>Programs</th><th>Stage</th><th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {pageLeads.length === 0 && <tr><td colSpan={7} className="empty-row">No leads match.</td></tr>}
                {pageLeads.map((l) => (
                  <tr key={l.id} className={'clickable-row' + (selected.includes(l.id) ? ' row-selected' : '')}>
                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} />
                    </td>
                    <td onClick={() => setOpenLead(l)}>{l.full_name}<div className="cell-sub">{l.email}</div></td>
                    <td onClick={() => setOpenLead(l)}>{l.current_work || '—'}{l.bs_degree && <div className="cell-sub">{l.bs_degree}</div>}</td>
                    <td onClick={() => setOpenLead(l)} className="muted">{l.location || '—'}</td>
                    <td onClick={() => setOpenLead(l)}>{(l.programs || []).length} · {peso(leadTotalDue(l))}</td>
                    <td onClick={() => setOpenLead(l)}><span className="stage-pill">{l.stage}</span></td>
                    <td onClick={() => setOpenLead(l)}>{payTag(l)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="table-footer">
            <div className="page-size">
              Show
              {[25, 50, 100].map((n) => (
                <button key={n} className={pageSize === n ? 'active' : ''} onClick={() => setPageSize(n)}>{n}</button>
              ))}
              <span className="muted">· {shownLeads.length} leads</span>
            </div>
            <div className="pager">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
            </div>
          </div>
        </>
      )}

      {openLead && (
        <LeadModal lead={leads.find((l) => l.id === openLead.id) || openLead}
          onClose={() => setOpenLead(null)} onSave={(patch) => updateLead(openLead.id, patch)}
          onDelete={() => { setConfirmDelete({ ids: [openLead.id], fromModal: true }); }} />
      )}
      {creating && (
        <LeadModal createMode lead={{ full_name: '', email: '', contact_number: '', programs: [], training_duration: '', stage: 'Applicants', amount_paid: 0, notes: '', source: 'walk_in' }}
          onClose={() => setCreating(false)} onSave={(data) => { addLead(data); setCreating(false); }} />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">⚠</div>
            <h2>Delete {confirmDelete.ids.length} lead{confirmDelete.ids.length > 1 ? 's' : ''}?</h2>
            <p>This permanently removes the selected lead{confirmDelete.ids.length > 1 ? 's' : ''} and cannot be undone.</p>
            <div className="confirm-actions">
              <button className="portal-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="portal-btn-danger" onClick={doDelete}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
