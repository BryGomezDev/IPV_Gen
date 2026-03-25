// ===== Utilidades compartidas de IPV_CommandWeb =====

/**
 * Muestra una notificación toast temporal (no bloqueante).
 * @param {string} msg - Mensaje a mostrar.
 * @param {'error'|'success'|'info'} type - Tipo de toast.
 */
function showToast(msg, type = 'error') {
    let container = document.getElementById('_toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = '_toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

/**
 * Descarga el texto del área de salida como fichero .txt.
 * @param {string} text     - Contenido a exportar.
 * @param {string} filename - Nombre del fichero descargado.
 */
function exportTxt(text, filename) {
    if (!text || !text.trim()) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename || 'comandos.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Vincula los botones de atajo de fecha.
 * Los botones deben tener:
 *   data-date-shortcut   (presente, para seleccionarlos)
 *   data-target="id"     (id del <input type="date">)
 *   data-offset="N"      (días a sumar: 0 = hoy, -1 = ayer)
 */
function initDateShortcuts() {
    document.querySelectorAll('[data-date-shortcut]').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetEl = document.getElementById(btn.dataset.target);
            if (!targetEl) return;
            const offset = parseInt(btn.dataset.offset ?? '0', 10);
            const d = new Date();
            d.setDate(d.getDate() + offset);
            targetEl.value = d.toISOString().slice(0, 10);
            targetEl.dispatchEvent(new Event('change'));
        });
    });
}

/**
 * Inicializa la persistencia de la ruta ejecutable en localStorage.
 * @param {HTMLInputElement} exeEl        - Elemento <input> del ejecutable.
 * @param {string}           defaultValue - Valor original/por defecto.
 * @param {string}           storageKey   - Clave en localStorage.
 */
function initExeStorage(exeEl, defaultValue, storageKey) {
    if (!exeEl) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) exeEl.value = saved;
    exeEl.addEventListener('change', () => {
        const val = exeEl.value.trim();
        if (val) localStorage.setItem(storageKey, val);
    });
    const restoreBtn = document.getElementById('btnRestoreExe');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', () => {
            exeEl.value = defaultValue;
            localStorage.removeItem(storageKey);
        });
    }
}

/**
 * Muestra un toast con un botón de acción inline (ej: "Deshacer").
 * @param {string}   msg         - Mensaje a mostrar.
 * @param {string}   actionLabel - Texto del botón de acción.
 * @param {Function} onAction    - Callback al pulsar el botón.
 * @param {number}   timeout     - Milisegundos antes de desaparecer (default 5000).
 */
function showToastWithAction(msg, actionLabel, onAction, timeout = 5000) {
    let container = document.getElementById('_toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = '_toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast info';

    const text = document.createElement('span');
    text.textContent = msg;

    const btn = document.createElement('button');
    btn.className = 'toast-action';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
        onAction();
        toast.remove();
    });

    toast.appendChild(text);
    toast.appendChild(btn);
    container.appendChild(toast);

    const timer = setTimeout(() => toast.remove(), timeout);
    btn.addEventListener('click', () => clearTimeout(timer));
}

/**
 * Auto-guarda el contenido del textarea en localStorage y lo restaura al cargar.
 * Intercepta el setter de .value para persistir cambios automáticamente.
 * @param {HTMLTextAreaElement} outEl      - Textarea de salida.
 * @param {string}              storageKey - Clave en localStorage.
 */
function initOutputPersistence(outEl, storageKey) {
    if (!outEl) return;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
        const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        proto.set.call(outEl, saved);
    }

    const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    let _busy = false;
    Object.defineProperty(outEl, 'value', {
        get() { return desc.get.call(this); },
        set(v) {
            desc.set.call(this, v);
            if (_busy) return;
            _busy = true;
            try {
                if (v) localStorage.setItem(storageKey, v);
                else   localStorage.removeItem(storageKey);
            } finally { _busy = false; }
        },
        configurable: true
    });
}

/**
 * Reemplaza el listener de "Limpiar" con versión que muestra undo-toast.
 * @param {HTMLElement}         btn    - Botón de limpiar.
 * @param {HTMLTextAreaElement} outEl  - Textarea de salida.
 * @param {Function}            [onClear] - Callback adicional tras limpiar (opcional).
 */
