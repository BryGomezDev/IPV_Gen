(() => {
    'use strict';

    // --- Referencias a elementos básicos ---
    const inicio = document.querySelector('#inicio');
    const fin = document.querySelector('#fin');
    const tzSelect = document.querySelector('#tz');
    const exe = document.querySelector('#exe');
    const out = document.querySelector('#output');
    const generateBtn = document.querySelector('#btnGenerate');
    const formatoSelect = document.querySelector('#comillas');
    const copyBtn = document.querySelector('#btnCopy');
    const clearBtn = document.querySelector('#btnClear');
    const copyMsg = document.querySelector('#copyMsg');



    // Selector de modo -e (manual / automatic)
    const execModeSelect = document.querySelector('#execMode');

    // --- Elementos para la ventana de módulos ---
    const modulesBtn = document.querySelector('#modulesBtn');
    const modulesModal = document.querySelector('#modulesModal');
    const modulesOkBtn = document.querySelector('#modulesOk');
    const modulesCancelBtn = document.querySelector('#modulesCancel');
    const modulesSummary = document.querySelector('#modulesSummary');
    const modulesSelectAllBtn = document.querySelector('#modulesSelectAll');
    const modulesSelectNoneBtn = document.querySelector('#modulesSelectNone');

    // -------------------------------
    //  Configuración de módulos
    // -------------------------------

    const MODULE_GROUPS = [
        ['User', 'Tournament'],
        [
            'Alias',
            'LoginHistory',            // (Colombia)
            'LoginHistoryDetail',      // (Spain, Brazil & Portugal)
            'AutoExclusion',
            'DepositLimits',
            'UserAccount',
            'UserStatus',              // (Spain, Brazil & Colombia)
            'SRIJUserStatus',          // (Portugal)
            'UserData',
            'UserDocumentVerification',
            'BetEvent',
            'PendingVerification',
            'UserRegistrySession'
        ],
        [
            'CurrentDepositLimits',
            'Adjustments',
            'DepositWithdrawal',
            'ParticipationBySession',
            'BetSystemParticipation',
            'BetNotSystemParticipation',
            'SlotsSession'
        ],
        [
            'Balances',
            'ParticipationUnits',
            'SlotsParticipationUnits',
            'BetSystemParticipationUnits',
            'CancelUnits',
            'BetSystemCancelUnits',
            'Jackpot'
        ],
        [
            'JackpotUnit',
            'AutoExclusionRevocation',
            'AutoExclusionExpired',
            'RoundsDetails'
        ]
    ];

    const MODULE_PRIORITY = (() => {
        const map = {};
        MODULE_GROUPS.forEach((group, idx) => {
            group.forEach(m => { map[m] = idx; });
        });
        return map;
    })();

    // -------------------------------
    //  Utilidades de fechas
    // -------------------------------

    // Defaults
    const todayISO = () => new Date().toISOString().slice(0, 10);
    if (inicio && !inicio.value) inicio.value = todayISO();
    if (fin && !fin.value) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        fin.value = d.toISOString().split("T")[0];
    }

    function parseDateOnly(str) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function addDays(date, days) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    }

    function pad(n, width = 2) {
        return String(n).padStart(width, '0');
    }

    function formatExtractorDate(date, tzOffset) {
        const y = date.getFullYear();
        const m = pad(date.getMonth() + 1);
        const d = pad(date.getDate());
        return `${y}-${m}-${d}T00:00:00.0000000${tzOffset}`;
    }

    function getTzOffset() {
        return (tzSelect && tzSelect.value)
            ? tzSelect.value.trim()
            : '+01:00';
    }

    function getExecMode() {
        const val = execModeSelect && execModeSelect.value
            ? execModeSelect.value.trim()
            : 'manual';
        return val || 'manual';
    }

    // -------------------------------
    //  Formato de salida (comillas / comas)
    // -------------------------------
    function formatCommands(commands) {
        const mode = (formatoSelect && formatoSelect.value) ? formatoSelect.value : 'comma';

        // commands llega como array de cadenas "java -jar ..."
        if (mode === 'raw') {
            // Sin comillas ni coma
            return commands.join('\n');
        }

        // Con comillas simples alrededor de cada comando
        const withQuotes = commands.map(cmd => `'${cmd}'`);

        if (mode === 'nocomma') {
            // 'comando' (sin coma)
            return withQuotes.join('\n');
        }

        // mode === 'comma' (por defecto)
        // 'comando', (con coma)
        return withQuotes.map(c => c + ',').join('\n');
    }


    // -------------------------------
    //  Módulos seleccionados
    // -------------------------------

    function getSelectedModulesRaw() {
        const checked = document.querySelectorAll('input[name="modules"]:checked');
        return Array.from(checked)
            .map(chk => chk.value.trim())
            .filter(Boolean);
    }

    function sortModulesByPriority(modules) {
        return [...modules].sort((a, b) => {
            const pa = MODULE_PRIORITY[a] ?? 999;
            const pb = MODULE_PRIORITY[b] ?? 999;
            if (pa !== pb) return pa - pb;
            return a.localeCompare(b);
        });
    }

    function updateModulesSummary() {
        const mods = getSelectedModulesRaw();
        if (!modulesSummary) return;

        if (!mods.length) {
            // Sin módulos seleccionados = se migran todos
            modulesSummary.textContent = 'Sin selección ⇒ se migran TODOS los módulos';
            return;
        }

        // Solo mostramos el número, sin listar nombres
        modulesSummary.textContent = `${mods.length} módulo(s) seleccionados`;
    }


    // -------------------------------
    //  Validaciones
    // -------------------------------

    function validate() {
        if (!inicio.value || !fin.value) {
            throw new Error('Indica fecha inicio y fin.');
        }
        const d0 = parseDateOnly(inicio.value);
        const d1 = parseDateOnly(fin.value);
        if (d1 < d0) {
            throw new Error('La fecha fin no puede ser anterior a la fecha inicio.');
        }

        const mode = getExecMode();
        if (mode !== 'manual' && mode !== 'automatic') {
            throw new Error('Modo de ejecución no válido (usa manual o automatic).');
        }

        // Ojo: AQUÍ YA NO VALIDAMOS MÓDULOS
        // 0 módulos seleccionados = se migran todos (sin -m)
    }

    // -------------------------------
    //  Generación de comandos
    // -------------------------------

    function buildCommands() {
        try {
            validate();

            const tzOffset = getTzOffset();
            const execMode = getExecMode();
            const baseExe = (exe && exe.value.trim())
                ? exe.value.trim()
                : 'java -jar "C:\\services\\services_ics\\PASDataExtractorManual\\PASDataExtractor.jar"';

            const d0 = parseDateOnly(inicio.value);
            const d1 = parseDateOnly(fin.value);

            const selectedModules = sortModulesByPriority(getSelectedModulesRaw());
            const hasModules = selectedModules.length > 0;
            const modulesPart = hasModules ? ` -m ${selectedModules.join(' ')}` : '';

            const commands = [];
            let current = new Date(d0);

            while (current <= d1) {
                const next = addDays(current, 1);

                const fromStr = formatExtractorDate(current, tzOffset);
                const toStr = formatExtractorDate(next, tzOffset);

                // Si no hay módulos seleccionados, NO se incluye -m
                const cmd = `${baseExe} -e ${execMode}${modulesPart} -d ${fromStr} ${toStr} -sc --spring.config.location="C:\\services\\services_ics\\PASDataExtractorManual\\application.yml"`;
                commands.push(cmd);

                current = next;
            }

            if (!commands.length) return;

            const textToAppend = formatCommands(commands);

            if (out) {
                out.value = out.value
                    ? out.value + '\n' + textToAppend
                    : textToAppend;
            }

        } catch (err) {
            alert(err.message || err);
        }
    }

    // -------------------------------
    //  Ventana emergente de módulos
    // -------------------------------

    function openModulesModal() {
        if (!modulesModal) return;
        modulesModal.classList.remove('hidden');
        modulesModal.setAttribute('aria-hidden', 'false');
    }

    function closeModulesModal() {
        if (!modulesModal) return;
        modulesModal.classList.add('hidden');
        modulesModal.setAttribute('aria-hidden', 'true');
    }

    function onModulesOk() {
        updateModulesSummary();
        closeModulesModal();
    }

    function onModulesCancel() {
        closeModulesModal();
    }

    // -------------------------------
    //  Copiar y limpiar salida
    // -------------------------------
    async function copyOutput() {
        if (!out) return;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(out.value);
            } else {
                out.select();
                document.execCommand("copy");
            }
            if (copyMsg) {
                copyMsg.style.display = "inline";
                setTimeout(() => copyMsg.style.display = "none", 2000);
            }
        } catch {
            out.select();
            document.execCommand("copy");
        }
    }

    function clearOutput() {
        if (!out) return;
        out.value = "";
    }

    // -------------------------------
    //  Listeners
    // -------------------------------

    if (generateBtn) {
        generateBtn.addEventListener('click', buildCommands);
    }

    if (modulesBtn && modulesModal) {
        modulesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModulesModal();
        });
    }

    if (modulesOkBtn) {
        modulesOkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            onModulesOk();
        });
    }

    if (modulesCancelBtn) {
        modulesCancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            onModulesCancel();
        });
    }

    // Select all / none
    if (modulesSelectAllBtn) {
        modulesSelectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('input[name="modules"]').forEach(chk => {
                chk.checked = true;
            });
            updateModulesSummary();
        });
    }

    if (modulesSelectNoneBtn) {
        modulesSelectNoneBtn.addEventListener('click', () => {
            document.querySelectorAll('input[name="modules"]').forEach(chk => {
                chk.checked = false;
            });
            updateModulesSummary(); // ahora “Sin selección ⇒ se migran TODOS…”
        });
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            copyOutput();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearOutput();
        });
    }


    // Actualiza el resumen al marcar/desmarcar módulos dentro del modal
    document.addEventListener('change', (e) => {
        if (e.target && e.target.matches('input[name="modules"]')) {
            updateModulesSummary();
        }
    });

    // Inicializar resumen al cargar
    updateModulesSummary();

})();
