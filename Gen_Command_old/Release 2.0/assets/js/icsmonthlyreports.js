// Helpers
const $ = s => document.querySelector(s);

// Referencias
const periodicidad = $("#periodicidad");
const exe = $("#exe");
const inicio = $("#inicio");
const fin = $("#fin");
const formato = $("#comillas");
const out = $("#output");
const modeSel = $("#mode");
const counter = $("#counter");
const tipoBtn = $("#tipoBtn");
const tipoMenu = $("#tipoMenu");
const tipoSelect = $("#tipo");
const btnGenerate = $("#btnGenerate");
const btnCopy = $("#btnCopy");
const btnClear = $("#btnClear");

// Defaults
const todayISO = () => new Date().toISOString().slice(0, 10);
if (inicio && !inicio.value) inicio.value = todayISO();
if (fin && !fin.value) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    fin.value = d.toISOString().split("T")[0];
}

// Utilidades fecha
const pad2 = n => String(n).padStart(2, "0");

const parseDateOnly = iso => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
};

// yyyy-mm-dd
const toYYYYMMDD = d =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Recorrer MESES: del mes de d0 al mes de d1, siempre día 1
const eachMonthInclusive = (d0, d1) => {
    const out = [];
    // Normalizamos ambos a día 1
    let current = new Date(d0.getFullYear(), d0.getMonth(), 1);
    const last = new Date(d1.getFullYear(), d1.getMonth(), 1);

    while (current <= last) {
        out.push(new Date(current));
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return out;
};


// Formato (por si usas el desplegable "Formato")
function wrap(core) {
    const mode = formato?.value;
    if (mode === "comma") return `'${core}',`;
    if (mode === "nocomma") return `'${core}'`;
    return core;
}


// Tipos (módulos: BlockedAccounts, ActivityData, Regions)
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
    if (!inicio?.value) throw new Error("Indica la fecha de inicio.");
    if (!fin?.value) throw new Error("Indica la fecha de fin.");
    const d0 = parseDateOnly(inicio.value), d1 = parseDateOnly(fin.value);
    if (d1 < d0) throw new Error("La fecha fin no puede ser anterior a la fecha inicio.");
    getCheckedTypes(); // Asegura que hay módulos seleccionados
};

// Generación de items MENSUALES (uno por mes, día 1)
const buildItems = () => {
    validate();

    const d0 = parseDateOnly(inicio.value);
    const d1 = parseDateOnly(fin.value);

    const months = eachMonthInclusive(d0, d1);

    return months.map(d => ({
        yyyymmdd: toYYYYMMDD(d),      // siempre tipo 2024-10-01
        year: d.getFullYear(),
        month: d.getMonth() + 1
    }));
};


// Lógica para construir los comandos ICS Monthly Reports
const buildOutputText = () => {
    const exePath = exe.value.trim();     // ej: java -jar C:\...\IcsMonthlyReports.jar
    const modules = getCheckedTypes();    // p.ej.: ["BlockedAccounts","ActivityData","Regions"]
    const items = buildItems();           // [{ yyyymmdd: "2024-10-01", ...}, …]

    if (!items || !items.length) {
        if (counter) counter.textContent = `0 elementos`;
        return "";
    }

    // Sufijo fijo que debe ir SIEMPRE al final
    const tail = '-sc --spring.config.location="C:\\services\\services_ics\\IcsMonthlyReports\\application.yml"';

    const commands = [];

    // Un comando por (MES × módulo)
    for (const item of items) {
        // Formato requerido: -d 2024-10-01T00:00:00+02:00
        const tz = $("#tz")?.value || "+02:00";
        const dateTime = `${item.yyyymmdd}T00:00:00${tz}`

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
            // Si ya hay contenido, añadimos salto de línea + nuevos comandos
            out.value += (out.value ? "\n" : "") + newText;
        }

        if (typeof toggleMenu === "function") toggleMenu(false);
    } catch (err) {
        alert(err.message);
    }
};

const copyOutput = async () => {
    try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(out.value);
        else { out.select(); document.execCommand("copy"); }
        const msg = $("#copyMsg");
        msg.style.display = "inline";
        setTimeout(() => msg.style.display = "none", 2000);
    } catch {
        out.select();
        document.execCommand("copy");
    }
};

const clearOutput = () => out.value = "";

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

// Listeners
btnGenerate?.addEventListener("click", generate);
btnCopy?.addEventListener("click", copyOutput);
btnClear?.addEventListener("click", clearOutput);
[inicio, fin].forEach(inp => inp?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        e.preventDefault();
        generate();
    }
}));

// Abrir/cerrar menú al pulsar el botón
tipoBtn?.addEventListener("click", e => {
    e.stopPropagation();
    toggleMenu();
});

// Cerrar menú al hacer click fuera
document.addEventListener("click", e => {
    if (!customTipoEnabled()) return;

    // Si el click viene del desplegable "Formato", no hacemos nada
    if (e.target.closest("#comillas")) return;

    // También ignoramos clicks dentro del select de zona horaria
    if (e.target.closest("#tz")) return;

    // Si el click no es dentro del menú ni en el botón, cerramos
    if (!tipoMenu.contains(e.target) && !tipoBtn.contains(e.target)) {
        toggleMenu(false);
    }
});
