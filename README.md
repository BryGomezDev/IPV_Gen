# IPV CommandWeb — Guía de mantenimiento

Guía práctica para modificar la aplicación sin dependencia externa. Cada sección describe exactamente qué ficheros tocar y qué cambiar.

---

## Estructura del proyecto

```
IPV_CommandWeb/
├── index.html                          ← Página de inicio (índice de herramientas)
├── assets/
│   ├── css/main.css                    ← Todos los estilos
│   ├── js/
│   │   ├── utils.js                    ← Funciones compartidas (no tocar salvo ampliación)
│   │   ├── index.js                    ← Lógica del índice (búsqueda, último usado)
│   │   ├── espana.js                   ← Lógica ReportGenerator España
│   │   ├── portugal.js                 ← Lógica ReportGenerator Portugal
│   │   ├── colombia.js                 ← Lógica ReportGenerator Colombia
│   │   ├── reportanalyzer.js           ← Lógica ReportAnalyzer (España y Portugal comparten JS)
│   │   ├── dwhloader.js                ← Lógica DWHLoader
│   │   ├── icsmonthlyreports.js        ← Lógica IcsMonthlyReports
│   │   ├── migrationchecker.js         ← Lógica MigrationChecker
│   │   └── pde.js                      ← Lógica PasDataExtractor
│   └── favicon.svg
├── faq/faq.html                        ← Guía de usuario
└── herramientas/
    ├── ReportGenerator/
    │   ├── espana.html
    │   ├── portugal.html
    │   └── colombia.html
    ├── ReportAnalyzer/
    │   ├── reportanalyzerspain.html
    │   └── reportanalyzerportugal.html
    ├── DWHLoader/dwhloader.html
    ├── ICSMonthlyReports/icsmonthlyreports.html
    ├── MigrationChecker/migrationchecker.html
    └── PasDataExtractor/pde.html
```

---

## 1. Añadir un tipo de fichero (checkbox) al DWHLoader

Los tipos del DWHLoader son checkboxes definidos directamente en el HTML.

**Fichero:** `herramientas/DWHLoader/dwhloader.html`

Busca el bloque `<div id="tipoMenu" class="ms-menu">` y añade una línea más:

```html
<div id="tipoMenu" class="ms-menu" aria-hidden="true">
  <label><input type="checkbox" name="tipoOpt" value="player"> player</label>
  <label><input type="checkbox" name="tipoOpt" value="operatorIncomes"> operatorIncomes</label>
  <label><input type="checkbox" name="tipoOpt" value="nuevoTipo"> nuevoTipo</label>  <!-- NUEVO -->
</div>
```

El valor de `value` es exactamente lo que se insertará en el comando generado (`-m nuevoTipo`).

---

## 2. Añadir un tipo de fichero al ReportAnalyzer (España o Portugal)

Igual que el DWHLoader, los tipos son checkboxes en el HTML.

**Ficheros:**
- España: `herramientas/ReportAnalyzer/reportanalyzerspain.html`
- Portugal: `herramientas/ReportAnalyzer/reportanalyzerportugal.html`

Busca `<div id="tipoMenu" class="ms-menu">` y añade:

```html
<label><input type="checkbox" name="tipoOpt" value="NUE"> NUE</label>  <!-- NUEVO -->
```

El valor se pasa al flag `--type=` del comando.

---

## 3. Añadir un tipo de fichero al IcsMonthlyReports

**Fichero:** `herramientas/ICSMonthlyReports/icsmonthlyreports.html`

Busca `<div id="tipoMenu" class="ms-menu">` y añade:

```html
<label><input type="checkbox" name="tipoOpt" value="NuevoModulo"> NuevoModulo</label>
```

El valor se pasa al flag `-r` del comando.

---

## 4. Añadir o quitar un tipo al ReportGenerator (España / Portugal / Colombia)

En el ReportGenerator los tipos NO están en el HTML, sino en una constante del JS que los asigna por periodicidad.

**Ficheros JS:**
- España: `assets/js/espana.js`
- Portugal: `assets/js/portugal.js`
- Colombia: `assets/js/colombia.js`

Al principio de cada fichero hay una constante `TIPOS`:

