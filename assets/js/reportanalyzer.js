// assets/js/reportanalyzer.js

// Detectar si estamos en el report de Portugal
const isPortugal = window.location.pathname.includes("reportanalyzerportugal.html");

// ── Config override (config.json via panel de administración) ──
(function applyRaConfig() {
    const cfg    = window.IPV_CONFIG;
    if (!cfg) return;
    const cfgKey = isPortugal ? 'reportanalyzer_portugal' : 'reportanalyzer_spain';
    const exeEl  = document.querySelector('#exe');
    if (cfg.executables?.[cfgKey] && exeEl) exeEl.value = cfg.executables[cfgKey];
    // Solo España tiene checkboxes de tipo; Portugal no los usa
    if (!isPortugal && cfg.fileTypes?.[cfgKey]) {
        const menu = document.querySelector('#tipoMenu');
        if (menu) {
            menu.innerHTML = cfg.fileTypes[cfgKey]
                .map(t => `<label><input type="checkbox" name="tipoOpt" value="${t}"> ${t}</label>`)
                .join('');
        }
    }
}());

// ===== Helpers =====
const $ = (s) => document.querySelector(s);

// ===== Referencias (algunas pueden no existir y el código lo contempla) =====
const periodicidad = $("#periodicidad"); // DAILY | MONTHLY
const exe = $("#exe");           // ruta ejecutable
const DEFAULT_EXE = exe ? exe.value : "";
const inicio = $("#inicio");        // fecha inicio (type=date)
const fin = $("#fin");           // fecha fin (type=date)
const formato = $("#comillas");      // formato salida ('comando', ... / raw)
const out = $("#output");        // textarea salida

// Selector de modos de salida (opcional): flat | grouped | ps | bash
const modeSel = $("#mode");          // puede no existir
const counter = $("#counter");       // puede no existir

// Selector de tipos: control custom (checkboxes) o fallback <select multiple>
const tipoBtn = $("#tipoBtn");       // puede no existir
const tipoMenu = $("#tipoMenu");      // puede no existir
const tipoSelect = $("#tipo");          // fallback (oculto o visible)

// Botones
const btnGenerate = $("#btnGenerate");
const btnCopy = $("#btnCopy");
const btnClear = $("#btnClear");

// ===== Valores por defecto =====
function todayISO() { return new Date().toISOString().slice(0, 10); }
if (inicio && !inicio.value) inicio.value = todayISO();
if (fin && !fin.value) fin.value = todayISO();

// ===== Utilidades de fecha =====
const pad2 = (n) => String(n).padStart(2, "0");
function parseDateOnly(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0);
}
function toYYYYMMDD(d) {
    return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}
function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}
function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d, n) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + n, 1);
    return startOfMonth(x);
}

// Iteradores inclusivos
function eachDayInclusive(d0, d1) {
    const out = [];
    for (let d = new Date(d0); d <= d1; d = addDays(d, 1)) out.push(new Date(d));
    return out;
}
function eachMonthInclusive(d0, d1) {
    const out = [];
    let cur = startOfMonth(d0), end = startOfMonth(d1);
    for (; cur <= end; cur = addMonths(cur, 1)) out.push(new Date(cur));
    return out;
}

// ===== Formato de envoltura =====
function wrap(core) {
    const mode = formato?.value || "nocomma";
    if (mode === "comma") return `'${core}',`;
    if (mode === "nocomma") return `'${core}'`;
    return core; // raw
}

// ===== Multi TIPO (custom si existe; si no, fallback al <select>) =====
function customTipoEnabled() {
    return !!(tipoBtn && tipoMenu);
}

