# Guía Paso a Paso: Cómo Personalizar tu Tienda CloudStore Serverless

¡Bienvenido! Esta guía está diseñada para que tú y tu equipo puedan transformar **CloudStore Serverless** en su propia tienda en línea (por ejemplo: cafetería, librería, tienda de ropa, papelería, artículos deportivos, electrónica, etc.) **sin necesidad de saber programación avanzada ni usar herramientas de inteligencia artificial**.

Toda la personalización se realiza editando **únicamente 4 lugares**:

1. `frontend/config/store.config.js` $\rightarrow$ Nombre, eslogan, textos, WhatsApp, redes sociales y copyright.
2. `frontend/css/theme.css` $\rightarrow$ Colores de la tienda, botones, fondos y tipografía.
3. `frontend/assets/` $\rightarrow$ Logotipo, icono de pestaña (favicon), banner e imágenes de productos.
4. `frontend/js/mock-data.js` $\rightarrow$ Categorías y productos de demostración para pruebas locales.

> **Regla de oro:** **NO** modifiques los archivos de la carpeta `backend/` ni cambies los nombres de los campos técnicos en inglés (`id`, `name`, `price`, `stock`, etc.), ya que esos conectan directamente con tu base de datos en **Amazon DynamoDB** y **AWS Lambda**.

---

## 1. Cómo cambiar el nombre de la tienda, eslogan y textos de bienvenida

1. Abre el archivo **`frontend/config/store.config.js`** en tu editor de texto (como Visual Studio Code o el Bloc de notas).
2. Busca la sección **`1. IDENTIDAD COMERCIAL Y PROPIETARIO`**:
   ```js
   storeName: 'CloudStore',
   storeBadge: 'Serverless',
   fullStoreName: 'CloudStore Serverless',
   slogan: 'Tecnología de Vanguardia al Alcance de tus Manos',
   description: 'Descubre laptops de alto rendimiento...',
   footerDescription: 'Plataforma moderna de e-commerce...',
   ownerName: 'Equipo CloudStore Serverless',
   ```
3. Cambia el texto que está **entre las comillas simples `'...'`** por los datos de tu equipo. Por ejemplo, para una cafetería:
   ```js
   storeName: 'Café Maya',
   storeBadge: 'Artesanal',
   fullStoreName: 'Café Maya Artesanal',
   slogan: 'El Mejor Café de Altura Directo a tu Taza',
   description: 'Granos seleccionados de Chiapas, Veracruz y Oaxaca tostados artesanalmente.',
   footerDescription: 'Tienda oficial de Café Maya Artesanal con envíos a todo México.',
   ownerName: 'Equipo 3 - Taller Cloud 2026',
   ```
4. En el mismo archivo, dentro de la sección **`7. TEXTOS COMERCIALES / BENEFICIOS DE LA PÁGINA PRINCIPAL`**, puedes editar las 3 tarjetas de beneficios (`title` y `description`).
5. Guarda el archivo (`Ctrl + S`). El nombre se actualizará automáticamente en la barra superior, el pie de página, los mensajes de WhatsApp y el Panel de Administración.

---

## 2. Cómo modificar los colores de la tienda

1. Abre el archivo **`frontend/css/theme.css`**.
2. Al inicio del archivo encontrarás las variables de color con su código hexadecimal (`#RRGGBB`):
   ```css
   :root {
     /* Color principal (botones, enlaces, iconos destacados) */
     --primary: #2563EB;
     --primary-hover: #1D4ED8;

     /* Color secundario (barra de navegación superior, barra lateral admin y pie de página) */
     --secondary: #101C2C;

     /* Gradiente del nombre de la tienda en la barra superior */
     --brand-gradient-start: #60A5FA;
     --brand-gradient-end: #38BDF8;

     /* Color de fondo general y tarjetas */
     --background: #F8FAFC;
     --surface: #FFFFFF;
   ```
