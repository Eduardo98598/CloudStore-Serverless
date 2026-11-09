# CloudStore Serverless — Backend (AWS Lambda + API Gateway HTTP API + DynamoDB)

Estructura del backend preparada para **Node.js 24.x** en **CommonJS**, utilizando **AWS SDK for JavaScript v3** (`@aws-sdk/client-dynamodb` y `@aws-sdk/lib-dynamodb`), alineada con [`API-CONTRACT.md`](../API-CONTRACT.md) y [`DYNAMODB-DESIGN.md`](../DYNAMODB-DESIGN.md).

---

## Estructura de directorios

```text
backend/
├── shared/                   # Módulos comunes (Lambda Layer o inclusión en paquete de despliegue)
│   ├── constants.js          # Nombres de tablas, GSIs, estados, límites y reglas de envío en MXN
│   ├── db.js                 # Singleton de DynamoDBDocumentClient (AWS SDK v3)
│   ├── http.js               # Normalizador de eventos API Gateway HTTP API (v2.0/v1.0) y envelope JSON + CORS
│   └── validators.js         # Redondeo MXN, cálculo de envío, slugs, hashes de idempotencia y sanitización
├── products/                 # Función Lambda 1: CloudStore-Products
│   ├── package.json          # Node.js >=24.0.0, CommonJS, AWS SDK v3
│   ├── index.js              # Handler de /products y /products/{id}
│   └── service.js            # Acceso a datos con StatusIndex y CategoryIndex (sin Scan)
├── categories/               # Función Lambda 2: CloudStore-Categories
│   ├── package.json          # Node.js >=24.0.0, CommonJS, AWS SDK v3
│   ├── index.js              # Handler de /categories y /categories/{id}
│   └── service.js            # Acceso a datos con StatusIndex + conteo/validación cruzada en Products
└── orders/                   # Función Lambda 3: CloudStore-Orders
    ├── package.json          # Node.js >=24.0.0, CommonJS, AWS SDK v3
    ├── index.js              # Handler de /orders, /orders/{id}, /orders/{id}/status y /dashboard/metrics
    └── service.js            # TransactWriteItems atómico, idempotencia, COUNTER#ORDER_NUMBER y métricas
```

---

## Mapa de rutas en API Gateway HTTP API hacia cada Lambda

| Función Lambda | Método | Ruta | Tabla(s) DynamoDB utilizadas |
|---|---|---|---|
| **Products** (`backend/products`) | `GET` | `/products` | `CloudStore-Products` (`StatusIndex` / `CategoryIndex`) |
| **Products** (`backend/products`) | `GET` | `/products/{id}` | `CloudStore-Products` (`GetItem`) |
| **Products** (`backend/products`) | `POST` | `/products` | `CloudStore-Products` (`PutItem`) |
| **Products** (`backend/products`) | `PUT` | `/products/{id}` | `CloudStore-Products` (`GetItem` + `UpdateItem`) |
| **Products** (`backend/products`) | `DELETE` | `/products/{id}` | `CloudStore-Products` (`DeleteItem`) |
| **Categories** (`backend/categories`) | `GET` | `/categories` | `CloudStore-Categories` (`StatusIndex`) + `CloudStore-Products` (`CategoryIndex` `COUNT`) |
| **Categories** (`backend/categories`) | `POST` | `/categories` | `CloudStore-Categories` (`PutItem` con unicidad por `id = cat-<slug>`) |
| **Categories** (`backend/categories`) | `PUT` | `/categories/{id}` | `CloudStore-Categories` (`UpdateItem`) + propagación de `categoryName` en `CloudStore-Products` |
| **Categories** (`backend/categories`) | `DELETE` | `/categories/{id}` | `CloudStore-Products` (`CategoryIndex` `Limit: 1`) + `CloudStore-Categories` (`DeleteItem`) |
| **Orders** (`backend/orders`) | `GET` | `/orders` | `CloudStore-Orders` (`DateIndex` / `StatusDateIndex`) |
| **Orders** (`backend/orders`) | `GET` | `/orders/{id}` | `CloudStore-Orders` (`GetItem` por `id` o `Query` en `OrderNumberIndex` si empieza con `CS-`) |
| **Orders** (`backend/orders`) | `POST` | `/orders` | `CloudStore-Orders` + `CloudStore-Products` (`BatchGetItem` + `TransactWriteItems`) |
| **Orders** (`backend/orders`) | `PATCH` | `/orders/{id}/status` | `CloudStore-Orders` (`UpdateItem`) |
| **Orders** (`backend/orders`) | `GET` | `/dashboard/metrics` | `CloudStore-Orders` (`DateIndex`), `CloudStore-Products` (`StatusIndex`), `CloudStore-Categories` (`StatusIndex`) |

---

## Variables de entorno soportadas por las 3 Lambdas

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PRODUCTS_TABLE` | `CloudStore-Products` | Nombre de la tabla de productos en DynamoDB |
| `CATEGORIES_TABLE` | `CloudStore-Categories` | Nombre de la tabla de categorías en DynamoDB |
| `ORDERS_TABLE` | `CloudStore-Orders` | Nombre de la tabla de pedidos y contador `COUNTER#ORDER_NUMBER` |
| `CORS_ORIGIN` | `*` | Origen permitido en las cabeceras CORS (ej. dominio CloudFront) |
| `AWS_REGION` | *(Región de ejecución)* | Región de AWS |
