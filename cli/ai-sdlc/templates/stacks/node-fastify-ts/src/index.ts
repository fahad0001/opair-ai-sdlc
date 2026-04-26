import Fastify from "fastify";
import pino from "pino";

const logger = pino({ name: "__projectName__" });
const app = Fastify({ loggerInstance: logger });

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 3000);
app.listen({ port, host: "0.0.0.0" }).then((addr) => {
  logger.info({ addr }, "listening");
});
