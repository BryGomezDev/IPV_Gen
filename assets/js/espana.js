document.addEventListener("DOMContentLoaded", () => {

    // ===== Constantes de datos =====
    // Los valores por defecto pueden sobreescribirse desde config.json via el panel de administración.
    const TIPOS = window.IPV_CONFIG?.fileTypes?.espana || {
        Diario:  ["CJT", "CJD", "RUD"],
        Horario: ["JUC"],
        Mensual: ["CJT", "CJD", "RUT", "RUD", "OPT", "BOT"],
    };

    const GAME_HORARIO = ["SES", "RAC"];                  // Horario + JUC
    const GAME_MENSUAL = ["AZA", "RLT", "BLJ", "AOC"];   // Mensual + OPT | BOT

    // ===== Helper DOM =====
    const $ = (s) => document.querySelector(s);

    // ===== Referencias a elementos =====
    const periodicidad = $("#periodicidad");
    const tipo         = $("#tipo");
    const tz           = $("#tz");
    const exe          = $("#exe");
    if (window.IPV_CONFIG?.executables?.espana && exe) exe.value = window.IPV_CONFIG.executables.espana;
    const DEFAULT_EXE  = exe ? exe.value : "";
    const inicio       = $("#inicio");
    const fin          = $("#fin");
    const hstart       = $("#hstart");
    const hend         = $("#hend");
    const horasBox     = $("#horasBox");
    const gameBox      = $("#gameBox");
    const gametype     = $("#gametype");
    const formato      = $("#comillas");
    const filename     = $("#filename");
    const out          = $("#output");

    const btnGenerate  = $("#btnGenerate");
    const btnCopy      = $("#btnCopy");
    const btnClear     = $("#btnClear");

    // ===== Utilidades de fecha =====
    const todayISO = () => new Date().toISOString().slice(0, 10);
    if (inicio) inicio.value = todayISO();
    if (fin)    fin.value    = todayISO();

    function parseDateOnly(s) {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d, 0, 0, 0);
    }

    function addDays(dt, n) {
        const x = new Date(dt);
        x.setDate(x.getDate() + n);
        return x;
    }

    function addHours(dt, n) {
        const x = new Date(dt);
        x.setHours(x.getHours() + n);
        return x;
    }

    function fmtDateTime(dt) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` +
               `T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
    }

    function monthToken(d) {
        const MESES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return MESES[d.getMonth()];
    }

    // ===== Lógica de interfaz =====
    function updateTipos() {
        if (!tipo || !periodicidad) return;

        const list = TIPOS[periodicidad.value] || [];
        tipo.innerHTML = "";
        for (const t of list) {
            const opt = document.createElement("option");
            opt.value = opt.textContent = t;
            tipo.appendChild(opt);
        }
        if (list.length) tipo.value = list[0];

        toggleControls();
        suggestFilename();
    }

    function toggleControls() {
        if (!periodicidad || !tipo) return;

        const per = periodicidad.value;
        const t   = tipo.value;

        if (horasBox) horasBox.classList.toggle("hidden", per !== "Horario");

        let showGame  = false;
        let gameValues = [];

        if (per === "Horario" && t === "JUC") {
            showGame   = true;
            gameValues = GAME_HORARIO;
        } else if (per === "Mensual" && (t === "OPT" || t === "BOT")) {
            showGame   = true;
            gameValues = GAME_MENSUAL;
        }

        if (gameBox) gameBox.classList.toggle("hidden", !showGame);

        if (showGame && gametype) {
            gametype.innerHTML = "";
            for (const v of gameValues) {
                const o = document.createElement("option");
                o.value = o.textContent = v;
                gametype.appendChild(o);
            }
        }
    }

    function suggestFilename() {
        if (!inicio || !tipo || !filename) return;
        try {
            // FIX: parseDateOnly evita el desfase UTC de new Date("YYYY-MM-DD")
            const d = parseDateOnly(inicio.value);
            if (!isNaN(d)) {
                filename.value =
                    `España${tipo.value}_commands_${monthToken(d)}_${d.getFullYear()}_001.txt`;
            }
        } catch (_) {
            // silencioso
        }
    }

    // ===== Eventos de UI =====
    if (periodicidad) periodicidad.addEventListener("change", updateTipos);
    if (tipo) tipo.addEventListener("change", () => { toggleControls(); suggestFilename(); });
    if (inicio) inicio.addEventListener("change", suggestFilename);

    updateTipos(); // Inicializar al cargar

    // ===== Formato de salida =====
    function wrap(core) {
        if (!formato) return core;
        const mode = formato.value;
        if (mode === "comma")   return `'${core}',`;
        if (mode === "nocomma") return `'${core}'`;
        return core;
    }

    // ===== Construcción de líneas =====
    function makeLine({ exePath, tipo, start, end, tzStr, periodicidad, game }) {
        const base = `${exePath} --report.type=${tipo}`;

        if (periodicidad === "Diario") {
            return wrap(`${base} --periodicity=Daily --report.start=${fmtDateTime(start)}${tzStr}`);
        }

        if (periodicidad === "Mensual") {
            const extra = (tipo === "OPT" || tipo === "BOT") && game ? ` --game.type=${game}` : "";
            return wrap(`${base}${extra} --periodicity=Monthly --report.start=${fmtDateTime(start)}${tzStr}`);
        }

        // Horario: bloques de 1 hora con start y end
        const extra = tipo === "JUC" && game ? ` --game.type=${game}` : "";
        return wrap(`${base}${extra} --report.start=${fmtDateTime(start)}${tzStr} --report.end=${fmtDateTime(end)}${tzStr}`);
    }

    // ===== Validación =====
    function validate() {
        if (!inicio || !fin)             throw new Error("Indica fecha inicio y fin.");
        if (!inicio.value || !fin.value) throw new Error("Indica fecha inicio y fin.");

        const d0 = parseDateOnly(inicio.value);
        const d1 = parseDateOnly(fin.value);
        if (d1 < d0) throw new Error("Fin anterior a inicio.");

        if (periodicidad && periodicidad.value === "Horario") {
            const hs = +hstart.value;
            const he = +hend.value;
            if (!Number.isInteger(hs) || !Number.isInteger(he)) throw new Error("Horas no válidas.");
            if (hs < 0 || hs > 23) throw new Error("Inicio 0–23.");
            if (he < 1 || he > 24) throw new Error("Fin 1–24.");
            if (he <= hs)          throw new Error("Fin > inicio.");
        }
    }

    // ===== Generación de comandos =====
    function generate() {
        try {
            validate();
            if (!tz || !exe || !periodicidad || !tipo || !out) return;

            const tzStr   = tz.value;
            const exePath = exe.value.trim();
            const per     = periodicidad.value;
            const t       = tipo.value;
            const game    = gametype?.value;

            let current   = parseDateOnly(inicio.value);
            const last    = parseDateOnly(fin.value);
            const lines   = [];

            while (current <= last) {
                const y  = current.getFullYear();
                const mo = current.getMonth();
                const d  = current.getDate();

                if (per === "Horario") {
                    const hs = +hstart.value;
                    const he = +hend.value;
                    for (let h = hs; h < he; h++) {
                        const start = new Date(y, mo, d, h, 0, 0);
                        const end   = addHours(start, 1);
                        lines.push(makeLine({ exePath, tipo: t, start, end, tzStr, periodicidad: per, game }));
                    }
                } else if (per === "Diario") {
                    const start = new Date(y, mo, d, 0, 0, 0);
                    lines.push(makeLine({ exePath, tipo: t, start, tzStr, periodicidad: per, game }));
                } else {
                    // Mensual: solo un comando (día 1 del mes de inicio)
                    const start = new Date(y, mo, 1, 0, 0, 0);
                    lines.push(makeLine({ exePath, tipo: t, start, tzStr, periodicidad: per, game }));
                    break;
                }

                current = addDays(current, 1);
            }

            const newText = lines.join("\n");
            saveToHistory(newText, 'ipv_hist_espana');
            out.value = out.value ? out.value + makeSeparator() + newText : newText;
            updateCounter(document.getElementById('counter'), newText);

        } catch (err) {
            showToast(err.message || String(err));
        }
    }

    // ===== Acciones de botones =====
    const copyOutput = async () => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(out.value);
            } else {
                out.select();
                document.execCommand("copy");
            }
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

    if (btnGenerate) btnGenerate.addEventListener("click", generate);
    if (btnCopy && out) btnCopy.addEventListener("click", copyOutput);

    const btnExport = $("#btnExport");
    if (btnExport && out) btnExport.addEventListener("click", () => {
        exportTxt(out.value, `espana_comandos_${new Date().toISOString().slice(0, 10)}.txt`);
    });

    initDateShortcuts();
    initExeStorage(exe, DEFAULT_EXE, "ipv_exe_espana");
    initOutputPersistence(out, "ipv_out_espana");
    initOutputEditor(out);
    initClearConfirm(btnClear, out);
    initToolTracking();

    initPresets(['periodicidad', 'tipo', 'inicio', 'fin', 'tz'], 'ipv_presets_espana', document.querySelector('fieldset'));
    const _saveForm = initFormPersistence(['inicio', 'fin', 'tz'], 'ipv_form_espana');
    if (btnGenerate) btnGenerate.addEventListener('click', _saveForm);
    initGenerationHistory(out, document.querySelector('.actions'), 'ipv_hist_espana');
    [inicio, fin].forEach(inp => inp?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); generate(); }
    }));

});
