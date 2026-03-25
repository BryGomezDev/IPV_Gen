// Helpers
const $ = s => document.querySelector(s);


// Referencias
const periodicidad = $("#periodicidad");
const exe = $("#exe");
const DEFAULT_EXE = exe ? exe.value : "";
const quarter = $("#quarter");
const yearSel = $("#year");
const formato = $("#comillas");
const out = $("#output");
const counter = $("#counter");
const tipoBtn = $("#tipoBtn");
const tipoMenu = $("#tipoMenu");
const tipoSelect = $("#tipo");
const btnGenerate = $("#btnGenerate");
const btnCopy = $("#btnCopy");
const btnClear = $("#btnClear");
const legislation = $("#legislation");


// Legislación → timezone por trimestre
const LEGISLATION_CONFIG = {
    ES: {
        name: "España",
        quarters: {
            Q1: "+02:00",
            Q2: "+02:00",
            Q3: "+02:00",
            Q4: "+01:00"
        }
    }
};

// Constante para TimeZone automático
const getTimezone = (leg, q) => {
    if (!LEGISLATION_CONFIG[leg]) {
        throw new Error("Legislación no soportada.");
    }
    const tz = LEGISLATION_CONFIG[leg].quarters[q];
    if (!tz) {
        throw new Error("No se pudo determinar el timezone para el trimestre.");
    }
    return tz;
};


// Utilidades fecha
const pad2 = n => String(n).padStart(2, "0");

const toYYYYMMDD = d =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Trimestre → fecha de corte REAL (1 solo comando por trimestre)
const getQuarterDate = (q, year) => {
    const y = Number(year);

    switch (q) {
        case "Q1": return new Date(y, 3, 1);  // 01/04/YYYY (Ene–Mar)
        case "Q2": return new Date(y, 6, 1);  // 01/07/YYYY (Abr–Jun)
        case "Q3": return new Date(y, 9, 1);  // 01/10/YYYY (Jul–Sep)
        case "Q4": return new Date(y + 1, 0, 1);   // 01/01/YYYY+1 (Oct–Dic)
    }

    throw new Error("Trimestre inválido");
};

// Formato de salida
function wrap(core) {
    const mode = formato?.value;
    if (mode === "comma") return `'${core}',`;
    if (mode === "nocomma") return `'${core}'`;
    return core;
}

// Tipos (módulos)
const customTipoEnabled = () => tipoBtn && tipoMenu;

const getCheckedTypes = () => {
    const values = customTipoEnabled()
        ? Array.from(tipoMenu.querySelectorAll('input[name="tipoOpt"]'))
            .filter(i => i.checked)
            .map(i => i.value)
        : Array.from(tipoSelect?.options || [])
            .filter(o => o.selected)
            .map(o => o.value);

    if (!values.length)
        throw new Error("Selecciona al menos un módulo (BlockedAccounts, ActivityData, Regions).");

    return values;
};

// Validación
const validate = () => {
    if (!exe?.value) throw new Error("Falta la ruta del ejecutable.");
    if (!legislation?.value) throw new Error("Selecciona una legislación.");
    if (!quarter?.value) throw new Error("Selecciona un trimestre.");
    if (!yearSel?.value) throw new Error("Indica un año válido.");
    getCheckedTypes();
};

// Generación de items TRIMESTRALES (1 solo item)
const buildItems = () => {
    validate();

    const d = getQuarterDate(quarter.value, yearSel.value);

    return [{
        yyyymmdd: toYYYYMMDD(d),
        year: d.getFullYear(),
        month: d.getMonth() + 1
    }];
};

// Construcción del output
const buildOutputText = () => {
    const exePath = exe.value.trim();
    const modules = getCheckedTypes();
    const items = buildItems();

    if (!items.length) {
        if (counter) counter.textContent = `0 elementos`;
        return "";
    }

    const tail = '-sc --spring.config.location="C:\\services\\services_ics\\IcsMonthlyReports\\application.yml"';
    const commands = [];

    for (const item of items) {
        const tz = getTimezone(legislation.value, quarter.value);
        const dateTime = `${item.yyyymmdd}T00:00:00${tz}`;


        for (const mod of modules) {
            const cmd = `${exePath} -r ${mod} -d ${dateTime} ${tail}`;
            commands.push(wrap(cmd));
        }
    }

    if (counter) counter.textContent = `${commands.length} elementos`;

    return commands.join("\n");
};

// Acciones
const generate = () => {
    try {
        const newText = buildOutputText();

        if (newText?.trim()) {
            saveToHistory(newText, 'ipv_hist_icsmonthlyreports');
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
        // FIX: null check antes de acceder a .style
        const msg = $("#copyMsg");
        if (msg) {
            msg.style.display = "inline";
            setTimeout(() => (msg.style.display = "none"), 2000);
        }
    } catch {
        out.select();
        document.execCommand("copy");
    }
};

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


// Listeners -> Muestra los menús desplegables y los mantiene. Esto soluciona el problema de hacer click en el desplegable y que se oculte
btnGenerate?.addEventListener("click", generate);
btnCopy?.addEventListener("click", copyOutput);

const btnExport = $("#btnExport");
if (btnExport && out) btnExport.addEventListener("click", () => {
    exportTxt(out.value, `icsmonthlyreports_comandos_${new Date().toISOString().slice(0, 10)}.txt`);
});

initExeStorage(exe, DEFAULT_EXE, "ipv_exe_icsmonthlyreports");
initOutputPersistence(out, "ipv_out_icsmonthlyreports");
initOutputEditor(out);
initClearConfirm(btnClear, out);
initToolTracking();

initPresets(['legislation', 'quarter', 'year'], 'ipv_presets_icsmonthlyreports', document.querySelector('fieldset'));
const _saveForm = initFormPersistence(['quarter', 'year', 'legislation'], 'ipv_form_icsmonthlyreports');
btnGenerate?.addEventListener('click', _saveForm);
initGenerationHistory(out, document.querySelector('.actions'), 'ipv_hist_icsmonthlyreports');

tipoBtn?.addEventListener("click", e => {
    e.stopPropagation();
    toggleMenu();
});


document.addEventListener("click", e => {
    if (!customTipoEnabled()) return;
    if (e.target.closest("#comillas")) return;
    if (e.target.closest("#quarter")) return;
    if (e.target.closest("#legislation")) return;
    if (!tipoMenu.contains(e.target) && !tipoBtn.contains(e.target)) {
        toggleMenu(false);
    }
});