function initClearConfirm(btn, outEl, onClear) {
    if (!btn || !outEl) return;
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!outEl.value.trim()) {
            if (onClear) onClear();
            return;
        }
        const backup = outEl.value;
        outEl.value = '';
        if (onClear) onClear();
        showToastWithAction('Output limpiado.', 'Deshacer', () => {
            outEl.value = backup;
        });
    });
}

/**
 * Guarda la herramienta actualmente visitada en localStorage
 * para que el index pueda resaltar la última usada.
 */
function initToolTracking() {
    localStorage.setItem('ipv_last_tool', location.pathname);
}

/**
 * Devuelve un separador de bloque con la hora actual.
 * Reemplaza el \n# ---\n estático para facilitar la navegación del output.
 */
function makeSeparator() {
    const d  = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `\n# --- ${hh}:${mm} ---\n`;
}

/**
 * Guarda un lote de comandos generados en el historial de localStorage.
 * @param {string} text       - Texto del lote a guardar.
 * @param {string} storageKey - Clave de localStorage.
 * @param {number} max        - Máximo de entradas (default 10).
 */
function saveToHistory(text, storageKey, max = 10) {
    if (!text || !text.trim()) return;
    try {
        const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
        history.unshift({ ts: new Date().toISOString(), text });
        localStorage.setItem(storageKey, JSON.stringify(history.slice(0, max)));
    } catch (_) {}
}

/**
 * Actualiza el contador de comandos generados en un elemento span.
 * @param {HTMLElement} el   - Elemento donde mostrar el conteo (puede ser null).
 * @param {string}      text - Texto generado del que contar líneas de comando.
 */
function updateCounter(el, text) {
    if (!el || !text) return;
    const n = text.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;
    el.textContent = n === 1 ? '1 comando' : `${n} comandos`;
}

/**
 * Inicializa el panel de historial de generaciones.
 * Crea dinámicamente un botón "Historial" dentro del contenedor dado.
 * @param {HTMLTextAreaElement} outEl       - Textarea de salida.
 * @param {HTMLElement}         containerEl - Contenedor donde añadir el botón.
 * @param {string}              storageKey  - Clave de localStorage.
 */
function initGenerationHistory(outEl, containerEl, storageKey) {
    if (!outEl || !containerEl) return;

    // Botón dentro del contenedor dado
    const wrapper = document.createElement('span');
    wrapper.className = 'hist-wrapper';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Historial';

    wrapper.appendChild(btn);
    containerEl.appendChild(wrapper);

    // Panel anclado al body para evitar que lo recorte cualquier overflow:hidden padre
    const panel = document.createElement('div');
    panel.className = 'hist-panel';
    document.body.appendChild(panel);

    function positionPanel() {
        const rect    = btn.getBoundingClientRect();
        const panelH  = Math.min(panel.scrollHeight || 300, 300);
        const spaceUp = rect.top;
        // Alineación horizontal: borde derecho del panel con borde derecho del botón
        panel.style.right = (window.innerWidth - rect.right) + 'px';
        panel.style.left  = 'auto';
        // Vertical: mostrar encima si hay espacio, si no debajo
        if (spaceUp >= panelH + 12) {
            panel.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
            panel.style.top    = 'auto';
        } else {
            panel.style.top    = (rect.bottom + 8) + 'px';
            panel.style.bottom = 'auto';
        }
    }

    function renderPanel() {
        let history = [];
        try { history = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (_) {}
        panel.innerHTML = '';

        if (!history.length) {
            const empty = document.createElement('p');
            empty.className = 'hist-empty';
            empty.textContent = 'Sin historial guardado.';
            panel.appendChild(empty);
            return;
        }

        history.forEach((entry, i) => {
            const d     = new Date(entry.ts);
            const label = d.toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const firstCmd = entry.text.split('\n').find(l => l.trim() && !l.startsWith('#')) || '';
            const preview  = firstCmd.replace(/^'|',?$/g, '').slice(0, 68);

            const div  = document.createElement('div');
            div.className = 'hist-entry';

            const info = document.createElement('div');
            info.className = 'hist-info';

            const tsEl = document.createElement('span');
            tsEl.className   = 'hist-ts';
            tsEl.textContent = label;

            const prev = document.createElement('span');
            prev.className   = 'hist-preview';
            prev.textContent = preview + (firstCmd.length > 68 ? '…' : '');

            info.appendChild(tsEl);
            info.appendChild(prev);

            const acts = document.createElement('div');
            acts.className = 'hist-actions';

            const btnAdd = document.createElement('button');
            btnAdd.type        = 'button';
            btnAdd.className   = 'hist-btn-add';
            btnAdd.textContent = 'Añadir';
            btnAdd.title       = 'Añadir este lote al output actual';
            btnAdd.addEventListener('click', () => {
                outEl.value = outEl.value.trim()
                    ? outEl.value + makeSeparator() + entry.text
                    : entry.text;
                closePanel();
            });

            const btnDel = document.createElement('button');
            btnDel.type        = 'button';
            btnDel.className   = 'hist-btn-del';
            btnDel.textContent = '×';
            btnDel.title       = 'Eliminar este registro';
            btnDel.addEventListener('click', (e) => {
                e.stopPropagation();
                try {
                    const arr = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    arr.splice(i, 1);
                    localStorage.setItem(storageKey, JSON.stringify(arr));
                } catch (_) {}
                renderPanel();
            });

            acts.appendChild(btnAdd);
            acts.appendChild(btnDel);
            div.appendChild(info);
            div.appendChild(acts);
            panel.appendChild(div);
        });
    }

    const openPanel = () => {
        renderPanel();
        panel.classList.add('open');
        // Posicionar después de renderizar para tener scrollHeight real
        requestAnimationFrame(positionPanel);
    };
    const closePanel = () => panel.classList.remove('open');

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        panel.classList.contains('open') ? closePanel() : openPanel();
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target) && !panel.contains(e.target)) closePanel();
    });

    window.addEventListener('resize',  () => { if (panel.classList.contains('open')) positionPanel(); });
    window.addEventListener('scroll',  () => { if (panel.classList.contains('open')) positionPanel(); }, { passive: true });
}

