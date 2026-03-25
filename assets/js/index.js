const INFO_VERSION = "Release 2.1";

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
    modalHeader.textContent = "Novedad en ICSMonthlyReports✨";
    modalContent.appendChild(modalHeader);

    // Mensaje
    const modalBody = document.createElement("div");
    modalBody.style.whiteSpace = "pre-line"; // respeta saltos de línea
    modalBody.textContent = `
Ya no será necesario elegir la fecha a mano, directamente podemos seleccionar el comando del trimestre que queremos generar.

El timezone y la fecha de ejecución ahora se calculan automáticamente según la legislación y el trimestre seleccionados.

Para Q4, el sistema ejecuta el informe en el año siguiente de forma automática.
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

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", showInfoPopupOnce);
