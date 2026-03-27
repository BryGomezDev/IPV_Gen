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
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/IPV_CommandWeb/config.json', false); // false = síncrono
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