/**
 * Inicializa el sistema de presets con nombre por herramienta.
 * Crea una barra compacta (select + cargar/eliminar + campo nombre + guardar).
 * @param {string[]}    ids        - IDs de los elementos a guardar/restaurar (en orden).
 * @param {string}      storageKey - Clave de localStorage.
 * @param {HTMLElement} containerEl - Fieldset donde insertar la barra (tras el legend).
 */
function initPresets(ids, storageKey, containerEl) {
    if (!containerEl) return;

    const bar = document.createElement('div');
    bar.className = 'preset-bar';

    // --- Grupo cargar ---
    const loadGroup = document.createElement('div');
    loadGroup.className = 'preset-group';

    const sel = document.createElement('select');
    sel.className = 'preset-select';

    const btnLoad = document.createElement('button');
    btnLoad.type = 'button';
    btnLoad.className = 'preset-btn';
    btnLoad.textContent = 'Cargar';

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'preset-btn preset-btn-del';
    btnDel.textContent = '×';
    btnDel.title = 'Eliminar preset seleccionado';

    loadGroup.appendChild(sel);
    loadGroup.appendChild(btnLoad);
    loadGroup.appendChild(btnDel);

    // --- Grupo guardar ---
    const saveGroup = document.createElement('div');
    saveGroup.className = 'preset-group';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Nombre…';
    nameInput.className = 'preset-name';
    nameInput.maxLength = 40;

    const btnSave = document.createElement('button');
    btnSave.type = 'button';
    btnSave.className = 'preset-btn preset-btn-save';
    btnSave.textContent = 'Guardar';

    saveGroup.appendChild(nameInput);
    saveGroup.appendChild(btnSave);

    bar.appendChild(loadGroup);
    bar.appendChild(saveGroup);

    // Insertar tras el <legend> del fieldset, o al principio si no hay
    const legend = containerEl.querySelector(':scope > legend');
    if (legend) legend.insertAdjacentElement('afterend', bar);
    else containerEl.insertAdjacentElement('afterbegin', bar);

    // --- Helpers ---
    function getPresets() {
        try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (_) { return []; }
    }
    function savePresets(list) {
        try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch (_) {}
    }

    function renderSelect() {
        const list = getPresets();
        const prev = sel.value;
        sel.innerHTML = '';

        const ph = document.createElement('option');
        ph.value    = '';
        ph.disabled = true;
        ph.selected = true;
        ph.textContent = list.length ? '— Presets guardados —' : '— Sin presets —';
        sel.appendChild(ph);

        list.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = p.name;
            sel.appendChild(opt);
        });

        if (prev && sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
        btnLoad.disabled = !list.length;
        btnDel.disabled  = !list.length;
    }

    // --- Listeners ---
    btnLoad.addEventListener('click', () => {
        const idx = parseInt(sel.value, 10);
        if (isNaN(idx)) return;
        const preset = getPresets()[idx];
        if (!preset) return;
        // Restaurar en el orden del array ids para respetar dependencias (ej: periodicidad → tipo)
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el && preset.data[id] != null) {
                el.value = preset.data[id];
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        showToast(`Preset "${preset.name}" cargado.`, 'success');
    });

    btnSave.addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (!name) { showToast('Escribe un nombre para el preset.'); return; }
        const data = {};
        ids.forEach(id => { const el = document.getElementById(id); if (el) data[id] = el.value; });
        const list = getPresets();
        const existing = list.findIndex(p => p.name === name);
        let savedIdx;
        if (existing >= 0) {
            list[existing].data = data;
            savedIdx = existing;
            showToast(`Preset "${name}" actualizado.`, 'success');
        } else {
            list.push({ name, data });
            savedIdx = list.length - 1;
            showToast(`Preset "${name}" guardado.`, 'success');
        }
        savePresets(list);
        renderSelect();
        sel.value = String(savedIdx); // auto-seleccionar el preset recién guardado
        nameInput.value = '';
    });

    nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); btnSave.click(); }
    });

    btnDel.addEventListener('click', () => {
        const idx = parseInt(sel.value, 10);
        if (isNaN(idx)) return;
        const list = getPresets();
        const name = list[idx]?.name;
        list.splice(idx, 1);
        savePresets(list);
        renderSelect();
        if (name) showToast(`Preset "${name}" eliminado.`, 'info');
    });

    renderSelect();
}