```js
// espana.js — ejemplo actual
const TIPOS = {
    Diario:  ["CJT", "CJD", "RUD"],
    Horario: ["JUC"],
    Mensual: ["CJT", "CJD", "RUT", "RUD", "OPT", "BOT"],
};
```

Para añadir un tipo, simplemente agrega el string al array de la periodicidad que corresponda:

```js
const TIPOS = {
    Diario:  ["CJT", "CJD", "RUD", "NUE"],  // añadido NUE a Diario
    Horario: ["JUC"],
    Mensual: ["CJT", "CJD", "RUT", "RUD", "OPT", "BOT"],
};
```

### Tipos de GameType (solo Horario/Mensual en España)

Si el tipo nuevo lleva un GameType asociado, también hay dos arrays justo debajo:

```js
const GAME_HORARIO = ["SES", "RAC"];                  // GameTypes para Horario + JUC
const GAME_MENSUAL = ["AZA", "RLT", "BLJ", "AOC"];   // GameTypes para Mensual + OPT | BOT
```

Añade el GameType nuevo al array que corresponda.

---

## 5. Añadir una nueva legislación al IcsMonthlyReports

Son necesarios dos cambios: uno en el HTML y otro en el JS.

### 5a. Añadir la opción en el desplegable

**Fichero:** `herramientas/ICSMonthlyReports/icsmonthlyreports.html`

```html
<select id="legislation">
  <option value="ES" selected>España</option>
  <option value="PT">Portugal</option>  <!-- NUEVO — el value es la clave interna -->
</select>
```

### 5b. Añadir la configuración de timezone

**Fichero:** `assets/js/icsmonthlyreports.js`

Busca `const LEGISLATION_CONFIG` y añade la nueva legislación con sus timezones por trimestre:

```js
const LEGISLATION_CONFIG = {
    ES: {
        name: "España",
        quarters: {
            Q1: "+02:00",
            Q2: "+02:00",
            Q3: "+02:00",
            Q4: "+01:00"
        }
    },
    PT: {                   // NUEVO — la clave debe coincidir con el value del <option>
        name: "Portugal",
        quarters: {
            Q1: "+01:00",
            Q2: "+01:00",
            Q3: "+01:00",
            Q4: "+00:00"
        }
    }
};
```

---

## 6. Renombrar una herramienta (ejemplo: ReportAnalyzer → ReportAnalyzerManual)

Son cuatro pasos.

### 6a. Renombrar (o duplicar) el fichero HTML

Renombra o copia el fichero de la herramienta:
```
herramientas/ReportAnalyzer/reportanalyzerspain.html
→
herramientas/ReportAnalyzer/reportanalyzermanualspain.html
```

### 6b. Actualizar título y cabecera dentro del HTML

Abre el fichero y cambia:
```html
<title>Generador de Comandos — ReportAnalyzer</title>
...
<h1>Generador de Comandos — ReportAnalyzer</h1>
```
por:
```html
<title>Generador de Comandos — ReportAnalyzerManual</title>
...
<h1>Generador de Comandos — ReportAnalyzerManual</h1>
```

### 6c. Actualizar el enlace en el índice

**Fichero:** `index.html`

Cambia el `href` y el texto del enlace correspondiente:

```html
<!-- Antes -->
<a href="herramientas/ReportAnalyzer/reportanalyzerspain.html"
   class="button" data-tool="ReportAnalyzer España">ReportAnalyzer</a>

<!-- Después -->
<a href="herramientas/ReportAnalyzer/reportanalyzermanualspain.html"
   class="button" data-tool="ReportAnalyzerManual España">ReportAnalyzerManual</a>
```

> El atributo `data-tool` solo se usa para el buscador del índice. Pon palabras clave que ayuden a encontrarla.

### 6d. (Opcional) Actualizar las claves de localStorage en el JS

Si quieres conservar el historial y presets guardados bajo el nuevo nombre, **no cambies nada** en el JS: los datos antiguos seguirán disponibles.

Si prefieres empezar con localStorage limpio para la herramienta renombrada, cambia las claves en `assets/js/reportanalyzer.js`. Busca todas las ocurrencias de `reportanalyzer` y cámbialas por el nuevo nombre:

