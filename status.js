import fastifyJwt from '@fastify/jwt'
import 'dotenv/config'
import Fastify from 'fastify'
import { request } from 'undici'

const fastify = Fastify()
const { AUTH, GAME_2048, HACKER, NETWALK, DEFAULT, SECRET } = process.env
const services = [
  {
    auth: AUTH
  },
  {
    game2048: GAME_2048
  },
  {
    hacker: HACKER
  },
  {
    netwalk: NETWALK
  }
]

fastify.register(fastifyJwt, {
  secret: SECRET,
  sign: {
    expiresIn: 10
  }
})

fastify.get('/status', async (req, res) => {
  let result = []
  for (const service of services) {
    for (const [name, port] of Object.entries(service)) {
      try {
        const query = JSON.stringify({ query: `{ ${name}Status { result } }` })
        const { body } = await request({
          origin: `http://0.0.0.0:${Number(port)}`,
          path: '/graphql',
          method: 'POST',
          body: query,
          headers: {
            'Authorization': `Bearer ${fastify.jwt.sign({ userId: null })}`,
            'Content-Type': 'application/json',
            'Content-Length': query.length
          }
        })
        body.on('data', chunk => {
          const status = JSON.parse(chunk).data
            ? JSON.parse(chunk).data[`${name}Status`].result
              ? true
              : false
            : false
          result.push({ [name]: status })
        })
      } catch (err) {
        result.push({ [name]: false })
      }
    }
  }
  res.send({ result })
})

fastify.listen(DEFAULT, '0.0.0.0')