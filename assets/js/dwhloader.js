// Detectar contexto
const isPortugal = location.pathname.includes("reportanalyzerportugal.html");

// ── Config override (config.json via panel de administración) ──
(function applyDwhConfig() {
    const cfg = window.IPV_CONFIG;
    if (!cfg) return;
    const exeEl = document.querySelector("#exe");
    if (cfg.executables?.dwhloader && exeEl) exeEl.value = cfg.executables.dwhloader;
    const menu = document.querySelector("#tipoMenu");
    if (cfg.fileTypes?.dwhloader && menu) {
        menu.innerHTML = cfg.fileTypes.dwhloader
            .map(t => `<label><input type="checkbox" name="tipoOpt" value="${t}"> ${t}</label>`)
            .join('');
    }
}());

// ===== Helper DOM =====
const $ = (s) => document.querySelector(s);

// ===== Referencias a elementos =====
const periodicidad = $("#periodicidad");
const exe          = $("#exe");
const DEFAULT_EXE  = exe ? exe.value : "";
const inicio       = $("#inicio");
const fin          = $("#fin");
const formato      = $("#comillas");
const out          = $("#output");
const modeSel      = $("#mode");
const counter      = $("#counter");
const tipoBtn      = $("#tipoBtn");
const tipoMenu     = $("#tipoMenu");
const tipoSelect   = $("#tipo");
const btnGenerate  = $("#btnGenerate");
const btnCopy      = $("#btnCopy");
const btnClear     = $("#btnClear");

// ===== Valores por defecto =====
const todayISO = () => new Date().toISOString().slice(0, 10);
if (inicio && !inicio.value) inicio.value = todayISO();
if (fin && !fin.value) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    fin.value = d.toISOString().split("T")[0];
}

// ===== Utilidades de fecha =====
const pad2 = (n) => String(n).padStart(2, "0");

const parseDateOnly = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
};

// Devuelve "YYYY-MM-DD" (con guiones, para usarse como prefijo de timestamp)
const toYYYYMMDD = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

const eachDayInclusive = (d0, d1) => {
    const days = []; // FIX: renombrado de 'out' para no oscurecer la referencia al textarea
    for (let d = d0; d <= d1; d = addDays(d, 1)) days.push(new Date(d));
    return days;
};

// ===== Formato de salida =====
function wrap(core) {
    const mode = formato.value;
    if (mode === "comma")   return `'${core}',`;
    if (mode === "nocomma") return `'${core}'`;
    return core;
}

// ===== Tipos seleccionados =====
const customTipoEnabled = () => tipoBtn && tipoMenu;

const getCheckedTypes = () => {
    if (isPortugal) return [];

    const values = customTipoEnabled()
        ? Array.from(tipoMenu.querySelectorAll('input[name="tipoOpt"]'))
            .filter((i) => i.checked)
            .map((i) => i.value)
        : Array.from(tipoSelect?.options || [])
            .filter((o) => o.selected)
            .map((o) => o.value);

    if (!values.length) throw new Error("Selecciona al menos un tipo de fichero.");
    return values.includes("ALL") ? ["ALL"] : values;
};

// ===== Validación =====
const validate = () => {
    if (!exe?.value)    throw new Error("Falta la ruta del ejecutable.");
    if (!inicio?.value) throw new Error("Indica la fecha de inicio.");
    if (!fin?.value)    throw new Error("Indica la fecha de fin.");

    const d0 = parseDateOnly(inicio.value);
    const d1 = parseDateOnly(fin.value);
    if (d1 < d0) throw new Error("La fecha fin no puede ser anterior a la fecha inicio.");

    getCheckedTypes();
};

// ===== Generación de items =====
const buildItems = () => {
    validate();

    const d0    = parseDateOnly(inicio.value);
    const d1    = parseDateOnly(fin.value);
    const dates = eachDayInclusive(d0, d1);

    return dates.map((d) => ({
        yyyymmdd: toYYYYMMDD(d),
        year:     d.getFullYear(),
        month:    d.getMonth() + 1,
    }));
};

