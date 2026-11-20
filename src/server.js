import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3000;
const app = createApp();
app.listen(port, () => {
  const mode = process.env.ANTHROPIC_API_KEY ? "live (Claude)" : "offline demo story only";
  console.log(`Kidly Storiez running on http://localhost:${port} - ${mode}`);
});
