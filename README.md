# CloudStore Serverless



Tienda de comercio electrónico educativa construida con **HTML5, CSS3,

JavaScript Vanilla, Bootstrap 5 y AWS Serverless**. El proyecto permite

practicar el desarrollo de una aplicación web desacoplada y su

integración con servicios administrados de AWS.



> **Propósito educativo:** CloudStore es una aplicación de demostración

> para el taller. No debe utilizarse como tienda de producción sin

> implementar autenticación, autorización, controles adicionales de

> seguridad y las medidas operativas correspondientes.



## 1. ¿Qué aprenderás?**



-   Estructurar un frontend web sin depender de un framework.

-   Separar la interfaz de la capa de acceso a datos.

-   Consumir una API HTTP desde JavaScript.

-   Crear y consultar datos mediante AWS Lambda y Amazon DynamoDB.

-   Comprender el papel de Amazon API Gateway.

-   Personalizar la identidad visual y el catálogo de una tienda.

-   Preparar el frontend para alojarlo en Amazon S3 y distribuirlo con

    Amazon CloudFront.



## 2. Arquitectura**



El frontend se comunica con una capa de acceso a datos (`api.js`). Esta

capa permite trabajar con datos simulados durante el desarrollo local o

consumir la API desplegada en AWS.



``` text

                 Frontend (HTML / CSS / JavaScript)

                                |

                                v

                      Data Access Layer

                          frontend/js/api.js

                         /               \\

                        v                 v

                Modo simulado       AWS API Gateway

                localStorage               |

                                           v

                                     AWS Lambda

                             Products / Categories / Orders

                                           |

                                           v

                                      DynamoDB

```



Servicios utilizados:



**&#xA0; -----------------------------------------------------------------------**

  Servicio                            Responsabilidad

**&#xA0; ----------------------------------- -----------------------------------**

  Amazon API Gateway (HTTP API)       Recibe las solicitudes HTTP y las

                                      dirige a las funciones Lambda.



  AWS Lambda (Node.js 24.x)           Ejecuta la lógica de productos,

                                      categorías y pedidos.



  Amazon DynamoDB                     Almacena productos, categorías y

                                      pedidos.



  Amazon CloudWatch                   Permite consultar registros y

                                      métricas de ejecución de Lambda.



  Amazon S3                           Servicio previsto para alojar el

                                      frontend estático.



  Amazon CloudFront                   Servicio previsto para distribuir

                                      el frontend mediante una CDN y

                                      HTTPS.

  -----------------------------------------------------------------------



**### Recursos del backend del taller**



La implementación de referencia del instructor utiliza la región

****`mx-central-1`**** y estos recursos:



  Recurso                Nombre

**&#xA0; ---------------------- -------------------------**

  Tabla de productos     `CloudStore-Products`

  Tabla de categorías    `CloudStore-Categories`

  Tabla de pedidos       `CloudStore-Orders`

  Lambda de productos    `CloudStore-Products`

  Lambda de categorías   `CloudStore-Categories`

  Lambda de pedidos      `CloudStore-Orders`

  API Gateway            `CloudStore-API`

  Etapa de API Gateway   `$default`



La URL base de la API de referencia del instructor es:



``` text

https\://w8n9qxsmsd.execute-api.mx-central-1.amazonaws.com

```



Esta URL corresponde al entorno del instructor. Si tu equipo despliega

recursos propios, deberá utilizar la URL de su propia API.



## 3. Tecnologías y requisitos**



-   HTML5 y CSS3.

-   JavaScript Vanilla (ES6+).

-   Bootstrap 5.3.3 y Bootstrap Icons 1.11.3.

-   Node.js 24.x.

-   npm 11.x.

-   Git y una cuenta de GitHub.

-   Navegador web actualizado.



El servidor local incluido utiliza módulos nativos de Node.js y no

requiere dependencias externas para servir los archivos estáticos.



## 4. Estructura del repositorio**



``` text

CloudStore-Serverless/

├── backend/

│   ├── products/

│   ├── categories/

│   ├── orders/

│   └── shared/

├── docs/

├── frontend/

│   ├── admin/

│   ├── assets/

│   ├── config/

│   ├── css/

│   └── js/

├── tests/

├── API-CONTRACT.md

├── DYNAMODB-DESIGN.md

├── PERSONALIZAR-TIENDA.md

├── package.json

├── server.js

└── README.md

```



-   `backend/`: código de las funciones Lambda y módulos compartidos.

-   `docs/`: documentación de arquitectura, base de datos y API.

-   `frontend/`: tienda pública y panel administrativo.

-   `tests/`: pruebas y simulaciones del backend.

-   `API-CONTRACT.md`: contrato de endpoints.

-   `DYNAMODB-DESIGN.md`: diseño de tablas e índices.

-   `PERSONALIZAR-TIENDA.md`: guía de personalización para los equipos.



## 5. Obtener el proyecto mediante Fork**



Cada equipo trabajará en una copia propia del repositorio.



1.  Inicia sesión en GitHub.

2.  Abre el repositorio del instructor:\\

    https\://github.com/Eduardo98598/CloudStore-Serverless

3.  Selecciona ****Fork**** y después ****Create fork****.

4.  Entra al Fork que se creó en tu cuenta.

5.  Selecciona ****Code****, copia la URL HTTPS y clona tu copia.



Ejemplo:



``` powershell

git clone https\://github.com/TU-USUARIO/CloudStore-Serverless.git

cd CloudStore-Serverless

```



