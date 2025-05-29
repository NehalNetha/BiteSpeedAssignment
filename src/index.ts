import { Hono } from 'hono';

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
  return c.text('Hello World!');
});

app.get('/test', (c) => {
  return c.text('This is a test endpoint!');
});

export default {
  fetch: app.fetch,
}; 