// ===== Construcción del output =====
const buildOutputText = () => {
    const exePath = exe.value.trim();
    const types   = getCheckedTypes();
    const items   = buildItems();

    // Se necesitan al menos 2 fechas para formar un rango [inicio, fin)
    if (items.length < 2) {
        if (counter) counter.textContent = "0 elementos";
        return "";
    }

    const commands = [];

    // Pares consecutivos: (0,1), (1,2), (2,3)…
    for (let i = 0; i < items.length - 1; i++) {
        const start = `${items[i].yyyymmdd}T00:00:00.0000000-05:00`;
        const end   = `${items[i + 1].yyyymmdd}T00:00:00.0000000-05:00`;

        for (const type of types) {
            commands.push(wrap(`${exePath} -m ${type} -d ${start} ${end}`));
        }
    }

    if (counter) counter.textContent = `${commands.length} elementos`;

    return commands.join("\n");
};

// ===== Acciones =====
const generate = () => {
    try {
        const newText = buildOutputText();
        if (newText?.trim()) {
            saveToHistory(newText, 'ipv_hist_dwhloader');
            out.value += (out.value ? makeSeparator() : "") + newText;
        }
        if (typeof toggleMenu === "function") toggleMenu(false);
    } catch (err) {
        showToast(err.message || String(err));
    }
};

const copyOutput = async () => {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(out.value);
        } else {
            out.select();
            document.execCommand("copy");
        }
        const msg = $("#copyMsg");
        if (msg) { // FIX: null check antes de acceder a .style
            msg.style.display = "inline";
            setTimeout(() => (msg.style.display = "none"), 2000);
        }
    } catch {
        out.select();
        document.execCommand("copy");
    }
};

// ===== Custom: checkboxes tipo =====
function getTipoCheckboxes() {
    if (!customTipoEnabled()) return [];
    return Array.from(tipoMenu.querySelectorAll('input[name="tipoOpt"]'));
}

function getCheckedTypesCustom() {
    return getTipoCheckboxes().filter((i) => i.checked).map((i) => i.value);
}

function refreshTipoLabel() {
    if (!customTipoEnabled()) return;
    const values = getCheckedTypesCustom();
    tipoBtn.textContent = values.length ? values.join(", ") : "Selecciona tipos…";
}

function toggleMenu(open) {
    if (!customTipoEnabled()) return;
    const willOpen = open ?? !tipoMenu.classList.contains("open");
    tipoMenu.classList.toggle("open", willOpen);
    tipoMenu.setAttribute("aria-hidden", String(!willOpen));
    if (willOpen) {
        const first = tipoMenu.querySelector('input[name="tipoOpt"]');
        if (first) first.focus();
    } else {
        tipoBtn?.focus();
    }
}

// ===== Listeners =====
btnGenerate?.addEventListener("click", generate);
btnCopy?.addEventListener("click", copyOutput);

const btnExport = $("#btnExport");
if (btnExport && out) btnExport.addEventListener("click", () => {
    exportTxt(out.value, `dwhloader_comandos_${new Date().toISOString().slice(0, 10)}.txt`);
});

initDateShortcuts();
initExeStorage(exe, DEFAULT_EXE, "ipv_exe_dwhloader");
initOutputPersistence(out, "ipv_out_dwhloader");
initOutputEditor(out);
initClearConfirm(btnClear, out);
initToolTracking();

initPresets(['inicio', 'fin'], 'ipv_presets_dwhloader', document.querySelector('fieldset'));
const _saveForm = initFormPersistence(['inicio', 'fin'], 'ipv_form_dwhloader');
btnGenerate?.addEventListener('click', _saveForm);
initGenerationHistory(out, document.querySelector('.actions'), 'ipv_hist_dwhloader');

[inicio, fin].forEach((inp) =>
    inp?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); generate(); }
    })
);

tipoBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
});

document.addEventListener("click", (e) => {
    if (!customTipoEnabled()) return;
    if (e.target.closest("#comillas")) return;
    if (!tipoMenu.contains(e.target) && !tipoBtn.contains(e.target)) {
        toggleMenu(false);
    }
});
