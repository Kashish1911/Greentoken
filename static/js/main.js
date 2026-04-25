/* ── GreenToken Main JS ─────────────────────────────────────── */

// ─── Tab Switching ─────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'history') loadHistory();
  });
});

// ─── Slider Sync ───────────────────────────────────────────────
function syncSlider(inputId, sliderId) {
  const input  = document.getElementById(inputId);
  const slider = document.getElementById(sliderId);
  input.addEventListener('input',  () => slider.value = input.value);
  slider.addEventListener('input', () => input.value  = slider.value);
}
syncSlider('storage_gb',    'storage_slider');
syncSlider('compute_hours', 'compute_slider');
syncSlider('transfer_gb',   'transfer_slider');
syncSlider('tokens_per_day','tokens_slider');

// ─── Presets ───────────────────────────────────────────────────
const PRESETS = {
  startup:    { storage_gb: 100,  compute_hours: 50,  transfer_gb: 20  },
  smb:        { storage_gb: 500,  compute_hours: 200, transfer_gb: 100 },
  enterprise: { storage_gb: 5000, compute_hours: 720, transfer_gb: 2000 }
};
function loadPreset(name) {
  const p = PRESETS[name];
  document.getElementById('storage_gb').value    = p.storage_gb;
  document.getElementById('compute_hours').value = p.compute_hours;
  document.getElementById('transfer_gb').value   = p.transfer_gb;
  document.getElementById('storage_slider').value    = p.storage_gb;
  document.getElementById('compute_slider').value    = p.compute_hours;
  document.getElementById('transfer_slider').value   = p.transfer_gb;
}

// ─── Chart Instances ────────────────────────────────────────────
let barChart        = null;
let breakdownChart  = null;
let aiEnergyChart   = null;

