document.addEventListener("DOMContentLoaded", () => {
    // Tipos por periodicidad según tu app de escritorio
    const TIPOS = {
        Diario: ["CJT", "CJD", "RUD"],
        Horario: ["JUC"],
        Mensual: ["CJT", "CJD", "RUT", "RUD", "OPT", "BOT"],
    };

    // Game types por contexto
    const GAME_HORARIO_JUC = ["SES", "RAC"]; // Sólo si periodicidad=Horario y tipo=JUC
    const GAME_MENSUAL_OPT_BOT = ["AZA", "RLT", "BLJ", "AOC"]; // Sólo mensual cuando tipo ∈ {OPT,BOT}

    const $ = (s) => document.querySelector(s);

    const periodicidad = $("#periodicidad");
    const tipo = $("#tipo");
    const tz = $("#tz");
    const exe = $("#exe");
    const inicio = $("#inicio");
    const fin = $("#fin");
    const hstart = $("#hstart");
    const hend = $("#hend");
    const horasBox = $("#horasBox");
    const gameBox = $("#gameBox");
    const gametype = $("#gametype");
    const formato = $("#comillas");
    const filename = $("#filename"); // está comentado en el HTML, no pasa nada
    const out = $("#output");

    const btnGenerate = $("#btnGenerate");
    const btnCopy = $("#btnCopy");
    const btnClear = $("#btnClear");

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
                setTimeout(() => msg.style.display = "none", 2000);
            }
        } catch {
            out.select();
            document.execCommand("copy");
        }
    };

    const clearOutput = () => {
        out.value = "";
    };


    // const btnDownload = $("#btnDownload"); // si lo vuelves a usar

    const todayISO = () => new Date().toISOString().slice(0, 10);
    if (inicio) inicio.value = todayISO();
    if (fin) fin.value = todayISO();

    function monthToken(d) {
        const meses = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        return meses[d.getMonth()];
    }

    function updateTipos() {
        if (!tipo || !periodicidad) return;

        const list = TIPOS[periodicidad.value] || [];
        tipo.innerHTML = "";
        for (const t of list) {
            const opt = document.createElement("option");
            opt.value = opt.textContent = t;
            tipo.appendChild(opt);
        }
        if (list.length) {
            tipo.value = list[0];
        }
        toggleControls();
        suggestFilename();
    }

    function toggleControls() {
        if (!periodicidad || !tipo) return;

        const per = periodicidad.value;
        const t = tipo.value;

        if (horasBox) {
            horasBox.classList.toggle("hidden", per !== "Horario");
        }

        // GameType visibilidad + valores
        let showGame = false;
        let values = [];
        if (per === "Horario" && t === "JUC") {
            showGame = true;
            values = GAME_HORARIO_JUC;
        }
        if (per === "Mensual" && (t === "OPT" || t === "BOT")) {
            showGame = true;
            values = GAME_MENSUAL_OPT_BOT;
        }

        if (gameBox) {
            gameBox.classList.toggle("hidden", !showGame);
        }

        if (showGame && gametype) {
            gametype.innerHTML = "";
            values.forEach((v) => {
                const o = document.createElement("option");
                o.value = o.textContent = v;
                gametype.appendChild(o);
            });
        }
    }

    function suggestFilename() {
        try {
            if (!inicio || !tipo || !filename) return;
            const d = new Date(inicio.value);
            if (!isNaN(d)) {
                const token = monthToken(d) + "_" + d.getFullYear();
                filename.value = `España${tipo.value}_commands_${token}_001.txt`;
            }
        } catch (_) {
            // silencioso
        }
    }

    if (periodicidad) {
        periodicidad.addEventListener("change", updateTipos);
    }
    if (tipo) {
        tipo.addEventListener("change", () => {
            toggleControls();
            suggestFilename();
        });
    }
    if (inicio) {
        inicio.addEventListener("change", suggestFilename);
    }

    // Inicializar tipos y visibilidad al cargar
    updateTipos();

    function fmtDateTime(dt) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
            dt.getDate()
        )}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
    }

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

    function wrap(core) {
        if (!formato) return core;
        const mode = formato.value;
        if (mode === "comma") return `'${core}',`;
        if (mode === "nocomma") return `'${core}'`;
        return core;
    }

    function makeLine({ exePath, tipo, start, end, tzStr, periodicidad, game }) {
        const base = `${exePath} --report.type=${tipo}`;

        if (periodicidad === "Diario") {
            const core = `${base} --periodicity=Daily --report.start=${fmtDateTime(
                start
            )}${tzStr}`;
            return wrap(core);
        }

        if (periodicidad === "Mensual") {
            const extra =
                (tipo === "OPT" || tipo === "BOT") && game ? ` --game.type=${game}` : "";
            const core = `${base}${extra} --periodicity=Monthly --report.start=${fmtDateTime(
                start
            )}${tzStr}`;
            return wrap(core);
        }

        // Horario, bloques de 1h
        const extra = tipo === "JUC" && game ? ` --game.type=${game}` : "";
        const core = `${base}${extra} --report.start=${fmtDateTime(
            start
        )}${tzStr} --report.end=${fmtDateTime(end)}${tzStr}`;
        return wrap(core);
    }

    function validate() {
        if (!inicio || !fin) throw new Error("Indica fecha inicio y fin.");

        if (!inicio.value || !fin.value) throw new Error("Indica fecha inicio y fin.");
        const d0 = parseDateOnly(inicio.value);
        const d1 = parseDateOnly(fin.value);
        if (d1 < d0) throw new Error("Fin anterior a inicio.");

        if (periodicidad && periodicidad.value === "Horario") {
            const hs = +hstart.value;
            const he = +hend.value;
            if (!(Number.isInteger(hs) && Number.isInteger(he)))
                throw new Error("Horas no válidas.");
            if (hs < 0 || hs > 23) throw new Error("Inicio 0–23");
            if (he < 1 || he > 24) throw new Error("Fin 1–24");
            if (he <= hs) throw new Error("Fin > inicio");
        }
    }

    function generate() {
        try {
            validate();
            if (!tz || !exe || !periodicidad || !tipo || !out) return;

            const tzStr = tz.value;
            const exePath = exe.value.trim();
            let current = parseDateOnly(inicio.value);
            const last = parseDateOnly(fin.value);
            const lines = [];
            const per = periodicidad.value;
            const t = tipo.value;
            const game = gametype ? gametype.value : undefined;

            while (current <= last) {
                if (per === "Horario") {
                    const hs = +hstart.value;
                    const he = +hend.value;
                    for (let h = hs; h < he; h++) {
                        const start = new Date(
                            current.getFullYear(),
                            current.getMonth(),
                            current.getDate(),
                            h,
                            0,
                            0
                        );
                        const end = addHours(start, 1);
                        lines.push(
                            makeLine({
                                exePath,
                                tipo: t,
                                start,
                                end,
                                tzStr,
                                periodicidad: per,
                                game,
                            })
                        );
                    }
                } else if (per === "Diario") {
                    const start = new Date(
                        current.getFullYear(),
                        current.getMonth(),
                        current.getDate(),
                        0,
                        0,
                        0
                    );
                    lines.push(
                        makeLine({
                            exePath,
                            tipo: t,
                            start,
                            tzStr,
                            periodicidad: per,
                            game,
                        })
                    );
                } else {
                    // Mensual
                    const start = new Date(
                        current.getFullYear(),
                        current.getMonth(),
                        1,
                        0,
                        0,
                        0
                    );
                    lines.push(
                        makeLine({
                            exePath,
                            tipo: t,
                            start,
                            tzStr,
                            periodicidad: per,
                            game,
                        })
                    );
                    break; // solo una vez
                }
                current = addDays(current, 1);
            }
            const newText = lines.join("\n");
            out.value = out.value ? out.value + "\n" + newText : newText;

        } catch (err) {
            alert(err.message || String(err));
        }
    }

    if (btnGenerate) {
        btnGenerate.addEventListener("click", generate);
    }

    if (btnCopy && out) {
        btnCopy.addEventListener("click", copyOutput);
    }

    if (btnClear && out) {
        btnClear.addEventListener("click", clearOutput);
    }

});
