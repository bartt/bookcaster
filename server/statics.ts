import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const statics: FastifyPluginAsync = async (server: FastifyInstance): Promise<void> => {
  server.get('/screen.css', async (request, reply) => {
    return reply.sendFile('screen.css', {
      maxAge: '3600000' // In hour in ms!
    })
  })

  server.get('/launcher.js', async (request, reply) => {
    return reply.sendFile('launcher.js', {
      maxAge: '3600000' // 1 hour in ms!
    })
  })

  for (const size of [20, 29, 40, 50, 58, 72, 76, 80, 100, 144, 152, 167]) {
    server.get(`/favicon-${size}.png`, async (request, reply) => {
      return reply.sendFile(request.routerPath, {
        maxAge: '86400000' // 1 day in ms!
      })
    })
  }
}

export { statics }