// ─── Cloud Cost Calculation ────────────────────────────────────
document.getElementById('calc-btn').addEventListener('click', async () => {
  const btn = document.getElementById('calc-btn');
  btn.classList.add('loading');

  const payload = {
    storage_gb:    parseFloat(document.getElementById('storage_gb').value)    || 0,
    compute_hours: parseFloat(document.getElementById('compute_hours').value) || 0,
    transfer_gb:   parseFloat(document.getElementById('transfer_gb').value)   || 0
  };

  try {
    const res  = await fetch('/calculate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    renderCloudResults(data);
  } catch (err) {
    alert('Error connecting to server. Make sure Flask is running!');
    console.error(err);
  } finally {
    btn.classList.remove('loading');
  }
});

function renderCloudResults(data) {
  document.getElementById('placeholder-state').style.display = 'none';
  const content = document.getElementById('results-content');
  content.style.display = 'block';
  content.classList.add('fade-in');

  const { costs, cheapest } = data;
  const providers = ['aws', 'azure', 'gcp'];
  const labels    = ['AWS', 'Azure', 'GCP'];
  const colors    = ['#ff9900', '#0089d6', '#4285f4'];

  // Winner banner
  document.getElementById('winner-name').textContent  = labels[providers.indexOf(cheapest)];
  document.getElementById('winner-price').textContent = '$' + costs[cheapest].total.toFixed(2) + ' / mo';
  const sorted = [...providers].sort((a,b) => costs[a].total - costs[b].total);
  const savings = costs[sorted[1]].total - costs[sorted[0]].total;
  document.getElementById('winner-save').textContent  =
    'Save $' + savings.toFixed(2) + '/mo vs ' + labels[providers.indexOf(sorted[1])];

  // Cost cards
  providers.forEach(p => {
    const c = costs[p];
    document.getElementById(p + '-total').textContent = '$' + c.total.toFixed(2);
    document.getElementById(p + '-breakdown').innerHTML =
      `<div class="breakdown-row"><span>Storage</span><span>$${c.storage_cost.toFixed(3)}</span></div>
       <div class="breakdown-row"><span>Compute</span><span>$${c.compute_cost.toFixed(3)}</span></div>
       <div class="breakdown-row"><span>Transfer</span><span>$${c.transfer_cost.toFixed(3)}</span></div>
       <div class="breakdown-row"><span>Carbon</span><span>${c.carbon_kg} kg CO₂</span></div>`;
    const card = document.getElementById('card-' + p);
    card.classList.toggle('cheapest-card', p === cheapest);
  });

  // Bar Chart
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Monthly Cost ($)',
        data: providers.map(p => costs[p].total),
        backgroundColor: colors.map(c => c + '33'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#252c35' }, ticks: { color: '#5c6b7a' } },
        y: { grid: { color: '#252c35' }, ticks: { color: '#5c6b7a', callback: v => '$'+v } }
      }
    }
  });

  // Breakdown Grouped Chart
  if (breakdownChart) breakdownChart.destroy();
  breakdownChart = new Chart(document.getElementById('breakdownChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Storage',
          data: providers.map(p => costs[p].storage_cost),
          backgroundColor: '#00e5a033', borderColor: '#00e5a0', borderWidth: 2, borderRadius: 4
        },
        {
          label: 'Compute',
          data: providers.map(p => costs[p].compute_cost),
          backgroundColor: '#3b82f633', borderColor: '#3b82f6', borderWidth: 2, borderRadius: 4
        },
        {
          label: 'Transfer',
          data: providers.map(p => costs[p].transfer_cost),
          backgroundColor: '#f59e0b33', borderColor: '#f59e0b', borderWidth: 2, borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8a9baa', boxWidth: 12 } } },
      scales: {
        x: { grid: { color: '#252c35' }, ticks: { color: '#5c6b7a' } },
        y: { grid: { color: '#252c35' }, ticks: { color: '#5c6b7a', callback: v => '$'+v } }
      }
    }
  });

  // Breakdown Table
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  providers.forEach((p, i) => {
    const c   = costs[p];
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <span class="provider-logo ${p}-logo">${labels[i]}</span>
        ${p === cheapest ? '<span class="badge-cheapest">CHEAPEST</span>' : ''}
      </td>
      <td>$${c.storage_cost.toFixed(4)}</td>
      <td>$${c.compute_cost.toFixed(4)}</td>
      <td>$${c.transfer_cost.toFixed(4)}</td>
      <td style="font-weight:600;font-family:'Space Mono',monospace">$${c.total.toFixed(2)}</td>
      <td>$${(c.total * 12).toFixed(2)}</td>
      <td>${c.carbon_kg} kg</td>`;
    tbody.appendChild(row);
  });

  // Recommendations
  buildRecommendations(data);
}

function buildRecommendations(data) {
  const { costs, cheapest, inputs } = data;
  const providers = ['aws', 'azure', 'gcp'];
  const labels    = { aws:'AWS', azure:'Azure', gcp:'GCP' };
  const recs = [];

  // Cheapest
  recs.push({
    title: `✅ Use ${labels[cheapest]}`,
    desc:  `${labels[cheapest]} is the cheapest at $${costs[cheapest].total.toFixed(2)}/mo. Switching could save up to $${(Math.max(...providers.map(p=>costs[p].total)) - costs[cheapest].total).toFixed(2)}/mo.`
  });

  // Carbon
  const greenest = providers.reduce((a,b) => costs[a].carbon_kg < costs[b].carbon_kg ? a : b);
  recs.push({
    title: `🌱 ${labels[greenest]} is greenest`,
    desc:  `${labels[greenest]} produces only ${costs[greenest].carbon_kg} kg CO₂/mo for this workload. Choose a renewable-energy region to cut that further by 80%.`
  });

  // Compute tip
  if (inputs.compute_hours > 400) {
    recs.push({
      title: '⚙ High compute detected',
      desc:  'You\'re using ' + inputs.compute_hours + ' hours/mo. Consider reserved instances (up to 72% discount) or spot/preemptible VMs for batch workloads.'
    });
  }

  // Storage tip
  if (inputs.storage_gb > 1000) {
    recs.push({
      title: '🗄 Optimize storage',
      desc:  'For ' + inputs.storage_gb + ' GB, consider tiered storage (S3 Glacier / Archive). Cold data stored in archive tiers can cost 10× less than hot storage.'
    });
  }

  // Always show AI tip
  recs.push({
    title: '🤖 Sustainable AI tip',
    desc:  'If running AI workloads on this infrastructure, switch to smaller models like Mistral 7B or Llama 3 8B. They\'re up to 16× more energy-efficient than GPT-4.'
  });

  const grid = document.getElementById('rec-grid');
  grid.innerHTML = recs.map(r =>
    `<div class="rec-item">
       <div class="rec-title">${r.title}</div>
       <div class="rec-desc">${r.desc}</div>
     </div>`
  ).join('');
}

// ─── AI Energy Analysis ─────────────────────────────────────────
document.getElementById('ai-calc-btn').addEventListener('click', async () => {
  const btn = document.getElementById('ai-calc-btn');
  btn.classList.add('loading');

  const payload = {
    tokens_per_day: parseFloat(document.getElementById('tokens_per_day').value) || 100000,
    model:          document.getElementById('ai_model').value
  };

  try {
    const res  = await fetch('/ai_energy', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    renderAIResults(data);
  } catch (err) {
    alert('Error connecting to server.');
    console.error(err);
  } finally {
    btn.classList.remove('loading');
  }
});

function renderAIResults(data) {
  document.getElementById('ai-placeholder').style.display = 'none';
  const content = document.getElementById('ai-results-content');
  content.style.display = 'block';
  content.classList.add('fade-in');

  // Stats
  const treesNeeded = (data.carbon_yr_kg / 21).toFixed(1);
  document.getElementById('energy-stats').innerHTML = `
    <div class="energy-stat">
      <div class="stat-label">DAILY ENERGY</div>
      <div class="stat-value">${(data.wh_per_day * 1000).toFixed(0)}</div>
      <div class="stat-unit">mWh per day</div>
    </div>
    <div class="energy-stat">
      <div class="stat-label">ANNUAL ENERGY</div>
      <div class="stat-value">${data.kwh_per_yr.toFixed(2)}</div>
      <div class="stat-unit">kWh per year</div>
    </div>
    <div class="energy-stat">
      <div class="stat-label">CO₂ PER YEAR</div>
      <div class="stat-value">${data.carbon_yr_kg.toFixed(3)}</div>
      <div class="stat-unit">kg CO₂ equivalent</div>
    </div>
    <div class="energy-stat">
      <div class="stat-label">TREES TO OFFSET</div>
      <div class="stat-value">${treesNeeded}</div>
      <div class="stat-unit">trees needed / year</div>
    </div>`;

  // Table
  const tbody = document.getElementById('ai-table-body');
  tbody.innerHTML = '';
  data.comparisons.forEach(m => {
    const isCurrent = m.model === data.model;
    const row = document.createElement('tr');
    row.style.background = isCurrent ? 'rgba(0,229,160,.04)' : '';
    const saving = m.saving_pct > 0
      ? `<span style="color:#00e5a0;font-family:'Space Mono',monospace;font-size:.75rem">−${m.saving_pct}%</span>`
      : (isCurrent ? '<span style="color:#5c6b7a;font-size:.75rem">← current</span>' : '<span style="color:#ef4444;font-size:.75rem">uses more</span>');
    row.innerHTML = `
      <td style="font-weight:${isCurrent?600:400}">${m.model}${isCurrent?' ◀':''}</td>
      <td style="font-family:'Space Mono',monospace;font-size:.8rem">${m.params}</td>
      <td style="font-family:'Space Mono',monospace;font-size:.8rem">${m.kwh_yr.toFixed(4)}</td>
      <td><span class="efficiency-badge eff-${m.efficiency}">${m.efficiency.replace('_',' ')}</span></td>
      <td>${saving}</td>`;
    tbody.appendChild(row);
  });

  // AI Energy Chart
  if (aiEnergyChart) aiEnergyChart.destroy();
  const sortedComps = [...data.comparisons].sort((a,b) => a.kwh_yr - b.kwh_yr);
  const effColors = {very_high:'#00e5a0', high:'#6ca3ff', medium:'#f59e0b', low:'#ef4444'};

  aiEnergyChart = new Chart(document.getElementById('aiEnergyChart'), {
    type: 'bar',
    data: {
      labels: sortedComps.map(m => m.model),
      datasets: [{
        label: 'kWh / year',
        data:  sortedComps.map(m => m.kwh_yr),
        backgroundColor: sortedComps.map(m =>
          m.model === data.model ? '#ffffff33' : effColors[m.efficiency] + '33'
        ),
        borderColor: sortedComps.map(m =>
          m.model === data.model ? '#fff' : effColors[m.efficiency]
        ),
        borderWidth: sortedComps.map(m => m.model === data.model ? 2 : 1.5),
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#252c35' }, ticks: { color: '#5c6b7a', callback: v => v + ' kWh' } },
        y: { grid: { color: '#252c35' }, ticks: { color: '#8a9baa', font: { size: 11 } } }
      }
    }
  });
}

// ─── History ─────────────────────────────────────────────────────
async function loadHistory() {
  const tbody = document.getElementById('history-body');
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--muted)">Loading…</td></tr>';

  try {
    const res  = await fetch('/history');
    const rows = await res.json();

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--muted)">No calculations yet. Run one first!</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    rows.forEach(r => {
      const date = new Date(r.timestamp).toLocaleString();
      const cheapLabel = r.cheapest ? r.cheapest.toUpperCase() : '—';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-family:'Space Mono',monospace;font-size:.75rem;color:var(--muted)">${r.id}</td>
        <td style="font-size:.78rem;color:var(--muted2)">${date}</td>
        <td>${r.storage_gb}</td>
        <td>${r.compute_hours}</td>
        <td>${r.transfer_gb}</td>
        <td style="font-family:'Space Mono',monospace">$${Number(r.aws_cost).toFixed(2)}</td>
        <td style="font-family:'Space Mono',monospace">$${Number(r.azure_cost).toFixed(2)}</td>
        <td style="font-family:'Space Mono',monospace">$${Number(r.gcp_cost).toFixed(2)}</td>
        <td><span class="provider-logo ${r.cheapest}-logo" style="font-size:.65rem">${cheapLabel}</span></td>
        <td style="font-family:'Space Mono',monospace;font-size:.8rem">${Number(r.carbon_kg).toFixed(4)}</td>`;
      tbody.appendChild(row);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--red)">Failed to load history.</td></tr>';
  }
}

// ─── Auto-calculate on page load with defaults ─────────────────
window.addEventListener('load', () => {
  document.getElementById('calc-btn').click();
});
