# Descanso · Panel Administrativo

Plataforma web administrativa, **responsive** y fácil de usar, para gestionar
las **finanzas, el inventario y las ventas** de un emprendimiento venezolano de
productos para el descanso y la comodidad (pijamas, batas, pantuflas, ropa
cómoda y accesorios) para mujeres, hombres y niños.

Diseñada para que las propietarias sepan, en menos de 10 segundos: cuánto
invirtieron, cuánto vendieron, cuál es la **ganancia real**, cuánto tienen
disponible, cuánto reservar para reponer inventario, qué productos y proveedores
son más rentables, y cuánto afecta la **brecha entre la tasa BCV y la tasa
USDT**.

## Cómo usarla

Es una aplicación **estática, sin instalación ni build**. Funciona de dos formas:

1. **Abrir directamente**: doble clic en `index.html` (funciona sin internet).
2. **Publicar**: subir la carpeta `plataforma/` a cualquier hosting estático
   (Vercel, Netlify, GitHub Pages, Hostinger…).

Los datos se guardan en el **navegador** (localStorage). Para empezar viene
cargada con datos de ejemplo; puedes restablecerlos o exportar un respaldo desde
**Configuración**.

### Acceso (demo)

| Usuario        | Rol           | Contraseña |
|----------------|---------------|------------|
| Propietaria    | Administrador | `1234`     |
| Colaboradora   | Colaborador   | `1234`     |

- **Administrador**: control total (tasas, precios, proveedores, finanzas,
  configuración, eliminación de movimientos).
- **Colaborador**: registra ventas, pedidos e inventario; no modifica tasas ni
  elimina movimientos financieros.

## Qué incluye

| Sección | Función |
|---|---|
| **Panel principal** | Métricas clave, alertas y gráficos con filtros (hoy/semana/mes/rango, categoría, público, proveedor, canal, pago). |
| **Reportes** | Resumen mensual exportable a **CSV** y **PDF** (imprimir). |
| **Ventas** | Registro con pago mixto, tasas guardadas por operación, ganancia contable y sostenible, descuento de inventario automático. |
| **Productos** | Ficha completa; costo real (todo incluido), márgenes, precios sugeridos y alertas. |
| **Inventario** | Entradas, salidas, ajustes, devoluciones, dañados, contenido; alertas de poco stock, agotados y productos sin rotación. |
| **Lotes / Pacas** | Reparte el costo de un lote entre las unidades **vendibles** (descuenta dañadas y regalos). |
| **Proveedores** | Base de datos y comparación (más rentable, mejor margen, mejor calidad, envío más barato, entrega más rápida). |
| **Ingresos y egresos** | Movimientos financieros por categoría (escalables). |
| **Precios y rentabilidad** | Recargo sobre costo vs margen sobre precio; objetivo 30%–35%; alertas. |
| **Fondos y publicidad** | Distribución automática de la ganancia (reposición, disponible, publicidad, reserva) + ROAS y costo por venta. |
| **Simulador** | Escenarios: tasas, costos, precio, descuento, publicidad, punto de equilibrio y efecto de vender a tasa BCV. |
| **Configuración** | Tasas BCV/USDT e historial, objetivos, fondos, umbrales, categorías, usuarios, respaldo. |
| **Historial de cambios** | Auditoría: qué, quién, cuándo, valor anterior y nuevo. |

## Conceptos clave del negocio venezolano

- **Cada venta/gasto guarda la tasa** usada en ese momento, aunque luego cambie.
- **Costo histórico** (lo que se pagó) vs **costo de reposición** (reponer a la
  tasa actual). Se muestra la **ganancia contable** y la **ganancia sostenible**.
- **Brecha BCV–USDT**: si cobras en Bs a tasa BCV pero debes comprar divisa a
  tasa USDT para reponer, pierdes esa diferencia. La plataforma la calcula como
  *"erosión cambiaria"* y avisa cuando una venta parece rentable pero **no permite
  reponer** el producto.
- La rentabilidad **nunca** se calcula solo con el costo de compra: incluye
  envíos, comisiones, empaque y otros costos asociados.

## Estructura

```
plataforma/
├── index.html          # Shell de la app (login + layout)
├── css/styles.css      # Diseño (moderno, femenino, responsive, modo claro)
└── js/
    ├── store.js        # Datos (localStorage), semilla, bitácora, sesión
    ├── finance.js      # Motor de cálculos (monedas, costos, márgenes, fondos)
    ├── components.js    # UI: gráficos SVG, modales, tablas, toasts, exportar
    ├── views.js         # Vistas de cada sección (CRUD y reportes)
    └── app.js           # Router, navegación e inicialización
```

Pensada para **crecer**: agregar categorías, proveedores, usuarios, monedas,
gastos o impuestos no requiere rehacer el sistema.
