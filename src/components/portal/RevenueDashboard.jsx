import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { useLeads } from '../../lib/LeadsContext.jsx';
import { EXPENSE_CATEGORIES, TRAINING_DURATIONS, peso, isFullyPaid, leadTotalDue } from '../../lib/config.js';
import { Donut, LineChart, DurationPL } from './Charts.jsx';

const ACADEMY_YEARS = ['2027'];

const SAMPLE_EXPENSES = [
  { id: 1, spent_on: '2027-01-10', category: 'Digital', subcategory: 'Paid Ads', description: 'Meta ads', amount: 30000, duration: TRAINING_DURATIONS[0] },
  { id: 2, spent_on: '2027-01-15', category: 'Events', subcategory: 'Training Events', description: 'Guest speakers', amount: 45000, duration: TRAINING_DURATIONS[0] },
  { id: 3, spent_on: '2027-01-20', category: 'Operations', subcategory: 'Utilities', description: 'Venue + power', amount: 18000, duration: TRAINING_DURATIONS[1] },
  { id: 4, spent_on: '2027-02-01', category: 'Operations', subcategory: 'Employee Salary', description: 'Staff (annual)', amount: 60000, duration: 'General' },
  { id: 5, spent_on: '2027-01-22', category: 'Print', subcategory: 'Flyers', description: 'Enrollment flyers', amount: 8000, duration: TRAINING_DURATIONS[0] },
];

const shortDur = (d) => (d === 'General' ? 'General' : d.replace(', 2027', '').replace(' – ', '–'));

