/**
 * CloudStore - Servidor local de API
 * Sustituye API Gateway + Lambda durante el desarrollo local.
 * Utiliza los mismos handlers y servicios del backend.
 */

"use strict";

const http = require("http");

const productsHandler = require("./products/index").handler;
const categoriesHandler = require("./categories/index").handler;
const ordersHandler = require("./orders/index").handler;

const PORT = Number(process.env.LOCAL_API_PORT || 4000);
const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

function getHandler(pathname) {
  if (pathname === "/products" || pathname.startsWith("/products/")) {
    return productsHandler;
  }

  if (pathname === "/categories" || pathname.startsWith("/categories/")) {
    return categoriesHandler;
  }

  if (pathname === "/orders" || pathname.startsWith("/orders/")) {
    return ordersHandler;
  }

  if (pathname === "/dashboard/metrics") {
    return ordersHandler;
  }

  return null;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > MAX_BODY_SIZE) {
      const error = new Error("El cuerpo de la solicitud supera 1 MB");
      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  return chunks.length ? Buffer.concat(chunks).toString("utf8") : undefined;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Headers":
      "Content-Type,Accept,Authorization,Idempotency-Key",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  });

  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url || "/",
      `http://${req.headers.host || "localhost"}`,
    );

    const pathname = url.pathname;
    const handler = getHandler(pathname);

    if (!handler) {
      return sendJson(res, 404, {
        success: false,
        error: `Ruta no encontrada: ${pathname}`,
      });
    }

    const body = await readBody(req);

    const queryStringParameters = Object.fromEntries(
      url.searchParams.entries(),
    );

    const headers = {};

    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers[key.toLowerCase()] = Array.isArray(value)
          ? value.join(",")
          : value;
      }
    }

    // Simula el evento HTTP API de API Gateway (versión 2.0).
    const event = {
      version: "2.0",
      rawPath: pathname,
      headers,
      queryStringParameters,
      body,
      isBase64Encoded: false,
      requestContext: {
        stage: "$default",
        http: {
          method: req.method || "GET",
          path: pathname,
        },
      },
    };

    const result = await handler(event);

    res.writeHead(result.statusCode || 200, result.headers || {});
    res.end(result.body || "");
  } catch (error) {
    console.error("[Local API Error]:", error);

    sendJson(res, error.statusCode || 500, {
      success: false,
      error: error.message || "Error interno del servidor local",
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("================================================");
  console.log(" CloudStore - API Local");
  console.log("================================================");
  console.log(` API: http://localhost:${PORT}`);
  console.log(
    " DynamoDB endpoint:",
    process.env.DYNAMODB_ENDPOINT || "No configurado",
  );
  console.log(" Servicios: Products, Categories y Orders");
  console.log("================================================");
});