Crea una rama para tu equipo. Sustituye `equipo-01` por el identificador

asignado:



``` powershell

git switch -c equipo-01

```



Comprueba la rama activa:



``` powershell

git branch

```



**### Guardar y publicar tus cambios**



Después de modificar el proyecto:



``` powershell

git add .

git commit -m "Personalizacion inicial del equipo 01"

git push -u origin equipo-01

```



Para publicar cambios posteriores en esa misma rama:



``` powershell

git add .

git commit -m "Descripcion de los cambios"

git push

```



Cada equipo trabaja en su propio Fork. Para entregar el trabajo al

instructor, puede abrir un ****Pull Request**** desde su rama hacia el

repositorio original, siguiendo las indicaciones del taller.



## 6. Ejecutar el proyecto localmente**



**### Requisitos previos**



Comprueba que Node.js y npm estén instalados:



``` powershell

node -v

npm -v

```



**### Iniciar el servidor**



Desde la carpeta raíz del proyecto:



``` powershell

npm start

```



También puedes iniciar el servidor directamente:



``` powershell

node server.js

```



Abre estas direcciones en el navegador:



-   Tienda pública: http\://localhost:3000

-   Panel administrativo: http\://localhost:3000/admin/index.html



Detén el servidor con `Ctrl + C`.



## 7. Configurar el frontend para utilizar AWS**



El proyecto permite alternar entre el modo de datos simulados y la API

real. La configuración del frontend se encuentra en:



``` text

frontend/js/config.js

```



Para trabajar con datos simulados durante el desarrollo local, utiliza

el modo Mock. Para conectarte a AWS, configura el modo real y la URL

base de la API.



Ejemplo conceptual de configuración:



``` javascript

const CONFIG = {

  USE_MOCK_API: false,

  API_BASE_URL: 'https\://TU-API-ID.execute-api.mx-central-1.amazonaws.com'

};

```



****Importante:**** conserva las demás propiedades que ya existan en el

objeto `CONFIG`; modifica únicamente los valores correspondientes. La

URL debe ser la de la API asignada a tu equipo o la que indique el

instructor. No agregues `/prod`: la API de referencia utiliza la etapa

`$default`.



## 8. Endpoints de la API de referencia**



La API HTTP desplegada por el instructor expone las siguientes rutas:



**&#xA0; -----------------------------------------------------------------------**

  Método                  Ruta                    Operación

**&#xA0; ----------------------- ----------------------- -----------------------**

  GET                     `/products`             Consultar productos.



  GET                     `/products/{id}`        Consultar un producto

                                                  por ID.



  POST                    `/products`             Crear un producto.



  PUT                     `/products/{id}`        Actualizar un producto.



  DELETE                  `/products/{id}`        Desactivar/eliminar

                                                  lógicamente un

                                                  producto.



  GET                     `/categories`           Consultar categorías.



  POST                    `/categories`           Crear una categoría.



  PUT                     `/categories/{id}`      Actualizar una

                                                  categoría.



  DELETE                  `/categories/{id}`      Desactivar/eliminar

                                                  lógicamente una

                                                  categoría.



  GET                     `/orders`               Consultar pedidos.



  GET                     `/orders/{id}`          Consultar un pedido por

                                                  ID.



  POST                    `/orders`               Registrar un pedido.



  PATCH                   `/orders/{id}/status`   Actualizar el estado de

                                                  un pedido.



  GET                     `/dashboard/metrics`    Consultar métricas del

                                                  dashboard.

  -----------------------------------------------------------------------



La definición detallada de parámetros, cuerpos de solicitud y respuestas

está en `API-CONTRACT.md`. No sustituyas estas rutas por rutas

`/admin/...`: esas rutas no corresponden a la API desplegada del taller.



## 9. Personalizar la tienda**



Cada equipo deberá adaptar la identidad visual y el contenido de su

tienda. La guía principal es:



``` text

PERSONALIZAR-TIENDA.md

```



Como mínimo, revisa:



-   Nombre y descripción de la tienda.

-   Logotipo, favicon y banner.

-   Colores y tema visual.

-   Categorías y productos.

-   Imágenes y textos del catálogo.

-   Datos de contacto y configuración de WhatsApp, si aplica.



No modifiques las rutas de la API ni la lógica de pedidos sin

autorización del instructor. La personalización debe conservar el

contrato de comunicación entre frontend y backend.



## 10. Despliegue del frontend en S3 y CloudFront**



El frontend estático está preparado para alojarse en Amazon S3 y

distribuirse mediante Amazon CloudFront. El flujo general es:



1.  Crear un bucket S3 para el sitio del equipo.

2.  Publicar el contenido de la carpeta `frontend/`.

3.  Configurar CloudFront para distribuir el contenido del bucket.

4.  Configurar el acceso seguro al origen S3.

5.  Probar la tienda desde la URL de CloudFront.

6.  Invalidar la caché de CloudFront cuando sea necesario publicar

    cambios.



Los nombres de recursos deben ser únicos por equipo. Sigue la

demostración y las indicaciones del instructor antes de crear recursos

para evitar colisiones o costos innecesarios.



## 11. Seguridad y costos: consideraciones del laboratorio**



-   Nunca subas claves de acceso, contraseñas, archivos `.env` con

    secretos ni credenciales de AWS a GitHub.

-   No incluyas claves de AWS en el código JavaScript del navegador.

-   El panel administrativo de esta versión es demostrativo y **no

    cuenta con autenticación ni autorización de administrador**. No lo

    expongas como un sistema de producción.