```js
// Antes
saveToHistory(newText, 'ipv_hist_reportanalyzer_es');
initExeStorage(exe, DEFAULT_EXE, "ipv_exe_reportanalyzer_es");
initOutputPersistence(out, "ipv_out_reportanalyzer_es");
...

// Después
saveToHistory(newText, 'ipv_hist_reportanalyzermanual_es');
initExeStorage(exe, DEFAULT_EXE, "ipv_exe_reportanalyzermanual_es");
initOutputPersistence(out, "ipv_out_reportanalyzermanual_es");
...
```

---

## 7. Añadir una herramienta completamente nueva

### 7a. Crear la carpeta y el HTML

Crea `herramientas/NuevaHerramienta/nuevaherramienta.html` copiando como base el HTML de una herramienta similar. La estructura mínima es:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Generador de Comandos — NuevaHerramienta</title>
  <link rel="icon" type="image/svg+xml" href="../../assets/favicon.svg">
  <link rel="stylesheet" href="../../assets/css/main.css">
  <script defer src="../../assets/js/utils.js"></script>
  <script defer src="../../assets/js/nuevaherramienta.js"></script>
</head>
<body>
  <header>
    <h1>Generador de Comandos — NuevaHerramienta</h1>
    <div class="header-top">
      <a href="../../index.html" class="btn secondary">← Volver al índice</a>
      <a href="../../faq/faq.html" class="btn secondary">Guía de usuario</a>
    </div>
  </header>

  <main class="tool-layout">
    <fieldset>
      <legend>Parámetros</legend>
      <!-- tus campos aquí -->
      <div class="actions">
        <button id="btnGenerate" class="primary">Generar</button>
        <button id="btnCopy">Copiar</button>
        <span id="copyMsg" class="muted" style="display:none;">¡Copiado!</span>
        <button id="btnClear">Limpiar</button>
        <button id="btnExport">Exportar .txt</button>
        <span id="counter" class="muted" style="font-size:12px;"></span>
      </div>
    </fieldset>

    <fieldset>
      <legend>Salida</legend>
      <textarea id="output" placeholder="Aquí aparecerán los comandos..."></textarea>
    </fieldset>
  </main>
</body>
</html>
```

### 7b. Crear el fichero JS

Crea `assets/js/nuevaherramienta.js`. Las llamadas al final del fichero son las que activan todas las funcionalidades compartidas (persistencia, historial, presets, etc.):

```js
const $ = s => document.querySelector(s);

const exe    = $('#exe');
const DEFAULT_EXE = exe ? exe.value : '';
const out    = $('#output');
const btnGenerate = $('#btnGenerate');
const btnCopy     = $('#btnCopy');
const btnClear    = $('#btnClear');

const generate = () => {
    try {
        // Construye aquí el texto del comando
        const newText = 'tu-exe --flag valor';

        if (newText?.trim()) {
            saveToHistory(newText, 'ipv_hist_nuevaherramienta');
            out.value += (out.value ? makeSeparator() : '') + newText;
        }
    } catch (err) {
        showToast(err.message || String(err));
    }
};

btnGenerate?.addEventListener('click', generate);
btnCopy?.addEventListener('click', async () => {
    await navigator.clipboard?.writeText(out.value);
});

const btnExport = $('#btnExport');
if (btnExport) btnExport.addEventListener('click', () => {
    exportTxt(out.value, `nuevaherramienta_${new Date().toISOString().slice(0,10)}.txt`);
});

initExeStorage(exe, DEFAULT_EXE, 'ipv_exe_nuevaherramienta');
initOutputPersistence(out, 'ipv_out_nuevaherramienta');
initOutputEditor(out);
initClearConfirm(btnClear, out);
initToolTracking();

