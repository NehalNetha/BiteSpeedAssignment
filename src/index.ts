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

app.post('/identify', async (c) => {
  try{
    const body = await c.req.json<{ email?: string; phoneNumber?: string }>();
    const { email, phoneNumber } = body;

    if (!email && !phoneNumber) {
      return c.json({ error: 'Either email or phoneNumber must be provided' }, 400);
    }
    
  } catch (error) {
    console.error('Error in identify endpoint:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});



export default {
  fetch: app.fetch,
}; 