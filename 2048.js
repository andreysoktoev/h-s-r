import fastifyJwt from '@fastify/jwt'
import fastifyRedis from '@fastify/redis'
import { randomUUID } from 'crypto'
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
const INTERVAL = 5 * 60 * 1000

i18n.configure({
  locales: ['ru', 'en'],
  directory: path.join(__dirname, 'locales')
})

const emptyField = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0]
]
const map = {
  UP: { x: 0, y: 1 },
  RIGHT: { x: 1, y: 0 },
  DOWN: { x: 1, y: 1 },
  LEFT: { x: 0, y: 0 }
}

const resolvers = {
  Query: {
    game2048Status: () => {
      return { result: 'OK' }
    },
    newGame: (_, __, { userId }) => {
      // console.log(status)
      // drawField(field)
      return newGame(userId)
    },
    getGame: async (_, { sessionId }, { userId }) => {
      const { redis } = fastify
      if (redis.exists(sessionId)) {
        const { userId: sessionUserId, field, scores, status, win, money_rub } = await redis.hgetall(sessionId)
        if (+userId !== +sessionUserId) {
          throw new Error(i18n.__('unequalId'))
        }
        return {
          sessionId,
          field: groupArray(flatArr(field)),
          scores: +scores,
          status,
          win: win === 'true' ? true : false,
          money_rub: +money_rub
        }
      } else {
        return newGame(userId)
      }
    }
  },
  Mutation: {
    move: async (_, { sessionId, direction }, { userId }) => {
      const { redis } = fastify
      let { userId: sessionUserId, field, scores, status, win, money_rub } = await redis.hgetall(sessionId)
      if (+userId !== +sessionUserId) {
        throw new Error(i18n.__('unequalId'))
      }
      if (status === 'Game over') {
        throw new Error(i18n.__('gameOver'))
      }
      scores = Number(scores)
      field = groupArray(flatArr(field))
      const { x, y } = map[direction]
      const zeroFree = y === 1
        ? removeZeroes(transpose(field))
        : removeZeroes(field)
      let summed = []
      for (let chunk of zeroFree) {
        let newchunk = []
        chunk = x === 1
          ? chunk.reverse()
          : chunk
        if (chunk.length > 1) {
          for (let i = 0; i < chunk.length; i++) {
            const curr = chunk[i]
            const next = i === chunk.length - 1 ? null : chunk[i + 1]
            if (curr === next) {
              newchunk.push(curr + next)
              scores += curr + next
              i++
            } else {
              newchunk.push(curr)
            }
          }
          summed.push(newchunk)
        } else {
          summed.push(chunk)
        }
      }
      let zeroAdded = []
      for (let i of summed) {
        if (i.length < 4) {
          for (let j = i.length; j < 4; j++) {
            i.push(0)
          }
        }
        zeroAdded.push(x === 1 ? i.reverse() : i)
      }
      field = y === 1 ? transpose(zeroAdded) : zeroAdded
      console.log(direction)
      field = field.flat().indexOf(0) < 0 ? field : addNumber(field)
      const maxCell = Math.max(...field.flat())
      if (maxCell >= 2048) {
          win = true
          money_rub = scores
      } else {
          win = false
          money_rub = Math.floor(scores / 4)
      }
      if (checkUniqueNeighbours(field) && field.flat().indexOf(0) < 0) {
        status = 'Game over'
        await sql`
          update profiles
          set money_rub = money_rub + ${money_rub}
          where user_id = ${userId}
        `
      } else {
        status = 'Game'
      }
      drawField(field)
      console.log(scores)
      redis.hset(sessionId, { field, scores, status, win, money_rub })
      return { sessionId, field, scores, status, win, money_rub }
    },
    playGame: async (_, __, { userId }) => {
      const [{ moves }] = await sql`
        select * from profiles where user_id = ${userId}
      `
      if (!moves) {
        throw new Error(i18n.__('noMoves'))
      }
      await sql`
        update profiles
        set moves = case
          when moves - 1 < 0 then 0
          else moves - 1
        end
        where user_id = ${userId}
      `
      return true
    },
    quitGame: async (_, { sessionId }, { userId }) => {
      const { redis } = fastify
      const { status, win, money_rub } = await redis.hgetall(sessionId)
      if (!status) {
        throw new Error(i18n.__('invalidId'))
      }
      await redis.del(sessionId)
      if (status !== 'Game over') {
        await sql`
          update profiles
          set money_rub = money_rub + ${money_rub}
          where user_id = ${userId}
        `
      }
      return {
        win: win === 'true' ? true : false,
        money_rub: +money_rub
      }
    }
  }
}

fastify.register(fastifyJwt, {
  secret: process.env.SECRET
})
fastify.register(mercurius, {
  schema,
  resolvers,
  context: async (req, res) => {
    const lang = req.headers['accept-language'] || 'ru'
    i18n.setLocale(lang)
    try {
      await req.jwtVerify()
      const token = req.headers.authorization.split(' ')[1]
      const { userId } = fastify.jwt.decode(token)
      return { lang, userId }
    } catch (err) {
      throw new Error(i18n.__('unauthorized'))
    }
  }
})
fastify.register(fastifyRedis, { host: '127.0.0.1' })

const flatArr = field => field.split(',').map(i => Number(i))
const value = () => Math.random() > 0.9 ? 4 : 2

function addNumber(arr) {
  let flatArr = arr.flat()
  const zeroes = []
  flatArr.map((el, i) => {
    if (el === 0) {
      zeroes.push(i)
    }
  })
  const index = zeroes[Math.floor(Math.random() * zeroes.length)]
  flatArr.splice(index, 1, value())
  return groupArray(flatArr)
}

function checkUniqueNeighbours(field) {
  const uniqueNeighbours = []

  field.map(chunk => {
    chunk.reduce(
      (a, b) => {
        uniqueNeighbours.push(a !== b)
        return b
      }
    )
  })

  transpose(field).map(chunk => {
    chunk.reduce(
      (a, b) => {
        uniqueNeighbours.push(a !== b)
        return b
      }
    )
  })

  return uniqueNeighbours.every(el => el)
}

function drawField(data) {
  for (const i of data) {
    console.log(i)
  }
}

function groupArray(flatArr) {
  const groupedArr = []
  for (let i = 0; i < flatArr.length; i += 4) {
    groupedArr.push(flatArr.slice(i, i + 4))
  }
  return groupedArr
}

function newGame(userId) {
  const { redis } = fastify
  const sessionId = randomUUID()
  const field = addNumber(emptyField)
  const scores = 0
  const status = 'New game'
  const win = false
  const money_rub = 0
  redis.hset(sessionId, { userId, field, scores, status, win, money_rub })
  return { sessionId, field, scores, status, win, money_rub }
}

function removeZeroes(arr) {
  return arr.map(i => i.filter(j => j > 0))
}

function transpose(arr) {
  return arr[0].map((_, i) => arr.map(el => el[i]))
}

fastify.listen(process.env.GAME_2048, '0.0.0.0')