/**
 * CloudStore Serverless - Handler AWS Lambda: Categories
 * Endpoints atendidos (API-CONTRACT.md §2):
 *   - GET    /categories (soporta ?includeInactive=true)
 *   - POST   /categories
 *   - PUT    /categories/{id}
 *   - DELETE /categories/{id}
 */

'use strict';

const { parseEvent, ok, created, fail, jsonResponse } = require('../shared/http');
const CategoriesService = require('./service');

exports.handler = async (event) => {
  const req = parseEvent(event);

  if (req.method === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  if (req.bodyError && (req.method === 'POST' || req.method === 'PUT')) {
    return fail(400, req.bodyError);
  }

  const pathMatch = req.path.match(/^\/categories\/([^/]+)$/);
  const categoryId = req.pathParameters.id || (pathMatch ? decodeURIComponent(pathMatch[1]) : null);

  try {
    // GET /categories
    if (req.method === 'GET' && req.path === '/categories' && !categoryId) {
      const categories = await CategoriesService.listCategories(req.query);
      return ok(categories);
    }

    // GET /categories/{id} (consulta individual)
    if (req.method === 'GET' && categoryId) {
      const category = await CategoriesService.getCategoryById(categoryId);
      if (!category) {
        return fail(404, 'Categoría no encontrada');
      }
      return ok(category);
    }

    // POST /categories
    if (req.method === 'POST' && req.path === '/categories') {
      const res = await CategoriesService.createCategory(req.body);
      if (res.error) {
        return fail(res.status || 400, res.error);
      }
      return created(res.data, 'Categoría creada con éxito');
    }

    // PUT /categories/{id}
    if (req.method === 'PUT' && categoryId) {
      const res = await CategoriesService.updateCategory(categoryId, req.body);
      if (res.error) {
        return fail(res.status || 400, res.error);
      }
      return ok(res.data, 'Categoría actualizada con éxito');
    }

    // DELETE /categories/{id}
    if (req.method === 'DELETE' && categoryId) {
      const res = await CategoriesService.deleteCategory(categoryId);
      if (res.error) {
        return fail(res.status || 404, res.error);
      }
      return ok(undefined, 'Categoría eliminada con éxito');
    }

    return fail(404, `Ruta no encontrada en servicio Categories: ${req.method} ${req.path}`);
  } catch (err) {
    console.error('[Categories Lambda Error]:', err);
    return fail(500, 'Error interno al consultar categorías');
  }
};
