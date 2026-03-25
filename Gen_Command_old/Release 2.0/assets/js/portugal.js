document.addEventListener("DOMContentLoaded", () => {

    const tiposPorPeriodicidad = {
        Diario: ["EXCL", "RESF"],
        Horario: ["AJOG", "JGDR", "SESS", "TRAN"],
    };

    const $ = (s) => document.querySelector(s);
    const periodicidad = $("#periodicidad");
    const tipo = $("#tipo");
    const tz = $("#tz");
    const jar = $("#jar");
    const inicio = $("#inicio");
    const fin = $("#fin");
    const hstart = $("#hstart");
    const hend = $("#hend");
    const horasBox = $("#horasBox");
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
        const list = tiposPorPeriodicidad[periodicidad.value] || [];

        tipo.innerHTML = "";
        list.forEach(t => {
            const opt = document.createElement("option");
            opt.value = opt.textContent = t;
            tipo.appendChild(opt);
        });

        if (list.length) tipo.value = list[0];

        toggleHoras();
        suggestFilename();
    }

    function toggleHoras() {
        horasBox.classList.toggle("hidden", periodicidad.value !== "Horario");
    }

    function suggestFilename() {
        if (!filename) return;
        try {
            const d = new Date(inicio.value);
            if (!isNaN(d)) {
                const token = monthToken(d) + "_" + d.getFullYear();
                filename.value = `Portugal${tipo.value}_commands_${token}_001.txt`;
            }
        } catch { }
    }

    periodicidad.addEventListener("change", updateTipos);
    tipo.addEventListener("change", suggestFilename);
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

    function addDays(dt, n) { const nd = new Date(dt); nd.setDate(nd.getDate() + n); return nd; }
    function addHours(dt, n) { const nd = new Date(dt); nd.setHours(nd.getHours() + n); return nd; }

    function makeLine(jarName, tipo, start, end, tzStr, mode) {
        const core = `java -jar ${jarName} --report.type=${tipo} --report.start=${fmtDateTime(start)}${tzStr} --report.end=${fmtDateTime(end)}${tzStr}`;
        if (mode === "comma") return `'${core}',`;
        if (mode === "nocomma") return `'${core}'`;
        return core;
    }

    function validate() {
        if (!inicio.value || !fin.value)
            throw new Error("Debes indicar fecha inicio y fin.");

        const d0 = parseDateOnly(inicio.value);
        const d1 = parseDateOnly(fin.value);

        if (d1 < d0)
            throw new Error("La fecha fin no puede ser anterior a la fecha inicio.");

        if (periodicidad.value === "Horario") {
            const hs = +hstart.value;
            const he = +hend.value;

            if (!(Number.isInteger(hs) && Number.isInteger(he)))
                throw new Error("Horas no válidas.");

            if (hs < 0 || hs > 23) throw new Error("Hora inicio debe estar entre 0 y 23.");
            if (he < 1 || he > 24) throw new Error("Hora fin debe estar entre 1 y 24.");

            if (he <= hs) throw new Error("Hora fin debe ser mayor que inicio.");
        }
    }

    function generate() {
        try {
            validate();

            const tzStr = tz.value;
            const jarName = jar.value.trim();
            const mode = formato.value;

            let current = parseDateOnly(inicio.value);
            const last = parseDateOnly(fin.value);

            const lines = [];

            while (current <= last) {

                if (periodicidad.value === "Horario") {
                    const hs = +hstart.value;
                    const he = +hend.value;

                    for (let h = hs; h < he; h++) {
                        const start = new Date(current.getFullYear(), current.getMonth(), current.getDate(), h, 0, 0);
                        const end = addHours(start, 1);

                        lines.push(makeLine(jarName, tipo.value, start, end, tzStr, mode));
                    }

                } else {  // Diario
                    const start = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0);
                    const end = addDays(start, 1);
                    lines.push(makeLine(jarName, tipo.value, start, end, tzStr, mode));
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
