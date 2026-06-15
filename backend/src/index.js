import { createAppServer } from "./server.js";
import { config } from "./config.js";

const server = createAppServer();

server.listen(config.port, () => {
  process.stdout.write(`Backend prêt sur http://localhost:${config.port}\n`);
});
