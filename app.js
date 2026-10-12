let datosFiltrados = [...deportistas];
let deportistaSeleccionado = null;
let pdfDoc = null;

function init() {
    populateFilters();
    renderResults();
    setupEventListeners();
    loadPdf();
}

async function loadPdf() {
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdfData = Uint8Array.from(atob(DIPLOMAS_PDF_BASE64), c => c.charCodeAt(0));
    pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
}

function populateFilters() {
    const categorias = [...new Set(deportistas.map(d => d.categoria))].sort();
    const equipos = [...new Set(deportistas.map(d => d.equipo))].sort();

    const selectCategoria = document.getElementById('filterCategoria');
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        selectCategoria.appendChild(option);
    });

    const selectEquipo = document.getElementById('filterEquipo');
    equipos.forEach(eq => {
        const option = document.createElement('option');
        option.value = eq;
        option.textContent = eq;
        selectEquipo.appendChild(option);
    });
}

function setupEventListeners() {
    document.getElementById('filterNombre').addEventListener('input', applyFilters);
    document.getElementById('filterCategoria').addEventListener('change', applyFilters);
    document.getElementById('filterEquipo').addEventListener('change', applyFilters);
    document.getElementById('filterDorsal').addEventListener('input', applyFilters);

    document.getElementById('diplomaModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });
}

function applyFilters() {
    const nombre = document.getElementById('filterNombre').value.toLowerCase();
    const categoria = document.getElementById('filterCategoria').value;
    const equipo = document.getElementById('filterEquipo').value;
    const dorsal = document.getElementById('filterDorsal').value;

    datosFiltrados = deportistas.filter(d => {
        const matchNombre = !nombre || d.nombre.toLowerCase().includes(nombre);
        const matchCategoria = !categoria || d.categoria === categoria;
        const matchEquipo = !equipo || d.equipo === equipo;
        const matchDorsal = !dorsal || d.dorsal.toString() === dorsal;
        return matchNombre && matchCategoria && matchEquipo && matchDorsal;
    });

    renderResults();
}

function clearFilters() {
    document.getElementById('filterNombre').value = '';
    document.getElementById('filterCategoria').value = '';
    document.getElementById('filterEquipo').value = '';
    document.getElementById('filterDorsal').value = '';
    datosFiltrados = [...deportistas];
    renderResults();
}

function renderResults() {
    const grid = document.getElementById('resultsGrid');
    const count = document.getElementById('resultsCount');

    count.textContent = datosFiltrados.length + ' resultado' + (datosFiltrados.length !== 1 ? 's' : '');

    if (datosFiltrados.length === 0) {
        grid.innerHTML = '<div class="no-results" style="grid-column: 1 / -1;"><div class="no-results-icon">&#128269;</div><p>No se encontraron resultados con los filtros seleccionados.</p></div>';
        return;
    }

    grid.innerHTML = datosFiltrados.map(d => {
        const nombreEscapado = d.nombre.replace(/'/g, "\\'");
        return '<div class="athlete-card">' +
            '<div class="card-header">' +
                '<span class="card-position">' + d.puesto + '</span>' +
                '<span class="card-category">' + d.categoria + '</span>' +
            '</div>' +
            '<div class="card-name">' + d.nombre + '</div>' +
            '<div class="card-team">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 21v-6h6v6"></path></svg>' +
                d.equipo +
            '</div>' +
            '<div class="card-details">' +
                '<div class="card-dorsal"><span>Dorsal</span><span>' + d.dorsal + '</span></div>' +
                '<div class="card-time"><span>Tiempo</span><span>' + d.tiempo + '</span></div>' +
            '</div>' +
            '<button class="btn-view" onclick="viewDiploma(' + d.paginaDiploma + ', \'' + nombreEscapado + '\')">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>' +
                'Ver Diploma' +
            '</button>' +
        '</div>';
    }).join('');
}

async function viewDiploma(pagina, nombre) {
    deportistaSeleccionado = { pagina, nombre };
    document.getElementById('modalTitle').textContent = 'Diploma - ' + nombre;
    document.getElementById('diplomaModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    if (!pdfDoc) {
        await loadPdf();
    }

    const page = await pdfDoc.getPage(pagina);
    const canvas = document.getElementById('diplomaCanvas');
    const context = canvas.getContext('2d');
    const containerWidth = canvas.parentElement.clientWidth;
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = (containerWidth - 32) / baseViewport.width;
    const viewport = page.getViewport({ scale: scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport: viewport }).promise;
}

function closeModal() {
    document.getElementById('diplomaModal').classList.remove('active');
    document.body.style.overflow = '';
    deportistaSeleccionado = null;
}

function downloadDiploma() {
    if (!deportistaSeleccionado) return;
    const link = document.createElement('a');
    link.href = 'Diplomas/DIPLOMAS BETULIA.pdf';
    link.download = 'Diploma_' + deportistaSeleccionado.nombre.replace(/\s+/g, '_') + '.pdf';
    link.target = '_blank';
    link.click();
}

function printDiploma() {
    if (!deportistaSeleccionado) return;
    const canvas = document.getElementById('diplomaCanvas');
    const win = window.open('', '_blank');
    win.document.write('<html><head><title>Diploma - ' + deportistaSeleccionado.nombre + '</title><style>body{margin:0;display:flex;justify-content:center;}canvas{max-width:100%;}</style></head><body><img src="' + canvas.toDataURL() + '" style="max-width:100%;" onload="window.print();"></body></html>');
    win.document.close();
}

document.addEventListener('DOMContentLoaded', init);
