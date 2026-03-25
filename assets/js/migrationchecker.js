document.addEventListener("DOMContentLoaded", () => {
    const periodicidad = document.getElementById("periodicidad");
    const exe = document.getElementById("exe");
    const DEFAULT_EXE = exe ? exe.value : "";
    const inicio = document.getElementById("inicio");
    const fin = document.getElementById("fin");
    const comillas = document.getElementById("comillas");
    const output = document.getElementById("output");

    const btnGenerate = document.getElementById("btnGenerate");
    const btnCopy = document.getElementById("btnCopy");
    const btnClear = document.getElementById("btnClear");
    const copyMsg = document.getElementById("copyMsg");

    // Defaults
    const todayISO = () => new Date().toISOString().slice(0, 10);
    if (inicio && !inicio.value) inicio.value = todayISO();
    if (fin && !fin.value) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        fin.value = d.toISOString().split("T")[0];
    }

    function parseDateOnly(value) {
        // value: "YYYY-MM-DD"
        const [y, m, d] = value.split("-").map(Number);
        return new Date(y, m - 1, d);
    }

    function formatYYYYMMDD(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}${m}${d}`;
    }

    function addDays(date, days) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    }

    function addMonthsToFirstDay(date, months) {
        // Siempre devuelve el día 1 del mes correspondiente
        const y = date.getFullYear();
        const m = date.getMonth() + months;
        return new Date(y, m, 1);
    }

    function validate() {
        if (!inicio.value || !fin.value) {
            throw new Error("Indica fecha inicio y fin.");
        }

        const d0 = parseDateOnly(inicio.value);
        const d1 = parseDateOnly(fin.value);

        if (d1 < d0) {
            throw new Error("La fecha fin no puede ser anterior a la fecha inicio.");
        }
    }

    function buildCommands() {
        validate();

        const freq = periodicidad.value; // "Daily" o "Monthly"
        const d0 = parseDateOnly(inicio.value);
        const d1 = parseDateOnly(fin.value);
        const baseExe = exe.value.trim();

        const commands = [];

        if (freq === "Daily") {
            // Un comando por día entre inicio y fin (incluidos)
            let current = new Date(d0);
            while (current <= d1) {
                const dateStr = formatYYYYMMDD(current);
                const cmd = `${baseExe} --f Daily --date ${dateStr}`;
                commands.push(cmd);
                current = addDays(current, 1);
            }
        } else if (freq === "Monthly") {
            // Un comando por mes; fecha siempre día 1 del mes
            let currentMonth = new Date(d0.getFullYear(), d0.getMonth(), 1);
            const lastMonth = new Date(d1.getFullYear(), d1.getMonth(), 1);

            while (currentMonth <= lastMonth) {
                const dateStr = formatYYYYMMDD(currentMonth); // siempre YYYYMM01
                const cmd = `${baseExe} --f Monthly --date ${dateStr}`;
                commands.push(cmd);
                currentMonth = addMonthsToFirstDay(currentMonth, 1);
            }
        }

        return commands;
    }

    function applyFormat(commands) {
        const mode = comillas.value; // "comma", "nocomma", "raw"

        return commands
            .map(cmd => {
                if (mode === "comma") return `'${cmd}',`;
                if (mode === "nocomma") return `'${cmd}'`;
                return cmd; // raw
            })
            .join("\n");
    }

    btnGenerate.addEventListener("click", () => {
        try {
            copyMsg.style.display = "none";
            const cmds = buildCommands();
            const formatted = applyFormat(cmds);

            if (formatted.trim()) {
                saveToHistory(formatted, 'ipv_hist_migrationchecker');
                output.value += (output.value ? makeSeparator() : "") + formatted;
                updateCounter(document.getElementById('counter'), formatted);
            }
        } catch (err) {
            showToast(err.message || String(err));
        }
    });

    btnCopy.addEventListener("click", async () => {
        if (!output.value.trim()) return;
        try {
            await navigator.clipboard.writeText(output.value);
            copyMsg.style.display = "inline";
            setTimeout(() => (copyMsg.style.display = "none"), 1500);
        } catch {
            showToast("No se pudo copiar al portapapeles.");
        }
    });

    const btnExport = document.getElementById("btnExport");
    if (btnExport) btnExport.addEventListener("click", () => {
        exportTxt(output.value, `migrationchecker_comandos_${new Date().toISOString().slice(0, 10)}.txt`);
    });

    initDateShortcuts();
    initExeStorage(exe, DEFAULT_EXE, "ipv_exe_migrationchecker");
    initOutputPersistence(output, "ipv_out_migrationchecker");
    initOutputEditor(output);
    initClearConfirm(btnClear, output, () => { copyMsg.style.display = "none"; });
    initToolTracking();

    initPresets(['periodicidad', 'inicio', 'fin'], 'ipv_presets_migrationchecker', document.querySelector('fieldset'));
    const _saveForm = initFormPersistence(['inicio', 'fin', 'periodicidad'], 'ipv_form_migrationchecker');
    btnGenerate.addEventListener('click', _saveForm);
    initGenerationHistory(output, document.querySelector('.actions'), 'ipv_hist_migrationchecker');
    [inicio, fin].forEach(inp => inp?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); btnGenerate.click(); }
    }));
});
