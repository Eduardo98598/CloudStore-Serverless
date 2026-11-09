# CloudStore Serverless

Tienda de comercio electrónico educativa construida con **HTML5, CSS3,
JavaScript Vanilla, Bootstrap 5 y AWS Serverless**. El proyecto permite
practicar el desarrollo de una aplicación web desacoplada y su
integración con servicios administrados de AWS.

> **Propósito educativo:** CloudStore es una aplicación de demostración
> para el taller. No debe utilizarse como tienda de producción sin
> implementar autenticación, autorización, controles adicionales de
> seguridad y las medidas operativas correspondientes.

## 1. ¿Qué aprenderás?

-   Estructurar un frontend web sin depender de un framework.
-   Separar la interfaz de la capa de acceso a datos.
-   Consumir una API HTTP desde JavaScript.
-   Crear y consultar datos mediante AWS Lambda y Amazon DynamoDB.
-   Comprender el papel de Amazon API Gateway.
-   Personalizar la identidad visual y el catálogo de una tienda.
-   Preparar el frontend para alojarlo en Amazon S3 y distribuirlo con
    Amazon CloudFront.

## 2. Arquitectura

El frontend se comunica con una capa de acceso a datos (`api.js`). Esta
capa permite trabajar con datos simulados durante el desarrollo local o
consumir la API desplegada en AWS.

``` text
                 Frontend (HTML / CSS / JavaScript)
                                |
                                v
                      Data Access Layer
                          frontend/js/api.js
                         /               \
                        v                 v
                Modo simulado       AWS API Gateway
                localStorage               |
                                           v
                                     AWS Lambda
                             Products / Categories / Orders
                                           |
                                           v
                                      DynamoDB
```

Servicios utilizados:

  -----------------------------------------------------------------------
  Servicio                            Responsabilidad
  ----------------------------------- -----------------------------------
  Amazon API Gateway (HTTP API)       Recibe las solicitudes HTTP y las
                                      dirige a las funciones Lambda.

  AWS Lambda (Node.js 24.x)           Ejecuta la lógica de productos,
                                      categorías y pedidos.

  Amazon DynamoDB                     Almacena productos, categorías y
                                      pedidos.

  Amazon CloudWatch                   Permite consultar registros y
                                      métricas de ejecución de Lambda.

  Amazon S3                           Servicio previsto para alojar el
                                      frontend estático.

  Amazon CloudFront                   Servicio previsto para distribuir
                                      el frontend mediante una CDN y
                                      HTTPS.
  -----------------------------------------------------------------------

### Recursos del backend del taller

La implementación de referencia del instructor utiliza la región
**`mx-central-1`** y estos recursos:

  Recurso                Nombre
  ---------------------- -------------------------
  Tabla de productos     `CloudStore-Products`
  Tabla de categorías    `CloudStore-Categories`
  Tabla de pedidos       `CloudStore-Orders`
  Lambda de productos    `CloudStore-Products`
  Lambda de categorías   `CloudStore-Categories`
  Lambda de pedidos      `CloudStore-Orders`
  API Gateway            `CloudStore-API`
  Etapa de API Gateway   `$default`

La URL base de la API de referencia del instructor es:

``` text
https://w8n9qxsmsd.execute-api.mx-central-1.amazonaws.com
```

Esta URL corresponde al entorno del instructor. Si tu equipo despliega
recursos propios, deberá utilizar la URL de su propia API.

## 3. Tecnologías y requisitos

-   HTML5 y CSS3.
-   JavaScript Vanilla (ES6+).
-   Bootstrap 5.3.3 y Bootstrap Icons 1.11.3.
-   Node.js 24.x.
-   npm 11.x.
-   Git y una cuenta de GitHub.
-   Navegador web actualizado.

El servidor local incluido utiliza módulos nativos de Node.js y no
requiere dependencias externas para servir los archivos estáticos.

## 4. Estructura del repositorio

``` text
CloudStore-Serverless/
├── backend/
│   ├── products/
│   ├── categories/
│   ├── orders/
│   └── shared/
├── docs/
├── frontend/
│   ├── admin/
│   ├── assets/
│   ├── config/
│   ├── css/
│   └── js/
├── tests/
├── API-CONTRACT.md
├── DYNAMODB-DESIGN.md
├── PERSONALIZAR-TIENDA.md
├── package.json
├── server.js
└── README.md
```

-   `backend/`: código de las funciones Lambda y módulos compartidos.
-   `docs/`: documentación de arquitectura, base de datos y API.
-   `frontend/`: tienda pública y panel administrativo.
-   `tests/`: pruebas y simulaciones del backend.
-   `API-CONTRACT.md`: contrato de endpoints.
-   `DYNAMODB-DESIGN.md`: diseño de tablas e índices.
-   `PERSONALIZAR-TIENDA.md`: guía de personalización para los equipos.

## 5. Obtener el proyecto mediante Fork

Cada equipo trabajará en una copia propia del repositorio.

1.  Inicia sesión en GitHub.
2.  Abre el repositorio del instructor:\
    https://github.com/Eduardo98598/CloudStore-Serverless
3.  Selecciona **Fork** y después **Create fork**.
4.  Entra al Fork que se creó en tu cuenta.
5.  Selecciona **Code**, copia la URL HTTPS y clona tu copia.

Ejemplo:

