import { FastifyPluginAsync } from 'fastify';
import { readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'

declare module statics {
  export interface StaticsOptions {
    root: string
  }
}
const statics: FastifyPluginAsync<NonNullable<statics.StaticsOptions>> = async (server, options): Promise<void> => {

  const files = await readdir(options.root)
  for (const file of files) {
    const maxAge = extname(file) == '.png'
      ? 86400000 // 1 Day in ms
      : 3600000; // 1 Hour in ms
    server.get(`/${file}`, async (request, reply) => {
      return reply.sendFile(file, {
        maxAge: maxAge
      })
    })
  }
}

export { statics }
