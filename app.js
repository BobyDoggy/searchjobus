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
    return;
  }

  emptyState.classList.add('hidden');

  tbody.innerHTML = apps.map(app => {
    const followup = needsFollowup(app);
    const days = daysSince(app.date);
    const rowClass = followup ? ' row-followup' : '';

    const dateCellContent = followup
      ? `<span>${formatDate(app.date)}</span>
         <span class="followup-badge" title="${days} jours sans réponse — pensez à relancer !">⏰ Relancer</span>`
      : `<span>${formatDate(app.date)}</span>`;

    return `
      <tr class="${rowClass}" data-id="${app.id}">
        <td><strong>${escHtml(app.company)}</strong></td>
        <td>${escHtml(app.contact || '—')}</td>
        <td><div class="date-cell">${dateCellContent}</div></td>
        <td>${formatSalary(app)}</td>
        <td>${statusBadge(app.status || 'sent')}</td>
        <td class="td-comment">${escHtml(app.comment || '')}</td>
        <td>
          <div class="actions">
            <button class="btn btn-icon" onclick="openEdit('${app.id}')" title="Modifier">✏️</button>
            <button class="btn btn-icon btn-danger" onclick="openDelete('${app.id}')" title="Supprimer">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');
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
    apps[idx] = app;
  } else {
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
  closeDelete();
  render();
}

// ── Event listeners ──────────────────────────────────────────────────────────

document.getElementById('btn-add').addEventListener('click', openAdd);
document.getElementById('btn-cancel').addEventListener('click', closeForm);
document.getElementById('modal-overlay-form').addEventListener('click', closeForm);

document.getElementById('application-form').addEventListener('submit', handleFormSubmit);

document.getElementById('btn-cancel-delete').addEventListener('click', closeDelete);
document.getElementById('btn-confirm-delete').addEventListener('click', confirmDelete);
document.getElementById('modal-overlay-delete').addEventListener('click', closeDelete);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeForm();
    closeDelete();
  }
});

// ── Init ─────────────────────────────────────────────────────────────────────

render();
