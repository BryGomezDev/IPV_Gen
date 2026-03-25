const INFO_VERSION = "Release 2.2";

const showInfoPopupOnce = () => {
    const key = `seen-info-${INFO_VERSION}`;
    if (localStorage.getItem(key)) return;

    // Creamos el contenedor del modal
    const modal = document.createElement("div");
    modal.className = "info-modal"; // NUEVO modal exclusivo

    // Fondo oscuro
    const backdrop = document.createElement("div");
    backdrop.className = "info-modal-backdrop";
    modal.appendChild(backdrop);

    // Contenido del modal
    const modalContent = document.createElement("div");
    modalContent.className = "info-modal-content";

    // Título
    const modalHeader = document.createElement("h2");
    modalHeader.textContent = "Novedades — Release 2.2";
    modalContent.appendChild(modalHeader);

    // Mensaje
    const modalBody = document.createElement("div");
    modalBody.style.whiteSpace = "pre-line";
    modalBody.textContent = `
Mejoras en todas las herramientas:

· El output se guarda automáticamente y se restaura al recargar la página.
· El botón Limpiar ahora permite deshacer la acción durante 5 segundos.
· Los separadores entre bloques incluyen la hora de generación (# --- HH:MM ---).
· Contador de comandos generados en cada lote.
· Historial de las últimas 10 generaciones por herramienta, accesible desde el botón "Historial".
· Los campos de fecha y configuración se recuerdan entre sesiones.
· Tecla Enter en los campos de fecha genera los comandos directamente.

Mejoras en el índice:
· Buscador de herramientas en tiempo real.
· Se resalta la última herramienta visitada.
`;
    modalContent.appendChild(modalBody);

    // Botón cerrar
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Cerrar";
    closeBtn.addEventListener("click", () => {
        modal.remove(); // cierra el modal
        localStorage.setItem(key, "true"); // recuerda que ya se mostró
    });
    modalContent.appendChild(closeBtn);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
};

// --- Última herramienta usada ---
function highlightLastUsed() {
    const lastPath = localStorage.getItem("ipv_last_tool");
    if (!lastPath) return;

    document.querySelectorAll(".country-card .button[data-tool]").forEach(link => {
        // Compara el final de la ruta del href con el pathname guardado
        try {
            const linkPath = new URL(link.href, location.href).pathname;
            if (linkPath === lastPath) {
                link.classList.add("last-used");
                link.title = "Última herramienta usada";
            }
        } catch (_) { /* silencioso */ }
    });
}

// --- Buscador ---
function initSearch() {
    const searchInput = document.getElementById("indexSearch");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();

        document.querySelectorAll("[data-group]").forEach(group => {
            let groupVisible = false;

            group.querySelectorAll("[data-card]").forEach(card => {
                const cardText = card.textContent.toLowerCase();
                const cardVisible = !q || cardText.includes(q);
                card.style.display = cardVisible ? "" : "none";
                if (cardVisible) groupVisible = true;
            });

            group.style.display = groupVisible ? "" : "none";
        });
    });
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    showInfoPopupOnce();
    highlightLastUsed();
    initSearch();
});
