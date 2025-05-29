DROP TABLE IF EXISTS Contact;

CREATE TABLE Contact (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phoneNumber TEXT,
  email TEXT,
  linkedId INTEGER, 
  linkPrecedence TEXT CHECK(linkPrecedence IN ('primary', 'secondary')),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME, 
  FOREIGN KEY (linkedId) REFERENCES Contact(id)
);


CREATE INDEX IF NOT EXISTS idx_contact_email ON Contact(email);
CREATE INDEX IF NOT EXISTS idx_contact_phoneNumber ON Contact(phoneNumber);
CREATE INDEX IF NOT EXISTS idx_contact_linkedId ON Contact(linkedId); 