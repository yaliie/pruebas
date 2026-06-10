/* =========================================================
   NortiV8 — Lógica de la landing
   ========================================================= */

/* ====== CONFIGURACIÓN — EDITA AQUÍ ======
   Pon tu número de WhatsApp con código de país, SIN "+", espacios ni guiones.
   Venezuela = 58. Ejemplo: 04141234567  ->  584141234567
*/
const CONFIG = {
  whatsappNumber: "584140000000", // 👈 CAMBIA ESTO por tu número real
  productName: "Botas NortiV8",
  // Tallas agotadas (US). Ej: ["7", "12"] las muestra tachadas y no seleccionables.
  tallasAgotadas: [],
};

/* ====== ESTADO ====== */
let tallaSeleccionada = null;

/* ====== UTILIDADES ====== */
function buildWaLink(text) {
  const num = CONFIG.whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

/* ====== SELECTOR DE TALLAS ====== */
function initTallas() {
  const grid = document.getElementById("tallas");
  if (!grid) return;
  const errorEl = document.getElementById("talla-error");

  grid.querySelectorAll(".talla-btn").forEach((btn) => {
    const talla = btn.textContent.trim();

    if (CONFIG.tallasAgotadas.includes(talla)) {
      btn.classList.add("agotada");
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
      btn.title = "Talla agotada";
      return;
    }

    btn.addEventListener("click", () => {
      grid.querySelectorAll(".talla-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      tallaSeleccionada = talla;
      if (errorEl) errorEl.textContent = "";
    });
  });
}

/* ====== ENLACES DE WHATSAPP ====== */
function initWhatsappLinks() {
  const errorEl = document.getElementById("talla-error");

  document.querySelectorAll("[data-wa]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const baseText = el.getAttribute("data-wa-text") || `Hola, quiero información sobre las ${CONFIG.productName}.`;
      const needsSize = el.hasAttribute("data-wa-needs-size");

      if (needsSize && !tallaSeleccionada) {
        if (errorEl) errorEl.textContent = "⚠️ Selecciona tu talla antes de continuar.";
        const grid = document.getElementById("tallas");
        if (grid) grid.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      let text = baseText;
      if (tallaSeleccionada) {
        text += ` Mi talla US es: ${tallaSeleccionada}.`;
      }

      window.open(buildWaLink(text), "_blank", "noopener");
    });
  });
}

/* ====== GALERÍA DE PRODUCTO ====== */
function initGallery() {
  const thumbs = document.getElementById("thumbs");
  const main = document.getElementById("main-img");
  if (!thumbs || !main) return;

  thumbs.querySelectorAll(".thumb").forEach((t) => {
    t.addEventListener("click", () => {
      const src = t.getAttribute("data-img");
      if (src) {
        main.src = src;
        main.style.visibility = "visible";
      }
      thumbs.querySelectorAll(".thumb").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
    });
  });
}

/* ====== FAQ ACORDEÓN ====== */
function initFaq() {
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const answer = btn.nextElementSibling;
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isOpen));
      if (answer) answer.hidden = isOpen;
    });
  });
}

/* ====== CARRUSEL DE RESEÑAS ====== */
function initReviews() {
  const car = document.getElementById("reviews");
  if (!car) return;
  const card = car.querySelector(".review-card");
  const step = card ? card.offsetWidth + 18 : 320; // ancho de tarjeta + gap

  const prev = document.querySelector(".rev-prev");
  const next = document.querySelector(".rev-next");
  if (prev) prev.addEventListener("click", () => car.scrollBy({ left: -step, behavior: "smooth" }));
  if (next) next.addEventListener("click", () => car.scrollBy({ left: step, behavior: "smooth" }));
}

/* ====== AÑO EN FOOTER ====== */
function initYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

/* ====== INIT ====== */
document.addEventListener("DOMContentLoaded", () => {
  initTallas();
  initWhatsappLinks();
  initGallery();
  initReviews();
  initFaq();
  initYear();
});
