/**
 * CloudStore Serverless - Utilidades HTTP para Amazon API Gateway HTTP API (v2.0 y v1.0)
 * Implementa el envelope de respuesta estándar definido en API-CONTRACT.md:
 *   { success: boolean, data?: any, message?: string, error?: string }
 */

'use strict';

const DEFAULT_HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Accept,Authorization,Idempotency-Key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
});

/**
 * Construye una respuesta HTTP compatible con API Gateway HTTP API.
 * @param {number} statusCode
 * @param {Object} payload
 * @param {Object} [extraHeaders]
 */
function jsonResponse(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      ...DEFAULT_HEADERS,
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  };
}

/**
 * Respuesta exitosa (200 / 201).
 */
function ok(data, message, statusCode = 200) {
  const body = { success: true };
  if (data !== undefined) body.data = data;
  if (message) body.message = message;
  return jsonResponse(statusCode, body);
}

/**
 * Respuesta de creación exitosa (201).
 */
function created(data, message) {
  return ok(data, message, 201);
}

/**
 * Respuesta de error controlado (400 / 404 / 409 / 500 / 503).
 */
function fail(statusCode, errorMessage) {
  return jsonResponse(statusCode, {
    success: false,
    error: errorMessage
  });
}

/**
 * Extrae y normaliza método, ruta, pathParameters, queryStringParameters, headers y body
 * desde un evento de API Gateway HTTP API (formato 2.0 o 1.0).
 * @param {Object} event
 */
function parseEvent(event = {}) {
  const method = (
    event.requestContext?.http?.method ||
    event.httpMethod ||
    'GET'
  ).toUpperCase();

  let rawPath =
    event.rawPath ||
    event.requestContext?.http?.path ||
    event.path ||
    '/';
  // Eliminar prefijo de stage si viene incluido (ej. /prod/products -> /products)
  const stage = event.requestContext?.stage;
  if (stage && stage !== '$default' && rawPath.startsWith(`/${stage}/`)) {
    rawPath = rawPath.slice(stage.length + 1);
  }
  // Normalizar barra final excepto en raíz
  if (rawPath.length > 1 && rawPath.endsWith('/')) {
    rawPath = rawPath.slice(0, -1);
  }

  const pathParameters = event.pathParameters || {};
  const query = event.queryStringParameters || {};

  // Normalizar cabeceras a minúsculas para lectura consistente (ej. idempotency-key)
  const headers = {};
  if (event.headers && typeof event.headers === 'object') {
    for (const [k, v] of Object.entries(event.headers)) {
      headers[k.toLowerCase()] = v;
    }
  }

  let body = {};
  let bodyError = null;
  if (event.body) {
    try {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    } catch (_err) {
      bodyError = 'El cuerpo de la solicitud no contiene JSON válido';
    }
  }

  return {
    method,
    path: rawPath,
    pathParameters,
    query,
    headers,
    body: body && typeof body === 'object' ? body : {},
    bodyError
  };
}

module.exports = {
  DEFAULT_HEADERS,
  jsonResponse,
  ok,
  created,
  fail,
  parseEvent
};
