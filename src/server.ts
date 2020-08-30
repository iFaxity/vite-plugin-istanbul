import { ServerPlugin } from 'vite';

const coveragePublicPath = '/__coverage__';

export const serverPlugin: ServerPlugin = ({ app }) => {
  app.use(async (ctx, next) => {
    // Return global code coverage (will probably be null).
    if (ctx.path === coveragePublicPath) {
      // @ts-ignore
      const coverage = global.__coverage__ ?? null;

      ctx.status = 200;
      ctx.type = 'json';
      ctx.body = { coverage };
    } else {
      await next();
    }
  });
};