export default function RevenueDashboard() {
  const { leads } = useLeads();
  const [expenses, setExpenses] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('2027');
  const [durFilter, setDurFilter] = useState('all'); // 'all' or a specific duration
  const [form, setForm] = useState({ category: 'Digital', subcategory: 'Paid Ads', description: '', amount: '', spent_on: '', duration: 'General' });

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) { setExpenses(SAMPLE_EXPENSES); setLoading(false); return; }
      const { data, error } = await supabase.from('expenses').select('*').order('spent_on', { ascending: false });
      if (error || !data) { setExpenses(SAMPLE_EXPENSES); } else { setExpenses(data); setConnected(true); }
      setLoading(false);
    };
    load();
  }, []);

  const addExpense = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return;
    const row = { category: form.category, subcategory: form.subcategory, description: form.description.trim(),
      amount: amt, spent_on: form.spent_on || new Date().toISOString().slice(0, 10), duration: form.duration };
    if (isSupabaseConfigured && connected) {
      const { data } = await supabase.from('expenses').insert([row]).select();
      if (data) setExpenses((e) => [data[0], ...e]);
    } else { setExpenses((e) => [{ id: Date.now(), ...row }, ...e]); }
    setForm({ ...form, description: '', amount: '' });
  };
  const removeExpense = async (id) => {
    setExpenses((e) => e.filter((x) => x.id !== id));
    if (isSupabaseConfigured && connected) await supabase.from('expenses').delete().eq('id', id);
  };

  if (loading) return <div className="panel-loading">Loading…</div>;

  // Revenue + expense per duration
  const revenueByDur = {}; TRAINING_DURATIONS.forEach((d) => (revenueByDur[d] = 0));
  leads.filter(isFullyPaid).forEach((l) => {
    if (l.training_duration && revenueByDur[l.training_duration] != null) revenueByDur[l.training_duration] += leadTotalDue(l);
  });
  const expenseByDur = {}; TRAINING_DURATIONS.forEach((d) => (expenseByDur[d] = 0));
  let generalExpense = 0;
  expenses.forEach((e) => {
    const d = e.duration || 'General';
    if (d === 'General') generalExpense += Number(e.amount);
    else if (expenseByDur[d] != null) expenseByDur[d] += Number(e.amount);
    else generalExpense += Number(e.amount);
  });

  const isAll = durFilter === 'all';

  // ---- Scoped figures based on filter ----
  let revenue, durationExpense, genExpense, net, title;
  if (isAll) {
    revenue = Object.values(revenueByDur).reduce((s, v) => s + v, 0);
    durationExpense = Object.values(expenseByDur).reduce((s, v) => s + v, 0);
    genExpense = generalExpense;
    net = revenue - durationExpense - genExpense;
    title = `All Durations · AY ${year}`;
  } else {
    revenue = revenueByDur[durFilter] || 0;
    durationExpense = expenseByDur[durFilter] || 0;
    genExpense = 0; // general only applies to the annual view
    net = revenue - durationExpense;
    title = shortDur(durFilter);
  }

  const durColors = ['#00264d', '#1b4f7a', '#b8860b', '#d4a94a', '#27795b', '#7a5c1b'];
  const linePoints = TRAINING_DURATIONS.map((d) => ({ label: shortDur(d).split('–')[0], value: revenueByDur[d] }));
  const donutData = TRAINING_DURATIONS.map((d, i) => ({ label: shortDur(d), value: revenueByDur[d], color: durColors[i], isMoney: true })).filter((x) => x.value > 0);
  const plRows = TRAINING_DURATIONS.map((d) => ({ label: shortDur(d), revenue: revenueByDur[d], expense: expenseByDur[d], net: revenueByDur[d] - expenseByDur[d] }));

  // Top expense contributors by primary source (Digital/Events/Print/Operations)
  const scopedForSources = isAll ? expenses : expenses.filter((e) => (e.duration || 'General') === durFilter);
  const bySource = {};
  scopedForSources.forEach((e) => { bySource[e.category] = (bySource[e.category] || 0) + Number(e.amount); });
  const sourceColors = { Digital: '#1b4f7a', Events: '#b8860b', Print: '#7a5c1b', Operations: '#c0392b' };
  const sourceRows = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  const sourceTotal = sourceRows.reduce((s, [, v]) => s + v, 0);

  const scopedExpenses = isAll ? expenses : expenses.filter((e) => (e.duration || 'General') === durFilter);
  const subOptions = EXPENSE_CATEGORIES[form.category] || [];

  return (
    <div className="rev-dash">
      {!connected && <div className="notice">Preview mode — expenses are sample/local. Connect Supabase (an <code>expenses</code> table) to persist them.</div>}

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Academy Year</label>
          <select className="portal-field sm" value={year} onChange={(e) => setYear(e.target.value)}>
            {ACADEMY_YEARS.map((y) => <option key={y} value={y}>AY {y}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Training Duration</label>
          <select className="portal-field sm" value={durFilter} onChange={(e) => setDurFilter(e.target.value)}>
            <option value="all">All durations</option>
            {TRAINING_DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="filter-scope">{title}</div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid kpi-sm">
        <div className="kpi-card"><div className="kpi-value">{peso(revenue)}</div><div className="kpi-label">Earned Revenue</div></div>
        <div className="kpi-card"><div className="kpi-value">{peso(durationExpense)}</div><div className="kpi-label">{isAll ? 'Duration Expenses' : 'Expenses'}</div></div>
        {isAll && <div className="kpi-card"><div className="kpi-value">{peso(genExpense)}</div><div className="kpi-label">General / Annual</div></div>}
        <div className="kpi-card" style={{ borderLeftColor: net >= 0 ? '#27795b' : '#c0392b' }}>
          <div className="kpi-value" style={{ color: net >= 0 ? '#27795b' : '#c0392b' }}>{peso(net)}</div>
          <div className="kpi-label">Net Profit</div>
        </div>
      </div>

      {isAll ? (
        <>
          <div className="dash-2col">
            <div className="panel">
              <h3>Revenue Trend by Duration</h3>
              <LineChart points={linePoints} color="var(--gold)" fill="rgba(184,134,11,0.12)" />
            </div>
            <div className="panel">
              <h3>Revenue Share</h3>
              <Donut data={donutData} size={170} thickness={28} />
            </div>
          </div>
          <div className="panel">
            <h3>Profit &amp; Loss per Duration</h3>
            <p className="muted mini">Net = fully-paid revenue − expenses tagged to that duration. General expenses hit the annual net only.</p>
            <DurationPL rows={plRows} />
          </div>
        </>
      ) : (
        <div className="panel">
          <h3>{title} — Breakdown</h3>
          <div className="single-breakdown">
            <div className="sb-item"><span className="sb-tag rev">Revenue</span><div className="sb-track"><div className="sb-fill rev" style={{ width: revenue ? '100%' : '0' }} /></div><span className="sb-val">{peso(revenue)}</span></div>
            <div className="sb-item"><span className="sb-tag exp">Expenses</span><div className="sb-track"><div className="sb-fill exp" style={{ width: revenue ? `${Math.min(100, (durationExpense / Math.max(revenue, durationExpense)) * 100)}%` : '100%' }} /></div><span className="sb-val">{peso(durationExpense)}</span></div>
            <div className="sb-item"><span className="sb-tag net">Net</span><div className="sb-track"><div className={'sb-fill ' + (net >= 0 ? 'net' : 'neg')} style={{ width: `${Math.min(100, (Math.abs(net) / Math.max(revenue, durationExpense, 1)) * 100)}%` }} /></div><span className={'sb-val ' + (net < 0 ? 'neg-text' : '')}>{peso(net)}</span></div>
          </div>
        </div>
      )}

      {/* Top Expense Contributors by source */}
      <div className="panel">
        <h3>Top Expense Contributors {!isAll && <span className="muted mini">· {title}</span>}</h3>
        <p className="muted mini" style={{ marginBottom: 16 }}>Ranked by primary expense source.</p>
        {sourceRows.length === 0 ? (
          <div className="chart-empty" style={{ height: 80 }}>No expenses logged yet</div>
        ) : (
          <div className="contrib-list">
            {sourceRows.map(([src, amt], i) => (
              <div className="contrib-row" key={src}>
                <div className="contrib-rank">{i + 1}</div>
                <div className="contrib-main">
                  <div className="contrib-head">
                    <span className="contrib-name"><span className="contrib-dot" style={{ background: sourceColors[src] || '#888' }} />{src}</span>
                    <span className="contrib-amt">{peso(amt)} <span className="contrib-pct">({sourceTotal ? Math.round((amt / sourceTotal) * 100) : 0}%)</span></span>
                  </div>
                  <div className="contrib-track"><div className="contrib-fill" style={{ width: `${sourceTotal ? (amt / sourceTotal) * 100 : 0}%`, background: sourceColors[src] || '#888' }} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense management */}
      <div className="dash-2col">
        <div className="panel">
          <h3>Log an Expense</h3>
          <div className="expense-form">
            <select className="portal-field sm" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
              <option value="General">General / Annual (whole year)</option>
              {TRAINING_DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="expense-form-2col">
              <select className="portal-field sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: EXPENSE_CATEGORIES[e.target.value][0] })}>
                {Object.keys(EXPENSE_CATEGORIES).map((c) => <option key={c}>{c}</option>)}
              </select>
              <select className="portal-field sm" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })}>
                {subOptions.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <input className="portal-field sm" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="expense-form-2col">
              <input className="portal-field sm" type="date" value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} />
              <input className="portal-field sm" type="number" placeholder="Amount (₱)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <button className="portal-btn sm" onClick={addExpense}>Add Expense</button>
          </div>
        </div>

        <div className="panel">
          <h3>Expense Log {!isAll && <span className="muted mini">· {title}</span>}</h3>
          <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table className="crm-table sm">
              <thead><tr><th>Date</th><th>Duration</th><th>Category</th><th>Amount</th><th></th></tr></thead>
              <tbody>
                {scopedExpenses.length === 0 && <tr><td colSpan={5} className="empty-row">No expenses.</td></tr>}
                {scopedExpenses.map((e) => (
                  <tr key={e.id}>
                    <td className="muted">{e.spent_on}</td>
                    <td><span className={'dur-tag' + ((e.duration || 'General') === 'General' ? ' gen' : '')}>{shortDur(e.duration || 'General')}</span></td>
                    <td><span className="source-tag">{e.category}</span> {e.subcategory}</td>
                    <td>{peso(e.amount)}</td>
                    <td><button className="row-del" onClick={() => removeExpense(e.id)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