3. Sustituye los códigos hexadecimales por la paleta de tu marca.  
   **Ejemplos listos para copiar y pegar:**
   - **Tienda Ecológica / Orgánica (Verde Esmeralda):**
     - `--primary: #059669;`
     - `--primary-hover: #047857;`
     - `--secondary: #064E3B;`
     - `--brand-gradient-start: #34D399;`
     - `--brand-gradient-end: #A7F3D0;`
   - **Cafetería / Repostería (Café Cálido & Ámbar):**
     - `--primary: #B45309;`
     - `--primary-hover: #92400E;`
     - `--secondary: #291D12;`
     - `--brand-gradient-start: #FBBF24;`
     - `--brand-gradient-end: #FDE68A;`
   - **Moda / Boutique (Rosa Frambuesa & Carbón):**
     - `--primary: #DB2777;`
     - `--primary-hover: #BE185D;`
     - `--secondary: #1F122B;`
     - `--brand-gradient-start: #F472B6;`
     - `--brand-gradient-end: #FBCFE8;`
4. **Consejo de lectura (Contraste):** Mantén `--background` y `--surface` en tonos claros y `--text-primary` oscuro (`#0F172A`) para que los precios y descripciones siempre se lean con claridad.

---

## 3. Cómo cambiar el logotipo y el icono de la pestaña (Favicon)

Tienes **dos opciones** muy sencillas:

### Opción A: Usar tu propio archivo de imagen (`.svg`, `.png` o `.webp`)
1. Guarda tu logotipo dentro de la carpeta **`frontend/assets/branding/`** con el nombre **`logo.svg`** (o reemplaza el archivo existente).
2. Si tu archivo tiene otro formato (por ejemplo `mi-logo.png`), guárdalo en `frontend/assets/branding/mi-logo.png`, abre **`frontend/config/store.config.js`** y actualiza la ruta en la sección `5. LOGOTIPO E ICONOS DE MARCA`:
   ```js
   branding: {
     logoImage: 'assets/branding/mi-logo.png',
     useLogoImage: true,
     logoIcon: 'bi-cloud-check-fill',
     favicon: 'assets/branding/favicon.ico'
   },
   ```
3. Para cambiar el icono pequeño de la pestaña del navegador, reemplaza el archivo **`frontend/assets/branding/favicon.ico`**.

