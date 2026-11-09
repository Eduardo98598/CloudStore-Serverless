# CloudStore Serverless — Frontend E-Commerce de Tecnología

**CloudStore** es una tienda de tecnología moderna, elegante y funcional desarrollada con **JavaScript Vanilla** y **Bootstrap 5**, diseñada bajo un patrón desacoplado y lista para integrarse de forma transparente con una arquitectura **Serverless en Amazon Web Services (AWS)**.

---

## 🚀 1. Tecnologías y Requisitos

- **HTML5** semántico y accesible.
- **CSS3** con diseño responsivo y tema dark tech.
- **Bootstrap 5.3.3** y **Bootstrap Icons 1.11.3**.
- **JavaScript Vanilla (ES6+)** sin frameworks adicionales.
- **Node.js 24.x** (probado en v24.22.2).
- **npm 11.x** (probado en v11.19.1).

---

## 📂 2. Estructura del Proyecto

```text
CloudStore-Serverless/
├── package.json               # Configuración de Node.js y scripts de arranque
├── server.js                  # Servidor HTTP estático nativo en Node.js (cero dependencias externas)
├── README.md                  # Documentación completa y guía de AWS
└── frontend/
    ├── index.html             # Portada de la tienda con productos y categorías destacadas
    ├── catalog.html           # Catálogo completo con buscador, filtros y ordenamiento
    ├── product.html           # Vista de detalle de producto con galería y especificaciones
    ├── cart.html              # Carrito de compras con persistencia y cálculo en tiempo real
    ├── checkout.html          # Formulario de orden de compra y validación de cliente
    ├── order-success.html     # Confirmación de pedido con botón de apertura en WhatsApp
    ├── admin/
    │   ├── index.html         # Dashboard administrativo con KPIs y alertas de stock
    │   ├── products.html      # Listado y gestión rápida de productos (activar/desactivar)
    │   ├── product-form.html  # Formulario unificado de creación y edición de productos
    │   ├── categories.html    # Gestión completa (CRUD) de categorías
    │   ├── orders.html        # Historial y filtrado de pedidos por estado
    │   └── order-detail.html  # Detalle de pedido, cambio de estado y contacto por WhatsApp
    ├── css/
    │   ├── styles.css         # Estilos visuales del frontend público (paleta oscura tecnológica)
    │   └── admin.css          # Estilos de layout, barra lateral y tablas del panel admin
    └── js/
        ├── config.js          # Configuración global, switch USE_MOCK_API y API_BASE_URL
        ├── mock-data.js       # Datos semilla iniciales (14 productos, 5 categorías, 5 pedidos)
        ├── storage.js         # Capa de almacenamiento local (localStorage simulando DynamoDB)
        ├── api.js             # Data Access Layer unificado (enruta a Mock o a AWS API Gateway)
        ├── ui.js              # Helpers de interfaz: notificaciones toast, moneda, modales y fechas
        ├── cart.js            # Lógica y operaciones del carrito de compras
        ├── products.js        # Operaciones y renderizado de productos
        ├── orders.js          # Lógica de pedidos y formateador para WhatsApp
        └── categories.js      # Operaciones y modal de administración de categorías
```

---

## ⚙️ 3. Comunicación entre Módulos y Arquitectura JS

El frontend implementa una **Capa de Abstracción de Datos (Data Access Layer)** que independiza la interfaz de usuario de la fuente de datos:

```
[ Páginas HTML / Componentes UI ]
               │
               ▼
   [ Módulos de Dominio (cart.js, products.js, orders.js) ]
               │
               ▼
          [ api.js ] (Data Access Layer)
          /        \
  (USE_MOCK_API)    (API_BASE_URL)
        /            \
       ▼              ▼
[ storage.js ]     [ AWS API Gateway (HTTP API) ]
(localStorage)                │
                              ▼
                     [ AWS Lambda (Node.js 24) ]
                              │
                              ▼
                     [ Amazon DynamoDB ]
```

