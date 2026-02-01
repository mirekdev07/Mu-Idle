import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    adapter: async () => {
      const { PrismaNeon } = await import('@prisma/adapter-neon');
      const { neonConfig, Pool } = await import('@neondatabase/serverless');

      neonConfig.webSocketConstructor = (await import('ws')).default;

      const connectionString = process.env.DATABASE_URL!;
      const pool = new Pool({ connectionString });
      return new PrismaNeon(pool);
    },
  },
});
