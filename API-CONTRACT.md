# API Contract — CloudStore Serverless

> **Versión:** 1.0  
> **Fecha:** 2026-11-08  
> **Estado:** Mock activo (`USE_MOCK_API = true`). Las rutas documentadas aquí son las que se activarán al configurar `API_BASE_URL` y cambiar `USE_MOCK_API` a `false`.

---

## Convenciones Generales

### Base URL

```
https://<API_GATEWAY_ID>.execute-api.<REGION>.amazonaws.com/<STAGE>
```

Configurada en `frontend/js/config.js`:

```js
API_BASE_URL: 'https://xyz.execute-api.us-east-1.amazonaws.com/prod'
```

### Cabeceras HTTP requeridas

| Cabecera | Valor |
|---|---|
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |

### Envelope de respuesta estándar

Todas las respuestas siguen este contrato:

```json
{
  "success": true,
  "data": { },
  "message": "Texto descriptivo opcional",
  "error": "Descripción del error (solo cuando success = false)"
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `success` | `boolean` | `true` si la operación fue exitosa |
| `data` | `any` | Payload de la respuesta (objeto o array) |
| `message` | `string?` | Mensaje informativo para el cliente |
| `error` | `string?` | Descripción del error cuando `success = false` |

### Códigos de estado HTTP

| Código | Significado |
|---|---|
| `200` | Consulta exitosa |
| `201` | Recurso creado |
| `204` | Sin contenido (eliminación exitosa) |
| `400` | Parámetros inválidos o payload malformado |
| `404` | Recurso no encontrado |
| `409` | Conflicto (ej. categoría con productos asignados) |
| `500` | Error interno del servidor |

---

## Estados de Pedido

Los únicos valores válidos para el campo `status` de un pedido son:

| Valor | Descripción |
|---|---|
| `pendiente` | Pedido recibido, pendiente de revisión |
| `confirmado` | Pedido verificado, en preparación |
| `enviado` | Pedido despachado con guía de rastreo |
| `cancelado` | Pedido cancelado por cliente o tienda |

---

## 1. Productos

### Esquema de Producto

```json
{
  "id": "prod-001",
  "name": "MacBook Pro 16\" M3 Max",
  "slug": "macbook-pro-16-m3-max",
  "categoryId": "cat-laptops",
  "categoryName": "Laptops & Computadoras",
  "description": "Descripción completa del producto...",
  "features": [
    "Chip Apple M3 Max (16 CPU / 40 GPU)",
    "36 GB de memoria unificada"
  ],
  "price": 3499.00,
  "comparePrice": 3899.00,
  "stock": 8,
  "image": "https://...",
  "featured": true,
  "active": true,
  "rating": 4.9,
  "reviewsCount": 38,
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-03-01T12:00:00Z"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | `string` | Auto | Generado por el backend (`prod-` + identificador único). **Es la referencia principal y única del producto** |
| `name` | `string` | ✅ | Nombre visible en la tienda |
| `slug` | `string` | Auto | Texto URL amigable generado desde `name` si no se envía. **No se garantiza que sea único**: el frontend navega siempre por `id` |
| `categoryId` | `string` | ✅ | ID de la categoría padre |
| `categoryName` | `string` | ✅ | Nombre denormalizado para evitar joins frecuentes |
| `description` | `string` | ✅ | Descripción larga del producto |
| `features` | `string[]` | — | Lista de características destacadas |
| `price` | `number` | ✅ | Precio de venta en MXN |
| `comparePrice` | `number\|null` | — | Precio tachado (antes de descuento) |
| `stock` | `integer` | ✅ | Unidades disponibles en inventario |
| `image` | `string` | ✅ | URL de la imagen principal |
| `featured` | `boolean` | — | Si aparece en sección destacada. Default: `false` |
| `active` | `boolean` | — | Si es visible en la tienda pública. Default: `true` |
| `rating` | `number` | Auto | Calificación promedio (0–5). Default: `5.0` |
| `reviewsCount` | `integer` | Auto | Cantidad de reseñas. Default: `0` |
| `createdAt` | `ISO 8601` | Auto | Fecha de creación |
| `updatedAt` | `ISO 8601` | Auto | Fecha de última actualización |

---

### `GET /products`

Consulta el catálogo de productos para la tienda pública. Retorna únicamente productos con `active = true`.

**Parámetros de query:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `categoryId` | `string` | Filtrar por categoría. Omitir o `all` para todas |
| `search` | `string` | Búsqueda por nombre, descripción o categoría |
| `sort` | `string` | Orden: `newest` \| `price-asc` \| `price-desc` \| `name-asc` \| `name-desc` |
| `onlyFeatured` | `boolean` | Si `true`, retorna solo destacados |
| `includeInactive` | `boolean` | Si `true`, incluye productos inactivos (uso admin) |

**Respuesta exitosa `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "prod-001",
      "name": "MacBook Pro 16\" M3 Max",
      "slug": "macbook-pro-16-m3-max",
      "categoryId": "cat-laptops",
      "categoryName": "Laptops & Computadoras",
      "price": 3499.00,
      "comparePrice": 3899.00,
      "stock": 8,
      "image": "https://...",
      "featured": true,
      "active": true,
      "rating": 4.9,
      "reviewsCount": 38
    }
  ]
}
```

**Errores posibles:**

| Código | `error` |
|---|---|
| `500` | `"Error interno al consultar productos"` |

---

### `GET /products/{id}`

Obtiene el detalle completo de un producto por su ID.

**Parámetros de ruta:**

| Parámetro | Descripción |
|---|---|
| `id` | ID del producto (ej. `prod-001`) |

**Respuesta exitosa `200`:**

```json
{
  "success": true,
  "data": {
    "id": "prod-001",
    "name": "MacBook Pro 16\" M3 Max",
    "slug": "macbook-pro-16-m3-max",
    "categoryId": "cat-laptops",
    "categoryName": "Laptops & Computadoras",
    "description": "La estación de trabajo portátil definitiva...",
    "features": ["Chip Apple M3 Max", "36 GB memoria unificada"],
    "price": 3499.00,
    "comparePrice": 3899.00,
    "stock": 8,
    "image": "https://...",
    "featured": true,
    "active": true,
    "rating": 4.9,
    "reviewsCount": 38,
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

**Errores posibles:**

| Código | `error` |
|---|---|
| `404` | `"Producto no encontrado"` |

---

### `POST /products`

Crea un nuevo producto. Uso exclusivo del panel administrativo.

**Body JSON:**

```json
{
  "name": "Nombre del Producto",
  "slug": "nombre-del-producto",
  "categoryId": "cat-laptops",
  "categoryName": "Laptops & Computadoras",
  "description": "Descripción detallada...",
  "features": ["Característica 1", "Característica 2"],
  "price": 999.00,
  "comparePrice": 1099.00,
  "stock": 10,
  "image": "https://...",
  "featured": false,
  "active": true
}
```

**Campos requeridos:** `name`, `categoryId`, `categoryName`, `description`, `price`, `stock`, `image`

**Respuesta exitosa `201`:**

```json
{
  "success": true,
  "data": {
    "id": "prod-lx7k9",
    "name": "Nombre del Producto",
    "slug": "nombre-del-producto",
    "categoryId": "cat-laptops",
    "categoryName": "Laptops & Computadoras",
    "description": "Descripción detallada...",
    "features": [],
    "price": 999.00,
    "comparePrice": 1099.00,
    "stock": 10,
    "image": "https://...",
    "featured": false,
    "active": true,
    "rating": 5.0,
    "reviewsCount": 0,
    "createdAt": "2026-11-08T23:00:00Z"
  },
  "message": "Producto creado exitosamente"
}
```

**Errores posibles:**

| Código | `error` |
|---|---|
| `400` | `"El campo 'name' es obligatorio"` |
| `400` | `"El campo 'price' debe ser un número positivo"` |

> **Slug duplicado:** no produce error. Dos productos pueden compartir `slug`; el identificador único es `id`.

---

### `PUT /products/{id}`

Actualiza uno o más campos de un producto existente. Uso exclusivo del panel administrativo.

**Parámetros de ruta:**

| Parámetro | Descripción |
|---|---|
| `id` | ID del producto a actualizar |

**Body JSON** (todos los campos son opcionales — se aplica patch parcial):

```json
{
  "name": "Nuevo Nombre",
  "price": 1099.00,
  "stock": 15,
  "active": false,
  "featured": true,
  "categoryId": "cat-audio",
  "categoryName": "Audio & Sonido",
  "description": "Descripción actualizada...",
  "features": ["Nueva característica"],
  "comparePrice": 1199.00,
  "image": "https://nueva-imagen..."
}
```

**Respuesta exitosa `200`:**

```json
{
  "success": true,
  "data": {
    "id": "prod-001",
    "name": "Nuevo Nombre",
    "price": 1099.00,
    "stock": 15,
    "active": false,
    "updatedAt": "2026-11-08T23:00:00Z"
  },
  "message": "Producto actualizado exitosamente"
}
```

**Errores posibles:**

| Código | `error` |
|---|---|
| `404` | `"Producto no encontrado para actualizar"` |
| `400` | `"El precio debe ser un número positivo"` |

---

### `DELETE /products/{id}`

Elimina permanentemente un producto del catálogo. Uso exclusivo del panel administrativo.

> **Nota:** Considerar soft-delete (`active = false`) en producción para preservar historial de pedidos.

**Parámetros de ruta:**

| Parámetro | Descripción |
|---|---|
| `id` | ID del producto a eliminar |

**Respuesta exitosa `200`:**

```json
{
  "success": true,
  "message": "Producto eliminado correctamente"
}
```

**Errores posibles:**

| Código | `error` |
|---|---|
| `404` | `"Producto no encontrado para eliminar"` |

---

## 2. Categorías

### Esquema de Categoría

```json
{
  "id": "cat-laptops",
  "name": "Laptops & Computadoras",
  "slug": "laptops-computadoras",
  "description": "Equipos portátiles y estaciones de trabajo...",
  "icon": "bi-laptop",
  "productCount": 3,
  "active": true,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-03-01T12:00:00Z"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | `string` | Auto | Generado como `cat-` + slug |
| `name` | `string` | ✅ | Nombre visible en la tienda y administración |
| `slug` | `string` | ✅ | Identificador URL amigable, único |
| `description` | `string` | — | Descripción opcional de la categoría |
| `icon` | `string` | — | Clase Bootstrap Icons (ej. `bi-laptop`) |
| `productCount` | `integer` | Auto | Calculado dinámicamente al consultar |
| `active` | `boolean` | — | Visibilidad en la tienda. Default: `true` |
| `createdAt` | `ISO 8601` | Auto | Fecha de creación |
| `updatedAt` | `ISO 8601` | Auto | Fecha de última actualización |

---

### `GET /categories`

Obtiene la lista de categorías. Incluye `productCount` calculado en tiempo real (cuenta solo productos activos).

- **Por defecto** devuelve únicamente las categorías activas (`active = true`). Es el comportamiento que usa la tienda pública.
- Con `includeInactive=true` devuelve **todas**, incluidas las desactivadas. Es lo que usa el panel administrativo.

**Parámetros de query:**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `includeInactive` | `boolean` | `false` | Si `true`, incluye categorías con `active = false` |

**Ejemplos:**

```
GET /categories                       → solo activas
GET /categories?includeInactive=true  → activas + desactivadas
```

**Respuesta exitosa `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "cat-laptops",
      "name": "Laptops & Computadoras",
      "slug": "laptops-computadoras",
      "description": "Equipos portátiles...",
      "icon": "bi-laptop",
      "productCount": 3,
      "active": true,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

**Errores posibles:**

| Código | `error` |
|---|---|
| `500` | `"Error interno al consultar categorías"` |

---

### `POST /categories`

Crea una nueva categoría. Uso exclusivo del panel administrativo.

**Body JSON:**

```json
{
  "name": "Redes & Conectividad",
  "slug": "redes-conectividad",
  "description": "Routers, switches y equipos de red empresarial.",
  "icon": "bi-wifi"
}
```

**Campos requeridos:** `name`, `slug`

**Respuesta exitosa `201`:**

```json
{
  "success": true,
  "data": {
    "id": "cat-redes-conectividad",
    "name": "Redes & Conectividad",
    "slug": "redes-conectividad",
    "description": "Routers, switches y equipos de red empresarial.",
    "icon": "bi-wifi",
    "productCount": 0,
    "active": true,
    "createdAt": "2026-11-08T23:00:00Z"
  },
  "message": "Categoría creada con éxito"
}
```

**Errores posibles:**

| Código | `error` |
|---|---|
| `400` | `"El campo 'name' es obligatorio"` |
| `400` | `"El campo 'slug' es obligatorio"` |
| `409` | `"Ya existe una categoría con ese slug"` |

---

### `PUT /categories/{id}`

Actualiza los datos de una categoría existente. Uso exclusivo del panel administrativo.

**Parámetros de ruta:**

| Parámetro | Descripción |
|---|---|
| `id` | ID de la categoría (ej. `cat-laptops`) |

**Body JSON** (patch parcial):

```json
{
  "name": "Nombre Actualizado",
  "description": "Nueva descripción.",
  "icon": "bi-pc-display"
}
```

**Respuesta exitosa `200`:**

```json
{
  "success": true,
  "data": {
    "id": "cat-laptops",
    "name": "Nombre Actualizado",
    "description": "Nueva descripción.",
    "icon": "bi-pc-display",
    "updatedAt": "2026-11-08T23:00:00Z"
  },
  "message": "Categoría actualizada con éxito"
}
```

**Errores posibles:**

| Código | `error` |
|---|---|
| `404` | `"Categoría no encontrada"` |

---

### `DELETE /categories/{id}`

Elimina una categoría. Falla si tiene productos asignados.

**Parámetros de ruta:**

| Parámetro | Descripción |
|---|---|
| `id` | ID de la categoría a eliminar |

**Respuesta exitosa `200`:**

```json
{
  "success": true,
  "message": "Categoría eliminada con éxito"
}
```

**Errores posibles:**

| Código | `error` |
|---|---|
| `404` | `"Categoría no encontrada"` |
| `409` | `"No se puede eliminar la categoría porque tiene productos asignados. Reasigna o elimina los productos primero."` |

---

## 3. Pedidos

### Esquema de Pedido

```json
{
  "id": "ord-1001",
  "orderNumber": "CS-2026-1001",
  "customer": {
    "name": "Sofía Valenzuela Mendoza",
    "phone": "+52 55 4123 9876",
    "email": "sofia@techcorp.io",
    "address": "Av. Reforma 222, Piso 14, CDMX",
    "notes": "Entregar en recepción, atención a TI."
  },
  "items": [
    {
      "productId": "prod-001",
      "name": "MacBook Pro 16\" M3 Max",
      "price": 3499.00,
      "quantity": 1,
      "subtotal": 3499.00,
      "image": "https://..."
    }
  ],
  "subtotal": 3499.00,
  "shipping": 0.00,
  "total": 3499.00,
  "status": "enviado",
  "trackingNumber": "FEDEX-MX-9823411",
  "whatsappSent": true,
  "createdAt": "2026-03-01T15:30:00Z",
  "updatedAt": "2026-03-02T10:00:00Z"
}
```

#### Sub-esquema `customer`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `name` | `string` | ✅ | Nombre completo del cliente |
| `phone` | `string` | ✅ | Teléfono con código de país para WhatsApp |
| `email` | `string` | — | Correo electrónico (opcional) |
| `address` | `string` | ✅ | Dirección completa de entrega |
| `notes` | `string` | — | Observaciones o instrucciones de entrega |

#### Sub-esquema `items[]`

| Campo | Tipo | Descripción |
|---|---|---|
| `productId` | `string` | ID del producto en catálogo |
| `name` | `string` | Nombre del producto al momento de la compra |
| `price` | `number` | Precio unitario al momento de la compra |
| `quantity` | `integer` | Cantidad de unidades pedidas |
| `subtotal` | `number` | `price × quantity` |
| `image` | `string` | URL de imagen del producto |

#### Campos de pedido

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | Generado por el backend (`ord-` + timestamp) |
| `orderNumber` | `string` | Folio amigable: `CS-{AÑO}-{CONSECUTIVO}` |
| `subtotal` | `number` | Suma de todos los subtotales de items |
| `shipping` | `number` | Costo de envío. `0.00` = envío gratis |
| `total` | `number` | `subtotal + shipping` |
| `status` | `string` | Ver tabla de estados |
| `trackingNumber` | `string?` | Número de guía de rastreo (opcional) |
| `whatsappSent` | `boolean` | Si se abrió WhatsApp para confirmar el pedido |
| `createdAt` | `ISO 8601` | Fecha y hora de creación del pedido |
| `updatedAt` | `ISO 8601` | Fecha y hora de última actualización |

---

### `GET /orders`

Obtiene el listado de todos los pedidos con filtros opcionales. Uso del panel administrativo.

**Parámetros de query:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `status` | `string` | Filtrar por estado: `pendiente` \| `confirmado` \| `enviado` \| `cancelado` \| `all` |
| `search` | `string` | Busca en `orderNumber`, `customer.name`, `customer.phone`, `customer.email` |

**Respuesta exitosa `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "ord-1001",
      "orderNumber": "CS-2026-1001",
      "customer": {
        "name": "Sofía Valenzuela Mendoza",
        "phone": "+52 55 4123 9876",
        "email": "sofia@techcorp.io",
        "address": "Av. Reforma 222...",
        "notes": "Entregar en recepción..."
      },
      "items": [ { "productId": "prod-001", "quantity": 1, "subtotal": 3499.00 } ],
      "subtotal": 3499.00,
      "shipping": 0.00,
      "total": 3499.00,
      "status": "enviado",
      "trackingNumber": "FEDEX-MX-9823411",
      "createdAt": "2026-03-01T15:30:00Z"
    }
  ]
}
```

Los resultados se ordenan por `createdAt` descendente (más recientes primero).

**Errores posibles:**

| Código | `error` |
|---|---|
| `500` | `"Error interno al consultar pedidos"` |

---

### `GET /orders/{id}`

Obtiene el detalle completo de un pedido. Acepta ID interno o número de orden.

**Parámetros de ruta:**

| Parámetro | Descripción |
|---|---|
| `id` | ID del pedido (`ord-1001`) o número de orden (`CS-2026-1001`) |

> **Nota para la Lambda:** si el parámetro empieza con `CS-` es un `orderNumber` → `Query` sobre el GSI `OrderNumberIndex`. En cualquier otro caso es un `id` → `GetItem`. Ver `DYNAMODB-DESIGN.md` §4.

**Respuesta exitosa `200`:**

```json
{
  "success": true,
  "data": {
    "id": "ord-1001",
    "orderNumber": "CS-2026-1001",
    "customer": {
      "name": "Sofía Valenzuela Mendoza",
      "phone": "+52 55 4123 9876",
      "email": "sofia@techcorp.io",
      "address": "Av. Reforma 222, Piso 14, CDMX",
      "notes": "Entregar en recepción, atención a TI."
    },
    "items": [
      {
        "productId": "prod-001",
        "name": "MacBook Pro 16\" M3 Max",
        "price": 3499.00,
        "quantity": 1,
        "subtotal": 3499.00,
        "image": "https://..."
      }
    ],
    "subtotal": 3499.00,
    "shipping": 0.00,
    "total": 3499.00,
    "status": "enviado",
    "trackingNumber": "FEDEX-MX-9823411",
    "whatsappSent": true,
    "createdAt": "2026-03-01T15:30:00Z"
  }
}
```

**Errores posibles:**

| Código | `error` |
|---|---|
| `404` | `"Pedido no encontrado"` |

---

### `POST /orders`

Registra un nuevo pedido desde el checkout de la tienda pública. En una **sola operación atómica** asigna el folio, guarda el pedido y descuenta el inventario: o se completan las tres cosas, o no se hace ninguna.

**Body JSON:**

El frontend envía el carrito completo (formato actual de `Orders.submitOrder()`, sin cambios):

```json
{
  "customer": {
    "name": "Ana García López",
    "phone": "+52 55 1234 5678",
    "email": "ana.garcia@email.com",
    "address": "Calle Morelos 45, Col. Centro, Puebla, Pue.",
    "notes": "Llamar antes de entregar."
  },
  "items": [
    {
      "productId": "prod-003",
      "name": "Sony WH-1000XM5",
      "price": 399.00,
      "quantity": 2,
      "subtotal": 798.00,
      "image": "https://..."
    }
  ],
  "subtotal": 798.00,
  "shipping": 0.00,
  "total": 798.00
}
```

#### Campos que el backend usa realmente

| Campo | ¿Lo usa el backend? |
|---|---|
| `customer.*` | ✅ Sí (validado) |
| `items[].productId` | ✅ Sí |
| `items[].quantity` | ✅ Sí — entero ≥ 1 |
| `items[].price` | ✅ **Sí — validación de consistencia obligatoria:** se compara contra el `price` actual en DynamoDB. Si difiere, se devuelve `409 Conflict` sin registrar el pedido |
| `items[].name`, `items[].subtotal`, `items[].image` | ❌ **Se ignoran.** Se toman de DynamoDB para construir el snapshot |
| `subtotal`, `shipping`, `total` | ❌ **Se ignoran.** Se recalculan en el backend |

#### Regla explícita de cálculo de envío (`shipping`)

Tanto el carrito (`cart.js`), como el modo Mock (`api.js`) y el backend en AWS aplican exactamente la misma regla definida en `CONFIG.SHIPPING` (en pesos mexicanos, `MXN`):

- **Umbral de envío gratis (`FREE_THRESHOLD`):** `$500.00 MXN`
- **Costo de envío estándar (`STANDARD_COST`):** `$20.00 MXN`
- Si `subtotal <= 0` → `shipping = 0.00`
- Si `subtotal >= 500.00` → `shipping = 0.00` (Envío gratis)
- Si `0 < subtotal < 500.00` → `shipping = 20.00` (Envío estándar)
- `total = round(subtotal + shipping, 2)`

#### Procesamiento en el backend

1. **Validar** `customer` (`name`, `phone`, `address`), que `items` no esté vacío y que cada ítem incluya `productId`, `quantity` (entero $\ge 1$) y `price` (número $\ge 0$).
2. **Agrupar y verificar límites:** Consolidar artículos repetidos por `productId` sumando `quantity` (garantiza una sola operación por elemento en `TransactWriteItems`). Verificar que la cantidad de productos distintos no supere `MAX_DISTINCT_ITEMS = 50` y que el total de acciones ($2 + N$) no supere el límite duro de `100` operaciones de `TransactWriteItems`.
3. **Lectura consistente de productos (`BatchGetItem` con `ConsistentRead: true`):**
   - Si algún producto no existe o está inactivo (`active = false` / `productStatus != "ACTIVE"`) → `409 Conflict`.
   - **Comparación de precio:** Se compara el `items[].price` enviado al confirmar el pedido contra el `price` actual leído de DynamoDB. Si cambió (`|clientPrice - dbPrice| > 0.001`) → se devuelve `409 Conflict` sin registrar el pedido, para que el cliente revise el precio actualizado y confirme nuevamente.
   - Si `stock < quantity` → `409 Conflict`.
4. **Construir snapshot y recalcular totales** con los datos de DynamoDB:
   - `items[].name`, `price`, `image` → **copia inmutable (snapshot)** del producto en ese instante.
   - `items[].subtotal = round(price × quantity, 2)`
   - `subtotal = round(Σ items[].subtotal, 2)`
   - `shipping = (subtotal >= 500.00 ? 0.00 : 20.00)` (en MXN)
   - `total = round(subtotal + shipping, 2)`
5. **Lectura consistente del contador y `TransactWriteItems` (con reintentos por concurrencia en el folio):**
   - Leer `COUNTER#ORDER_NUMBER` en `CloudStore-Orders` con `ConsistentRead: true` y calcular `nextSeq = currentSeq + 1` (`orderNumber = "CS-2026-" + nextSeq`).
   - Ejecutar `TransactWriteItems` incluyendo en la **misma transacción**:
     1. `Update` condicional en `COUNTER#ORDER_NUMBER` comprobando `seq = :currentSeq`.
     2. `Put` del pedido con ese `orderNumber` (`attribute_not_exists(id)`).
     3. `Update` de cada producto comprobando que sigue activo (`active = true`), que **el precio no cambió entre la lectura y la transacción** (`price = :snapshotPrice`) y que tiene stock suficiente (`stock >= :qty`).