``` powershell
git clone https://github.com/TU-USUARIO/CloudStore-Serverless.git
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

### Guardar y publicar tus cambios

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
instructor, puede abrir un **Pull Request** desde su rama hacia el
repositorio original, siguiendo las indicaciones del taller.

## 6. Ejecutar el proyecto localmente

### Requisitos previos

Comprueba que Node.js y npm estén instalados:

``` powershell
node -v
npm -v
```

### Iniciar el servidor

Desde la carpeta raíz del proyecto:

``` powershell
npm start
```

También puedes iniciar el servidor directamente:

``` powershell
node server.js
```

Abre estas direcciones en el navegador:

-   Tienda pública: http://localhost:3000
-   Panel administrativo: http://localhost:3000/admin/index.html

Detén el servidor con `Ctrl + C`.

## 7. Configurar el frontend para utilizar AWS

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
  API_BASE_URL: 'https://TU-API-ID.execute-api.mx-central-1.amazonaws.com'
};
```

**Importante:** conserva las demás propiedades que ya existan en el
objeto `CONFIG`; modifica únicamente los valores correspondientes. La
URL debe ser la de la API asignada a tu equipo o la que indique el
instructor. No agregues `/prod`: la API de referencia utiliza la etapa
`$default`.

## 8. Endpoints de la API de referencia

La API HTTP desplegada por el instructor expone las siguientes rutas:

  -----------------------------------------------------------------------
  Método                  Ruta                    Operación
  ----------------------- ----------------------- -----------------------
  GET                     `/products`             Consultar productos.

  GET                     `/products/{id}`        Consultar un producto
                                                  por ID.

  POST                    `/products`             Crear un producto.

  PUT                     `/products/{id}`        Actualizar un producto.

  DELETE                  `/products/{id}`        Desactivar/eliminar
                                                  lógicamente un
                                                  producto.

  GET                     `/categories`           Consultar categorías.

  POST                    `/categories`           Crear una categoría.

  PUT                     `/categories/{id}`      Actualizar una
                                                  categoría.

  DELETE                  `/categories/{id}`      Desactivar/eliminar
                                                  lógicamente una
                                                  categoría.

  GET                     `/orders`               Consultar pedidos.

  GET                     `/orders/{id}`          Consultar un pedido por
                                                  ID.

  POST                    `/orders`               Registrar un pedido.

  PATCH                   `/orders/{id}/status`   Actualizar el estado de
                                                  un pedido.

  GET                     `/dashboard/metrics`    Consultar métricas del
                                                  dashboard.
  -----------------------------------------------------------------------

La definición detallada de parámetros, cuerpos de solicitud y respuestas
está en `API-CONTRACT.md`. No sustituyas estas rutas por rutas
`/admin/...`: esas rutas no corresponden a la API desplegada del taller.

## 9. Personalizar la tienda

Cada equipo deberá adaptar la identidad visual y el contenido de su
tienda. La guía principal es:

``` text
PERSONALIZAR-TIENDA.md
```

Como mínimo, revisa:

-   Nombre y descripción de la tienda.
-   Logotipo, favicon y banner.
-   Colores y tema visual.
-   Categorías y productos.
-   Imágenes y textos del catálogo.
-   Datos de contacto y configuración de WhatsApp, si aplica.

No modifiques las rutas de la API ni la lógica de pedidos sin
autorización del instructor. La personalización debe conservar el
contrato de comunicación entre frontend y backend.

## 10. Despliegue del frontend en S3 y CloudFront

El frontend estático está preparado para alojarse en Amazon S3 y
distribuirse mediante Amazon CloudFront. El flujo general es:

1.  Crear un bucket S3 para el sitio del equipo.
2.  Publicar el contenido de la carpeta `frontend/`.
3.  Configurar CloudFront para distribuir el contenido del bucket.
4.  Configurar el acceso seguro al origen S3.
5.  Probar la tienda desde la URL de CloudFront.
6.  Invalidar la caché de CloudFront cuando sea necesario publicar
    cambios.

Los nombres de recursos deben ser únicos por equipo. Sigue la
demostración y las indicaciones del instructor antes de crear recursos
para evitar colisiones o costos innecesarios.

## 11. Seguridad y costos: consideraciones del laboratorio

-   Nunca subas claves de acceso, contraseñas, archivos `.env` con
    secretos ni credenciales de AWS a GitHub.
-   No incluyas claves de AWS en el código JavaScript del navegador.
-   El panel administrativo de esta versión es demostrativo y **no
    cuenta con autenticación ni autorización de administrador**. No lo
    expongas como un sistema de producción.
-   CORS no sustituye la autenticación ni protege por sí solo las
    operaciones.
-   Utiliza únicamente los recursos y permisos indicados por el
    instructor.
-   Revisa los recursos creados y elimina los que ya no se utilicen al
    finalizar el taller.
-   AWS puede generar cargos por servicios, almacenamiento, solicitudes
    y transferencia de datos. Consulta la consola de facturación y los
    límites de tu cuenta.

## 12. Documentación adicional

-   `API-CONTRACT.md`: rutas y contrato de comunicación de la API.
-   `DYNAMODB-DESIGN.md`: tablas, claves e índices de DynamoDB.
-   `PERSONALIZAR-TIENDA.md`: instrucciones para adaptar la tienda.
-   `docs/aws-architecture.md`: arquitectura de la solución.
-   `docs/dynamodb-schemas.md`: esquemas de datos.
-   `docs/openapi.yaml`: especificación OpenAPI.

------------------------------------------------------------------------

**CloudStore Serverless --- Proyecto educativo para el taller de
desarrollo de aplicaciones con AWS.**