// =============================
//  Syntax highlighter
// =============================

/**
 * Resalta tokens de un comando CLI devolviendo HTML.
 * @param {string} raw - Texto plano de una línea de comando.
 * @returns {string} HTML con spans de coloreado.
 */
function highlightCommand(raw) {
    // Escapar HTML básico
    let s = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Separar envoltorio de comillas externas  '...'  o  '...',
    let pre = '', suf = '', core = s;
    if (s.startsWith("'")) {
        if (s.endsWith("',"))      { pre = "'"; suf = "',"; core = s.slice(1, -2); }
        else if (s.endsWith("'")) { pre = "'"; suf = "'";  core = s.slice(1, -1); }
    }

    // 1. Rutas entre comillas dobles: "C:\..." o "/unix/path"
    core = core.replace(/"([^"]+)"/g, '<span class="hl-path">"$1"</span>');

    // 2. Timestamps ISO: 2025-01-01T00:00:00...+01:00
    core = core.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+[+-]\d{2}:\d{2}/g,
        '<span class="hl-date">$&</span>');

    // 3. Fechas YYYYMMDD (8 dígitos exactos)
    core = core.replace(/\b\d{8}\b/g, '<span class="hl-date">$&</span>');

    // 4. Flags largos: --flag o --flag=value
    core = core.replace(/--[\w][\w.-]*(?:=[^\s<]*)*/g, '<span class="hl-flag">$&</span>');

    // 5. Flags cortos: -x o -xx (precedidos por espacio o inicio)
    core = core.replace(/(^|\s)(-[a-zA-Z]{1,2})(?=\s|$)/g,
        '$1<span class="hl-flag">$2</span>');

    if (pre) {
        return `<span class="hl-wrap">${pre}</span>${core}<span class="hl-wrap">${suf}</span>`;
    }
    return core;
}

// =============================
//  Output editor (reemplaza textarea)
// =============================

/**
 * Reemplaza visualmente el textarea de salida por un editor línea a línea
 * con copia individual por línea, resaltado de sintaxis y edición inline.
 * Debe llamarse DESPUÉS de initOutputPersistence para encadenar el setter.
 * @param {HTMLTextAreaElement} textareaEl
 */
