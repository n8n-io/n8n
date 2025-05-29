export default {
  async fetch(request, env, ctx) {
    // 处理 API 请求的逻辑
    const url = new URL(request.url);
    
    // 静态文件服务
    if (request.method === "GET" && !url.pathname.startsWith('/rest')) {
      return env.ASSETS.fetch(request);
    }

    // API 请求处理
    if (url.pathname.startsWith('/rest')) {
      // 在这里处理 API 请求
      // 您需要根据 n8n 的 API 路由进行相应处理
    }

    return new Response('Not Found', { status: 404 });
  }
};