/**
 * CloudStore Serverless - Handler AWS Lambda: Orders
 * Endpoints atendidos (API-CONTRACT.md §3 y §4):
 *   - GET   /orders
 *   - GET   /orders/{id}
 *   - POST  /orders
 *   - PATCH /orders/{id}/status
 *   - GET   /dashboard/metrics
 */

'use strict';

const { parseEvent, ok, created, fail, jsonResponse } = require('../shared/http');
const OrdersService = require('./service');

exports.handler = async (event) => {
  const req = parseEvent(event);

  if (req.method === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  if (req.bodyError && (req.method === 'POST' || req.method === 'PATCH')) {
    return fail(400, req.bodyError);
  }

  try {
    // GET /dashboard/metrics
    if (req.method === 'GET' && req.path === '/dashboard/metrics') {
      const metrics = await OrdersService.getDashboardMetrics();
      return ok(metrics);
    }

    // PATCH /orders/{id}/status
    const statusMatch = req.path.match(/^\/orders\/([^/]+)\/status$/);
    if (req.method === 'PATCH' && statusMatch) {
      const orderId = req.pathParameters.id || decodeURIComponent(statusMatch[1]);
      const res = await OrdersService.updateOrderStatus(
        orderId,
        req.body.status,
        req.body.trackingNumber
      );
      if (res.error) {
        return fail(res.status || 400, res.error);
      }
      return ok(res.data, res.message);
    }

    // Extraer {id} desde /orders/{id}
    const detailMatch = req.path.match(/^\/orders\/([^/]+)$/);
    const orderIdOrNumber =
      req.pathParameters.id || (detailMatch ? decodeURIComponent(detailMatch[1]) : null);

    // GET /orders
    if (req.method === 'GET' && req.path === '/orders' && !orderIdOrNumber) {
      const orders = await OrdersService.listOrders(req.query);
      return ok(orders);
    }

    // GET /orders/{id}
    if (req.method === 'GET' && orderIdOrNumber) {
      const order = await OrdersService.getOrderByIdOrNumber(orderIdOrNumber);
      if (!order) {
        return fail(404, 'Pedido no encontrado');
      }
      return ok(order);
    }

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

    return fail(404, `Ruta no encontrada en servicio Orders: ${req.method} ${req.path}`);
  } catch (err) {
    console.error('[Orders Lambda Error]:', err);
    return fail(500, 'Error interno al procesar pedidos');
  }
};