-   CORS no sustituye la autenticación ni protege por sí solo las

    operaciones.

-   Utiliza únicamente los recursos y permisos indicados por el

    instructor.

-   Revisa los recursos creados y elimina los que ya no se utilicen al

    finalizar el taller.

-   AWS puede generar cargos por servicios, almacenamiento, solicitudes

    y transferencia de datos. Consulta la consola de facturación y los

    límites de tu cuenta.



## 12. Documentación adicional**



-   `API-CONTRACT.md`: rutas y contrato de comunicación de la API.

-   `DYNAMODB-DESIGN.md`: tablas, claves e índices de DynamoDB.

-   `PERSONALIZAR-TIENDA.md`: instrucciones para adaptar la tienda.

-   `docs/aws-architecture.md`: arquitectura de la solución.

-   `docs/dynamodb-schemas.md`: esquemas de datos.

-   `docs/openapi.yaml`: especificación OpenAPI.



**------------------------------------------------------------------------**



**CloudStore Serverless --- Proyecto educativo para el taller de

desarrollo de aplicaciones con AWS.**

---

# Anexo: laboratorio local con AWS Emulator

# CloudStore Serverless — Bitácora técnica del laboratorio local

**Sesión validada:** 14 de noviembre de 2026 (hora de México) / 15 de noviembre UTC  
**Proyecto:** `D:\Taller 2026\CloudStore-Serverless`  
**Objetivo:** ejecutar el frontend y el backend de CloudStore contra **AWS Emulator local**, sin enviar solicitudes a la cuenta de AWS real.  
**Estado final observado:** tienda funcionando en `http://localhost:3000`, API funcionando en `http://localhost:4000`, DynamoDB emulado en `https://127.0.0.1:9297`.

> **Alcance y fidelidad.** Esta bitácora documenta los comandos y fragmentos de código que se mostraron durante la sesión y las respuestas verificadas. Los identificadores y resultados corresponden al estado de aquella ejecución; cambiarán al recrear los datos. No es una copia completa del repositorio: el contenido íntegro de `backend/local-server.js` y de los servicios no se pegó en esta conversación. No se inventa ese código ni se afirma que se haya ejecutado aquí. Cuando se incluye un comando *equivalente* para repetir una prueba anterior, se identifica como tal.

## 1. Resultado ejecutivo

Se comprobó un flujo completo de comercio electrónico sin infraestructura de AWS real:

1. DynamoDB Emulator respondió a AWS CLI y al SDK de JavaScript v3.
2. Se crearon las tres tablas de CloudStore con índices secundarios activos.
3. El backend Node.js expuso rutas HTTP locales y reutilizó los handlers de Lambda existentes.
4. Se crearon y consultaron categorías y productos; el CRUD de productos se probó de extremo a extremo.
5. Se creó una orden con una transacción que registró el pedido, actualizó el contador y descontó inventario.
6. Repetir la compra con la misma `Idempotency-Key` no duplicó el pedido ni redujo de nuevo el stock.
7. Se confirmó el pedido, se consultó por estado y se obtuvieron métricas coherentes.
8. El usuario abrió la tienda en el navegador y confirmó que el frontend funcionaba correctamente contra la API local.

### Indicadores finales observados

| Indicador | Resultado |
|---|---:|
| Productos | 1 |
| Categorías | 2 |
| Pedidos | 1 |
| Ventas acumuladas | $799 MXN |
| Pedidos confirmados | 1 |
| Pedidos pendientes | 0 |
| Pedidos enviados / cancelados | 0 / 0 |
| Stock del Mouse Logitech G305 | 14 |
| Productos con bajo inventario | 0 |

> Una de las dos categorías se creó con caracteres acentuados mal codificados desde PowerShell. La categoría `Electronica` sí quedó utilizable y fue la empleada en la prueba de compra.

## 2. Arquitectura local validada

```text
                    NAVEGADOR
              http://localhost:3000
                         |
                         v
       frontend/ (HTML + CSS + Bootstrap + JS)
                  frontend/js/api.js
                         |
                         | HTTP / JSON
                         v
              http://localhost:4000
               backend/local-server.js
                (Node.js http nativo)
                         |
           +-------------+-------------+
           |             |             |
           v             v             v
       Products       Categories       Orders
       handler        handler          handler
           \             |             /
            \            |            /
             +----- backend/shared/db.js
                         |
                 AWS SDK JavaScript v3
                         |
                         v
              DynamoDB Emulator local
              https://127.0.0.1:9297
                         |
           +-------------+-------------+
           |             |             |
   CloudStore-Products  Categories     Orders
```

**Diferencia clave:** en el laboratorio no se ejecutan Lambda ni API Gateway administrados por AWS. `backend/local-server.js` **simula el evento de API Gateway** y llama a los mismos handlers de la aplicación. El cliente DynamoDB se redirige al emulador mediante `DYNAMODB_ENDPOINT`.

### Puertos y componentes

| Puerto / URL | Componente | Función |
|---|---|---|
| `http://localhost:3000` | `server.js` | Sirve el frontend estático |
| `http://localhost:4000` | `backend/local-server.js` | API HTTP local |
| `https://127.0.0.1:9297` | AWS Emulator en Docker | API DynamoDB emulada |

## 3. Requisitos y versiones observadas

