document.addEventListener("DOMContentLoaded", () => {

    const TIPOS = {
        Diario: ["CJD", "RUT", "RUD"],
        Horario: ["JUD", "JUT"],
        Mensual: ["CJD", "RUT", "RUD", "OPT", "LIQ", "LEX", "SIPLAFT"],
    };

    const GAME_HORARIO = ["TRA", "BLJ", "RLT", "ADC", "CEV"];
    const GAME_MENSUAL_OPT = ["TRA", "BLJ", "RLT", "ADC", "CEV"];

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
    const filename = $("#filename");
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
                setTimeout(() => { msg.style.display = "none"; }, 2000);
            }
        } catch {
            out.select();
            document.execCommand("copy");
        }
    };

    const clearOutput = () => {
        out.value = "";
    };


    const todayISO = () => new Date().toISOString().slice(0, 10);
    inicio.value = todayISO();
    fin.value = todayISO();

    function monthToken(d) {
        const meses = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return meses[d.getMonth()];
    }

    function updateTipos() {
        const list = TIPOS[periodicidad.value] || [];
        tipo.innerHTML = "";
        list.forEach(t => {
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
        const t = tipo.value;

        horasBox.classList.toggle("hidden", per !== "Horario");

        let show = false, values = [];

        if (per === "Horario" && (t === "JUD" || t === "JUT")) {
            show = true;
            values = GAME_HORARIO;
        }

        if (per === "Mensual" && t === "OPT") {
            show = true;
            values = GAME_MENSUAL_OPT;
        }

        gameBox.classList.toggle("hidden", !show);

        if (show) {
            gametype.innerHTML = "";
            values.forEach(v => {
                const o = document.createElement("option");
                o.value = o.textContent = v;
                gametype.appendChild(o);
            });
        }
    }

    function suggestFilename() {
        if (!filename) return;
        try {
            const d = new Date(inicio.value);
            if (!isNaN(d)) {
                const token = monthToken(d) + "_" + d.getFullYear();
                filename.value = `Colombia${tipo.value}_commands_${token}_001.txt`;
            }
        } catch { }
    }

    periodicidad.addEventListener("change", updateTipos);
    tipo.addEventListener("change", () => { toggleControls(); suggestFilename(); });
    inicio.addEventListener("change", suggestFilename);

    updateTipos();

    function fmtDateTime(dt) {
        const pad = n => String(n).padStart(2, "0");
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
    }

    function parseDateOnly(s) {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d, 0, 0, 0);
    }

    function addDays(dt, n) { const x = new Date(dt); x.setDate(x.getDate() + n); return x; }
    function addHours(dt, n) { const x = new Date(dt); x.setHours(x.getHours() + n); return x; }

    function wrap(core) {
        const mode = formato.value;
        if (mode === "comma") return `'${core}',`;
        if (mode === "nocomma") return `'${core}'`;
        return core;
    }

    function makeLine({ exePath, tipo, start, end, tzStr, periodicidad, game }) {
        const base = `${exePath} --report.type=${tipo}`;

        if (periodicidad === "Diario") {
            return wrap(`${base} --periodicity=Daily --report.start=${fmtDateTime(start)}${tzStr}`);
        }

        if (periodicidad === "Mensual") {
            const extra = (tipo === "OPT" && game) ? ` --game.type=${game}` : "";
            return wrap(`${base}${extra} --periodicity=Monthly --report.start=${fmtDateTime(start)}${tzStr}`);
        }

        // Horario
        const extra = ((tipo === "JUD" || tipo === "JUT") && game) ? ` --game.type=${game}` : "";
        return wrap(`${base}${extra} --report.start=${fmtDateTime(start)}${tzStr} --report.end=${fmtDateTime(end)}${tzStr}`);
    }

    function validate() {
        if (!inicio.value || !fin.value)
            throw new Error("Indica fecha inicio y fin.");

        const d0 = parseDateOnly(inicio.value);
        const d1 = parseDateOnly(fin.value);

        if (d1 < d0) throw new Error("Fin anterior a inicio.");

        if (periodicidad.value === "Horario") {
            const s = +hstart.value;
            const e = +hend.value;

            if (isNaN(s) || isNaN(e)) throw new Error("Horas no válidas.");

            if (e <= s) throw new Error("La hora fin debe ser mayor.");

            if (s < 0 || e > 24)
                throw new Error("Rango permitido: 0 a 24.");
        }
    }

    function generate() {
        try {
            validate();

            const tzStr = tz.value;
            const exePath = exe.value.trim();
            let current = parseDateOnly(inicio.value);
            const last = parseDateOnly(fin.value);

            const lines = [];
            const per = periodicidad.value;
            const t = tipo.value;
            const game = gametype.value;

            while (current <= last) {
                if (per === "Horario") {
                    const s = +hstart.value, e = +hend.value;

                    for (let h = s; h < e; h += 8) {
                        const start = new Date(current.getFullYear(), current.getMonth(), current.getDate(), h, 0, 0);
                        const end = addHours(start, 8);

                        lines.push(makeLine({ exePath, tipo: t, start, end, tzStr, periodicidad: per, game }));
                    }
                } else if (per === "Diario") {
                    const start = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0);
                    lines.push(makeLine({ exePath, tipo: t, start, tzStr, periodicidad: per, game }));
                } else {
                    const start = new Date(current.getFullYear(), current.getMonth(), 1, 0, 0, 0);
                    lines.push(makeLine({ exePath, tipo: t, start, tzStr, periodicidad: per, game }));
                    break;
                }

                current = addDays(current, 1);
            }

            const newText = lines.join("\n");
            out.value = out.value ? out.value + "\n" + newText : newText;


        } catch (err) {
            alert(err.message || String(err));
        }
    }

    btnGenerate.addEventListener("click", generate);
    btnCopy.addEventListener("click", copyOutput);
    btnClear.addEventListener("click", clearOutput);


});