### Opción B: Usar un icono de Bootstrap Icons (sin imagen)
1. En **`frontend/config/store.config.js`**, cambia `useLogoImage` a `false` y elige cualquier icono de [Bootstrap Icons](https://icons.getbootstrap.com/) en `logoIcon`:
   ```js
   branding: {
     logoImage: 'assets/branding/logo.svg',
     useLogoImage: false,
     logoIcon: 'bi-cup-hot-fill', // Ejemplo: taza de café, bi-bag-heart-fill, bi-book-half, etc.
     favicon: 'assets/branding/favicon.ico'
   },
   ```

---

## 4. Cómo sustituir o activar el banner principal

1. Coloca la imagen de tu banner dentro de la carpeta **`frontend/assets/banners/`** con el nombre **`hero.webp`** (tamaño horizontal recomendado: `1200 x 450 px`).
2. Abre **`frontend/config/store.config.js`** y en la sección **`6. BANNER PRINCIPAL (HERO)`** cambia `showBannerImage` a `true`:
   ```js
   hero: {
     welcomeBadge: 'Nueva Colección 2026',
     welcomeMessage: 'Envíos rápidos a toda la República Mexicana',
     bannerImage: 'assets/banners/hero.webp',
     showBannerImage: true,
     bannerAlt: 'Banner promocional de nuestra tienda',
     primaryButtonText: 'Explorar Catálogo',
     secondaryButtonText: 'Ver Destacados'
   },
   ```
3. Si prefieres el diseño limpio sin imagen en el encabezado, deja `showBannerImage: false`.

---

## 5. Cómo reemplazar imágenes de productos

1. Guarda las fotos de tus productos dentro de la carpeta **`frontend/assets/products/`** (por ejemplo: `frontend/assets/products/cafe-chiapas.webp`).
2. Cuando edites un producto en `frontend/js/mock-data.js` o cuando crees un producto nuevo en el **Panel Admin > Nuevo Producto**, escribe en el campo de imagen la ruta:
   ```text
   assets/products/cafe-chiapas.webp
   ```
   *(También puedes seguir utilizando enlaces externos que comiencen con `https://...`).*

---

## 6. Cómo personalizar categorías y productos de demostración

Cuando la tienda está en **Modo Mock** (`USE_MOCK_API: true`), carga los datos iniciales desde **`frontend/js/mock-data.js`**.

1. Abre **`frontend/js/mock-data.js`**.
2. En **`SECCIÓN 1: CATEGORÍAS DE DEMOSTRACIÓN` (`MOCK_CATEGORIES`)**, modifica el nombre, descripción e icono de cada categoría:
   ```js
   {
     id: 'cat-cafe-grano',
     name: 'Café en Grano',
     slug: 'cafe-grano',
     description: 'Granos enteros recién tostados para moler en casa.',
     icon: 'bi-cup-hot',
     productCount: 3,
     active: true,
     createdAt: '2026-01-01T00:00:00Z'
   }
   ```
3. En **`SECCIÓN 2: PRODUCTOS DE DEMOSTRACIÓN` (`MOCK_PRODUCTS`)**, modifica los datos de cada producto asegurándote de que `categoryId` y `categoryName` coincidan con una de tus categorías:
   ```js
   {
     id: 'prod-001',
     name: 'Café Reserva Chiapas Altura 500g',
     slug: 'cafe-reserva-chiapas-500g',
     categoryId: 'cat-cafe-grano',
     categoryName: 'Café en Grano',
     price: 245.00,
     comparePrice: 280.00,
     stock: 20,
     description: 'Notas a chocolate amargo, nuez y caramelo. Tueste medio.',
     features: [
       '100% Arábica de altura (1,500 msnm)',
       'Bolsa con válvula desgasificadora',
       'Tueste artesanal reciente'
     ],
     image: 'assets/products/cafe-chiapas.webp',
     featured: true,
     active: true,
     rating: 4.9,
     reviewsCount: 18,
     createdAt: '2026-01-15T10:00:00Z'
   }
   ```
4. **¡Muy importante después de editar `mock-data.js`!**  
   El navegador guarda una copia de los datos iniciales en su memoria (`localStorage`). Para ver tus nuevos productos y categorías de demostración:
   - Entra a tu tienda en el navegador y haz clic en el botón **Panel Admin** (arriba a la derecha).
   - En la esquina superior derecha del Dashboard Administrativo, haz clic en el botón **"Reset Datos"** y confirma **"Restaurar"**.

---

## 7. Cómo cambiar WhatsApp, correo y redes sociales

1. Abre **`frontend/config/store.config.js`**.
2. En la sección **`3. DATOS DE CONTACTO Y WHATSAPP`**, coloca el correo y el número de WhatsApp donde recibirán los pedidos:
   ```js
   contact: {
     email: 'ventas@mitienda.mx',
     // Solo números: código de país (52 para México) + 10 dígitos
     whatsappPhone: '529991234567',
     // Cómo quieres que se vea escrito en el pie de página
     whatsappDisplay: '+52 999 123 4567',
     whatsappGreeting: '¡Hola! Acabo de realizar el siguiente pedido:'
   },
   ```
3. Si deseas mostrar iconos de redes sociales en el pie de página, agrega los enlaces en la sección **`4. REDES SOCIALES`**:
   ```js
   social: {
     facebook: 'https://facebook.com/mitienda',
     instagram: 'https://instagram.com/mitienda',
     tiktok: '',
     github: ''
   },
   ```

---

## 8. Cómo modificar el copyright y los créditos del pie de página

1. En **`frontend/config/store.config.js`**, busca la sección **`2. DERECHOS DE AUTOR Y PIE DE PÁGINA (FOOTER)`**:
   ```js
   copyrightYear: '2026',
   copyrightText: '© 2026 Mi Tienda — Equipo 3. Todos los derechos reservados.',
   footerCredits: 'Proyecto del Taller de Arquitectura Serverless en AWS.',
   ```
2. Guarda los cambios y recarga cualquier página para ver el nuevo pie de página.

---

## 9. Cómo comprobar tus cambios localmente

1. Abre una terminal en la carpeta raíz del proyecto (`CloudStore-Serverless`).
2. Inicia el servidor local ejecutando:
   ```bash
   npm start
   ```
3. Abre tu navegador en:
   ```text
   http://localhost:3000
   ```
4. **Lista de verificación rápida:**
   - [ ] Revisa la página de **Inicio**, el **Catálogo**, el **Detalle de un Producto**, el **Carrito** y el **Panel Admin**.
   - [ ] Si editaste `frontend/js/mock-data.js`, recuerda pulsar **"Reset Datos"** en el **Panel Admin** para recargar tus productos de demostración en el navegador.
   - [ ] Ejecuta en la terminal `npm test` para comprobar que la tienda y la arquitectura siguen pasando todas las pruebas automatizadas.
