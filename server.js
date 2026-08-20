const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const sql = require('mssql');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'login-events.jsonl');

function buildAzureConnectionString() {
  const server = process.env.AZURE_SQL_SERVER;
  const database = process.env.AZURE_SQL_DATABASE;
  const user = process.env.AZURE_SQL_USER;
  const password = process.env.AZURE_SQL_PASSWORD;

  if (!server || !database || !user || !password) {
    return '';
  }

  return `Server=tcp:${server},1433;Initial Catalog=${database};Persist Security Info=False;User ID=${user};Password=${password};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;`;
}

const azureConnectionString = process.env.AZURE_SQL_CONNECTION_STRING || buildAzureConnectionString();

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

function ensureDataDirectory() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function appendLocalEvent(event) {
  ensureDataDirectory();
  const line = `${JSON.stringify({ ...event, storedAt: new Date().toISOString() })}\n`;
  fs.appendFileSync(DATA_FILE, line);
}

async function ensureSqlTable(pool) {
  await pool.request().query(`
    IF OBJECT_ID(N'dbo.LoginEvents', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.LoginEvents (
        event_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        student_id NVARCHAR(100) NOT NULL,
        resource_id NVARCHAR(100) NOT NULL,
        login_timestamp DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        session_id NVARCHAR(200) NULL,
        success_bit BIT NOT NULL DEFAULT 1,
        source NVARCHAR(100) NULL,
        ip_address NVARCHAR(45) NULL,
        metadata NVARCHAR(1000) NULL
      );
    END
  `);
}

async function writeToSql(event) {
  const pool = await sql.connect(azureConnectionString);
  try {
    await ensureSqlTable(pool);
    await pool.request()
      .input('studentId', sql.NVarChar(100), event.studentId)
      .input('resourceId', sql.NVarChar(100), event.resourceId)
      .input('sessionId', sql.NVarChar(200), event.sessionId || null)
      .input('success', sql.Bit, event.success !== false ? 1 : 0)
      .input('source', sql.NVarChar(100), event.source || 'web')
      .input('ipAddress', sql.NVarChar(45), event.ipAddress || null)
      .input('metadata', sql.NVarChar(1000), JSON.stringify(event.metadata || {}))
      .query(`
        INSERT INTO dbo.LoginEvents (
          student_id,
          resource_id,
          session_id,
          success_bit,
          source,
          ip_address,
          metadata
        )
        VALUES (@studentId, @resourceId, @sessionId, @success, @source, @ipAddress, @metadata)
      `);
  } finally {
    await pool.close();
  }
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/login-events', async (req, res) => {
  const event = {
    studentId: req.body.studentId,
    resourceId: req.body.resourceId,
    studentName: req.body.studentName || null,
    sessionId: req.body.sessionId || null,
    success: req.body.success !== false,
    source: req.body.source || 'web',
    ipAddress: req.body.ipAddress || null,
    metadata: req.body.metadata || {},
    timestamp: new Date().toISOString(),
  };

  if (!event.studentId || !event.resourceId) {
    return res.status(400).json({ error: 'studentId and resourceId are required' });
  }

  try {
    if (azureConnectionString) {
      await writeToSql(event);
      return res.status(202).json({ status: 'accepted', storage: 'azure-sql' });
    }

    appendLocalEvent(event);
    return res.status(202).json({ status: 'accepted', storage: 'local-file' });
  } catch (error) {
    console.error(error);
    appendLocalEvent(event);
    return res.status(202).json({
      status: 'accepted',
      storage: 'local-file',
      note: 'Azure write failed; event saved locally for later import.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Login tracker listening on http://localhost:${PORT}`);
});
