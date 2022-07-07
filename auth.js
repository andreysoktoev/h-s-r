import fastifyJwt from '@fastify/jwt'
import 'dotenv/config'
import Fastify from 'fastify'
import i18n from 'i18n'
import mercurius from 'mercurius'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { sql } from './db/client.js'
import { schema } from './schema.js'

const fastify = Fastify()
const __dirname = dirname(fileURLToPath(import.meta.url))
const { AUTH, SECRET } = process.env

i18n.configure({
  locales: ['ru', 'en'],
  directory: path.join(__dirname, 'locales')
})

const resolvers = {
  Query: {
    authStatus: () => {
      return { result: 'OK' }
    },
    signIn: async (_, { username, password }) => {
      const [user] = await sql`
        select
          id,
          username,
          (pswhash = crypt(${password}, pswhash)) pswmatch
        from users
        where username = ${username}
      `
      if (!user) {
        throw new Error(i18n.__('userNotFound'))
      }
      if (!user.pswmatch) {
        throw new Error(i18n.__('invalidPassword'))
      }
      const token = fastify.jwt.sign({ userId: user.id })
      return { token }
    }
  },
  Mutation: {    
    signUp: async (_, { username, password }) => {
      if (username.length < 4 || username.length > 16 || !/^[a-z][a-z\d]+/i.test(username)) {
        throw new Error(i18n.__('invalidUsername'))
      }
      if (password.length < 8 || password.length > 20) {
        throw new Error(i18n.__('invalidPasswordLength'))
      }
      const [user] = await sql`select username from users where username = ${username}`
      if (user) {
        throw new Error(i18n.__('userExists'))
      }
      const [{ id }] = await sql`
        insert into users (username, pswhash) values
          (${username}, crypt(${password}, gen_salt('md5')))
        returning id
      `
      await sql`insert into profiles (user_id, username) values(${id}, ${username})`
      const token = fastify.jwt.sign({ userId: id })
      return { token }
    }
  }
}

fastify.register(fastifyJwt, {
  secret: SECRET,
  sign: {
    expiresIn: '30d'
  }
})
fastify.register(mercurius, {
  schema,
  resolvers
})

fastify.addHook('onRequest', (req, res, done) => {
  const lang = req.headers['accept-language'] || 'ru'
  i18n.setLocale(lang)
  done()
})

fastify.listen(AUTH, '0.0.0.0')