### Contrato de Respuesta Unificado
Tanto el modo simulado como las llamadas reales a AWS API Gateway devuelven exactamente la misma estructura de Promesa:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operación completada exitosamente",
  "error": null
}
```

Gracias a este diseño, **ninguna página HTML realiza llamadas `fetch` directamente**, lo que garantiza que la migración a AWS no requerirá reescribir la lógica de presentación.

---

## 🛠️ 4. Instrucciones para Ejecución Local

### Paso 1: Clonar o situarse en el repositorio
Abre una terminal en el directorio raíz del proyecto:
```bash
cd "d:\Taller 2026\CloudStore-Serverless"
```

### Paso 2: Iniciar el servidor local
El proyecto incluye un servidor nativo Node.js sin dependencias pesadas:
```bash
npm start
```
*También puedes ejecutar `node server.js` directamente.*

### Paso 3: Abrir en el navegador
Visita en tu navegador:
- **Tienda Pública:** [http://localhost:3000](http://localhost:3000)
- **Panel Administrativo:** [http://localhost:3000/admin/index.html](http://localhost:3000/admin/index.html)

---

## ✨ 5. Funcionalidades Implementadas

### Tienda Pública
1. **Página de Inicio (`index.html`):**
   - Hero banner moderno con llamado a la acción.
   - Categorías destacadas dinámicas con conteo de productos.
   - Cuadrícula de productos destacados con insignias de descuento y estrellas de calificación.
   - Insignias de garantía, envío gratuito y soporte por WhatsApp.

2. **Catálogo Tecnológico (`catalog.html`):**
   - Filtro por categorías con selector interactivo y contador de existencias.
   - Búsqueda en tiempo real por texto (nombre, descripción, categoría).
   - Ordenamiento por precio (ascendente / descendente), nombre alfabético o más recientes.
   - Estado vacío cuando no hay coincidencias con botón para restablecer filtros.

3. **Detalle de Producto (`product.html`):**
   - Vista detallada con imagen en alta resolución y control de error en carga.
   - Precios con cálculo de porcentaje de ahorro.
   - Indicador de stock dinámico ("Agotado", "¡Últimas X unidades!", "Disponible").
   - Lista estructurada de especificaciones técnicas.
   - Selector interactivo de cantidad respetando el límite de inventario.
   - Botón directo "Consultar por WhatsApp" con mensaje pre-rellenado del SKU.
   - Sección de productos relacionados de la misma categoría.

4. **Carrito de Compras (`cart.html`):**
   - Persistencia local entre recargas y navegación entre páginas.
   - Modificación dinámica de cantidades con control de stock.
   - Eliminación individual de productos y botón para vaciar el carrito completo.
   - Cálculo automático de subtotal, costo de envío ($20 o ¡Gratis! en compras $\ge \$500$) y total.
   - Contador en tiempo real en la barra de navegación.

5. **Finalizar Pedido (`checkout.html`):**
   - Formulario de datos: Nombre completo, Teléfono WhatsApp, Correo electrónico, Dirección detallada y Observaciones.
   - Validaciones de formulario (Bootstrap + JS).
   - Resumen lateral con desglose de artículos y montos.
   - Generación de consecutivo amigable (Ej. `CS-2026-1006`).

6. **Confirmación de Pedido (`order-success.html`):**
   - Folio único de orden generado.
   - **Integración con WhatsApp:** Botón que abre directamente la aplicación de WhatsApp con el resumen formateado (cliente, dirección, lista de artículos con subtotales, envío y total a pagar).
   - Opción para copiar resumen al portapapeles.
   - Vista de impresión limpia optimizada mediante CSS `@media print`.

### Panel Administrativo
1. **Dashboard (`admin/index.html`):**
   - Indicadores KPI: Ventas Totales registradas, Total de Pedidos, Catálogo de Productos y Alertas de Stock Bajo.
   - Tabla de pedidos recientes con insignias de estado.
   - Lista de alerta para productos con inventario crítico ($\le 5$ unidades).
   - Botón de reinicio rápido de datos semilla.

2. **Administración de Productos (`admin/products.html`):**
   - Listado tabular completo con imágenes, categorías, precios y existencias.
   - Interruptores switch para activar/desactivar productos en tiempo real.
   - Búsqueda y filtrado por categoría y estado de visibilidad.
   - Acceso a edición y eliminación con modal de confirmación seguro.

3. **Creación y Edición de Productos (`admin/product-form.html`):**
   - Modo dual: Crear nuevo producto o editar producto existente vía parámetro `?id=...`.
   - Selector dinámico de categorías.
   - Previsualización en vivo de la imagen por URL.
   - Campos de precio, precio comparado y stock.
   - Área de texto para especificaciones por línea.
   - Switches para visibilidad ("Activo") y destacado ("Home").

4. **Gestión de Categorías (`admin/categories.html`):**
   - CRUD completo de categorías de catálogo.
   - Modal interactivo con generador automático de slug y previsualización de icono Bootstrap.
   - Validación de seguridad: impide eliminar una categoría si contiene productos asociados.

5. **Gestión de Pedidos (`admin/orders.html`):**
   - Tabla con todos los pedidos, cliente, fecha, total y estado.
   - Filtro por estado: `pendiente`, `confirmado`, `enviado` y `cancelado`.
   - Botón directo para iniciar conversación por WhatsApp con el comprador.

6. **Detalle de Pedido (`admin/order-detail.html`):**
   - Información completa del destinatario y notas de entrega.
   - Desglose detallado de productos y totales.
   - Formulario para actualizar el estado del pedido y asignar número de guía/tracking.
   - Botón de contacto directo con el cliente vía WhatsApp.

---

## ☁️ 6. Preparación para la Arquitectura Serverless en AWS

El proyecto está diseñado para conectarse a los siguientes servicios de AWS:

| Servicio AWS | Propósito en CloudStore |
|---|---|
| **Amazon S3** | Alojamiento estático del frontend (`frontend/`) y almacenamiento de imágenes de productos. |
| **Amazon CloudFront** | CDN global con HTTPS, compresión gzip/brotli y baja latencia. |
| **Amazon API Gateway** | HTTP API para enrutar los endpoints REST hacia las funciones Lambda. |
| **AWS Lambda (Node.js 24)** | Microservicios de backend para Productos, Categorías, Pedidos y Métricas. |
| **Amazon DynamoDB** | Base de datos NoSQL con tablas `cloudstore-products`, `cloudstore-categories` y `cloudstore-orders`. |
| **Amazon CloudWatch** | Registro de logs y métricas de ejecución de las funciones Lambda. |

### Pasos para Conectar a AWS (Producción):
1. Desplegar los microservicios en **AWS Lambda** y crear la **HTTP API en Amazon API Gateway**.
2. Abrir el archivo `frontend/js/config.js`.
3. Modificar:
   ```javascript
   const CONFIG = {
     USE_MOCK_API: false, // Conmutar a modo real
     API_BASE_URL: 'https://tu-api-id.execute-api.us-east-1.amazonaws.com/prod',
     WHATSAPP_PHONE: '5219991234567',
     ...
   };
   ```
4. Subir la carpeta `frontend/` al bucket de **Amazon S3** e invalidar la caché de **Amazon CloudFront**.

### Especificación de Endpoints REST requeridos para AWS Lambda:
- `GET /products` — Lista productos activos (soporta query params `categoryId`, `search`, `sort`, `onlyFeatured`).
- `GET /products/:id` — Detalle de un producto por ID.
- `GET /admin/products` — Lista todos los productos para el panel admin.
- `POST /admin/products` — Crea un nuevo producto.
- `PUT /admin/products/:id` — Actualiza un producto existente.
- `DELETE /admin/products/:id` — Elimina un producto.
- `GET /categories` — Lista las categorías y conteo de productos.
- `POST /admin/categories` — Crea una categoría.
- `PUT /admin/categories/:id` — Actualiza una categoría.
- `DELETE /admin/categories/:id` — Elimina una categoría si no tiene productos asociados.
- `GET /admin/orders` — Consulta lista de pedidos con filtros de búsqueda y estado.
- `GET /orders/:id` — Consulta detalle de un pedido.
- `POST /orders` — Registra un nuevo pedido y descuenta existencias en DynamoDB.
- `PATCH /admin/orders/:id/status` — Actualiza el estado de la orden (`pendiente`, `confirmado`, `enviado`, `cancelado`).
- `GET /admin/dashboard/metrics` — Retorna totales calculados de ventas, pedidos, inventario crítico y productos.

---

## 📌 7. Pendientes para Etapas Posteriores

- [ ] Implementación de autenticación y autorización con **Amazon Cognito** (User Pools & Identity Pools) para proteger las rutas del panel administrativo `/admin/*`.
- [ ] Implementación de la infraestructura como código (**AWS SAM**, **CDK** o **Terraform**) para el backend serverless.
- [ ] Subida de imágenes directa a **Amazon S3** mediante URLs prefirmadas (*Presigned URLs*).
- [ ] Integración opcional de pasarela de pago (ej. Stripe o Mercado Pago vía webhook en AWS Lambda).
