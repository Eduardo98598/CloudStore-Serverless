/**
 * CloudStore Serverless - Handler AWS Lambda: Products
 * Endpoints atendidos (API-CONTRACT.md §1):
 *   - GET    /products
 *   - GET    /products/{id}
 *   - POST   /products
 *   - PUT    /products/{id}
 *   - DELETE /products/{id}
 */

'use strict';

const { parseEvent, ok, created, fail, jsonResponse } = require('../shared/http');
const ProductsService = require('./service');

exports.handler = async (event) => {
  const req = parseEvent(event);

  if (req.method === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  if (req.bodyError && (req.method === 'POST' || req.method === 'PUT')) {
    return fail(400, req.bodyError);
  }

  // Extraer {id} desde pathParameters o desde /products/{id}
  const pathMatch = req.path.match(/^\/products\/([^/]+)$/);
  const productId = req.pathParameters.id || (pathMatch ? decodeURIComponent(pathMatch[1]) : null);

  try {
    // GET /products
    if (req.method === 'GET' && req.path === '/products' && !productId) {
      const products = await ProductsService.listProducts(req.query);
      return ok(products);
    }

    // GET /products/{id}
    if (req.method === 'GET' && productId) {
      const product = await ProductsService.getProductById(productId);
      if (!product) {
        return fail(404, 'Producto no encontrado');
      }
      return ok(product);
    }

    // POST /products
    if (req.method === 'POST' && req.path === '/products') {
      const res = await ProductsService.createProduct(req.body);
      if (res.error) {
        return fail(res.status || 400, res.error);
      }
      return created(res.data, 'Producto creado exitosamente');
    }

    // PUT /products/{id}
    if (req.method === 'PUT' && productId) {
      const res = await ProductsService.updateProduct(productId, req.body);
      if (res.error) {
        return fail(res.status || 400, res.error);
      }
      return ok(res.data, 'Producto actualizado exitosamente');
    }

    // DELETE /products/{id}
    if (req.method === 'DELETE' && productId) {
      const res = await ProductsService.deleteProduct(productId);
      if (res.error) {
        return fail(res.status || 404, res.error);
      }
      return ok(undefined, 'Producto eliminado correctamente');
    }

    return fail(404, `Ruta no encontrada en servicio Products: ${req.method} ${req.path}`);
  } catch (err) {
    console.error('[Products Lambda Error]:', err);
    return fail(500, 'Error interno al consultar productos');
  }
};
