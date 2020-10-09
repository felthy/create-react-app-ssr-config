import 'fetch-everywhere';
import express from 'express';
import bodyParser from 'body-parser';
import createRenderMiddleware from './middleware/render';
import errorMiddleware from './middleware/error';

export default function (options) {
  const router = express.Router();

  // Support post requests with body data (doesn't support multipart, use multer)
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));

  router.use(createRenderMiddleware(options));

  router.use(errorMiddleware);

  return router;
}
