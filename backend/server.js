require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 8056;

(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[Server] NexHire backend running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
  });
})();
