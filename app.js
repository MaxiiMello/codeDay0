const STORE_KEY = 'cows';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let cows = [];
let editingCowId = null;
let selectedCowId = null;

const toNumber = (v) => Number.parseFloat(v);
const fmtDate = (s) => s || '';
const byId = (id) => cows.find(c => c.id === id);
const save = () => localStorage.setItem(STORE_KEY, JSON.stringify(cows));
const load = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    cows = raw ? JSON.parse(raw) : [];
  } catch {
    cows = [];
  }
};

function renderList() {
  const tbody = $('#cowTableBody');
  const term = $('#searchInput').value.trim().toLowerCase();

  const filtered = cows
    .filter(c => {
      if (!term) return true;
      return c.id.toLowerCase().includes(term) || c.raza.toLowerCase().includes(term);
    })
    .sort((a,b) => a.id.localeCompare(b.id));

  $('#cowCount').textContent = `${filtered.length} vaca(s)`;

  tbody.innerHTML = '';
  for (const c of filtered) {
    const sortedW = (c.pesos || []).slice().sort((a,b)=> a.fecha.localeCompare(b.fecha));
    const lastW = sortedW.length ? sortedW[sortedW.length - 1].kg : null;
    const pesoActual = lastW ?? '-';
    const entrada = typeof c.pesoIngreso === 'number' ? c.pesoIngreso : null;
    const ganancia = lastW != null && entrada != null ? (lastW - entrada).toFixed(2) : '-';
    const vacCount = (c.vacunas?.length || 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(c.id)}</td>
      <td>${escapeHtml(c.nacimiento)}</td>
      <td>${escapeHtml(c.raza)}</td>
      <td>${entrada != null ? entrada : '-'}</td>
      <td>${escapeHtml(c.categoria || '-')}</td>
      <td>${pesoActual}</td>
      <td>${ganancia}</td>
      <td><span class="badge">${vacCount}</span></td>
      <td><span class="badge">${c.crias.length}</span></td>
      <td>
        <button data-action="view" data-id="${encodeAttr(c.id)}">Ver</button>
        <button data-action="edit" data-id="${encodeAttr(c.id)}">Editar</button>
        <button class="danger" data-action="delete" data-id="${encodeAttr(c.id)}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function resetForm() {
  editingCowId = null;
  $('#formTitle').textContent = 'Registrar vaca';
  $('#cowId').value = '';
  $('#cowId').disabled = false;
  $('#cowBirth').value = '';
  $('#cowBreed').value = '';
  $('#cowEntryWeight').value = '';
  $('#cowCategory').value = '';
}

function fillForm(cow) {
  editingCowId = cow.id;
  $('#formTitle').textContent = `Editar vaca (${cow.id})`;
  $('#cowId').value = cow.id;
  $('#cowId').disabled = true;
  $('#cowBirth').value = cow.nacimiento;
  $('#cowBreed').value = cow.raza;
  $('#cowEntryWeight').value = cow.pesoIngreso ?? '';
  $('#cowCategory').value = cow.categoria || '';
}

function setDetailVisible(visible) {
  $('#detailSection').classList.toggle('hidden', !visible);
}

function renderDetail(id) {
  const cow = byId(id);
  if (!cow) return;

  $('#detailCowId').textContent = cow.id;
  $('#detailBirth').textContent = cow.nacimiento;
  $('#detailBreed').textContent = cow.raza;
  $('#detailEntryWeight').textContent = typeof cow.pesoIngreso === 'number' ? cow.pesoIngreso : '-';
  $('#detailCategory').textContent = cow.categoria || '-';

  const sortedW = (cow.pesos || []).slice().sort((a,b)=> a.fecha.localeCompare(b.fecha));
  const firstW = sortedW.length ? sortedW[0] : null;
  const lastW = sortedW.length ? sortedW[sortedW.length - 1] : null;
  const gain = lastW && typeof cow.pesoIngreso === 'number' ? (lastW.kg - cow.pesoIngreso) : null;
  $('#detailGain').textContent = gain != null ? gain.toFixed(2) : '-';
  let gmd = '-';
  if (sortedW.length >= 2) {
    const d1 = new Date(sortedW[0].fecha);
    const d2 = new Date(sortedW[sortedW.length - 1].fecha);
    const days = Math.max(0, Math.round((d2 - d1) / 86400000));
    if (days > 0) gmd = ((sortedW[sortedW.length - 1].kg - sortedW[0].kg) / days).toFixed(3);
  }
  $('#detailGmd').textContent = gmd;

  const wtbody = $('#weightTableBody');
  wtbody.innerHTML = '';
  cow.pesos
    .slice()
    .sort((a,b)=> a.fecha.localeCompare(b.fecha))
    .forEach((w, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(w.fecha)}</td>
        <td>${w.kg}</td>
        <td><button class="danger" data-action="del-weight" data-id="${encodeAttr(cow.id)}" data-index="${idx}">Quitar</button></td>
      `;
      wtbody.appendChild(tr);
    });

  const itbody = $('#illnessTableBody');
  itbody.innerHTML = '';
  cow.enfermedades
    .slice()
    .sort((a,b)=> a.fecha.localeCompare(b.fecha))
    .forEach((e, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(e.fecha)}</td>
        <td>${escapeHtml(e.diagnostico)}</td>
        <td>${escapeHtml(e.tratamiento.nombre)}</td>
        <td>${escapeHtml(e.tratamiento.dosis)}</td>
        <td>${escapeHtml(e.tratamiento.inicio)}</td>
        <td>${escapeHtml(e.tratamiento.fin)}</td>
        <td><button class="danger" data-action="del-illness" data-id="${encodeAttr(cow.id)}" data-index="${idx}">Quitar</button></td>
      `;
      itbody.appendChild(tr);
    });

  const otbody = $('#offspringTableBody');
  otbody.innerHTML = '';
  cow.crias
    .slice()
    .sort((a,b)=> a.nacimiento.localeCompare(b.nacimiento))
    .forEach((o, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(o.id)}</td>
        <td>${escapeHtml(o.nacimiento)}</td>
        <td><button class="danger" data-action="del-offspring" data-id="${encodeAttr(cow.id)}" data-index="${idx}">Quitar</button></td>
      `;
      otbody.appendChild(tr);
    });

  const vtbody = $('#vaccineTableBody');
  vtbody.innerHTML = '';
  (cow.vacunas || [])
    .slice()
    .sort((a,b)=> a.fecha.localeCompare(b.fecha))
    .forEach((v, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(v.fecha)}</td>
        <td>${escapeHtml(v.nombre)}</td>
        <td>${escapeHtml(v.lote || '')}</td>
        <td>${escapeHtml(v.dosis || '')}</td>
        <td>${typeof v.retiro === 'number' ? v.retiro : (v.retiro || '')}</td>
        <td><button class="danger" data-action="del-vaccine" data-id="${encodeAttr(cow.id)}" data-index="${idx}">Quitar</button></td>
      `;
      vtbody.appendChild(tr);
    });
}

