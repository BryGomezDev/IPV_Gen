# IPV CommandWeb — Guía de mantenimiento

Guía práctica para modificar la aplicación sin dependencia externa. Cada sección describe exactamente qué ficheros tocar y qué cambiar.

---

## Estructura del proyecto

```
IPV_CommandWeb/
├── index.html                          ← Página de inicio (índice de herramientas)
├── admin.html                          ← Panel de administración (acceso con contraseña)
├── admin.ashx                          ← Handler .NET — lee/escribe config.json (requiere IIS)
├── config.json                         ← Configuración servidor: rutas y tipos de fichero
├── assets/
│   ├── css/main.css                    ← Todos los estilos
│   ├── js/
│   │   ├── utils.js                    ← Funciones compartidas (no tocar salvo ampliación)
│   │   ├── config-loader.js            ← Carga config.json antes de que arranquen las herramientas
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

## Panel de administración (Release 3.0+)

Desde la Release 3.0 existe un **panel de administración** que permite modificar rutas de ejecutables y tipos de fichero de forma permanente en el servidor, **sin tocar código**.

### Acceso

Haz clic en el botón **"Herramientas de desarrollo"** (esquina inferior izquierda del índice) o navega directamente a `admin.html`.

- **Contraseña:** `devtools2024`
  _(Cámbiala en `admin.ashx` línea `PASSWORD` y en `admin.html` variable `PWD` — ambos deben coincidir)_

### Qué puede configurarse desde el panel

| Sección | Herramientas cubiertas |
|---|---|
| Rutas ejecutables | Todas (9 herramientas) |
| Tipos de fichero por periodicidad | ReportGenerator España / Portugal / Colombia |
| Tipos de fichero (lista plana) | ReportAnalyzer España, DWHLoader, IcsMonthlyReports |
| Módulos por grupo de prioridad | PasDataExtractor |

### Prioridad de configuración

```
localStorage del usuario  >  config.json (servidor)  >  valor hardcodeado en HTML
```

- El panel escribe en `config.json` → todos los usuarios que no hayan personalizado su ruta verán el nuevo valor automáticamente.
- El botón `↩` de cada herramienta restaura al valor de `config.json`, no al hardcodeado en HTML.

### Permisos IIS necesarios

El proceso de IIS necesita permiso de escritura sobre `config.json`:

```
icacls config.json /grant "IIS_IUSRS:(W)"
```

---

## 1. Añadir un tipo de fichero (checkbox) al DWHLoader

> **Forma recomendada (Release 3.0+):** usa el panel de administración (`admin.html`) — no requiere tocar código.

Si prefieres hacerlo manualmente o necesitas un cambio permanente en el código base:

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

> **Forma recomendada (Release 3.0+):** usa el panel de administración (`admin.html`).

Si prefieres hacerlo manualmente:

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

> **Forma recomendada (Release 3.0+):** usa el panel de administración (`admin.html`).

Si prefieres hacerlo manualmente:

**Fichero:** `herramientas/ICSMonthlyReports/icsmonthlyreports.html`

Busca `<div id="tipoMenu" class="ms-menu">` y añade:

```html
<label><input type="checkbox" name="tipoOpt" value="NuevoModulo"> NuevoModulo</label>
```

El valor se pasa al flag `-r` del comando.

---

## 4. Añadir o quitar un tipo al ReportGenerator (España / Portugal / Colombia)

> **Forma recomendada (Release 3.0+):** usa el panel de administración (`admin.html`) — edita directamente las listas por periodicidad sin tocar JS.

Si prefieres hacerlo en código:

**Ficheros JS:**
- España: `assets/js/espana.js`
- Portugal: `assets/js/portugal.js`
- Colombia: `assets/js/colombia.js`

Al principio de cada fichero hay una constante `TIPOS` (actúa como fallback si `config.json` no tiene valores):

```js
// espana.js — fallback hardcodeado
const TIPOS = window.IPV_CONFIG?.fileTypes?.espana || {
    Diario:  ["CJT", "CJD", "RUD"],
    Horario: ["JUC"],
    Mensual: ["CJT", "CJD", "RUT", "RUD", "OPT", "BOT"],
};
```

Edita el objeto del fallback para cambiar los defaults del código.

### Tipos de GameType (solo Horario/Mensual en España)

Si el tipo nuevo lleva un GameType asociado, también hay dos arrays justo debajo en `espana.js`:

```js
const GAME_HORARIO = ["SES", "RAC"];                  // GameTypes para Horario + JUC
const GAME_MENSUAL = ["AZA", "RLT", "BLJ", "AOC"];   // GameTypes para Mensual + OPT | BOT
```

Añade el GameType nuevo al array que corresponda. _(Los GameTypes no son configurables desde el panel — requieren edición de código.)_

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

> **Forma recomendada (Release 3.0+):** usa el panel de administración (`admin.html`), sección **"Rutas ejecutables"**. El cambio se persiste en `config.json` y todos los usuarios que no hayan personalizado su ruta lo verán en la próxima carga.

Si prefieres hacerlo en el código base (como fallback hardcodeado):

La ruta fallback está en el atributo `value` del campo `#exe` dentro del HTML de cada herramienta.