6. **Manejo de cancelación y concurrencia:**
   - Si un producto se desactivó, **cambió de precio entre la lectura y la transacción** o no tiene stock suficiente → se cancela la operación y se devuelve `409 Conflict` (no se registra el pedido ni se incrementa el contador) para que el cliente pueda reintentar.
   - Si únicamente el contador `COUNTER#ORDER_NUMBER` cambió por otro pedido concurrente → se vuelve a leer el contador con `ConsistentRead: true` y se reintenta hasta `MAX_CONCURRENCY_RETRIES = 3` veces. Si se agotan los reintentos → `503 Service Unavailable`.

#### Idempotencia ante reintentos de red (`Idempotency-Key`)

Para evitar pedidos duplicados y dobles descuentos de stock cuando el cliente reintenta `POST /orders` tras un timeout o corte de red después de que DynamoDB ya confirmó la transacción, el diseño contempla una **llave de idempotencia (`Idempotency-Key` / `idempotencyKey`)** compatible con `CloudStore-Orders` sin requerir tablas adicionales (detalle completo e implicaciones en `DYNAMODB-DESIGN.md` §4.7).

**Respuesta exitosa `201`:**

```json
{
  "success": true,
  "data": {
    "id": "ord-7f3c9e2a",
    "orderNumber": "CS-2026-1006",
    "customer": {
      "name": "Ana García López",
      "phone": "+52 55 1234 5678",
      "email": "ana.garcia@email.com",
      "address": "Calle Morelos 45, Col. Centro, Puebla, Pue.",
      "notes": "Llamar antes de entregar."
    },
    "items": [
      {
        "productId": "prod-003",
        "name": "Sony WH-1000XM5 Noise Cancelling",
        "price": 399.00,
        "quantity": 2,
        "subtotal": 798.00,
        "image": "https://..."
      }
    ],
    "subtotal": 798.00,
    "shipping": 0.00,
    "total": 798.00,
    "status": "pendiente",
    "whatsappSent": false,
    "createdAt": "2026-11-08T23:00:00Z"
  },
  "message": "Pedido registrado con éxito"
}
```

