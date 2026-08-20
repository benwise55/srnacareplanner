# Login event tracker

This starter project accepts login events from a web app or service and stores them in Azure SQL when a connection string is configured. If no Azure connection string is present, events are saved locally to the data directory for later import.

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the API:
   ```bash
   node server.js
   ```
3. Send a test event:
   ```bash
   curl -X POST http://localhost:3000/api/login-events \
     -H 'Content-Type: application/json' \
     -d '{"studentId":"student-001","resourceId":"resource-001"}'
   ```

## Azure SQL setup

1. Create or confirm your Azure SQL server and database.
2. Run the statements in schema.sql.
3. Fill in the values in .env:
   - AZURE_SQL_SERVER=wisefamilyfantasyleague.database.windows.net
   - AZURE_SQL_DATABASE=wisefamilyfantasyleague
   - AZURE_SQL_USER=your_sql_user
   - AZURE_SQL_PASSWORD=your_sql_password
4. If you prefer, you can instead set AZURE_SQL_CONNECTION_STRING directly in .env.
5. Restart the service.
