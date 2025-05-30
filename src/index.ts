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

    const primaryContacts = contacts.filter((contact: any) => contact.linkPrecedence === 'primary');
    
    let primaryContactId;
    let shouldCreateSecondary = false;

    if (primaryContacts.length === 0) {


      const linkedId = contacts[0].linkedId;

      const primaryContact = await db.prepare(

        `SELECT * FROM Contact WHERE id = ? AND deletedAt IS NULL`
      ).bind(linkedId).first();
      primaryContactId = primaryContact?.id;
    } else if (primaryContacts.length === 1) {
      primaryContactId = primaryContacts[0].id;
      
      const existingPrimary = primaryContacts[0];

      const hasNewEmail = email && email !== existingPrimary.email;
      const hasNewPhone = phoneNumber && phoneNumber !== existingPrimary.phoneNumber;
      
      if ((hasNewEmail || hasNewPhone) && (email || phoneNumber)) {
        const existingCombination = await db.prepare(
          `SELECT * FROM Contact 
           WHERE email = ? AND phoneNumber = ? AND deletedAt IS NULL`

        ).bind(email || null, phoneNumber || null).first();

        
        if (!existingCombination) {
          shouldCreateSecondary = true;
        }
      }
    } else {
    
      const oldestPrimary = primaryContacts[0];
      
      primaryContactId = oldestPrimary.id;
      
      for (let i = 1; i < primaryContacts.length; i++) {
        await db.prepare(
          `UPDATE Contact 
           SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = CURRENT_TIMESTAMP 
           WHERE id = ?`
        ).bind(primaryContactId, primaryContacts[i].id).run();
        
        await db.prepare(
          `UPDATE Contact 
           SET linkedId = ?, updatedAt = CURRENT_TIMESTAMP 
           WHERE linkedId = ?`
        ).bind(primaryContactId, primaryContacts[i].id).run();
      }
    }

    
    
  } catch (error) {
    console.error('Error in identify endpoint:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});



export default {
  fetch: app.fetch,
}; 