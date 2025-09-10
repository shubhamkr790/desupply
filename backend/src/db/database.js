const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          address TEXT PRIMARY KEY,
          role TEXT,
          company_name TEXT,
          pan TEXT,
          gstin TEXT,
          phone TEXT,
          email TEXT,
          kyc_status TEXT DEFAULT 'none',
          reputation_score INTEGER DEFAULT 100,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Invoices table
      db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
          token_id INTEGER PRIMARY KEY,
          invoice_hash TEXT UNIQUE,
          supplier TEXT,
          buyer TEXT,
          invoice_number TEXT,
          issue_date DATE,
          due_date DATE,
          face_value INTEGER,
          currency TEXT DEFAULT 'INR',
          token_uri TEXT,
          file_metadata TEXT,
          status TEXT DEFAULT 'pending',
          gst_verified BOOLEAN DEFAULT 0,
          erp_verified BOOLEAN DEFAULT 0,
          logistics_verified BOOLEAN DEFAULT 0,
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add file_metadata column if it doesn't exist (for backward compatibility)
      db.run(`ALTER TABLE invoices ADD COLUMN file_metadata TEXT`, (err) => { /* ignore error if column exists */ });

      // Funding positions table
      db.run(`
        CREATE TABLE IF NOT EXISTS funding_positions (
          token_id INTEGER PRIMARY KEY,
          funder TEXT,
          purchase_price INTEGER,
          face_value INTEGER,
          funded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          due_date TIMESTAMP,
          status TEXT DEFAULT 'funded',
          settled_at TIMESTAMP,
          FOREIGN KEY (token_id) REFERENCES invoices(token_id)
        )
      `);

      // Events table
      db.run(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token_id INTEGER,
          event_type TEXT,
          payload TEXT,
          tx_hash TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database initialized successfully');
          resolve();
        }
      });
    });
  });
};

// Helper functions
const getUser = (address) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE address = ?', [address], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const createUser = (userData) => {
  return new Promise((resolve, reject) => {
    const { address, role, company_name, pan, gstin, phone, email } = userData;
    db.run(
      `INSERT INTO users (address, role, company_name, pan, gstin, phone, email) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [address, role, company_name, pan, gstin, phone, email],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

const createInvoice = (invoiceData) => {
  return new Promise((resolve, reject) => {
    const {
      token_id,
      invoice_hash,
      supplier,
      buyer,
      invoice_number,
      issue_date,
      due_date,
      face_value,
      token_uri
    } = invoiceData;
    
    db.run(
      `INSERT INTO invoices (token_id, invoice_hash, supplier, buyer, invoice_number, 
                             issue_date, due_date, face_value, token_uri, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'minted')`,
      [token_id, invoice_hash, supplier, buyer, invoice_number, 
       issue_date, due_date, face_value, token_uri],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

const updateInvoiceVerification = (tokenId, verificationType) => {
  return new Promise((resolve, reject) => {
    const column = verificationType + '_verified';
    db.run(
      `UPDATE invoices SET ${column} = 1 WHERE token_id = ?`,
      [tokenId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
};

const getInvoice = (tokenId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM invoices WHERE token_id = ?', [tokenId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getVerifiedInvoices = () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM invoices 
       WHERE gst_verified = 1 AND erp_verified = 1 AND logistics_verified = 1
       ORDER BY registered_at DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

const createEvent = (eventData) => {
  return new Promise((resolve, reject) => {
    const { token_id, event_type, payload, tx_hash } = eventData;
    db.run(
      `INSERT INTO events (token_id, event_type, payload, tx_hash) VALUES (?, ?, ?, ?)`,
      [token_id, event_type, JSON.stringify(payload), tx_hash],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

const getEvents = (tokenId) => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM events WHERE token_id = ? ORDER BY created_at DESC',
      [tokenId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

module.exports = {
  db,
  initDatabase,
  getUser,
  createUser,
  createInvoice,
  updateInvoiceVerification,
  getInvoice,
  getVerifiedInvoices,
  createEvent,
  getEvents
};
