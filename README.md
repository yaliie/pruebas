# NortiV8 — Landing eCommerce de botas tácticas

Landing de una sola página, enfocada en conversión (CRO) y confianza, para vender las **Botas Tácticas NortiV8** con delivery en **Maracay** y envíos a **toda Venezuela**.

## Estructura

```
.
├── index.html              # Página principal (todas las secciones)
├── assets/
│   ├── css/styles.css      # Estilos
│   ├── js/main.js          # Lógica (tallas, WhatsApp, FAQ)
│   └── img/                # Imágenes (coloca aquí hero-botas.jpg)
└── README.md
```

## Configuración rápida (lo único que debes tocar)

### 1. Número de WhatsApp
Abre `assets/js/main.js` y edita `CONFIG.whatsappNumber`:

```js
whatsappNumber: "584140000000", // código país (58) + número, sin "+", espacios ni guiones
```

Ejemplo: `0414-123 4567` → `584141234567`.

Todos los botones de WhatsApp se arman solos a partir de ese número e incluyen
automáticamente la talla seleccionada en el mensaje.

### 2. Imagen del hero
Coloca tu foto de fondo en `assets/img/hero-botas.jpg`.
Si quieres otra ruta o URL, edítala en `index.html` (variable `--hero-bg` del `<section class="hero">`).

### 3. Tallas agotadas (opcional)
En `assets/js/main.js`, lista las tallas sin stock para mostrarlas tachadas:

```js
tallasAgotadas: ["7", "12"],
```

### 4. Precio
El precio está como texto en `index.html` (busca `$199.99` y `$380.00`).

## Decisiones de CRO y confianza

- **Sin trucos engañosos**: se eliminaron el "87 personas viendo ahora" y el
  contador regresivo falso del diseño original. Para el público objetivo
  (hombres 22–55 que quieren comprar sin rollo) esos gimmicks restan credibilidad.
- **Política honesta y visible**: cambios de talla sí, devolución de dinero no.
  Se declara en la trust bar, en la sección de seguridad, en el FAQ y en el footer.
- **Ubicación correcta**: delivery en Maracay + envíos nacionales (no Caracas).
- **Selección de talla obligatoria** antes de ordenar, para reducir errores y
  fricción en el cierre por WhatsApp.
- **Pago al recibir** destacado como principal reductor de riesgo percibido.

## Publicar

Es un sitio estático. Puedes abrir `index.html` directamente o desplegarlo en
cualquier hosting estático (Vercel, Netlify, GitHub Pages, Hostinger, etc.).