**Errores posibles:**

| Código | `error` | Cuándo |
|---|---|---|
| `400` | `"El carrito está vacío"` | `items` vacío o ausente |
| `400` | `"El campo customer.name es obligatorio"` | |
| `400` | `"El campo customer.phone es obligatorio"` | |
| `400` | `"El campo customer.address es obligatorio"` | |
| `400` | `"Cantidad inválida para el producto {id}"` | `quantity` no es entero ≥ 1 |
| `400` | `"El pedido supera el máximo permitido de 50 productos distintos por transacción"` | Supera `MAX_DISTINCT_ITEMS = 50` o el límite de `100` acciones de `TransactWriteItems` |
| `409` | `"Stock insuficiente para el producto {id}. Disponible: {n}"` | Inventario menor que la cantidad pedida |
| `409` | `"El producto {id} no está disponible o fue desactivado"` | Producto inexistente o inactivo |
| `409` | `"El precio del producto \"{name}\" ({id}) cambió recientemente. Por favor actualiza tu carrito e intenta nuevamente."` | El precio cambió respecto a la lectura o al carrito; se cancela para que el cliente reintente |
| `503` | `"No se pudo asignar el folio del pedido por alta concurrencia. Por favor intenta confirmar nuevamente."` | Se agotaron los 3 reintentos de concurrencia sobre `COUNTER#ORDER_NUMBER` |

