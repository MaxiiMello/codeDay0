// App de gestión de ganado con persistencia en localStorage
// Estructura de datos:
// Cow {
//   id: string,
//   nacimiento: 'YYYY-MM-DD',
//   raza: string,
//   pesos: Array<{ fecha: 'YYYY-MM-DD', kg: number }>,
//   enfermedades: Array<{
//     fecha: 'YYYY-MM-DD',
//     diagnostico: string,
//     tratamiento: { nombre: string, dosis: string, inicio: 'YYYY-MM-DD', fin: 'YYYY-MM-DD' }
//   }>,
//   crias: Array<{ id: string, nacimiento: 'YYYY-MM-DD' }>
// }

const STORE_KEY = 'cows';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let cows = [];
let editingCowId = null; // null = creando; string = editando
let selectedCowId = null; // para la vista de detalle

// Utilidades
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

// Render principal
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
    const pesoActual = c.pesos.length ? c.pesos[c.pesos.length - 1].kg : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(c.id)}</td>
      <td>${escapeHtml(c.nacimiento)}</td>
      <td>${escapeHtml(c.raza)}</td>
      <td>${pesoActual}</td>
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
}

function fillForm(cow) {
  editingCowId = cow.id;
  $('#formTitle').textContent = `Editar vaca (${cow.id})`;
  $('#cowId').value = cow.id;
  $('#cowId').disabled = true; // ID no se cambia
  $('#cowBirth').value = cow.nacimiento;
  $('#cowBreed').value = cow.raza;
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

  // Pesos
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

  // Enfermedades
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

  // Crías
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
}

function openDetail(id) {
  selectedCowId = id;
  renderDetail(id);
  setDetailVisible(true);
  // scroll to detail
  $('#detailSection').scrollIntoView({behavior:'smooth', block:'start'});
}

// Eventos principales
function setupEvents() {
  // Crear / actualizar vaca
  $('#cowForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#cowId').value.trim();
    const nacimiento = $('#cowBirth').value;
    const raza = $('#cowBreed').value.trim();

    if (!id || !nacimiento || !raza) {
      alert('Completa todos los campos.');
      return;
    }
    if (!editingCowId) {
      // Crear
      if (byId(id)) {
        alert('Ya existe una vaca con ese ID.');
        return;
      }
      const cow = {
        id,
        nacimiento,
        raza,
        pesos: [],
        enfermedades: [],
        crias: []
      };
      cows.push(cow);
    } else {
      // Editar
      const cow = byId(editingCowId);
      if (!cow) return;
      cow.nacimiento = nacimiento;
      cow.raza = raza;
    }
    save();
    renderList();
    resetForm();
  });

  $('#resetFormBtn').addEventListener('click', () => resetForm());

  // Acciones en la tabla de vacas
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

  // Buscar
  $('#searchInput').addEventListener('input', () => renderList());

  // Volver
  $('#backToListBtn').addEventListener('click', () => {
    setDetailVisible(false);
    selectedCowId = null;
  });

  // Pesos
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

  // Enfermedades
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

  // Crías
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

  // Exportar / Importar / Borrar todo
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
      // Validación mínima
      for (const c of data) {
        if (typeof c.id !== 'string') throw new Error('Vaca sin id válido');
        c.pesos = Array.isArray(c.pesos) ? c.pesos : [];
        c.enfermedades = Array.isArray(c.enfermedades) ? c.enfermedades : [];
        c.crias = Array.isArray(c.crias) ? c.crias : [];
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

// Seguridad básica para HTML
function escapeHtml(s) {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}
function encodeAttr(s) {
  // evita inyección en atributos data-*
  return String(s).replaceAll('"','&quot;').replaceAll("'","&#39;");
}

// Init
function init() {
  load();
  setupEvents();
  renderList();
  setDetailVisible(false);
}
document.addEventListener('DOMContentLoaded', init);