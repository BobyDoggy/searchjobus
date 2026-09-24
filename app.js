'use strict';

const STORAGE_KEY = 'searchjobus_applications';
const FOLLOWUP_DAYS = 7;

// ── Persistence ──────────────────────────────────────────────────────────────

function loadApplications() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveApplications(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86_400_000);
}

function needsFollowup(app) {
  return app.status === 'sent' && daysSince(app.date) >= FOLLOWUP_DAYS;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatSalary(app) {
  const { salaryMin, salaryMax } = app;
  if (!salaryMin && !salaryMax) return '—';
  const fmt = (v) => Number(v).toLocaleString('fr-FR') + ' €';
  if (salaryMin && salaryMax) return `${fmt(salaryMin)} – ${fmt(salaryMax)}`;
  if (salaryMin) return `à partir de ${fmt(salaryMin)}`;
  return `jusqu'à ${fmt(salaryMax)}`;
}

const STATUS_LABELS = {
  sent:       'Envoyée',
  relaunched: 'Relancée',
  interview:  'Entretien planifié',
  rejected:   'Refusée',
  offer:      'Offre reçue',
};

function statusBadge(status) {
  const label = STATUS_LABELS[status] || status;
  return `<span class="status-badge status-${status}">${label}</span>`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Render ───────────────────────────────────────────────────────────────────

let selectedAppId = null;

function render() {
  const apps = loadApplications();
  const tbody = document.getElementById('table-body');
  const emptyState = document.getElementById('empty-state');

  document.getElementById('stat-total').textContent = apps.length;
  document.getElementById('stat-followup').textContent = apps.filter(needsFollowup).length;
  document.getElementById('stat-interview').textContent =
    apps.filter(a => a.status === 'interview').length;

  if (apps.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    renderFollowupPanel();
    return;
  }

  emptyState.classList.add('hidden');

  tbody.innerHTML = apps.map(app => {
    const followup = needsFollowup(app);
    const days = daysSince(app.date);
    const rowClass = (followup ? ' row-followup' : '') + (app.id === selectedAppId ? ' row-selected' : '');

    const dateCellContent = followup
      ? `<span>${formatDate(app.date)}</span>
         <span class="followup-badge" title="${days} jours sans réponse — pensez à relancer !">⏰ Relancer</span>`
      : `<span>${formatDate(app.date)}</span>`;

    return `
      <tr class="${rowClass}" data-id="${app.id}" onclick="selectApp('${app.id}')">
        <td><strong>${escHtml(app.company)}</strong></td>
        <td>${escHtml(app.contact || '—')}</td>
        <td><div class="date-cell">${dateCellContent}</div></td>
        <td>${formatSalary(app)}</td>
        <td>${statusBadge(app.status || 'sent')}</td>
        <td class="td-comment">${escHtml(app.comment || '')}</td>
        <td>
          <div class="actions">
            <button class="btn btn-icon" onclick="event.stopPropagation(); openEdit('${app.id}')" title="Modifier">✏️</button>
            <button class="btn btn-icon btn-danger" onclick="event.stopPropagation(); openDelete('${app.id}')" title="Supprimer">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  renderFollowupPanel();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Modal form ───────────────────────────────────────────────────────────────

function openAdd() {
  document.getElementById('modal-title').textContent = 'Nouvelle candidature';
  document.getElementById('application-form').reset();
  document.getElementById('form-id').value = '';
  document.getElementById('form-date').value = todayISO();
  document.getElementById('form-error').classList.add('hidden');
  document.getElementById('modal-form').classList.remove('hidden');
  document.getElementById('form-company').focus();
}

function openEdit(id) {
  const apps = loadApplications();
  const app = apps.find(a => a.id === id);
  if (!app) return;

  document.getElementById('modal-title').textContent = 'Modifier la candidature';
  document.getElementById('form-id').value = app.id;
  document.getElementById('form-company').value = app.company;
  document.getElementById('form-contact').value = app.contact || '';
  document.getElementById('form-date').value = app.date;
  document.getElementById('form-salary-min').value = app.salaryMin || '';
  document.getElementById('form-salary-max').value = app.salaryMax || '';
  document.getElementById('form-status').value = app.status || 'sent';
  document.getElementById('form-comment').value = app.comment || '';
  document.getElementById('form-error').classList.add('hidden');
  document.getElementById('modal-form').classList.remove('hidden');
  document.getElementById('form-company').focus();
}

function closeForm() {
  document.getElementById('modal-form').classList.add('hidden');
}

function handleFormSubmit(e) {
  e.preventDefault();

  const company = document.getElementById('form-company').value.trim();
  const date    = document.getElementById('form-date').value;
  const errorEl = document.getElementById('form-error');

  if (!company || !date) {
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');

  const app = {
    id:        document.getElementById('form-id').value || generateId(),
    company,
    contact:   document.getElementById('form-contact').value.trim(),
    date,
    salaryMin: document.getElementById('form-salary-min').value || '',
    salaryMax: document.getElementById('form-salary-max').value || '',
    status:    document.getElementById('form-status').value,
    comment:   document.getElementById('form-comment').value.trim(),
  };

  const apps = loadApplications();
  const idx = apps.findIndex(a => a.id === app.id);

  if (idx >= 0) {
    app.followups = apps[idx].followups || [];
    apps[idx] = app;
  } else {
    app.followups = [];
    apps.unshift(app);
  }

  saveApplications(apps);
  closeForm();
  render();
}

// ── Delete modal ─────────────────────────────────────────────────────────────

let pendingDeleteId = null;

function openDelete(id) {
  const apps = loadApplications();
  const app = apps.find(a => a.id === id);
  if (!app) return;
  pendingDeleteId = id;
  document.getElementById('delete-company-name').textContent = app.company;
  document.getElementById('modal-delete').classList.remove('hidden');
}

function closeDelete() {
  pendingDeleteId = null;
  document.getElementById('modal-delete').classList.add('hidden');
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  const apps = loadApplications().filter(a => a.id !== pendingDeleteId);
  saveApplications(apps);
  if (selectedAppId === pendingDeleteId) selectedAppId = null;
  closeDelete();
  render();
}

// ── Suivi (followups) ─────────────────────────────────────────────────────────

const FOLLOWUP_TYPE_LABELS = {
  email:     'Email',
  call:      'Appel',
  relance:   'Relance',
  interview: 'Entretien',
  note:      'Note',
  other:     'Autre',
};

function getApp(id) {
  return loadApplications().find(a => a.id === id);
}

function selectApp(id) {
  selectedAppId = selectedAppId === id ? null : id;
  closeFollowupFormPanel();
  render();
}

function renderFollowupPanel() {
  const empty = document.getElementById('followup-empty');
  const body = document.getElementById('followup-body');
  const title = document.getElementById('followup-title');
  const subtitle = document.getElementById('followup-subtitle');

  const app = selectedAppId ? getApp(selectedAppId) : null;

  if (!app) {
    selectedAppId = null;
    empty.classList.remove('hidden');
    body.classList.add('hidden');
    title.textContent = 'Suivi';
    subtitle.textContent = 'Sélectionnez une candidature';
    return;
  }

  empty.classList.add('hidden');
  body.classList.remove('hidden');
  title.textContent = app.company;
  subtitle.textContent = 'Suivi de la candidature';

  const followups = (app.followups || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const list = document.getElementById('followup-list');

  if (followups.length === 0) {
    list.innerHTML = '<li class="followup-empty-item">Aucun suivi enregistré pour cette candidature.</li>';
    return;
  }

  list.innerHTML = followups.map(f => `
    <li class="followup-item" data-id="${f.id}">
      <div class="followup-item-header">
        <span class="followup-type-badge">${FOLLOWUP_TYPE_LABELS[f.type] || f.type}</span>
        <span class="followup-date">${formatDate(f.date)}</span>
        <div class="actions">
          <button class="btn btn-icon" onclick="openEditFollowup('${f.id}')" title="Modifier">✏️</button>
          <button class="btn btn-icon btn-danger" onclick="deleteFollowup('${f.id}')" title="Supprimer">🗑️</button>
        </div>
      </div>
      ${f.note ? `<p class="followup-note">${escHtml(f.note)}</p>` : ''}
    </li>`).join('');
}

function openAddFollowup() {
  if (!selectedAppId) return;
  document.getElementById('followup-form-id').value = '';
  document.getElementById('followup-form-date').value = todayISO();
  document.getElementById('followup-form-type').value = 'note';
  document.getElementById('followup-form-note').value = '';
  document.getElementById('followup-form').classList.remove('hidden');
  document.getElementById('followup-form-date').focus();
}

function openEditFollowup(id) {
  if (!selectedAppId) return;
  const app = getApp(selectedAppId);
  if (!app) return;
  const followup = (app.followups || []).find(f => f.id === id);
  if (!followup) return;

  document.getElementById('followup-form-id').value = followup.id;
  document.getElementById('followup-form-date').value = followup.date;
  document.getElementById('followup-form-type').value = followup.type;
  document.getElementById('followup-form-note').value = followup.note || '';
  document.getElementById('followup-form').classList.remove('hidden');
  document.getElementById('followup-form-date').focus();
}

function closeFollowupFormPanel() {
  const form = document.getElementById('followup-form');
  form.reset();
  form.classList.add('hidden');
}

function handleFollowupFormSubmit(e) {
  e.preventDefault();
  if (!selectedAppId) return;

  const date = document.getElementById('followup-form-date').value;
  if (!date) return;

  const followup = {
    id:   document.getElementById('followup-form-id').value || generateId(),
    date,
    type: document.getElementById('followup-form-type').value,
    note: document.getElementById('followup-form-note').value.trim(),
  };

  const apps = loadApplications();
  const app = apps.find(a => a.id === selectedAppId);
  if (!app) return;

  app.followups = app.followups || [];
  const idx = app.followups.findIndex(f => f.id === followup.id);
  if (idx >= 0) {
    app.followups[idx] = followup;
  } else {
    app.followups.push(followup);
  }

  saveApplications(apps);
  closeFollowupFormPanel();
  renderFollowupPanel();
}

function deleteFollowup(id) {
  if (!selectedAppId) return;
  if (!confirm('Supprimer ce suivi ?')) return;

  const apps = loadApplications();
  const app = apps.find(a => a.id === selectedAppId);
  if (!app) return;

  app.followups = (app.followups || []).filter(f => f.id !== id);
  saveApplications(apps);
  renderFollowupPanel();
}

// ── CSV export / import ───────────────────────────────────────────────────────

const CSV_FIELDS = ['id', 'company', 'contact', 'date', 'salaryMin', 'salaryMax', 'status', 'comment'];

function csvEscape(value) {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportCSV() {
  const apps = loadApplications();
  const lines = [CSV_FIELDS.join(',')];

  for (const app of apps) {
    lines.push(CSV_FIELDS.map(field => csvEscape(app[field])).join(','));
  }

  const csvContent = '﻿' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `searchjobus_candidatures_${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Parses raw CSV text (handles quoted fields with embedded commas/newlines/escaped quotes)
// into an array of rows, each row an array of string cells.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // ignored, newline is handled on '\n'
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

function importCSV(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const text = String(e.target.result).replace(/^﻿/, '');
    const rows = parseCSV(text);

    if (rows.length < 2) {
      alert('Le fichier CSV ne contient aucune candidature à importer.');
      return;
    }

    const header = rows[0].map(h => h.trim().toLowerCase());
    const colIndex = {};
    CSV_FIELDS.forEach(field => {
      colIndex[field] = header.indexOf(field.toLowerCase());
    });

    if (colIndex.company === -1 || colIndex.date === -1) {
      alert('Le fichier CSV doit contenir au minimum les colonnes "company" et "date".');
      return;
    }

    const apps = loadApplications();
    let imported = 0;
    let skipped = 0;

    for (const row of rows.slice(1)) {
      const company = (row[colIndex.company] || '').trim();
      const date = (row[colIndex.date] || '').trim();

      if (!company || !date) {
        skipped++;
        continue;
      }

      const rawId = colIndex.id !== -1 ? (row[colIndex.id] || '').trim() : '';
      const rawStatus = colIndex.status !== -1 ? (row[colIndex.status] || '').trim() : '';

      const app = {
        id: rawId || generateId(),
        company,
        contact: colIndex.contact !== -1 ? (row[colIndex.contact] || '').trim() : '',
        date,
        salaryMin: colIndex.salaryMin !== -1 ? (row[colIndex.salaryMin] || '').trim() : '',
        salaryMax: colIndex.salaryMax !== -1 ? (row[colIndex.salaryMax] || '').trim() : '',
        status: STATUS_LABELS[rawStatus] ? rawStatus : 'sent',
        comment: colIndex.comment !== -1 ? (row[colIndex.comment] || '').trim() : '',
      };

      const existingIdx = apps.findIndex(a => a.id === app.id);
      if (existingIdx >= 0) {
        apps[existingIdx] = app;
      } else {
        apps.push(app);
      }
      imported++;
    }

    saveApplications(apps);
    render();

    const skippedMsg = skipped > 0 ? ` (${skipped} ligne(s) ignorée(s), champs obligatoires manquants)` : '';
    alert(`${imported} candidature(s) importée(s)${skippedMsg}.`);
  };

  reader.onerror = () => {
    alert("Erreur lors de la lecture du fichier CSV.");
  };

  reader.readAsText(file, 'UTF-8');
}

// ── Suivi CSV export / import ─────────────────────────────────────────────────

const FOLLOWUP_CSV_FIELDS = ['id', 'applicationId', 'date', 'type', 'note'];

function exportFollowupsCSV() {
  const apps = loadApplications();
  const lines = [FOLLOWUP_CSV_FIELDS.join(',')];

  for (const app of apps) {
    for (const f of app.followups || []) {
      const row = { ...f, applicationId: app.id };
      lines.push(FOLLOWUP_CSV_FIELDS.map(field => csvEscape(row[field])).join(','));
    }
  }

  const csvContent = '﻿' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `searchjobus_suivis_${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importFollowupsCSV(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const text = String(e.target.result).replace(/^﻿/, '');
    const rows = parseCSV(text);

    if (rows.length < 2) {
      alert('Le fichier CSV ne contient aucun suivi à importer.');
      return;
    }

    const header = rows[0].map(h => h.trim().toLowerCase());
    const colIndex = {};
    FOLLOWUP_CSV_FIELDS.forEach(field => {
      colIndex[field] = header.indexOf(field.toLowerCase());
    });

    if (colIndex.applicationId === -1 || colIndex.date === -1) {
      alert('Le fichier CSV doit contenir au minimum les colonnes "applicationId" et "date".');
      return;
    }

    const apps = loadApplications();
    const appsById = new Map(apps.map(a => [a.id, a]));
    let imported = 0;
    let skipped = 0;

    for (const row of rows.slice(1)) {
      const applicationId = (row[colIndex.applicationId] || '').trim();
      const date = (row[colIndex.date] || '').trim();
      const app = appsById.get(applicationId);

      if (!app || !date) {
        skipped++;
        continue;
      }

      const rawId = colIndex.id !== -1 ? (row[colIndex.id] || '').trim() : '';
      const rawType = colIndex.type !== -1 ? (row[colIndex.type] || '').trim() : '';

      const followup = {
        id:   rawId || generateId(),
        date,
        type: FOLLOWUP_TYPE_LABELS[rawType] ? rawType : 'note',
        note: colIndex.note !== -1 ? (row[colIndex.note] || '').trim() : '',
      };

      app.followups = app.followups || [];
      const idx = app.followups.findIndex(f => f.id === followup.id);
      if (idx >= 0) {
        app.followups[idx] = followup;
      } else {
        app.followups.push(followup);
      }
      imported++;
    }

    saveApplications(apps);
    render();

    const skippedMsg = skipped > 0
      ? ` (${skipped} ligne(s) ignorée(s) : candidature introuvable ou date manquante)`
      : '';
    alert(`${imported} suivi(s) importé(s)${skippedMsg}.`);
  };

  reader.onerror = () => {
    alert("Erreur lors de la lecture du fichier CSV.");
  };

  reader.readAsText(file, 'UTF-8');
}

// ── Event listeners ──────────────────────────────────────────────────────────

document.getElementById('btn-add').addEventListener('click', openAdd);
document.getElementById('btn-cancel').addEventListener('click', closeForm);
document.getElementById('modal-overlay-form').addEventListener('click', closeForm);

document.getElementById('application-form').addEventListener('submit', handleFormSubmit);

document.getElementById('btn-cancel-delete').addEventListener('click', closeDelete);
document.getElementById('btn-confirm-delete').addEventListener('click', confirmDelete);
document.getElementById('modal-overlay-delete').addEventListener('click', closeDelete);

document.getElementById('btn-export').addEventListener('click', exportCSV);

document.getElementById('input-import-csv').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) importCSV(file);
  e.target.value = '';
});

document.getElementById('btn-add-followup').addEventListener('click', openAddFollowup);
document.getElementById('btn-cancel-followup').addEventListener('click', closeFollowupFormPanel);
document.getElementById('followup-form').addEventListener('submit', handleFollowupFormSubmit);

document.getElementById('btn-export-followups').addEventListener('click', exportFollowupsCSV);

document.getElementById('input-import-followups-csv').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) importFollowupsCSV(file);
  e.target.value = '';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeForm();
    closeDelete();
    closeFollowupFormPanel();
  }
});

// ── Init ─────────────────────────────────────────────────────────────────────

render();
