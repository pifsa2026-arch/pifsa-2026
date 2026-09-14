import { useState } from 'react';
import { useLeads } from '../../lib/LeadsContext.jsx';
import { STAGES, TRAINING_DURATIONS, TRAINING_PROGRAMS, isFullyPaid, PROGRAM_PRICE } from '../../lib/config.js';
import { Donut, MultiLineChart } from './Charts.jsx';

export default function EnrollmentDashboard() {
  const { leads: allLeads, loading, connected } = useLeads();
  const [year, setYear] = useState('2027');
  const [durFilter, setDurFilter] = useState('all');
  const [chartMetric, setChartMetric] = useState('enrollment'); // enrollment | revenue | stages
  if (loading) return <div className="panel-loading">Loading…</div>;

  // Filter by academic year (via training duration containing the year) + specific duration
  const leads = allLeads.filter((l) => {
    if (durFilter !== 'all') return l.training_duration === durFilter;
    if (year && l.training_duration) return l.training_duration.includes(year);
    return true;
  });

  const total = leads.length;
  const paid = leads.filter(isFullyPaid).length;
  const admitted = leads.filter((l) => l.stage === 'Admitted' || l.stage === 'Paid').length;
  const conversion = total ? ((paid / total) * 100).toFixed(1) : '0.0';

  // Lead sources
  const sources = {};
  leads.forEach((l) => { const s = l.source || 'direct'; sources[s] = (sources[s] || 0) + 1; });
  const sourceRows = Object.entries(sources).sort((a, b) => b[1] - a[1]);
  const sourceMax = Math.max(1, ...sourceRows.map((r) => r[1]));

  // Stage summary
  const stageCounts = STAGES.map((s) => ({ stage: s, n: leads.filter((l) => l.stage === s).length }));
  const stageMax = Math.max(1, ...stageCounts.map((s) => s.n));

  // Enrollment per training duration (count leads at Admitted/Paid)
  const perDuration = TRAINING_DURATIONS.map((d) => ({
    d,
    n: leads.filter((l) => l.training_duration === d && (l.stage === 'Admitted' || l.stage === 'Paid')).length,
  }));
  const durMax = Math.max(1, ...perDuration.map((x) => x.n));

  // Program popularity
  const progCounts = {};
  leads.forEach((l) => (l.programs || []).forEach((p) => { progCounts[p] = (progCounts[p] || 0) + 1; }));
  const progRows = TRAINING_PROGRAMS.map((p) => ({ p, n: progCounts[p] || 0 })).sort((a, b) => b.n - a.n);
  const progMax = Math.max(1, ...progRows.map((r) => r.n));

  return (
    <div>
      {!connected && <div className="notice">Preview mode — showing sample data. Connect Supabase to see live enrollments.</div>}

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

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-value">{total}</div><div className="kpi-label">Total Leads</div></div>
        <div className="kpi-card"><div className="kpi-value">{admitted}</div><div className="kpi-label">Admitted + Paid</div></div>
        <div className="kpi-card"><div className="kpi-value">{paid}</div><div className="kpi-label">Fully Paid</div></div>
        <div className="kpi-card"><div className="kpi-value">{conversion}%</div><div className="kpi-label">Conversion Rate</div></div>
      </div>

      <div className="dash-2col">
        <div className="panel">
          <h3>Lead Sources</h3>
          <Donut size={150} thickness={26} data={sourceRows.map(([s, n], i) => ({ label: s, value: n, color: ['#00264d','#b8860b','#1b4f7a','#27795b','#d4a94a','#7a5c1b'][i % 6] }))} />
        </div>

        <div className="panel">
          <h3>CRM Summary (by stage)</h3>
          <div className="bar-chart">
            {stageCounts.map((s) => (
              <div className="bar-row" key={s.stage}>
                <div className="bar-label">{s.stage}</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(s.n / stageMax) * 100}%` }} /></div>
                <div className="bar-count">{s.n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="chart-panel-head">
          <div>
            <h3>Enrollment Trends by Training Duration</h3>
            <p className="muted mini">
              {chartMetric === 'enrollment' && 'Total leads at Admitted or Paid per duration.'}
              {chartMetric === 'revenue' && 'Fully-paid revenue (₱25k × programs) per duration.'}
              {chartMetric === 'stages' && 'Leads by pipeline stage across durations.'}
            </p>
          </div>
          <div className="metric-toggle">
            {[['enrollment', 'Enrollments'], ['revenue', 'Revenue'], ['stages', 'By Stage']].map(([k, lbl]) => (
              <button key={k} className={chartMetric === k ? 'active' : ''} onClick={() => setChartMetric(k)}>{lbl}</button>
            ))}
          </div>
        </div>
        {(() => {
          const durLabels = TRAINING_DURATIONS.map((d) => d.replace(', 2027', '').split(' – ')[0].replace(/ \d+$/, ''));
          if (chartMetric === 'stages') {
            const stageColors = { Leads: '#5b8def', Applicants: '#b8860b', Examinees: '#7a5c1b', 'For Requirements': '#c98a2b', Admitted: '#27795b', Paid: '#1b7a52' };
            const series = STAGES.map((st) => ({
              name: st, color: stageColors[st],
              values: TRAINING_DURATIONS.map((d) => leads.filter((l) => l.training_duration === d && l.stage === st).length),
            }));
            return <MultiLineChart series={series} labels={durLabels} height={280} />;
          }
          if (chartMetric === 'revenue') {
            const series = [{ name: 'Revenue', color: 'var(--gold)',
              values: TRAINING_DURATIONS.map((d) => leads.filter((l) => l.training_duration === d && isFullyPaid(l)).reduce((s, l) => s + (l.programs?.length || 0) * PROGRAM_PRICE, 0)) }];
            return <MultiLineChart series={series} labels={durLabels} height={240} money />;
          }
          const series = [{ name: 'Enrollments (Admitted + Paid)', color: 'var(--navy)',
            values: TRAINING_DURATIONS.map((d) => leads.filter((l) => l.training_duration === d && (l.stage === 'Admitted' || l.stage === 'Paid')).length) }];
          return <MultiLineChart series={series} labels={durLabels} height={240} />;
        })()}
      </div>

      <div className="panel">
        <h3>Program Popularity</h3>
        <div className="bar-chart">
          {progRows.map((r) => (
            <div className="bar-row" key={r.p}>
              <div className="bar-label bar-label-wide">{r.p}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.n / progMax) * 100}%` }} /></div>
              <div className="bar-count">{r.n}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