function initOutputEditor(textareaEl) {
    if (!textareaEl) return;

    // Crear div editor hermano
    const editor = document.createElement('div');
    editor.className = 'output-editor';
    textareaEl.insertAdjacentElement('afterend', editor);
    textareaEl.style.display = 'none';

    let _syncing = false;

    // --- Render ---
    function renderEditor(text) {
        editor.innerHTML = '';
        if (!text) return;
        const lines = text.split('\n');
        for (const line of lines) {
            if (!line || line.startsWith('# ---')) {
                const sep = document.createElement('div');
                sep.className = 'cmd-separator';
                sep.textContent = line;
                editor.appendChild(sep);
                continue;
            }

            const row = document.createElement('div');
            row.className = 'cmd-line';

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'cmd-copy';
            copyBtn.title = 'Copiar línea';
            copyBtn.innerHTML =
                '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" ' +
                'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="5" y="5" width="9" height="9" rx="1.5"/>' +
                '<path d="M4 11H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h6.5A1.5 1.5 0 0 1 11 3v1"/>' +
                '</svg>';

            const ct = document.createElement('div');
            ct.className = 'cmd-text';
            ct.contentEditable = 'true';
            ct.spellcheck = false;
            ct.dataset.raw = line;
            ct.innerHTML = highlightCommand(line);

            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const raw = ct.dataset.raw;
                const done = () => {
                    copyBtn.classList.add('copied');
                    setTimeout(() => copyBtn.classList.remove('copied'), 1200);
                };
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(raw).then(done).catch(done);
                } else {
                    const tmp = document.createElement('textarea');
                    tmp.value = raw;
                    document.body.appendChild(tmp);
                    tmp.select();
                    document.execCommand('copy');
                    document.body.removeChild(tmp);
                    done();
                }
            });

            ct.addEventListener('focus', () => {
                ct.textContent = ct.dataset.raw;
            });

            ct.addEventListener('keydown', (e) => {
                if (e.key === 'Enter')  { e.preventDefault(); ct.blur(); }
                if (e.key === 'Escape') { ct.textContent = ct.dataset.raw; ct.blur(); }
            });

            ct.addEventListener('blur', () => {
                const newRaw = ct.textContent;
                ct.dataset.raw = newRaw;
                ct.innerHTML = highlightCommand(newRaw);
                syncViewToTextarea();
            });

            row.appendChild(copyBtn);
            row.appendChild(ct);
            editor.appendChild(row);
        }
    }

    // --- Sincronizar editor → textarea ---
    function syncViewToTextarea() {
        _syncing = true;
        const lines = [];
        editor.querySelectorAll('.cmd-line, .cmd-separator').forEach(el => {
            if (el.classList.contains('cmd-separator')) {
                lines.push(el.textContent);
            } else {
                lines.push(el.querySelector('.cmd-text')?.dataset.raw ?? '');
            }
        });
        textareaEl.value = lines.join('\n');
        _syncing = false;
    }

    // --- Encadenar con el setter de initOutputPersistence ---
    const instDesc = Object.getOwnPropertyDescriptor(textareaEl, 'value');
    const proto    = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    const prevSet  = instDesc?.set  || proto.set;
    const prevGet  = instDesc?.get  || proto.get;

    Object.defineProperty(textareaEl, 'value', {
        get()  { return prevGet.call(this); },
        set(v) {
            prevSet.call(this, v);
            if (!_syncing) renderEditor(prevGet.call(this));
        },
        configurable: true
    });

    // Render inicial desde el valor actual del textarea
    renderEditor(prevGet.call(textareaEl));
}

/**
 * Persiste los valores de un conjunto de inputs/selects en localStorage.
 * Restaura en carga y devuelve una función para guardar el estado actual.
 * @param {string[]} ids        - IDs de los elementos a persistir.
 * @param {string}   storageKey - Clave de localStorage.
 * @returns {Function} Llamar tras cada generación para guardar el estado.
 */
function initFormPersistence(ids, storageKey) {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
        if (saved) {
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el && saved[id] != null) el.value = saved[id];
            });
        }
    } catch (_) {}

    return function saveFormState() {
        const data = {};
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) data[id] = el.value;
        });
        try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch (_) {}
    };
}
