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

    const db = c.env.DB;

    let existingContacts;

    if (email && phoneNumber) {
      existingContacts = await db.prepare(
        `SELECT * FROM Contact 
         WHERE (email = ? OR phoneNumber = ?) 
         AND deletedAt IS NULL 
         ORDER BY createdAt ASC`
      ).bind(email, phoneNumber).all();
    } else if (email) {
      existingContacts = await db.prepare(
        `SELECT * FROM Contact 
         WHERE email = ? AND deletedAt IS NULL 
         ORDER BY createdAt ASC`
      ).bind(email).all();
    } else {
      existingContacts = await db.prepare(
        `SELECT * FROM Contact 
         WHERE phoneNumber = ? AND deletedAt IS NULL 
         ORDER BY createdAt ASC`
      ).bind(phoneNumber).all();
    }

    const contacts = existingContacts.results || [];

    if (contacts.length === 0) {
      const result = await db.prepare(
        `INSERT INTO Contact (email, phoneNumber, linkPrecedence, createdAt, updatedAt) 
         VALUES (?, ?, 'primary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(email || null, phoneNumber || null).run();

      return c.json({
        contact: {
          primaryContactId: result.meta.last_row_id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    
    return c.json({ email, phoneNumber });
    
  } catch (error) {
    console.error('Error in identify endpoint:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});



export default {
  fetch: app.fetch,
}; 