En todos los errores **no se registra el pedido, no se modifica el inventario y no se incrementa el contador de folios**.

> **Paridad con el modo Mock:** `API.createOrder()` en modo Mock aplica las mismas validaciones (agrupación de ítems repetidos por `productId`, límite de 50 productos distintos y 100 acciones, comprobación de producto activo, precio sin cambios y stock suficiente con rechazo `status: 409`, actualización del elemento `COUNTER#ORDER_NUMBER` y regla explícita de envío).

---

### `PATCH /orders/{id}/status`

Actualiza el estado de un pedido y opcionalmente agrega número de guía de rastreo. Uso exclusivo del panel administrativo.

**Parámetros de ruta:**

| Parámetro | Descripción |
|---|---|
| `id` | ID interno del pedido (`ord-1001`) |

**Body JSON:**

```json
{
  "status": "enviado",
  "trackingNumber": "FEDEX-MX-9823411"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `status` | `string` | ✅ | Nuevo estado del pedido (ver tabla de estados) |
| `trackingNumber` | `string` | — | Número de guía de rastreo (solo cuando `status = enviado`) |

**Respuesta exitosa `200`:**

```json
{
  "success": true,
  "data": {
    "id": "ord-1001",
    "orderNumber": "CS-2026-1001",
    "status": "enviado",
    "trackingNumber": "FEDEX-MX-9823411",
    "updatedAt": "2026-11-08T23:00:00Z"
  },
  "message": "Estado actualizado a \"enviado\""
}
```

**Errores posibles:**

| Código | `error` |
|---|---|
| `400` | `"Estado inválido. Valores permitidos: pendiente, confirmado, enviado, cancelado"` |
| `404` | `"Pedido no encontrado para actualizar"` |

---

## 4. Dashboard (Admin)

### `GET /dashboard/metrics`

Obtiene los indicadores de rendimiento del panel administrativo.

**Sin parámetros.**

**Respuesta exitosa `200`:**

```json
{
  "success": true,
  "data": {
    "totalRevenue": 10811.00,
    "totalOrders": 5,
    "totalProducts": 14,
    "totalCategories": 5,
    "ordersPending": 2,
    "ordersConfirmed": 1,
    "ordersShipped": 1,
    "ordersCancelled": 1,
    "lowStockCount": 2,
    "lowStockProducts": [
      { "id": "prod-008", "name": "Samsung Odyssey G9", "stock": 4 }
    ],
    "recentOrders": [
      {
        "id": "ord-1004",
        "orderNumber": "CS-2026-1004",
        "customer": { "name": "Rodrigo Nava Herrera" },
        "total": 1418.00,
        "status": "pendiente",
        "createdAt": "2026-03-05T14:45:00Z"
      }
    ]
  }
}
```

| Métrica | Descripción |
|---|---|
| `totalRevenue` | Suma de `total` de pedidos no cancelados |
| `totalOrders` | Conteo total de pedidos |
| `totalProducts` | Conteo total de productos |
| `totalCategories` | Conteo total de categorías |
| `ordersPending` | Pedidos en estado `pendiente` |
| `ordersConfirmed` | Pedidos en estado `confirmado` |
| `ordersShipped` | Pedidos en estado `enviado` |
| `ordersCancelled` | Pedidos en estado `cancelado` |
| `lowStockCount` | Productos activos con `stock <= 5` |
| `lowStockProducts` | Lista de esos productos con sus datos básicos |
| `recentOrders` | Últimos 5 pedidos ordenados por fecha |

---

## 5. Mapa completo de endpoints

| Método | Ruta | Función JS | Descripción |
|---|---|---|---|
| `GET` | `/products` | `API.getProducts(filters)` | Catálogo público (activos) |
| `GET` | `/products?includeInactive=true` | `API.getAdminProducts(filters)` | Catálogo admin (todos) |
| `GET` | `/products/{id}` | `API.getProductById(id)` | Detalle de producto |
| `POST` | `/products` | `API.createProduct(data)` | Crear producto |
| `PUT` | `/products/{id}` | `API.updateProduct(id, data)` | Actualizar producto |
| `DELETE` | `/products/{id}` | `API.deleteProduct(id)` | Eliminar producto |
| `GET` | `/categories` | `API.getCategories(filters)` | Listar categorías (activas por defecto; `?includeInactive=true` para todas) |
| `POST` | `/categories` | `API.createCategory(data)` | Crear categoría |
| `PUT` | `/categories/{id}` | `API.updateCategory(id, data)` | Actualizar categoría |
| `DELETE` | `/categories/{id}` | `API.deleteCategory(id)` | Eliminar categoría |
| `GET` | `/orders` | `API.getOrders(filters)` | Listar pedidos (admin) |
| `GET` | `/orders/{id}` | `API.getOrderById(id)` | Detalle de pedido |
| `POST` | `/orders` | `API.createOrder(payload)` | Registrar pedido |
| `PATCH` | `/orders/{id}/status` | `API.updateOrderStatus(id, status, tracking)` | Actualizar estado |
| `GET` | `/dashboard/metrics` | `API.getDashboardMetrics()` | KPIs del dashboard |

---

## 6. Consideraciones para la migración a AWS

### API Gateway + Lambda

- Crear una **HTTP API** en API Gateway (menor costo que REST API).
- Mapear cada ruta a su propia función Lambda, o usar un **proxy Lambda único** con enrutado interno.
- Proteger las rutas de escritura (`POST`, `PUT`, `DELETE`, `PATCH`) con un **Lambda Authorizer** (en lugar de prefijos `/admin/`).
- Habilitar **CORS** para el dominio CloudFront del frontend.

### DynamoDB

Tablas diseñadas (detalle completo en `DYNAMODB-DESIGN.md`):

| Tabla | Partition Key | Sort Key | GSIs |
|---|---|---|---|
| `CloudStore-Products` | `id` (S) | — | `StatusIndex` (`productStatus`, `createdAt`) · `CategoryIndex` (`categoryId`, `categorySort`) |
| `CloudStore-Categories` | `id` (S) | — | `StatusIndex` (`categoryStatus`, `name`) |
| `CloudStore-Orders` | `id` (S) | — | `StatusDateIndex` (`status`, `createdAt`) · `DateIndex` (`entityType`, `createdAt`) · `OrderNumberIndex` (`orderNumber`) |

### Cambio de Mock a Real (un solo paso)

```js
// frontend/js/config.js
const CONFIG = {
  USE_MOCK_API: false,                                           // ← cambiar a false
  API_BASE_URL: 'https://xyz.execute-api.us-east-1.amazonaws.com/prod'  // ← URL de API Gateway
};
```

> No se requiere modificar ninguna página HTML ni módulo de lógica de negocio.

---

*Generado automáticamente por análisis de `frontend/js/api.js` v1.0 — CloudStore Serverless.*