**Ejemplo** — `herramientas/ReportAnalyzer/reportanalyzerspain.html`:

```html
<input id="exe" type="text" value="C:\services\services_ics\ReportAnalyzer\DGOJReportAnalyzer.exe" />
```

> **Prioridad de carga:** `localStorage` del usuario → `config.json` → `value` del HTML.
> El botón `↩` restaura al valor de `config.json` (o al `value` del HTML si `config.json` no tiene entrada para esa herramienta).

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

| Cambio | Método recomendado | Alternativa en código |
|---|---|---|
| Añadir/quitar tipo DWHLoader | Panel admin → Tipos de fichero | `herramientas/DWHLoader/dwhloader.html` |
| Añadir/quitar tipo ReportAnalyzer | Panel admin → Tipos de fichero | `reportanalyzerspain.html` o `reportanalyzerportugal.html` |
| Añadir/quitar tipo IcsMonthlyReports | Panel admin → Tipos de fichero | `herramientas/ICSMonthlyReports/icsmonthlyreports.html` |
| Añadir/quitar tipo ReportGenerator | Panel admin → Tipos de fichero | `assets/js/espana.js` / `portugal.js` / `colombia.js` (fallback `TIPOS`) |
| Cambiar ruta ejecutable por defecto | Panel admin → Rutas ejecutables | HTML de la herramienta (atributo `value` del `#exe`) |
| Añadir/quitar módulo PasDataExtractor | Panel admin → Módulos PDE | `assets/js/pde.js` (array `MODULE_GROUPS`) |
| Añadir legislación IcsMonthlyReports | Solo en código | `icsmonthlyreports.html` (option) + `icsmonthlyreports.js` (`LEGISLATION_CONFIG`) |
| Añadir GameType España/Colombia | Solo en código | `assets/js/espana.js` / `colombia.js` (`GAME_HORARIO`, `GAME_MENSUAL`) |
| Renombrar herramienta | Solo en código | HTML + `index.html` + (opcional) claves en JS |
| Cambiar formato del comando | Solo en código | JS de la herramienta (`buildOutputText` o `buildCommands`) |
| Nueva herramienta | Solo en código | Nueva carpeta + HTML + JS + entrada en `index.html` |

### Módulos del PasDataExtractor (fallback en código)

Si el panel de admin no está disponible, los módulos del PDE se definen en `assets/js/pde.js`. Cada sub-array es un grupo de prioridad:

```js
// Fallback hardcodeado (se usa si config.json no tiene valores para 'pde')
return [
    ['User', 'Tournament'],
    ['Alias', 'LoginHistory', ...],
    // ...
];
```

Para añadir un módulo nuevo en código, agrégalo al sub-array del grupo de prioridad que corresponda.
