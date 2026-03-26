/**
 * config-loader.js
 * Carga config.json de forma síncrona ANTES de que los scripts de herramientas
 * (defer) se ejecuten y expone el resultado en window.IPV_CONFIG.
 *
 * IMPORTANTE: incluir este script SIN atributo defer en el <head>,
 * justo antes de los scripts de utils.js y de la herramienta.
 */
(function () {
    try {
        // Calcular la ruta relativa a la raíz según la profundidad del pathname.
        // Ejemplos:
        //   /index.html                                    → depth 0 → prefix ''
        //   /herramientas/DWHLoader/dwhloader.html         → depth 2 → prefix '../../'
        var slashes = (window.location.pathname.match(/\//g) || []).length;
        var depth   = Math.max(0, slashes - 1);
        var prefix  = depth > 0 ? new Array(depth + 1).join('../') : '';

        var xhr = new XMLHttpRequest();
        xhr.open('GET', prefix + 'config.json', false); // false = síncrono
        xhr.send(null);

        if (xhr.status === 200 && xhr.responseText) {
            window.IPV_CONFIG = JSON.parse(xhr.responseText);
        } else {
            window.IPV_CONFIG = null;
        }
    } catch (e) {
        // Si falla (servidor sin config.json, red, JSON malformado, etc.)
        // las herramientas usan sus valores hardcodeados por defecto.
        window.IPV_CONFIG = null;
    }
}());