- Windows 11, PowerShell, Docker con AWS Emulator ejecutándose.
- Node.js `v24.22.2` y npm `11.19.1` en el equipo de la sesión.
- AWS CLI v2 instalado.
- `@aws-sdk/client-dynamodb@3.1169.0`.
- `@aws-sdk/lib-dynamodb@3.1169.0`.
- No se instaló Express: `npm ls express` devolvió `(empty)`; el servidor HTTP local usa el módulo nativo `http`.
- Proyecto raíz: `D:\Taller 2026\CloudStore-Serverless`.

### Verificación de dependencias (ejecutada)

```powershell
node -v
npm -v
npm ls @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
npm ls express
node --check backend/local-server.js
```

La última verificación sintáctica no reportó errores.

## 4. Protección contra conexiones a AWS real

**Todas las operaciones del laboratorio deben ir al emulador.** Se utilizaron archivos de configuración y credenciales propios del emulador y un endpoint explícito.

### 4.1 Variables de entorno para el proceso Node.js

Ejecutar en **la misma ventana de PowerShell desde la que se arrancará** `node backend/local-server.js`:

```powershell
$env:AWS_REGION = "us-east-1"
$env:AWS_DEFAULT_REGION = "us-east-1"
$env:DYNAMODB_ENDPOINT = "https://127.0.0.1:9297"
$env:AWS_SHARED_CREDENTIALS_FILE = "$env:USERPROFILE\.aws\emulator\9297\emulator_credentials"
$env:AWS_CONFIG_FILE = "$env:USERPROFILE\.aws\emulator\9297\config"
$env:NODE_EXTRA_CA_CERTS = "$env:USERPROFILE\.aws\emulator\9297\ca.pem"
$env:AWS_EC2_METADATA_DISABLED = "true"

Remove-Item Env:AWS_ACCESS_KEY_ID, Env:AWS_SECRET_ACCESS_KEY, Env:AWS_SESSION_TOKEN, Env:AWS_PROFILE -ErrorAction SilentlyContinue
```

**Importante:** estas variables pertenecen a la sesión de PowerShell. Una nueva terminal no las hereda automáticamente. No copiar claves reales al laboratorio ni subir el archivo de credenciales al repositorio.

### 4.2 Validar que existan los archivos locales

```powershell
Test-Path "$env:USERPROFILE\.aws\emulator\9297\emulator_credentials"
Test-Path "$env:USERPROFILE\.aws\emulator\9297\config"
Test-Path "$env:USERPROFILE\.aws\emulator\9297\ca.pem"
```

**Resultado observado:** `True`, `True`, `True`.

### 4.3 Patrón AWS CLI usado para el emulador

```powershell
$env:AWS_PAGER = ""

aws dynamodb list-tables `
  --region us-east-1 `
  --endpoint-url https://127.0.0.1:9297 `
  --ca-bundle "$env:USERPROFILE\.aws\emulator\9297\ca.pem"
```

El ARN de la tabla de prueba incluía la cuenta local `000000000000`, característica observada del emulador; **no** una cuenta real de AWS.

## 5. DynamoDB: tablas e índices activos

Las tablas se crearon con capacidad `PAY_PER_REQUEST`. Se verificó que todas y sus GSIs estaban en estado `ACTIVE`.

| Tabla | Clave primaria (S) | Índices secundarios globales (GSI) |
|---|---|---|
| `CloudStore-Products` | `id` | `StatusIndex` (`productStatus`, `createdAt`), `CategoryIndex` (`categoryId`, `categorySort`) |
| `CloudStore-Categories` | `id` | `StatusIndex` (`categoryStatus`, `name`) |
| `CloudStore-Orders` | `id` | `StatusDateIndex` (`status`, `createdAt`), `DateIndex` (`entityType`, `createdAt`), `OrderNumberIndex` (`orderNumber`) |

Además se creó `CloudStore-Test`, una tabla auxiliar con PK `id` de tipo `S`, para validar la conexión de AWS CLI.

### 5.1 Comandos de consulta usados

```powershell
# Lista de tablas del emulador
aws dynamodb list-tables `
  --endpoint-url https://127.0.0.1:9297 `
  --ca-bundle "$env:USERPROFILE\.aws\emulator\9297\ca.pem"

# Ejemplo: estado de la tabla de pedidos y sus GSIs
aws dynamodb describe-table `
  --table-name CloudStore-Orders `
  --endpoint-url https://127.0.0.1:9297 `
  --ca-bundle "$env:USERPROFILE\.aws\emulator\9297\ca.pem"
```

**Salida observada de `list-tables`:** `CloudStore-Categories`, `CloudStore-Orders`, `CloudStore-Products`, `CloudStore-Test`.

### 5.2 Prueba de lectura y escritura AWS CLI

En `C:\AWS-Emulator-Pruebas` se utilizaron `item.json` y `key.json` para insertar y recuperar un registro en `CloudStore-Test`.

Contenido lógico de los archivos de prueba:

```json
// item.json — representación del ítem de prueba
{
  "id": {"S": "test-001"},
  "name": {"S": "Producto de prueba"},
  "price": {"N": "799"}
}
```

```json
// key.json
{
  "id": {"S": "test-001"}
}
```

> Los comentarios `//` de los ejemplos anteriores son rótulos del documento; no deben copiarse dentro de los archivos JSON.

Comandos equivalentes para repetir la prueba, usando los mismos archivos:

```powershell
aws dynamodb put-item `
  --table-name CloudStore-Test `
  --item file://item.json `
  --endpoint-url https://127.0.0.1:9297 `
  --ca-bundle "$env:USERPROFILE\.aws\emulator\9297\ca.pem"