// Custom: checkboxes
function getTipoCheckboxes() {
    if (!customTipoEnabled()) return [];
    return Array.from(tipoMenu.querySelectorAll('input[name="tipoOpt"]'));
}
function getCheckedTypesCustom() {
    return getTipoCheckboxes().filter(i => i.checked).map(i => i.value);
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

// Bind solo si existe el custom
if (customTipoEnabled()) {
    tipoBtn.addEventListener("click", () => toggleMenu());
    document.addEventListener("click", (e) => {
        if (
            tipoMenu.classList.contains("open") &&
            !tipoMenu.contains(e.target) &&
            !tipoBtn.contains(e.target) &&
            e.target.tagName !== "SELECT"
        ) {
            toggleMenu(false);
        }
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleMenu(false); });
    tipoMenu.addEventListener("change", (e) => {
        const target = e.target;
        if (!target || target.name !== "tipoOpt") return;
        const allChk = getTipoCheckboxes();
        if (target.value === "ALL") {
            if (target.checked) {
                allChk.forEach(c => { if (c.value !== "ALL") c.checked = false; });
            }
        } else {
            const all = allChk.find(c => c.value === "ALL");
            if (all && target.checked) all.checked = false;
        }
        refreshTipoLabel();
    });

    tipoMenu.addEventListener("click", (e) => e.stopPropagation());

    refreshTipoLabel();
}

// Fallback: <select multiple>
function getCheckedTypesSelect() {
    if (!tipoSelect) return [];
    return Array.from(tipoSelect.options).filter(o => o.selected).map(o => o.value);
}


function getSelectedTypes() {

    // Si es Portugal, no requerimos tipos
    if (isPortugal) {
        return []; // o lo que necesites devolver en este caso
    }

    // Lógica normal para otros casos
    const values = customTipoEnabled() ? getCheckedTypesCustom() : getCheckedTypesSelect();
    if (values.length === 0) throw new Error("Selecciona al menos un tipo de fichero.");
    if (values.includes("ALL")) return ["ALL"];
    return values;
}


// ===== Validación =====
function validate() {
    if (!exe?.value) throw new Error("Falta la ruta del ejecutable.");
    if (!inicio?.value) throw new Error("Indica la fecha de inicio.");
    if (!fin?.value) throw new Error("Indica la fecha de fin.");
    const d0 = parseDateOnly(inicio.value);
    const d1 = parseDateOnly(fin.value);
    if (d1 < d0) throw new Error("La fecha fin no puede ser anterior a la fecha inicio.");
    getSelectedTypes();     // lanza si no hay tipos
}

// ===== Generación de ITEMS (fechas concretas) =====
function buildItems() {
    validate();

    const freq = periodicidad?.value || "DAILY";
    const d0 = parseDateOnly(inicio.value);
    const d1 = parseDateOnly(fin.value);

    if (freq === "MONTHLY") {
        const months = eachMonthInclusive(d0, d1);
        return months.map(md => ({
            yyyymmdd: toYYYYMMDD(startOfMonth(md)),
            year: md.getFullYear(),
            month: md.getMonth() + 1
        }));
    } else {
        const days = eachDayInclusive(d0, d1);
        return days.map(dd => ({
            yyyymmdd: toYYYYMMDD(dd),
            year: dd.getFullYear(),
            month: dd.getMonth() + 1
        }));
    }
}

// ===== Construcción de TEXTO de salida según modo =====
function buildOutputText() {
    const exePath = exe.value.trim();
    const freq = periodicidad?.value || "DAILY";
    const types = getSelectedTypes().join(",");
    const items = buildItems();

    if (isPortugal) {
        return items.map(it =>
            wrap(`${exePath} -f ${freq} -d ${it.yyyymmdd}`)
        ).join("\n");
    }

    // contador (si existe)
    if (counter) counter.textContent = `${items.length} elementos`;

    const mode = modeSel?.value || "flat";

    // Modo 1: lista simple
    if (mode === "flat") {
        return items.map(it =>
            wrap(`${exePath} --type="${types}" --frequency=${freq} --Date=${it.yyyymmdd}`)
        ).join("\n");
    }

    // Modo 2: agrupado por mes con encabezados
    if (mode === "grouped") {
        const groups = {};
        for (const it of items) {
            const key = `${it.year}-${String(it.month).padStart(2, "0")}`;
            (groups[key] ??= []).push(it);
        }
        const lines = [];
        for (const key of Object.keys(groups).sort()) {
            lines.push(`# ${key}`);
            for (const it of groups[key]) {
                lines.push(
                    wrap(`${exePath} --type="${types}" --frequency=${freq} --Date=${it.yyyymmdd}`)
                );
            }
            lines.push(""); // línea en blanco separadora
        }
        return lines.join("\n");
    }

    // Modo 3: bucle PowerShell
    if (mode === "ps") {
        const core = `# PowerShell
$exe = '${exePath}'
$types = '${types}'
$freq = '${freq}'
$start = Get-Date '${inicio.value}'
$end   = Get-Date '${fin.value}'
for ($d = $start; $d -le $end; $d = $d.AddDays(1)) {
  $date = $d.ToString('yyyyMMdd')${(periodicidad?.value === "MONTHLY") ? `
  if ($d.Day -ne 1) { continue }` : ``}
  & $exe --type="$types" --frequency=$freq --Date=$date
}`;
        return wrap(core);
    }

    // Modo 4: bucle Bash (GNU date)
    if (mode === "bash") {
        const d0s = toYYYYMMDD(parseDateOnly(inicio.value));
        const d1s = toYYYYMMDD(parseDateOnly(fin.value));
        const core = `# Bash
exe='${exePath}'
types='${types}'
freq='${freq}'
d0='${d0s}'
d1='${d1s}'
d="$d0"
while [ "$d" -le "$d1" ]; do${(periodicidad?.value === "MONTHLY") ? `
  # Ejecutar solo el día 01
  if [ "\${d:6:2}" = "01" ]; then
    "$exe" --type="$types" --frequency=$freq --Date="$d"
  fi` : `
  "$exe" --type="$types" --frequency=$freq --Date="$d"`}
  d=$(date -d "$d + 1 day" +%Y%m%d)
done`;
        return wrap(core);
    }

    // Fallback
    return items.map(it =>
        wrap(`${exePath} --type="${types}" --frequency=${periodicidad?.value || "DAILY"} --Date=${it.yyyymmdd}`)
    ).join("\n");
}

// ===== Acciones =====
const generate = () => {
    try {
        const newText = buildOutputText();

        if (newText?.trim()) {
            saveToHistory(newText, 'ipv_hist_reportanalyzer_' + (isPortugal ? 'pt' : 'es'));
            out.value += (out.value ? makeSeparator() : "") + newText;
        }

        if (typeof toggleMenu === "function") toggleMenu(false);
    } catch (err) {
        showToast(err.message || String(err));
    }
};


async function copyOutput() {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(out.value);
        } else {
            out.select();
            document.execCommand("copy");
        }
        // FIX: usar el helper $ y añadir null check antes de acceder a .style
        const msg = $("#copyMsg");
        if (msg) {
            msg.style.display = "inline";
            setTimeout(() => (msg.style.display = "none"), 2000);
        }
    } catch {
        out.select();
        document.execCommand("copy");
    }
}

