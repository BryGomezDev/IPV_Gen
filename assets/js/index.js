const INFO_VERSION = "Release 3.0";

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
    modalHeader.textContent = "Novedades — Release 3.0";
    modalContent.appendChild(modalHeader);

    // Mensaje
    const modalBody = document.createElement("div");
    modalBody.style.whiteSpace = "pre-line";
    modalBody.textContent = `
Panel de administración centralizado:

· Nueva página admin.html para configurar la aplicación sin tocar código.
· Rutas de ejecutables editables directamente desde el panel.
· Tipos de fichero por herramienta (periodicidades, listas planas, grupos PDE) editables desde el panel.
· Game types de España (Horario/Mensual) y Colombia editables desde el panel.
· Los cambios se persisten en config.json y afectan a todos los usuarios al instante.
· Nuevo backend disponible: los tipos de fichero pueden ampliarse desde el servidor sin tocar el código fuente.

config.json como fuente de verdad:

· Todas las herramientas leen su configuración de config.json al arrancar.
· Los valores hardcodeados actúan solo como fallback si config.json no está disponible.
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