aws dynamodb get-item `
  --table-name CloudStore-Test `
  --key file://key.json `
  --endpoint-url https://127.0.0.1:9297 `
  --ca-bundle "$env:USERPROFILE\.aws\emulator\9297\ca.pem"
```

**Resultado observado:** se recuperó `test-001`, `Producto de prueba`, precio `799`.

### 5.3 Índices y reglas relevantes

- `StatusIndex` de productos permite filtrar por `ACTIVE`/`INACTIVE`.
- `CategoryIndex` permite recuperar productos por categoría sin escanear toda la tabla.
- `StatusDateIndex` permite listar órdenes por estado y fecha.
- `DateIndex` permite ordenar pedidos por fecha mediante `entityType = ORDER`.
- `OrderNumberIndex` permite consultar por folio (`CS-...`).
- El ítem contador usa `id = COUNTER#ORDER_NUMBER`; su secuencia inicial definida en código es `1005`, por lo que el primer pedido de esta prueba recibió `CS-2026-1006`.
- El emulador observado conserva el estado en memoria: **si se detiene/reinicia el contenedor sin persistencia, se pueden perder las tablas y los registros**.

## 6. Código de integración Node.js que se validó

### 6.1 `backend/shared/db.js`: conexión a DynamoDB

Fragmento del cliente singleton, tomado del código compartido en el proyecto:

```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const clientConfig = {};
if (process.env.AWS_REGION) {
  clientConfig.region = process.env.AWS_REGION;
}
if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
}

const baseClient = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(baseClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false
  },
  unmarshallOptions: {
    wrapNumbers: false
  }
});
```

En el archivo real el cliente se conserva como singleton y existe `setDocClient(customClient)` para pruebas. La decisión importante es que **el endpoint se inyecta por variable de entorno**; no se modifica la lógica de los servicios.

### 6.2 `backend/local-server.js`: adaptador HTTP

Se creó y comprobó sintácticamente `backend/local-server.js`. El archivo:

- Usa `http` nativo de Node.js, sin Express.
- Escucha en `127.0.0.1:4000`.
- Recibe solicitudes a `/products`, `/categories`, `/orders` y `/dashboard/metrics`.
- Lee el cuerpo JSON, construye un evento compatible con API Gateway HTTP API v2 y llama a los handlers existentes.
- Responde con el código HTTP, JSON y encabezados CORS apropiados.

**Salida real al arrancar:**

```text
CloudStore - API Local
API: http://localhost:4000
DynamoDB endpoint: https://127.0.0.1:9297
Servicios: Products, Categories y Orders
```

**Código fuente íntegro:** conservar el `backend/local-server.js` original del proyecto; no se reconstruye aquí porque no se compartió su texto completo en la sesión.

### 6.3 `backend/orders/index.js`: ruta de creación de pedidos

Este fragmento sí fue mostrado y revisado durante la sesión:

```javascript
// POST /orders
if (req.method === 'POST' && req.path === '/orders') {
  const idempotencyKey =
    req.headers['idempotency-key'] !== undefined
      ? req.headers['idempotency-key']
      : null;

  const res = await OrdersService.createOrder(req.body, idempotencyKey);
  if (res.error) {
    return fail(res.status || 400, res.error);
  }
  if (res.idempotentReplay) {
    return ok(res.data, 'Pedido recuperado de forma idempotente');
  }
  return created(res.data, 'Pedido registrado con éxito');
}
```

También se comprobó que el handler atiende `GET /orders`, `GET /orders/{id}`, `PATCH /orders/{id}/status` y `GET /dashboard/metrics`.

### 6.4 `backend/shared/constants.js`: estados y reglas

```javascript
const ORDER_STATUSES = Object.freeze([
  'pendiente',
  'confirmado',
  'enviado',
  'cancelado'
]);

const SHIPPING = Object.freeze({
  FREE_THRESHOLD_MXN: 500.00,
  STANDARD_COST_MXN: 20.00
});

const ORDER_LIMITS = Object.freeze({
  COUNTER_ID: 'COUNTER#ORDER_NUMBER',
  ORDER_ENTITY_TYPE: 'ORDER',
  ORDER_PREFIX: 'CS-2026-',
  INITIAL_SEQUENCE: 1005,
  MAX_DISTINCT_ITEMS: 50,
  DYNAMODB_MAX_TRANSACT_ITEMS: 100,
  MAX_CONCURRENCY_RETRIES: 3,
  LOW_STOCK_THRESHOLD: 5
});
```

Los servicios de pedidos comprueban producto activo, precio, stock, cantidad y límites. Para crear una orden usan `TransactWriteCommand` con actualización del contador, registro del pedido y decremento de stock. La prueba observada demuestra que esa transacción se completó en el emulador.

## 7. Iniciar los tres procesos del laboratorio

### Terminal A — AWS Emulator

Dejar el contenedor Docker del emulador en ejecución y comprobar que responde en `https://127.0.0.1:9297` con AWS CLI. El comando exacto de creación del contenedor no quedó registrado en esta parte de la sesión; usar la configuración de Docker que ya funciona en el equipo.

### Terminal B — API Node.js

Desde `D:\Taller 2026\CloudStore-Serverless`, aplicar las variables de entorno de la sección 4 y ejecutar:

```powershell
node backend/local-server.js
```

### Terminal C — frontend estático

```powershell
node server.js
```

**Salida observada:** servidor frontend en `http://localhost:3000`, raíz `frontend/`.

