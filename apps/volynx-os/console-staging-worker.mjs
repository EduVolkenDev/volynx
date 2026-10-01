import app from "./.open-next/worker.js";

export * from "./.open-next/worker.js";

const notFound = () => new Response("Not Found", {
  status: 404,
  headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }
});

const workspacePath = /^\/console\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?$/;

export default {
  fetch(request, env, context) {
    const path = new URL(request.url).pathname;

    if (path === "/console" || path === "/console/preview" || workspacePath.test(path)) {
      return app.fetch(request, env, context);
    }

    if (path === "/api/cloud/v1/catalog" || path === "/api/cloud/v1/overview") {
      return app.fetch(request, env, context);
    }

    if (path.startsWith("/_next/static/") || path.startsWith("/assets/cloud-console/")) {
      return env.ASSETS.fetch(request);
    }

    return notFound();
  }
};