// ===== Listeners =====
btnGenerate?.addEventListener("click", generate);
btnCopy?.addEventListener("click", copyOutput);

// Enter en inputs de fecha => generar
[inicio, fin].forEach(inp => {
    inp?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); generate(); }
    });
});

const btnExport = $("#btnExport");
if (btnExport && out) btnExport.addEventListener("click", () => {
    exportTxt(out.value, `reportanalyzer_comandos_${new Date().toISOString().slice(0, 10)}.txt`);
});

initDateShortcuts();
initExeStorage(exe, DEFAULT_EXE, "ipv_exe_reportanalyzer_" + (isPortugal ? "pt" : "es"));
initOutputPersistence(out, "ipv_out_reportanalyzer_" + (isPortugal ? "pt" : "es"));
initOutputEditor(out);
initClearConfirm(btnClear, out);
initToolTracking();

initPresets(['periodicidad', 'inicio', 'fin'], 'ipv_presets_reportanalyzer_' + (isPortugal ? 'pt' : 'es'), document.querySelector('fieldset'));
const _saveForm = initFormPersistence(['inicio', 'fin', 'periodicidad'], 'ipv_form_reportanalyzer_' + (isPortugal ? 'pt' : 'es'));
btnGenerate?.addEventListener('click', _saveForm);
initGenerationHistory(out, document.querySelector('.actions'), 'ipv_hist_reportanalyzer_' + (isPortugal ? 'pt' : 'es'));