> **Mensaje engañoso:** `server.js` imprimió «Modo API: Simulado (`USE_MOCK_API = true`)», pero el archivo `frontend/js/config.js` leído después contenía `USE_MOCK_API: false`. El mensaje de consola no reflejaba la configuración efectiva. El navegador confirmó que la tienda funcionaba con la API local.

### 7.1 Configuración efectiva del frontend

Archivo: `frontend/js/config.js`.

```javascript
USE_MOCK_API: false,
API_BASE_URL: 'http://localhost:4000',
```

El resto de la configuración (nombre de tienda, WhatsApp, moneda, paginación, almacenamiento local y envío) se conservó. **No sustituir por la URL de AWS real mientras se trabaje con el emulador.**

### 7.2 Pruebas iniciales HTTP (observadas)

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/products" -Method Get
Invoke-RestMethod -Uri "http://localhost:4000/categories" -Method Get
Invoke-RestMethod -Uri "http://localhost:4000/orders" -Method Get
```

Las tres devolvieron HTTP 200, `success: true` y `data: []` antes de cargar los datos de prueba.

## 8. CRUD de categorías y productos

### 8.1 Categoría utilizada

Se creó una categoría válida con estos valores:

```json
{
  "name": "Electronica",
  "description": "Categoria de prueba sin acentos",
  "icon": "bi-cpu",
  "active": true
}
```

- ID resultante: `cat-electronica`.
- `slug`: `electronica`.
- La categoría quedó visible en `GET /categories`.
- `GET /categories/cat-electronica` devolvió `productCount: 1` cuando había un producto asociado.

**Comando equivalente para repetir la creación** (la estructura del payload sí se comprobó):

```powershell
$categoryBody = @{
    name = "Electronica"
    description = "Categoria de prueba sin acentos"
    icon = "bi-cpu"
    active = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/categories" `
    -Method Post -ContentType "application/json" -Body $categoryBody
```

### 8.2 Crear el producto — comando exacto ejecutado

```powershell
$body = @{
    name = "Mouse Logitech G305"
    description = "Wireless mouse for CloudStore order test"
    price = 799
    stock = 15
    categoryId = "cat-electronica"
    categoryName = "Electronica"
    image = "https://placehold.co/600x600?text=Mouse"
    featured = $true
    active = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/products" `
    -Method Post -ContentType "application/json" -Body $body
```

**Respuesta:** `success: true`, producto `prod-eb7518af`.

### 8.3 Consultas y modificaciones de productos

```powershell
# Todos los productos
Invoke-RestMethod -Uri "http://localhost:4000/products" -Method Get

# Filtrar por categoría (validó CategoryIndex)
Invoke-RestMethod -Uri "http://localhost:4000/products?categoryId=cat-electronica" -Method Get

# Detalle por ID
Invoke-RestMethod -Uri "http://localhost:4000/products/prod-eb7518af" -Method Get

# Mostrar solamente el stock
(Invoke-RestMethod -Uri "http://localhost:4000/products/prod-eb7518af").data.stock
```

En una prueba anterior se actualizó exitosamente el producto `prod-5dfcf679` con `stock = 20` y `price = 799`, se verificó el cambio con GET y luego se eliminó con DELETE. Tras eliminarlo, `GET /products` devolvió lista vacía. Estos IDs son **de pruebas distintas** y no deben confundirse con el producto final `prod-eb7518af`.

Ejemplos equivalentes a aquellas operaciones:

```powershell
$updateBody = @{ stock = 20; price = 799 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:4000/products/prod-5dfcf679" `
    -Method Put -ContentType "application/json" -Body $updateBody

Invoke-RestMethod -Uri "http://localhost:4000/products/prod-5dfcf679" -Method Delete
```

> En este proyecto, el DELETE de productos se maneja como desactivación lógica según el contrato del backend; una lista pública vacía no prueba por sí sola eliminación física del ítem de DynamoDB.

## 9. Pedido: transacción, stock e idempotencia

### 9.1 Crear la orden — comando exacto ejecutado

```powershell
$body = @{
    customer = @{
        name = "Cliente de prueba"
        phone = "9991234567"
        address = "Calle 123, Merida"
    }
    items = @(
        @{
            productId = "prod-eb7518af"
            quantity = 1
            price = 799
        }
    )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
    -Uri "http://localhost:4000/orders" `
    -Method Post `
    -ContentType "application/json" `
    -Headers @{ "Idempotency-Key" = "cloudstore-test-001" } `
    -Body $body
```

**Respuesta observada:**

```json
{
  "success": true,
  "data": {
    "id": "ord-96d8767b463b02639f80b91c",
    "orderNumber": "CS-2026-1006",
    "subtotal": 799,
    "shipping": 0,
    "total": 799,
    "status": "pendiente",
    "whatsappSent": false
  }
}
```

Este JSON muestra los campos relevantes de la respuesta, no todos los atributos de la orden.

### 9.2 Inventario antes y después

| Momento | Stock |
|---|---:|
| Producto recién creado | 15 |
| Después del primer POST de orden | 14 |
| Después de repetir el POST con la misma clave | 14 |

Comando ejecutado:

```powershell
(Invoke-RestMethod -Uri "http://localhost:4000/products/prod-eb7518af").data.stock
```

**Resultado:** `14`.

### 9.3 Reintento idempotente

Se repitió el **mismo** `POST /orders` con la misma `Idempotency-Key: cloudstore-test-001`. Después:

```powershell
(Invoke-RestMethod -Uri "http://localhost:4000/orders").data.Count
```

**Resultado:** `1`. El stock seguía en `14`. No hubo un segundo descuento ni un segundo pedido.

**Regla:** para probar idempotencia, repetir el mismo payload y la misma clave; una clave nueva representa otra solicitud y podría crear otro pedido.

### 9.4 Consultar el pedido guardado

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/orders" -Method Get | ConvertTo-Json -Depth 8
```

La respuesta mostró cliente, artículo, imagen, cantidad, subtotal, total, fecha, folio y estado. El pedido correspondía a:

- `id`: `ord-96d8767b463b02639f80b91c`.
- `orderNumber`: `CS-2026-1006`.
- Cliente: `Cliente de prueba`.
- Producto: `Mouse Logitech G305`.
- Cantidad: `1`.
- Subtotal / total: `$799 MXN`.
- Envío: `$0 MXN` por superar el umbral de `$500 MXN`.

## 10. Estados y consultas mediante GSI

### 10.1 Estados permitidos (leídos del código)

```javascript
[
  'pendiente',
  'confirmado',
  'enviado',
  'cancelado'
]
```

Se obtuvieron con:

```powershell
Select-String -Path "backend/shared/constants.js" -Pattern "ORDER_STATUSES" -Context 2,10
```

### 10.2 Confirmar la orden — comando exacto ejecutado

```powershell
$body = @{
    status = "confirmado"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:4000/orders/ord-96d8767b463b02639f80b91c/status" `
    -Method Patch `
    -ContentType "application/json" `
    -Body $body
```

**Resultado:** `success: true`, `status: confirmado`, `updatedAt: 2026-11-15T02:59:36.146Z`.

### 10.3 Consultar por estado — comando exacto ejecutado

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/orders?status=confirmado" -Method Get | ConvertTo-Json -Depth 6
```

**Resultado:** devolvió exactamente la orden `CS-2026-1006` con `status: confirmado`. Esta consulta valida funcionalmente la ruta que utiliza `StatusDateIndex`.

## 11. Dashboard: métricas reales del emulador

Comando exacto:

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/dashboard/metrics" -Method Get | ConvertTo-Json -Depth 8
```

Respuesta observada (campos numéricos):

```json
{
  "success": true,
  "data": {
    "totalRevenue": 799,
    "totalOrders": 1,
    "totalProducts": 1,
    "totalCategories": 2,
    "ordersPending": 0,
    "ordersConfirmed": 1,
    "ordersShipped": 0,
    "ordersCancelled": 0,
    "lowStockCount": 0,
    "lowStockProducts": [],
    "recentOrders": ["CS-2026-1006 (objeto completo en la respuesta real)"]
  }
}
```

> La entrada de `recentOrders` anterior es una **abreviatura documental**; en la respuesta real era un objeto con los datos completos de la orden, no una cadena.

## 12. Validación del frontend

El usuario inició:

```powershell
node server.js
```

La consola anunció `http://localhost:3000`. El archivo `frontend/js/config.js` mostró:

```javascript
USE_MOCK_API: false,
API_BASE_URL: 'http://localhost:4000',
```

El usuario abrió la tienda en el navegador y confirmó que estaba **«jalando al 100»**. Esto cierra la validación funcional de la integración **frontend → API local → DynamoDB Emulator** para el flujo probado.

### Comprobación visual recomendada al repetir la práctica

1. Abrir `http://localhost:3000`.
2. Verificar que aparece `Mouse Logitech G305` con precio `$799` y categoría `Electronica`.
3. Abrir las herramientas de desarrollador del navegador y comprobar que las peticiones van a `http://localhost:4000`, no a una URL real de API Gateway.
4. Revisar el panel `http://localhost:3000/admin/index.html` y sus métricas si se desea demostrar el dashboard.
5. Si hay archivos en caché, usar `Ctrl + F5`.

## 13. Matriz de pruebas: qué sí quedó demostrado

| Componente | Prueba | Resultado | Evidencia |
|---|---|---|---|
| AWS CLI / Emulator | `list-tables`, `describe-table`, `put-item`, `get-item` | **OK** | Tabla de prueba y tres tablas CloudStore activas |
| Node.js / SDK | GET a productos, categorías y pedidos | **OK** | HTTP 200 con listas vacías inicialmente |
| Categorías | POST, GET, detalle y conteo | **OK** | `cat-electronica`, `productCount: 1` |
| Productos | POST, GET, filtro, PUT, DELETE | **OK** | Creación, stock 20 en prueba anterior, borrado lógico |
| Pedidos | POST | **OK** | Folio `CS-2026-1006` |
| Transacción | Pedido + contador + stock | **OK** | Stock 15 → 14 |
| Idempotencia | Repetir POST con la misma clave | **OK** | 1 orden, stock 14 |
| Órdenes | GET listado | **OK** | Datos completos de la compra |
| Estados | PATCH a `confirmado` | **OK** | `updatedAt` y estado nuevos |
| Índice de órdenes | GET `?status=confirmado` | **OK** | 1 orden confirmada |
| Dashboard | GET `/dashboard/metrics` | **OK** | Ingresos 799, 1 pedido, 2 categorías |
| Frontend | Navegación y consumo de API local | **OK según usuario** | Tienda reportada funcionando |

**No documentado como prueba ejecutada en esta sesión:** actualización/borrado de categorías, cancelación o envío de órdenes, errores de concurrencia real, recuperación tras reiniciar el contenedor, despliegue en AWS real, autenticación y pruebas de carga. No confundir “flujo probado” con “cobertura exhaustiva”.

## 14. Problemas y aprendizajes

### 14.1 PowerShell y caracteres acentuados

Al crear `Tecnología`, la petición produjo un texto mal codificado y el ID `cat-tecnologa`. En contraste, `Electronica` (ASCII) funcionó. Para futuras peticiones con acentos, enviar bytes UTF-8 explícitos:

```powershell
$body = @{ name = "Tecnología"; description = "Productos tecnológicos" } | ConvertTo-Json
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Invoke-RestMethod -Uri "http://localhost:4000/categories" `
    -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes
```

**Nota:** esta corrección es una recomendación basada en el diagnóstico; la creación con acentos no se repitió exitosamente en la sesión del emulador. No crear de nuevo la categoría si ya existe un slug equivalente.

### 14.2 Certificado HTTPS local

Para AWS CLI se usó `--ca-bundle` y para Node `NODE_EXTRA_CA_CERTS`, ambos apuntando al certificado del emulador. Evitar desactivar la validación TLS de forma global.

### 14.3 Error de `server.js` al describir el modo

El texto de arranque dijo “Simulado” aunque `config.js` estaba en modo API. Revisar la lógica que imprime ese mensaje; **no** cambiar `USE_MOCK_API` a `true` para hacer coincidir el texto.

### 14.4 Evitar AWS real por accidente

No ejecutar comandos `aws dynamodb ...` sin el `--endpoint-url` cuando la intención sea usar el emulador. Para Node, verificar que la terminal tenga `DYNAMODB_ENDPOINT`. El nombre de región `us-east-1` aquí es un valor de contexto del emulador, no una instrucción para desplegar en esa región real.

### 14.5 Persistencia del emulador

El estado de las tablas puede perderse si se detiene el contenedor; antes del taller preparar un script de creación de tablas y datos semilla, o configurar almacenamiento persistente del emulador si está soportado por la instalación.

### 14.6 Seguridad del panel

El panel administrativo de este prototipo no tiene autenticación ni autorización. Es adecuado para una práctica local controlada; no exponerlo públicamente ni usar datos reales de clientes sin implementar controles apropiados.

## 15. Guion de demostración para el taller (18 horas)

**Día 1 — Fundamentos y arquitectura (6 h):** problema de una tienda, frontend/API/base de datos, AWS Serverless, región y zonas, comparación emulador vs AWS, DynamoDB PK y GSI. Cada equipo personaliza su tienda.

**Día 2 — Integración (6 h):** iniciar emulador y servidores, GET/POST de categorías y productos, revisar `frontend/js/config.js`, observar Network en el navegador, probar `CategoryIndex`.

**Día 3 — Pedidos y cierre (6 h):** crear pedido, explicar `TransactWriteItems`, stock, idempotencia, cambios de estado, dashboard y repaso de seguridad/costos.

Para grupos de tres, una distribución posible es: **integración frontend**, **catálogo (productos/categorías)** y **pedidos/métricas**. La colaboración se realiza sobre el mismo contrato de API.

## 16. Checklist de arranque rápido

- [ ] Docker / AWS Emulator encendido y respondiendo en `https://127.0.0.1:9297`.
- [ ] Credenciales y CA del emulador presentes.
- [ ] `DYNAMODB_ENDPOINT` configurado en la terminal del backend.
- [ ] Tablas `CloudStore-Products`, `CloudStore-Categories`, `CloudStore-Orders` activas.
- [ ] `node backend/local-server.js` ejecutándose en el puerto 4000.
- [ ] `frontend/js/config.js`: `USE_MOCK_API: false` y `API_BASE_URL: 'http://localhost:4000'`.
- [ ] `node server.js` ejecutándose en el puerto 3000.
- [ ] GET `/products`, `/categories`, `/orders`, `/dashboard/metrics` sin errores.
- [ ] Prueba de pedido con clave de idempotencia única para ese ensayo.
- [ ] Verificación de stock y conteo de pedidos.
- [ ] Navegador apuntando al backend local; sin credenciales reales.

## 17. Referencias internas del proyecto

- `frontend/js/config.js`: selección Mock/API y URL del backend.
- `frontend/js/api.js`: cliente HTTP del frontend.
- `backend/local-server.js`: adaptador HTTP local (archivo creado durante el laboratorio).
- `backend/shared/db.js`: cliente DynamoDB v3.
- `backend/shared/constants.js`: tablas, índices, estados, envíos y límites.
- `backend/shared/http.js`: normalización de eventos/respuestas.
- `backend/products/index.js` y `service.js`: catálogo.
- `backend/categories/index.js` y `service.js`: categorías.
- `backend/orders/index.js` y `service.js`: pedidos y dashboard.
- `API-CONTRACT.md`: contrato de endpoints.
- `DYNAMODB-DESIGN.md`: diseño de tablas e índices.
- `PERSONALIZAR-TIENDA.md`: personalización para estudiantes.

---

**Conclusión.** En la sesión se validó una tienda web funcional con un backend Node.js que invoca handlers diseñados para Lambda y utiliza DynamoDB Emulator. El flujo de compra quedó confirmado con un pedido de `$799 MXN`, folio `CS-2026-1006`, stock `15 → 14`, reintento idempotente, estado `confirmado` y métricas consistentes. La documentación describe un **laboratorio local** y no afirma haber desplegado ni modificado AWS real.
