/**
 * ============================================================================
 * CLOUDSTORE SERVERLESS — CONFIGURACIÓN DE IDENTIDAD COMERCIAL Y DE TIENDA
 * ============================================================================
 * Archivo pensado para que cada equipo de estudiantes personalice su tienda
 * sin modificar la lógica de programación ni el backend en AWS.
 *
 * INSTRUCCIONES RÁPIDAS:
 *   1. Cambia los textos entre comillas ('...') con los datos de tu negocio.
 *   2. Guarda este archivo y recarga el navegador (F5) para ver los cambios.
 *   3. Para cambiar los colores y tipografía, edita: frontend/css/theme.css
 * ============================================================================
 */

const STORE_CONFIG = {
  // --------------------------------------------------------------------------
  // 1. IDENTIDAD COMERCIAL Y PROPIETARIO
  // --------------------------------------------------------------------------
  storeName: 'CloudStore',
  storeBadge: 'Serverless',
  fullStoreName: 'CloudStore Serverless',
  slogan: 'Tecnología de Vanguardia al Alcance de tus Manos',
  description:
    'Descubre laptops de alto rendimiento, periféricos profesionales y dispositivos inteligentes diseñados para creadores y desarrolladores.',
  footerDescription:
    'Plataforma moderna de e-commerce tecnológico desarrollada bajo arquitectura desacoplada y lista para despliegue Serverless en Amazon Web Services.',
  ownerName: 'Equipo CloudStore Serverless',

  // --------------------------------------------------------------------------
  // 2. DERECHOS DE AUTOR Y PIE DE PÁGINA (FOOTER)
  // --------------------------------------------------------------------------
  copyrightYear: '2026',
  copyrightText: '© 2026 CloudStore Serverless. Todos los derechos reservados.',
  footerCredits: 'Construido con Vanilla JS, Bootstrap 5 y Node.js 24.',
  footerBadges: ['AWS Lambda', 'DynamoDB', 'S3 + CloudFront'],

  // --------------------------------------------------------------------------
  // 3. DATOS DE CONTACTO Y WHATSAPP
  // --------------------------------------------------------------------------
  contact: {
    email: 'soporte@cloudstore.dev',
    // Número de WhatsApp con código de país, sin espacios ni signos (ej. 5219991234567 para México)
    whatsappPhone: '5219991234567',
    // Formato legible que se muestra en el pie de página
    whatsappDisplay: '+52 1 999 123 4567',
    // Saludo inicial al enviar un pedido o consulta por WhatsApp
    whatsappGreeting: '¡Hola CloudStore! Acabo de realizar el siguiente pedido:'
  },

  // --------------------------------------------------------------------------
  // 4. REDES SOCIALES (Opcional: coloca la URL completa o déjalo vacío '')
  // --------------------------------------------------------------------------
  social: {
    facebook: '',
    instagram: '',
    tiktok: '',
    github: ''
  },

  // --------------------------------------------------------------------------
  // 5. LOGOTIPO E ICONOS DE MARCA
  // --------------------------------------------------------------------------
  branding: {
    // Ruta relativa desde frontend/ hacia el logotipo (ej. 'assets/branding/logo.svg')
    logoImage: 'assets/branding/logo.svg',
    // Si es true, muestra la imagen logoImage; si es false, muestra el icono de Bootstrap (logoIcon)
    useLogoImage: true,
    // Icono de respaldo de Bootstrap Icons (https://icons.getbootstrap.com/)
    logoIcon: 'bi-cloud-check-fill',
    // Ruta relativa desde frontend/ hacia el favicon
    favicon: 'assets/branding/favicon.ico'
  },

  // --------------------------------------------------------------------------
  // 6. BANNER PRINCIPAL (HERO) Y MENSAJES DE BIENVENIDA
  // --------------------------------------------------------------------------
  hero: {
    welcomeBadge: 'AWS Ready',
    welcomeMessage: 'Arquitectura preparada para Amazon API Gateway & DynamoDB',
    // Ruta a la imagen del banner principal en frontend/assets/banners/
    bannerImage: 'assets/banners/hero.webp',
    // Cambia a true si deseas mostrar la imagen hero.webp dentro del banner principal
    showBannerImage: false,
    bannerAlt: 'Banner principal de la tienda',
    primaryButtonText: 'Explorar Catálogo',
    secondaryButtonText: 'Ver Destacados'
  },

  // --------------------------------------------------------------------------
  // 7. TEXTOS COMERCIALES / BENEFICIOS DE LA PÁGINA PRINCIPAL
  // --------------------------------------------------------------------------
  benefits: [
    {
      icon: 'bi-shield-check',
      title: 'Garantía Directa',
      description: 'Equipos 100% originales con respaldo de fabricante.'
    },
    {
      icon: 'bi-truck',
      title: 'Envíos Gratuitos',
      description: 'En todas tus compras mayores a $500.00 MXN.'
    },
    {
      icon: 'bi-whatsapp',
      title: 'Atención por WhatsApp',
      description: 'Confirmación inmediata y seguimiento personalizado.'
    }
  ],

  // --------------------------------------------------------------------------
  // 8. BANNER INFERIOR DE PEDIDOS POR WHATSAPP
  // --------------------------------------------------------------------------
  whatsappCta: {
    badge: 'Pedidos Simples',
    title: '¿Prefieres ordenar directamente por WhatsApp?',
    description:
      'Selecciona tus artículos, agrégalos al carrito y pulsa checkout para generar un resumen automático listo para enviar a nuestro WhatsApp de atención.',
    buttonText: 'Comenzar Compra'
  }
};

// Exportar globalmente para que todas las páginas de la tienda lo utilicen
if (typeof window !== 'undefined') {
  window.STORE_CONFIG = STORE_CONFIG;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = STORE_CONFIG;
}