const _saveForm = initFormPersistence(['campo1', 'campo2'], 'ipv_form_nuevaherramienta');
btnGenerate?.addEventListener('click', _saveForm);
initGenerationHistory(out, document.querySelector('.actions'), 'ipv_hist_nuevaherramienta');
```

> **Importante:** `initOutputEditor(out)` debe ir siempre justo después de `initOutputPersistence(out, ...)`.

### 7c. Añadir la entrada en el índice

**Fichero:** `index.html`

Añade la herramienta en la sección correspondiente (`Regulaciones` o `Herramientas`):

```html
<section class="group" data-group>
  <h2>Herramientas</h2>
  <div class="country-card" data-card>
    <a href="herramientas/NuevaHerramienta/nuevaherramienta.html"
       class="button"
       data-tool="NuevaHerramienta palabras clave búsqueda">NuevaHerramienta</a>
    <!-- ... otras herramientas ... -->
  </div>
</section>
```

O, si es una herramienta específica de un país, añade el enlace dentro de la `country-card` correspondiente.

---

## 8. Cambiar la ruta del ejecutable por defecto

La ruta que aparece al abrir la herramienta por primera vez (antes de que el usuario la cambie) está en el atributo `value` del campo `#exe` dentro del HTML de cada herramienta.

**Ejemplo** — `herramientas/ReportAnalyzer/reportanalyzerspain.html`:

```html
<input id="exe" type="text" value="C:\services\services_ics\ReportAnalyzer\DGOJReportAnalyzer.exe" />
```

Cambia ese `value`. Si el usuario ya modificó la ruta en su navegador, puede restaurar la original pulsando el botón `↩` que hay junto al campo.

> Si quieres que todos los usuarios vean la nueva ruta aunque ya la tengan guardada, también tendrás que cambiar el `value` del HTML (la lógica de restauración siempre lee el `value` original del HTML).

---

## 9. Cambiar el formato del comando generado

El comando se construye en la función `buildOutputText` (o `buildCommands` en PasDataExtractor y MigrationChecker) dentro del JS de cada herramienta. Es una cadena de texto con interpolación.

**Ejemplo** — `dwhloader.js`, función `buildOutputText`:

```js
// Línea actual
commands.push(wrap(`${exePath} -m ${type} -d ${start} ${end}`));

// Si el nuevo ejecutable usa --module en lugar de -m:
commands.push(wrap(`${exePath} --module=${type} -d ${start} ${end}`));
```

Cada herramienta tiene su propio patrón. Localiza la función de construcción del comando buscando el string del flag que quieres cambiar (p. ej. `--type=`, `-r `, `-d `) dentro del JS correspondiente.

---

## Referencia rápida: qué fichero toca cada cambio

| Cambio | Fichero(s) a modificar |
|---|---|
| Añadir tipo DWHLoader | `herramientas/DWHLoader/dwhloader.html` |
| Añadir tipo ReportAnalyzer | `herramientas/ReportAnalyzer/reportanalyzerspain.html` o `reportanalyzerportugal.html` |
| Añadir tipo IcsMonthlyReports | `herramientas/ICSMonthlyReports/icsmonthlyreports.html` |
| Añadir tipo ReportGenerator | `assets/js/espana.js` / `portugal.js` / `colombia.js` (constante `TIPOS`) |
| Añadir legislación IcsMonthlyReports | `icsmonthlyreports.html` (option) + `assets/js/icsmonthlyreports.js` (`LEGISLATION_CONFIG`) |
| Renombrar herramienta | HTML de la herramienta + `index.html` + (opcional) claves en el JS |
| Cambiar ruta ejecutable por defecto | HTML de la herramienta (atributo `value` del `#exe`) |
| Cambiar formato del comando | JS de la herramienta (función `buildOutputText` o `buildCommands`) |
| Nueva herramienta | Nueva carpeta + nuevo HTML + nuevo JS + entrada en `index.html` |
| Añadir módulo PasDataExtractor | `assets/js/pde.js` (array `MODULE_GROUPS`) |

### Módulos del PasDataExtractor

Los módulos del PDE se definen en `assets/js/pde.js` en el array `MODULE_GROUPS`. Cada sub-array es un grupo de prioridad (el orden determina en qué secuencia se generan los comandos):

```js
const MODULE_GROUPS = [
    ['User', 'Tournament'],
    ['Alias', 'LoginHistory', ...],
    // ...
];
```

Para añadir un módulo nuevo, agrégalo al sub-array del grupo de prioridad que corresponda, o crea un nuevo sub-array al final para el grupo de menor prioridad.
