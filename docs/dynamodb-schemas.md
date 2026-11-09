# CloudStore Serverless — Diseño de Esquemas en Amazon DynamoDB

Este documento define el modelo de datos NoSQL para **Amazon DynamoDB**, diseñado para soportar las consultas requeridas por el frontend de CloudStore y alineado con los contratos JSON implementados en [`api.js`](../frontend/js/api.js).

---

## 1. Estrategia de Tablas

Se recomienda el enfoque de **tres tablas desacopladas** para facilitar el mantenimiento y control de cuotas/facturación en entornos serverless:

1. `cloudstore-products`
2. `cloudstore-categories`
3. `cloudstore-orders`

---

## 2. Tabla: `cloudstore-products`

### Llaves y Configuración
- **Partition Key (PK):** `id` (String) — Identificador único del producto (Ej. `prod-001`, `prod-m3max-01`).
- **Billing Mode:** On-Demand (`PAY_PER_REQUEST`).

### Índices Secundarios Globales (GSI)

#### GSI-1: `CategoryIndex`
- **GSI PK:** `categoryId` (String)
- **GSI SK:** `createdAt` (String, formato ISO-8601)
- **Proyección:** `ALL`
- **Propósito:** Consultar rápidamente todos los productos de una categoría ordenados por fecha de creación (utilizado en `catalog.html` y productos relacionados de `product.html`).

#### GSI-2: `FeaturedIndex`
- **GSI PK:** `featured` (String: `'true'` / `'false'`)
- **GSI SK:** `createdAt` (String)
- **Proyección:** `ALL`
- **Propósito:** Consultar los productos destacados que se despliegan en la portada de `index.html`.

### Estructura del Item (JSON)
```json
{
  "id": "prod-001",
  "name": "MacBook Pro 16\" M3 Max",
  "slug": "macbook-pro-16-m3-max",
  "categoryId": "cat-laptops",
  "categoryName": "Laptops & Computadoras",
  "price": 3499.00,
  "comparePrice": 3899.00,
  "stock": 8,
  "description": "La estación de trabajo portátil definitiva para desarrollo de software y ciencia de datos.",
  "features": [
    "Chip Apple M3 Max (16 CPU / 40 GPU)",
    "36 GB de memoria unificada",
    "1 TB de almacenamiento SSD ultra-rápido"
  ],
  "image": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
  "featured": true,
  "active": true,
  "rating": 4.9,
  "reviewsCount": 38,
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-03-01T12:00:00Z"
}
```

---

## 3. Tabla: `cloudstore-categories`

### Llaves y Configuración
- **Partition Key (PK):** `id` (String) — Identificador de categoría (Ej. `cat-laptops`).
- **Billing Mode:** On-Demand (`PAY_PER_REQUEST`).

### Estructura del Item (JSON)
```json
{
  "id": "cat-laptops",
  "name": "Laptops & Computadoras",
  "slug": "laptops-computadoras",
  "description": "Equipos portátiles y estaciones de trabajo de alto rendimiento.",
  "icon": "bi-laptop",
  "active": true,
  "createdAt": "2026-01-01T00:00:00Z"
}
```

---

## 4. Tabla: `cloudstore-orders`

### Llaves y Configuración
- **Partition Key (PK):** `id` (String) — Identificador único interno (Ej. `ord-1001` o UUID v4).
- **Billing Mode:** On-Demand (`PAY_PER_REQUEST`).

### Índices Secundarios Globales (GSI)

#### GSI-1: `StatusDateIndex`
- **GSI PK:** `status` (String: `'pendiente'` | `'confirmado'` | `'enviado'` | `'cancelado'`)
- **GSI SK:** `createdAt` (String, formato ISO-8601)
- **Proyección:** `ALL`
- **Propósito:** Filtrado eficiente de órdenes por estado en `admin/orders.html` ordenadas por fecha descendente.

#### GSI-2: `OrderNumberIndex`
- **GSI PK:** `orderNumber` (String: Ej. `CS-2026-1001`)
- **Proyección:** `ALL`
- **Propósito:** Búsqueda rápida por número de orden cuando el cliente consulta o accede a `order-success.html`.

### Estructura del Item (JSON)
```json
{
  "id": "ord-1001",
  "orderNumber": "CS-2026-1001",
  "customer": {
    "name": "Sofía Valenzuela Mendoza",
    "phone": "+52 55 4123 9876",
    "email": "sofia.valenzuela@techcorp.io",
    "address": "Av. Reforma 222, Piso 14, Col. Juárez, Cuauhtémoc, CDMX",
    "notes": "Entregar en recepción con atención al área de TI."
  },
  "items": [
    {
      "productId": "prod-001",
      "name": "MacBook Pro 16\" M3 Max",
      "price": 3499.00,
      "quantity": 1,
      "subtotal": 3499.00,
      "image": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80"
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

---

## 5. Patrones de Acceso y Operaciones en DynamoDB

| Patrón de Acceso | Operación DynamoDB | Parámetros Clave |
|---|---|---|
| Obtener producto por ID | `GetItem` | `Key: { id: "prod-001" }` |
| Listar productos activos | `Scan` o GSI | Filtro `active = true` |
| Listar productos por categoría | `Query` sobre `CategoryIndex` | `KeyConditionExpression: "categoryId = :cid"` |
| Listar productos destacados | `Query` sobre `FeaturedIndex` | `KeyConditionExpression: "featured = :f"` |
| Crear nuevo producto | `PutItem` | Objeto completo con `id` generado |
| Actualizar stock tras compra | `UpdateItem` | `UpdateExpression: "SET stock = stock - :qty"` con `ConditionExpression: "stock >= :qty"` |
| Listar pedidos por estado | `Query` sobre `StatusDateIndex` | `KeyConditionExpression: "status = :st"`, `ScanIndexForward: false` |
| Actualizar estado de pedido | `UpdateItem` | `UpdateExpression: "SET #st = :st, trackingNumber = :tk, updatedAt = :now"` |
