/**
 * CloudStore Serverless - Cliente DynamoDB Singleton (AWS SDK for JavaScript v3)
 * Reutiliza la conexión entre invocaciones cálidas de AWS Lambda.
 * Permite inyectar un cliente simulado en pruebas locales sin desplegar en AWS.
 */

'use strict';

let docClientInstance = null;

/**
 * Obtiene o inicializa la instancia de DynamoDBDocumentClient.
 * @returns {import('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient}
 */
function getDocClient() {
  if (docClientInstance) {
    return docClientInstance;
  }

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

  docClientInstance = DynamoDBDocumentClient.from(baseClient, {
    marshallOptions: {
      removeUndefinedValues: true, // Omite atributos undefined (cumple diseño de Sparse GSI)
      convertEmptyValues: false
    },
    unmarshallOptions: {
      wrapNumbers: false
    }
  });

  return docClientInstance;
}

/**
 * Permite reemplazar el cliente en pruebas unitarias o de integración local.
 * @param {Object|null} customClient
 */
function setDocClient(customClient) {
  docClientInstance = customClient;
}

module.exports = {
  getDocClient,
  setDocClient
};