function openDetail(id) {
  selectedCowId = id;
  renderDetail(id);
  setDetailVisible(true);
  $('#detailSection').scrollIntoView({behavior:'smooth', block:'start'});
}

function setupEvents() {
  $('#cowForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#cowId').value.trim();
    const nacimiento = $('#cowBirth').value;
    const raza = $('#cowBreed').value.trim();
    const pesoIngresoVal = $('#cowEntryWeight').value;
    const categoria = $('#cowCategory').value;
    const pesoIngreso = toNumber(pesoIngresoVal);

    if (!id || !nacimiento || !raza || !categoria || Number.isNaN(pesoIngreso) || pesoIngreso < 0) {
      alert('Completa todos los campos (peso de ingreso debe ser válido).');
      return;
    }
    if (!editingCowId) {
      if (byId(id)) {
        alert('Ya existe una vaca con ese ID.');
        return;
      }
      const cow = {
        id,
        nacimiento,
        raza,
        pesoIngreso,
        categoria,
        pesos: [],
        enfermedades: [],
        crias: [],
        vacunas: []
      };
      cows.push(cow);
    } else {
      const cow = byId(editingCowId);
      if (!cow) return;
      cow.nacimiento = nacimiento;
      cow.raza = raza;
      cow.pesoIngreso = pesoIngreso;
      cow.categoria = categoria;
    }
    save();
    renderList();
    resetForm();
  });

  $('#resetFormBtn').addEventListener('click', () => resetForm());

  $('#cowTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'edit') {
      const cow = byId(id);
      if (cow) fillForm(cow);
      window.scrollTo({top:0, behavior:'smooth'});
    } else if (action === 'delete') {
      if (confirm(`¿Eliminar vaca ${id}?`)) {
        cows = cows.filter(c => c.id !== id);
        save();
        renderList();
        if (selectedCowId === id) {
          setDetailVisible(false);
          selectedCowId = null;
        }
      }
    } else if (action === 'view') {
      openDetail(id);
    }
  });

  $('#searchInput').addEventListener('input', () => renderList());

  $('#backToListBtn').addEventListener('click', () => {
    setDetailVisible(false);
    selectedCowId = null;
  });

  $('#weightForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedCowId) return;
    const fecha = $('#weightDate').value;
    const kgVal = $('#weightKg').value;
    const kg = toNumber(kgVal);

    if (!fecha || Number.isNaN(kg) || kg < 0) {
      alert('Ingresa fecha y peso válidos.');
      return;
    }
    const cow = byId(selectedCowId);
    cow.pesos.push({ fecha, kg: Number(kg.toFixed(2)) });
    cow.pesos.sort((a,b)=> a.fecha.localeCompare(b.fecha));
    save();
    renderDetail(selectedCowId);
    renderList();
    $('#weightForm').reset();
  });

  $('#weightTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action !== 'del-weight') return;
    const id = btn.dataset.id;
    const index = Number(btn.dataset.index);
    const cow = byId(id);
    if (!cow) return;
    cow.pesos.splice(index,1);
    save();
    renderDetail(id);
    renderList();
  });

  $('#illnessForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedCowId) return;
    const diagnostico = $('#illnessDiag').value.trim();
    const fecha = $('#illnessDate').value;
    const nombre = $('#treatName').value.trim();
    const dosis = $('#treatDose').value.trim();
    const inicio = $('#treatStart').value;
    const fin = $('#treatEnd').value;

    if (!diagnostico || !fecha || !nombre || !dosis || !inicio || !fin) {
      alert('Completa todos los campos del tratamiento.');
      return;
    }
    if (fin < inicio) {
      alert('La fecha fin no puede ser anterior al inicio.');
      return;
    }

    const cow = byId(selectedCowId);
    cow.enfermedades.push({
      fecha,
      diagnostico,
      tratamiento: { nombre, dosis, inicio, fin }
    });
    cow.enfermedades.sort((a,b)=> a.fecha.localeCompare(b.fecha));
    save();
    renderDetail(selectedCowId);
    $('#illnessForm').reset();
  });

  $('#illnessTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action !== 'del-illness') return;
    const id = btn.dataset.id;
    const index = Number(btn.dataset.index);
    const cow = byId(id);
    if (!cow) return;
    cow.enfermedades.splice(index,1);
    save();
    renderDetail(id);
  });

  $('#offspringForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedCowId) return;
    const oid = $('#offspringId').value.trim();
    const nacimiento = $('#offspringBirth').value;
    if (!oid || !nacimiento) {
      alert('Completa ID y fecha de nacimiento de la cría.');
      return;
    }
    const cow = byId(selectedCowId);
    cow.crias.push({ id: oid, nacimiento });
    cow.crias.sort((a,b)=> a.nacimiento.localeCompare(b.nacimiento));
    save();
    renderDetail(selectedCowId);
    renderList();
    $('#offspringForm').reset();
  });

  $('#offspringTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action !== 'del-offspring') return;
    const id = btn.dataset.id;
    const index = Number(btn.dataset.index);
    const cow = byId(id);
    if (!cow) return;
    cow.crias.splice(index,1);
    save();
    renderDetail(id);
  });

  $('#vaccineForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedCowId) return;
    const nombre = $('#vaccineName').value.trim();
    const fecha = $('#vaccineDate').value;
    const lote = $('#vaccineLot').value.trim();
    const dosis = $('#vaccineDose').value.trim();
    const retiroRaw = $('#vaccineWithdrawal').value;
    const retiro = retiroRaw === '' ? '' : Number.parseInt(retiroRaw, 10);

    if (!nombre || !fecha || !lote || !dosis) {
      alert('Completa vacuna, fecha, lote y dosis.');
      return;
    }
    if (retiro !== '' && (Number.isNaN(retiro) || retiro < 0)) {
      alert('El retiro debe ser un número de días válido o dejarlo vacío.');
      return;
    }

    const cow = byId(selectedCowId);
    cow.vacunas = Array.isArray(cow.vacunas) ? cow.vacunas : [];
    cow.vacunas.push({ nombre, fecha, lote, dosis, retiro });
    cow.vacunas.sort((a,b)=> a.fecha.localeCompare(b.fecha));
    save();
    renderDetail(selectedCowId);
    renderList();
    $('#vaccineForm').reset();
  });

  $('#vaccineTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action !== 'del-vaccine') return;
    const id = btn.dataset.id;
    const index = Number(btn.dataset.index);
    const cow = byId(id);
    if (!cow) return;
    cow.vacunas.splice(index,1);
    save();
    renderDetail(id);
    renderList();
  });

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(cows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `ganado-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('#importInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Formato inválido: se esperaba un arreglo de vacas');
      for (const c of data) {
        if (typeof c.id !== 'string') throw new Error('Vaca sin id válido');
        c.pesos = Array.isArray(c.pesos) ? c.pesos : [];
        c.enfermedades = Array.isArray(c.enfermedades) ? c.enfermedades : [];
        c.crias = Array.isArray(c.crias) ? c.crias : [];
        c.vacunas = Array.isArray(c.vacunas) ? c.vacunas : [];
        c.pesoIngreso = typeof c.pesoIngreso === 'number' ? c.pesoIngreso : 0;
        c.categoria = typeof c.categoria === 'string' ? c.categoria : '';
      }
      cows = data;
      save();
      renderList();
      setDetailVisible(false);
      alert('Datos importados correctamente.');
    } catch (err) {
      console.error(err);
      alert('No se pudo importar el archivo. Verifica el formato JSON.');
    } finally {
      e.target.value = '';
    }
  });

  $('#clearAllBtn').addEventListener('click', () => {
    if (confirm('¿Borrar todas las vacas? Esta acción no se puede deshacer.')) {
      cows = [];
      save();
      renderList();
      setDetailVisible(false);
    }
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}
function encodeAttr(s) {
  return String(s).replaceAll('"','&quot;').replaceAll("'","&#39;");
}

function init() {
  load();
  for (const c of cows) {
    c.vacunas = Array.isArray(c.vacunas) ? c.vacunas : [];
    if (typeof c.pesoIngreso !== 'number') c.pesoIngreso = 0;
    if (typeof c.categoria !== 'string') c.categoria = '';
    c.pesos = Array.isArray(c.pesos) ? c.pesos : [];
    c.enfermedades = Array.isArray(c.enfermedades) ? c.enfermedades : [];
    c.crias = Array.isArray(c.crias) ? c.crias : [];
  }
  setupEvents();
  renderList();
  setDetailVisible(false);
}
document.addEventListener('DOMContentLoaded', init);