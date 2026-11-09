/**
 * ============================================================================
 * CLOUDSTORE SERVERLESS — CATÁLOGO Y DATOS DE DEMOSTRACIÓN (MODO MOCK)
 * ============================================================================
 * Este archivo contiene las categorías, productos y pedidos de demostración
 * que se muestran cuando la tienda funciona en modo local (USE_MOCK_API: true).
 *
 * CÓMO PERSONALIZAR PARA TU GIRO COMERCIAL:
 *   - Puedes cambiar los nombres, descripciones, precios (en MXN), stock e
 *     imágenes ('assets/products/tu-imagen.webp' o una URL https://...).
 *   - IMPORTANTE: Conserva exactamente los nombres de las propiedades en inglés
 *     (id, name, slug, categoryId, categoryName, price, stock, description,
 *     features, image, featured, active, createdAt) porque son los atributos
 *     oficiales que esperan Amazon DynamoDB y las funciones AWS Lambda.
 *   - Después de editar este archivo, abre el Panel Admin y haz clic en el
 *     botón "Reset Datos" (arriba a la derecha) para recargar tus cambios.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// SECCIÓN 1: CATEGORÍAS DE DEMOSTRACIÓN
// ----------------------------------------------------------------------------
const MOCK_CATEGORIES = [
  {
    id: 'cat-laptops',
    name: 'Laptops & Computadoras',
    slug: 'laptops-computadoras',
    description: 'Equipos portátiles y estaciones de trabajo de alto rendimiento para desarrolladores y creadores.',
    icon: 'bi-laptop',
    productCount: 3,
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cat-audio',
    name: 'Audio & Sonido',
    slug: 'audio-sonido',
    description: 'Auriculares con cancelación de ruido, micrófonos de estudio y parlantes de alta fidelidad.',
    icon: 'bi-headphones',
    productCount: 3,
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cat-perifericos',
    name: 'Periféricos & Accesorios',
    slug: 'perifericos-accesorios',
    description: 'Teclados mecánicos, ratones ergonómicos, hubs USB-C y accesorios premium.',
    icon: 'bi-keyboard',
    productCount: 3,
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cat-smartphones',
    name: 'Smartphones & Tablets',
    slug: 'smartphones-tablets',
    description: 'Dispositivos móviles de última generación con pantallas OLED y potentes procesadores.',
    icon: 'bi-phone',
    productCount: 3,
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'cat-monitores',
    name: 'Monitores & Pantallas',
    slug: 'monitores-pantallas',
    description: 'Monitores ultra-panorámicos 4K/5K con precisión de color y altas tasas de refresco.',
    icon: 'bi-display',
    productCount: 2,
    active: true,
    createdAt: '2026-01-01T00:00:00Z'
  }
];

const MOCK_PRODUCTS = [
  {
    id: 'prod-001',
    name: 'MacBook Pro 16" M3 Max',
    slug: 'macbook-pro-16-m3-max',
    categoryId: 'cat-laptops',
    categoryName: 'Laptops & Computadoras',
    price: 3499.00,
    comparePrice: 3899.00,
    stock: 8,
    description: 'La estación de trabajo portátil definitiva para desarrollo de software, ciencia de datos y renderizado 3D. Incorpora el chip M3 Max con CPU de 16 núcleos y GPU de 40 núcleos.',
    features: [
      'Chip Apple M3 Max (16 CPU / 40 GPU)',
      '36 GB de memoria unificada',
      '1 TB de almacenamiento SSD ultra-rápido',
      'Pantalla Liquid Retina XDR de 16.2 pulgadas',
      'Batería con hasta 22 horas de autonomía'
    ],
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    featured: true,
    active: true,
    rating: 4.9,
    reviewsCount: 38,
    createdAt: '2026-01-15T10:00:00Z'
  },
  {
    id: 'prod-002',
    name: 'Dell XPS 15 OLED InfinityEdge',
    slug: 'dell-xps-15-oled',
    categoryId: 'cat-laptops',
    categoryName: 'Laptops & Computadoras',
    price: 2199.00,
    comparePrice: 2450.00,
    stock: 12,
    description: 'Diseño en aluminio mecanizado CNC y fibra de carbono. Pantalla OLED 3.5K táctil con colores cinematográficos y tarjeta gráfica NVIDIA GeForce RTX 4060.',
    features: [
      'Intel Core i9 de 14va generación',
      '32 GB RAM DDR5 a 5600 MHz',
      '1 TB SSD NVMe PCIe Gen 4',
      'NVIDIA GeForce RTX 4060 8GB GDDR6',
      'Pantalla 15.6" OLED 3.5K (3456 x 2160)'
    ],
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80',
    featured: true,
    active: true,
    rating: 4.8,
    reviewsCount: 24,
    createdAt: '2026-01-20T11:30:00Z'
  },
  {
    id: 'prod-003',
    name: 'Sony WH-1000XM5 Noise Cancelling',
    slug: 'sony-wh-1000xm5',
    categoryId: 'cat-audio',
    categoryName: 'Audio & Sonido',
    price: 399.00,
    comparePrice: 449.00,
    stock: 25,
    description: 'Líder en cancelación de ruido con dos procesadores y ocho micrófonos. Calidad de audio excepcional compatible con audio de alta resolución y llamadas cristalinas.',
    features: [
      'Cancelación de ruido líder en la industria con procesador V1',
      'Hasta 30 horas de reproducción con carga rápida',
      'Diseño ultraligero y almohadillas de cuero suave',
      'Control táctil intuitivo y detección de voz Speak-to-Chat',
      'Conexión multipunto para 2 dispositivos simultáneos'
    ],
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    featured: true,
    active: true,
    rating: 4.9,
    reviewsCount: 82,
    createdAt: '2026-02-01T09:15:00Z'
  },
  {
    id: 'prod-004',
    name: 'Apple AirPods Max Space Gray',
    slug: 'apple-airpods-max',
    categoryId: 'cat-audio',
    categoryName: 'Audio & Sonido',
    price: 549.00,
    comparePrice: 599.00,
    stock: 7,
    description: 'Auriculares over-ear con transductor dinámico diseñado por Apple, cancelación activa de ruido con modo ambiente y audio espacial con seguimiento dinámico.',
    features: [
      'Transductor dinámico de 40 mm diseñado por Apple',
      'Audio espacial personalizado con seguimiento de cabeza',
      'Diadema de malla transpirable y estructura de acero inoxidable',
      'Corona digital para control de volumen y reproducción',
      '20 horas de autonomía de audio con ANC activado'
    ],
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    featured: false,
    active: true,
    rating: 4.7,
    reviewsCount: 45,
    createdAt: '2026-02-03T15:20:00Z'
  },
  {
    id: 'prod-005',
    name: 'Teclado Mecánico Keychron Q1 Pro Wireless',
    slug: 'keychron-q1-pro-wireless',
    categoryId: 'cat-perifericos',
    categoryName: 'Periféricos & Accesorios',
    price: 199.00,
    comparePrice: 229.00,
    stock: 18,
    description: 'Teclado mecánico custom 75% inalámbrico Bluetooth/USB con chasis completo de aluminio CNC, switches mecánicos hot-swappable y soporte completo QMK/VIA.',
    features: [
      'Cuerpo robusto de aluminio mecanizado CNC 6063',
      'Conectividad Bluetooth 5.1 y cable USB-C desmontable',
      'Switches Keychron K Pro Red prelubricados',
      'Compatibilidad nativa con macOS y Windows',
      'Iluminación RGB orientada al sur y perilla programable'
    ],
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    featured: true,
    active: true,
    rating: 4.9,
    reviewsCount: 57,
    createdAt: '2026-02-10T08:45:00Z'
  },
  {
    id: 'prod-006',
    name: 'Mouse Ergonómico Logitech MX Master 3S',
    slug: 'logitech-mx-master-3s',
    categoryId: 'cat-perifericos',
    categoryName: 'Periféricos & Accesorios',
    price: 99.00,
    comparePrice: 119.00,
    stock: 35,
    description: 'El ratón de productividad preferido por profesionales. Clics silenciosos, sensor óptico de 8000 DPI que funciona sobre cristal y rueda de desplazamiento MagSpeed electromagnética.',
    features: [
      'Rueda de scroll MagSpeed (hasta 1000 líneas por segundo)',
      'Sensor óptico Darkfield de 8,000 DPI',
      'Clics 90% más silenciosos con feedback táctil impecable',
      'Batería recargable USB-C con hasta 70 días de duración',
      'Software Logi Options+ con perfiles de teclas personalizados'
    ],
    image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
    featured: true,
    active: true,
    rating: 4.9,
    reviewsCount: 110,
    createdAt: '2026-02-12T14:10:00Z'
  },
  {
    id: 'prod-007',
    name: 'Monitor LG UltraFine 34" Curvo 5K2K',
    slug: 'lg-ultrafine-34-curvo-5k2k',
    categoryId: 'cat-monitores',
    categoryName: 'Monitores & Pantallas',
    price: 1299.00,
    comparePrice: 1499.00,
    stock: 6,
    description: 'Monitor panorámico 21:9 UltraWide con resolución Nano IPS 5K2K (5120 x 2160), conectividad Thunderbolt 4 con carga de 96W y 98% de cobertura DCI-P3.',
    features: [
      'Resolución UltraWide 5K2K (5120 x 2160) en 34 pulgadas',
      'Panel Nano IPS con soporte HDR600 y calibración de color',
      'Puerto Thunderbolt 4 con entrega de potencia de 96W',
      'Hub USB integrado con altavoces estéreo Waves MaxxAudio',
      'Diseño ergonómico con ajuste de altura, inclinación y giro'
    ],
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    featured: true,
    active: true,
    rating: 4.8,
    reviewsCount: 19,
    createdAt: '2026-02-15T16:00:00Z'
  },
  {
    id: 'prod-008',
    name: 'Samsung Odyssey OLED G9 49" Gaming',
    slug: 'samsung-odyssey-oled-g9',
    categoryId: 'cat-monitores',
    categoryName: 'Monitores & Pantallas',
    price: 1799.00,
    comparePrice: 1999.00,
    stock: 4,
    description: 'Pantalla curva inmersiva 1800R de 49 pulgadas equivalente a dos monitores QHD. Tasa de refresco de 240Hz, tiempo de respuesta de 0.03ms y procesador Neo Quantum.',
    features: [
      'Panel OLED curvo Dual QHD (5120 x 1440) de 49 pulgadas',
      '240 Hz de tasa de refresco y 0.03 ms de tiempo de respuesta',
      'AMD FreeSync Premium Pro y soporte VESA DisplayHDR True Black 400',
      'Iluminación trasera CoreSync y altavoces estéreo integrados',
      'Hub de puertos HDMI 2.1, DisplayPort 1.4 y Micro HDMI'
    ],
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    featured: false,
    active: true,
    rating: 4.7,
    reviewsCount: 14,
    createdAt: '2026-02-18T12:00:00Z'
  },
  {
    id: 'prod-009',
    name: 'iPhone 16 Pro Max 256GB Titanio Natural',
    slug: 'iphone-16-pro-max-titanio',
    categoryId: 'cat-smartphones',
    categoryName: 'Smartphones & Tablets',
    price: 1199.00,
    comparePrice: 1299.00,
    stock: 14,
    description: 'Construido en titanio grado 5 con el potente chip A18 Pro, pantalla Super Retina XDR de 6.9 pulgadas a 120Hz ProMotion y sistema de cámaras Pro con zoom óptico 5x.',
    features: [
      'Chip Apple A18 Pro con arquitectura de 3 nanómetros',
      'Pantalla Super Retina XDR OLED de 6.9" siempre activa',
      'Cámara principal de 48 MP con sensor Quad Pixel de 2ª gen',
      'Botón de Control de Cámara sensible a la presión táctil',
      'Chasis ultraligero y resistente de titanio aeroespacial'
    ],
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80',
    featured: true,
    active: true,
    rating: 4.9,
    reviewsCount: 63,
    createdAt: '2026-02-22T09:00:00Z'
  },
  {
    id: 'prod-010',
    name: 'iPad Pro 13" M4 OLED Ultra-Thin',
    slug: 'ipad-pro-13-m4-oled',
    categoryId: 'cat-smartphones',
    categoryName: 'Smartphones & Tablets',
    price: 1299.00,
    comparePrice: 1399.00,
    stock: 10,
    description: 'El dispositivo Apple más delgado de la historia con tan solo 5.1 mm. Revolucionaria pantalla Ultra Retina XDR con tecnología OLED en tándem y el chip M4 de última generación.',
    features: [
      'Chip M4 con motor neuronal de 38 billones de operaciones/s',
      'Pantalla Ultra Retina XDR con tecnología OLED en tándem',
      'Diseño ultra estilizado de 5.1 mm de grosor en aluminio',
      'Compatible con Apple Pencil Pro y Magic Keyboard nuevo',
      'Conector Thunderbolt / USB 4 de alta velocidad'
    ],
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80',
    featured: false,
    active: true,
    rating: 4.8,
    reviewsCount: 31,
    createdAt: '2026-02-25T11:45:00Z'
  },
  {
    id: 'prod-011',
    name: 'Samsung Galaxy S24 Ultra 512GB Titanium Black',
    slug: 'samsung-galaxy-s24-ultra',
    categoryId: 'cat-smartphones',
    categoryName: 'Smartphones & Tablets',
    price: 1349.00,
    comparePrice: 1449.00,
    stock: 11,
    description: 'Equipado con Galaxy AI, Snapdragon 8 Gen 3 for Galaxy, pantalla Dynamic AMOLED 2X de 6.8" plana con Corning Gorilla Armor antirreflejo y S Pen integrado.',
    features: [
      'Procesador Qualcomm Snapdragon 8 Gen 3 for Galaxy',
      'Galaxy AI con traducción en vivo y Circle to Search',
      'Sensor principal de 200 MP con teleobjetivo periscópico 5x',
      'Batería de 5,000 mAh con carga súper rápida de 45W',
      'Marco de titanio resistente a caídas y agua con IP68'
    ],
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80',
    featured: false,
    active: true,
    rating: 4.8,
    reviewsCount: 42,
    createdAt: '2026-03-01T14:20:00Z'
  },
  {
    id: 'prod-012',
    name: 'Micrófono Profesional Shure MV7+ USB/XLR',
    slug: 'shure-mv7-plus-microfono',
    categoryId: 'cat-audio',
    categoryName: 'Audio & Sonido',
    price: 279.00,
    comparePrice: 299.00,
    stock: 16,
    description: 'Micrófono dinámico híbrido diseñado para streamers, podcasters y músicos. DSP integrado con panel táctil LED personalizable, reducción de ruido ambiental y salida de auriculares.',
    features: [
      'Salidas duales USB-C y XLR analógica profesional',
      'Procesador DSP interno con Auto Level Mode y Denoiser',
      'Panel táctil LED personalizable con millones de colores',
      'Construcción enteramente metálica ultra duradera',
      'Filtro antipop interno y aislamiento de choque optimizado'
    ],
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    featured: false,
    active: true,
    rating: 4.9,
    reviewsCount: 29,
    createdAt: '2026-03-02T10:15:00Z'
  },
  {
    id: 'prod-013',
    name: 'Lenovo ThinkPad X1 Carbon Gen 12',
    slug: 'lenovo-thinkpad-x1-carbon-gen-12',
    categoryId: 'cat-laptops',
    categoryName: 'Laptops & Computadoras',
    price: 1899.00,
    comparePrice: 2099.00,
    stock: 9,
    description: 'El legendario ultrabook corporativo de fibra de carbono. Pesa tan solo 1.09 kg con procesador Intel Core Ultra vPro, teclado ergonómico resistente a derrames y seguridad biométrica.',
    features: [
      'Procesador Intel Core Ultra 7 con NPU para IA',
      '32 GB LPDDR5X y 1 TB SSD PCIe Gen 4',
      'Pantalla 14" 2.8K OLED a 120 Hz con HDR True Black',
      'Chasis de fibra de carbono y magnesio con estándar militar MIL-STD-810H',
      'Conectividad Wi-Fi 7 y lector de huella dactilar match-on-chip'
    ],
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
    featured: false,
    active: true,
    rating: 4.7,
    reviewsCount: 18,
    createdAt: '2026-03-03T16:40:00Z'
  },
  {
    id: 'prod-014',
    name: 'SSD Externo SanDisk Extreme PRO 2TB USB-C',
    slug: 'sandisk-extreme-pro-2tb',
    categoryId: 'cat-perifericos',
    categoryName: 'Periféricos & Accesorios',
    price: 219.00,
    comparePrice: 259.00,
    stock: 30,
    description: 'Unidad de estado sólido portátil ultra veloz con velocidades de lectura de hasta 2000 MB/s. Carcasa de aluminio forjado con protección de silicona resistente a caídas y agua (IP55).',
    features: [
      'Velocidades de transferencia NVMe de hasta 2000 MB/s',
      'Interfaz USB 3.2 Gen 2x2 Type-C de alta velocidad',
      'Resistencia a caídas de hasta 2 metros y certificación IP55',
      'Cifrado de hardware AES de 256 bits por contraseña',
      'Práctico orificio para mosquetón para llevar de viaje'
    ],
    image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80',
    featured: false,
    active: true,
    rating: 4.8,
    reviewsCount: 54,
    createdAt: '2026-03-04T09:30:00Z'
  }
];

const MOCK_ORDERS = [
  {
    id: 'ord-1001',
    orderNumber: 'CS-2026-1001',
    customer: {
      name: 'Sofía Valenzuela Mendoza',
      phone: '+52 55 4123 9876',
      email: 'sofia.valenzuela@techcorp.io',
      address: 'Av. Reforma 222, Piso 14, Col. Juárez, Cuauhtémoc, CDMX',
      notes: 'Entregar en recepción con atención al área de TI. Llamar al llegar.'
    },
    items: [
      {
        productId: 'prod-001',
        name: 'MacBook Pro 16" M3 Max',
        price: 3499.00,
        quantity: 1,
        subtotal: 3499.00,
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80'
      },
      {
        productId: 'prod-006',
        name: 'Mouse Ergonómico Logitech MX Master 3S',
        price: 99.00,
        quantity: 1,
        subtotal: 99.00,
        image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=300&q=80'
      }
    ],
    subtotal: 3598.00,
    shipping: 0.00, // Envío gratis sobre $500
    total: 3598.00,
    status: 'enviado', // pendiente | confirmado | enviado | cancelado
    createdAt: '2026-03-01T15:30:00Z',
    trackingNumber: 'FEDEX-MX-9823411',
    whatsappSent: true
  },
  {
    id: 'ord-1002',
    orderNumber: 'CS-2026-1002',
    customer: {
      name: 'Ing. Alejandro Morales Cruz',
      phone: '+52 81 8320 4455',
      email: 'amorales@solucionescloud.net',
      address: 'Calzada San Pedro 108, Col. Del Valle, San Pedro Garza García, N.L.',
      notes: 'Horario de entrega de 9:00 AM a 2:00 PM únicamente.'
    },
    items: [
      {
        productId: 'prod-003',
        name: 'Sony WH-1000XM5 Noise Cancelling',
        price: 399.00,
        quantity: 2,
        subtotal: 798.00,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80'
      },
      {
        productId: 'prod-005',
        name: 'Teclado Mecánico Keychron Q1 Pro Wireless',
        price: 199.00,
        quantity: 1,
        subtotal: 199.00,
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80'
      }
    ],
    subtotal: 997.00,
    shipping: 0.00,
    total: 997.00,
    status: 'confirmado',
    createdAt: '2026-03-03T11:20:00Z',
    whatsappSent: true
  },
  {
    id: 'ord-1003',
    orderNumber: 'CS-2026-1003',
    customer: {
      name: 'Dra. Gabriela Fuentes Rivas',
      phone: '+52 33 3615 2200',
      email: 'gaby.fuentes@biolab.mx',
      address: 'Av. Américas 1500, Torre Financiera, Guadalajara, Jal.',
      notes: 'Edificio inteligente con acceso controlado por gafete.'
    },
    items: [
      {
        productId: 'prod-007',
        name: 'Monitor LG UltraFine 34" Curvo 5K2K',
        price: 1299.00,
        quantity: 1,
        subtotal: 1299.00,
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80'
      }
    ],
    subtotal: 1299.00,
    shipping: 0.00,
    total: 1299.00,
    status: 'pendiente',
    createdAt: '2026-03-04T09:15:00Z',
    whatsappSent: false
  },
  {
    id: 'ord-1004',
    orderNumber: 'CS-2026-1004',
    customer: {
      name: 'Rodrigo Nava Herrera',
      phone: '+52 999 928 3344',
      email: 'rodrigo.nava@innovamedia.com',
      address: 'Paseo Montejo 495, Depto 3B, Mérida, Yucatán',
      notes: 'Tocar el timbre blanco a la derecha del portón negro.'
    },
    items: [
      {
        productId: 'prod-009',
        name: 'iPhone 16 Pro Max 256GB Titanio Natural',
        price: 1199.00,
        quantity: 1,
        subtotal: 1199.00,
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=300&q=80'
      },
      {
        productId: 'prod-014',
        name: 'SSD Externo SanDisk Extreme PRO 2TB USB-C',
        price: 219.00,
        quantity: 1,
        subtotal: 219.00,
        image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=300&q=80'
      }
    ],
    subtotal: 1418.00,
    shipping: 0.00,
    total: 1418.00,
    status: 'pendiente',
    createdAt: '2026-03-05T14:45:00Z',
    whatsappSent: true
  },
  {
    id: 'ord-1005',
    orderNumber: 'CS-2026-1005',
    customer: {
      name: 'Mariana Castillo León',
      phone: '+52 442 216 7788',
      email: 'mariana.castillo@studioqro.design',
      address: 'Boulevard Bernardo Quintana 4000, Juriquilla, Querétaro, Qro.',
      notes: 'Pedido cancelado por cambio de especificaciones de hardware.'
    },
    items: [
      {
        productId: 'prod-002',
        name: 'Dell XPS 15 OLED InfinityEdge',
        price: 2199.00,
        quantity: 1,
        subtotal: 2199.00,
        image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=300&q=80'
      }
    ],
    subtotal: 2199.00,
    shipping: 0.00,
    total: 2199.00,
    status: 'cancelado',
    createdAt: '2026-02-28T18:00:00Z',
    whatsappSent: false
  }
];

// Exponer a nivel global
window.MOCK_CATEGORIES = MOCK_CATEGORIES;
window.MOCK_PRODUCTS = MOCK_PRODUCTS;
window.MOCK_ORDERS = MOCK_ORDERS;
