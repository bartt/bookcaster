import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const robots: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get('/robots.txt', async (request, reply) => {
    return 'User-agent: *\nDisallow: /\n';
  });
};

export { robots };
