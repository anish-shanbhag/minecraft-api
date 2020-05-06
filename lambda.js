'use strict'
const awsServerlessExpress = require('aws-serverless-express')
const app = require('./app')
const binaryMimeTypes = [
	'application/octet-stream',
	'font/eot',
	'font/opentype',
	'font/otf',
	'image/jpeg',
	'image/png',
	'image/svg+xml'
]
const server = awsServerlessExpress.createServer(app, null, binaryMimeTypes);
exports.handler = (event, context) => {
  try {
    awsServerlessExpress.proxy(server, event, context);
  } catch {
    context.succeed({
      statusCode: 500,
      body: "Internal Server Error"
    });
  }
}
