document.addEventListener("DOMContentLoaded", () => {

    // ===== Constantes de datos =====
    // Los valores por defecto pueden sobreescribirse desde config.json via el panel de administración.
    const TIPOS = window.IPV_CONFIG?.fileTypes?.colombia || {
        Diario:  ["CJD", "RUT", "RUD"],
        Horario: ["JUD", "JUT"],
        Mensual: ["CJD", "RUT", "RUD", "OPT", "LIQ", "LEX", "SIPLAFT"],
    };

    // Los game types de Horario y Mensual-OPT comparten los mismos valores
    const GAME_TYPES = window.IPV_CONFIG?.gameTypes?.colombia || ["TRA", "BLJ", "RLT", "ADC", "CEV"];

    // ===== Helper DOM =====
    const $ = (s) => document.querySelector(s);

    // ===== Referencias a elementos =====
    const periodicidad = $("#periodicidad");
    const tipo         = $("#tipo");
    const tz           = $("#tz");
    const exe          = $("#exe");
    if (window.IPV_CONFIG?.executables?.colombia && exe) exe.value = window.IPV_CONFIG.executables.colombia;
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
        const list = TIPOS[periodicidad.value] || [];
        tipo.innerHTML = "";
        list.forEach((t) => {
            const o = document.createElement("option");
            o.value = o.textContent = t;
            tipo.appendChild(o);
        });
        if (list.length) tipo.value = list[0];
        toggleControls();
        suggestFilename();
    }

    function toggleControls() {
        const per = periodicidad.value;
        const t   = tipo.value;

        horasBox.classList.toggle("hidden", per !== "Horario");

        const showGame = (per === "Horario" && (t === "JUD" || t === "JUT"))
                      || (per === "Mensual" && t === "OPT");

        gameBox.classList.toggle("hidden", !showGame);

        if (showGame) {
            gametype.innerHTML = "";
            GAME_TYPES.forEach((v) => {
                const o = document.createElement("option");
                o.value = o.textContent = v;
                gametype.appendChild(o);
            });
        }
    }

    function suggestFilename() {
        if (!filename) return;
        try {
            // FIX: parseDateOnly evita el desfase UTC de new Date("YYYY-MM-DD")
            const d = parseDateOnly(inicio.value);
            if (!isNaN(d)) {
                filename.value =
                    `Colombia${tipo.value}_commands_${monthToken(d)}_${d.getFullYear()}_001.txt`;
            }
        } catch { }
    }

    // ===== Eventos de UI =====
    periodicidad.addEventListener("change", updateTipos);
    tipo.addEventListener("change", () => { toggleControls(); suggestFilename(); });
    inicio.addEventListener("change", suggestFilename);

    updateTipos(); // Inicializar al cargar

    // ===== Formato de salida =====
    function wrap(core) {
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
            const extra = tipo === "OPT" && game ? ` --game.type=${game}` : "";
            return wrap(`${base}${extra} --periodicity=Monthly --report.start=${fmtDateTime(start)}${tzStr}`);
        }

        // Horario: bloques de 8 horas
        const extra = (tipo === "JUD" || tipo === "JUT") && game ? ` --game.type=${game}` : "";
        return wrap(`${base}${extra} --report.start=${fmtDateTime(start)}${tzStr} --report.end=${fmtDateTime(end)}${tzStr}`);
    }

    // ===== Validación =====
    function validate() {
        if (!inicio.value || !fin.value)
            throw new Error("Indica fecha inicio y fin.");

        const d0 = parseDateOnly(inicio.value);
        const d1 = parseDateOnly(fin.value);
        if (d1 < d0) throw new Error("Fin anterior a inicio.");

        if (periodicidad.value === "Horario") {
            const hs = +hstart.value;
            const he = +hend.value;
            if (isNaN(hs) || isNaN(he)) throw new Error("Horas no válidas.");
            if (he <= hs)               throw new Error("La hora fin debe ser mayor.");
            if (hs < 0 || he > 24)      throw new Error("Rango permitido: 0 a 24.");
        }
    }

    // ===== Generación de comandos =====
    function generate() {
        try {
            validate();

            const tzStr   = tz.value;
            const exePath = exe.value.trim();
            const per     = periodicidad.value;
            const t       = tipo.value;
            const game    = gametype?.value; // FIX: gametype puede ser null

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
                    for (let h = hs; h < he; h += 8) {
                        const start = new Date(y, mo, d, h, 0, 0);
                        const end   = addHours(start, 8);
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
            saveToHistory(newText, 'ipv_hist_colombia');
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
                setTimeout(() => { msg.style.display = "none"; }, 2000);
            }
        } catch {
            out.select();
            document.execCommand("copy");
        }
    };

    btnGenerate.addEventListener("click", generate);
    btnCopy.addEventListener("click", copyOutput);

    const btnExport = $("#btnExport");
    if (btnExport && out) btnExport.addEventListener("click", () => {
        exportTxt(out.value, `colombia_comandos_${new Date().toISOString().slice(0, 10)}.txt`);
    });

    initDateShortcuts();
    initExeStorage(exe, DEFAULT_EXE, "ipv_exe_colombia");
    initOutputPersistence(out, "ipv_out_colombia");
    initOutputEditor(out);
    initClearConfirm(btnClear, out);
    initToolTracking();

    initPresets(['periodicidad', 'tipo', 'inicio', 'fin', 'tz'], 'ipv_presets_colombia', document.querySelector('fieldset'));
    const _saveForm = initFormPersistence(['inicio', 'fin', 'tz'], 'ipv_form_colombia');
    btnGenerate.addEventListener('click', _saveForm);
    initGenerationHistory(out, document.querySelector('.actions'), 'ipv_hist_colombia');
    [inicio, fin].forEach(inp => inp?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); generate(); }
    }));

});
