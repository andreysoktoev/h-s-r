import fastifyJwt from '@fastify/jwt'
import fastifyPostgres from '@fastify/postgres'
import fastifyStatic from '@fastify/static'
import Avatar from 'avatar-builder'
import axios from 'axios'
import 'dotenv/config'
import Fastify from 'fastify'
import fastifySchedulePlugin from 'fastify-schedule'
import glob from 'glob'
import i18n from 'i18n'
import mercurius from 'mercurius'
import path, { dirname } from 'path'
import pg from 'pg'
import { SimpleIntervalJob, Task } from 'toad-scheduler'
import { fileURLToPath } from 'url'
import { sql } from './db/client.js'
import { schema } from './schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const avatar = Avatar.default.male8bitBuilder(512)
const BTCRUB = 'https://api.coingate.com/v2/rates/merchant/btc/rub'
const db = new pg.Client({
  connectionString: process.env.DB_URL
})
const fastify = Fastify()
const JOB_INTERVAL = { days: 1 }

i18n.configure({
  locales: ['ru', 'en'],
  directory: path.join(__dirname, 'locales')
})

const resolvers = {
  Query: {
    listenPG: async (_, __, { pubsub, reply: { request: { user: { userId } } } }) => {
      await sql.listen(`cars_${userId}`, async () => {
        const cars = await sql`select * from cars_view where user_id = ${userId}`
        await pubsub.publish({
          topic: `cars_${userId}`,
          payload: { cars }
        })
      })
      await sql.listen(`girls_${userId}`, async () => {
        const girlTypes = await sql`select type from girls group by type order by type`
        const girls = await sql`
          select * from girls_view where user_id = ${userId}
        `
        let girlItems = []
        for (const t of girlTypes) {
          girlItems.push({ type: t.type, items: [] })
        }
        for (const i of girls) {
          girlItems[girlItems.findIndex(t => t.type === i.type)].items.push(i)
        }
        await pubsub.publish({
          topic: `girls_${userId}`,
          payload: { girls: girlItems }
        })
      })
      await sql.listen(`hardware_${userId}`, async () => {
        const hardware = await sql`select * from hardware_view where user_id = ${userId}`
        await pubsub.publish({
          topic: `hardware_${userId}`,
          payload: { hardware }
        })
      })
      await sql.listen(`health_${userId}`, async () => {
        const health = await sql`select * from health_view where user_id = ${userId}`
        await pubsub.publish({
          topic: `health_${userId}`,
          payload: { health }
        })
      })
      await sql.listen(`housing_${userId}`, async () => {
        const housing = await sql`select * from housing_view where user_id = ${userId}`
        await pubsub.publish({
          topic: `housing_${userId}`,
          payload: { housing }
        })
      })
      await sql.listen(`job_${userId}`, async () => {
        const job = await sql`select * from job_view where user_id = ${userId}`
        await pubsub.publish({
          topic: `job_${userId}`,
          payload: { job }
        })
      })
      await sql.listen(`longterm_job_${userId}`, async () => {
        const longtermJob = await sql`select * from longterm_job_view where user_id = ${userId}`
        await pubsub.publish({
          topic: `longterm_job_${userId}`,
          payload: { longtermJob }
        })
      })
      await sql.listen(`news`, async () => {
        const news = await sql`select * from news_view where user_id = ${userId}`
        await pubsub.publish({
          topic: `news_${userId}`,
          payload: { news }
        })
      })
      await sql.listen(`news_${userId}`, async () => {
        const news = await sql`select * from news_view where user_id = ${userId}`
        await pubsub.publish({
          topic: `news_${userId}`,
          payload: { news }
        })
      })
      await sql.listen(`profile_${userId}`, async () => {
        const [profile] = await sql`select * from profiles where user_id = ${userId}`
        await pubsub.publish({
          topic: `profile_${userId}`,
          payload: { profile }
        })
      })
      await sql.listen(`software_${userId}`, async () => {
        const software = await sql`select * from software_view where user_id = ${userId}`
        await pubsub.publish({
          topic: `software_${userId}`,
          payload: { software }
        })
      })
      return true
    },
    hackerStatus: () => {
      return { result: 'OK' }
    },
    getUser: async (_, __, { userId }) => {
      const { rows: [user] } = await fastify.pg.query(
        'SELECT id, username FROM users WHERE id = $1',
        [userId]
      )
      return user
    },
    getProfile: async (_, __, { userId }) => {
      const { rows: [profile] } = await fastify.pg.query(
        `select * from profiles WHERE user_id = $1`,
        [userId]
      )
      return profile
    },
    getHealth: async (_, { productType }, { userId }) => await sql`
      select * from health_view
      where type = ${productType} and user_id = ${userId}
    `,
    getHardware: async (_, __, { userId }) => await sql `
      select * from hardware_view where user_id = ${userId}
    `,
    getSoftware: async (_, __, { userId }) => await sql`
      select * from software_view where user_id = ${userId}
    `,
    getJobs: async (_, __, { userId }) => await sql`
      select * from job_view where user_id = ${userId}
    `,
    getLongtermJobs: async (_, __, { userId }) => await sql`
      select * from longterm_job_view where user_id = ${userId}
    `,
    getQuote: async (_, { symbol }) => {
      let price
      switch (symbol) {
        case 'BTCRUB':
          price = await axios
            .get(BTCRUB)
            .then(res => Math.round(res.data))
          break
        case 'RUBBTC':
          price = await axios
            .get(BTCRUB)
            .then(res => (1 / res.data).toFixed(4))
          break
      }
      return { price }
    },
    getGifts: async (_, __, { userId }) => {
      const { rows: [{ applied }] } = await fastify.pg.query(
        `SELECT (gift_availability > now() AT TIME ZONE 'utc') applied
        FROM profiles
        WHERE user_id = $1`,
        [userId]
      )
      const { rows: gifts } = await fastify.pg.query(`TABLE gifts`)
      return { applied, gifts }
    },
    getStats: async () => {
      const { rows: level } = await fastify.pg.query(
        `SELECT username, level FROM profiles ORDER BY level DESC, username LIMIT 5`
      )
      const { rows: alco } = await fastify.pg.query(
        `SELECT username, alco_liters_use FROM profiles ORDER BY alco_liters_use DESC, username LIMIT 5`
      )
      return { level, alco }
    },
    getNews: async (_, __, { userId }) => await sql`
      select * from news_view where user_id = ${userId}
    `,
    getMessages: async () => {
      const { rows: messages } = await fastify.pg.query(
        `SELECT * FROM messages ORDER BY sent_at DESC, id DESC LIMIT 50`
      )
      return messages
    },
    getUsers: async (_, __, { userId }) => {
      const { rows: users } = await fastify.pg.query(
        `SELECT
          *,
          (
            user_id = ANY (
              (
                SELECT friends || friendship_requests
                FROM profiles
                WHERE user_id = $1
              )::int[]
            ) OR ${userId} = ANY (friendship_requests)
          ) is_friend_or_requested_friendship
        FROM profiles
        WHERE user_id <> $1
        ORDER BY username`,
        [userId]
      )
      return users
    },
    getFriends: async (_, __, { userId }) => {
      const { rows: [{ friends }] } = await fastify.pg.query(
        `SELECT friends FROM profiles WHERE user_id = $1`,
        [userId]
      )
      const { rows: users } = await fastify.pg.query(
        `SELECT * FROM profiles WHERE user_id = ANY ($1)`,
        [friends]
      )
      return users
    },
    getFriendshipRequests: async (_, __, { userId }) => {
      const { rows: [{ friendship_requests }] } = await fastify.pg.query(
        `SELECT friendship_requests FROM profiles WHERE user_id = $1`,
        [userId]
      )
      const { rows: users } = await fastify.pg.query(
        `SELECT * FROM profiles WHERE user_id = ANY ($1)`,
        [friendship_requests]
      )
      return users
    },
    searchUsers: async (_, { query }, { userId }) => {
      const { rows: users } = await fastify.pg.query(
        `SELECT
          *,
          (
            user_id = ANY (
              (
                SELECT friends || friendship_requests
                FROM profiles
                WHERE user_id = $1
              )::int[]
            ) OR ${userId} = ANY (friendship_requests)
          ) is_friend_or_requested_friendship
        FROM profiles
        WHERE user_id <> $1 AND username ~* $2
        ORDER BY username`,
        [userId, query]
      )
      return users
    },
    getDM: async (_, { userIdWith }, { userId }) => {
      if (userIdWith) {
        const { rows: [user] } = await fastify.pg.query(
          `SELECT id FROM users WHERE id = $1`,
          [userIdWith]
        )
        if (!user) {
          throw new Error(i18n.__('userNotFound'))
        }
        const { rows: dm } = await fastify.pg.query(
          `SELECT
            (
              CASE
                WHEN user_id_from = $1 THEN user_id_to
                ELSE user_id_from
              END
            ) user_id,
            (
              CASE
                WHEN user_id_from = $1 THEN username_to
                ELSE username_from
              END
            ) username,
            sent_at,
            user_id_from,
            username_from,
            message
          FROM direct_messages
          WHERE user_id_to = ANY(ARRAY[$1, $2]) AND user_id_from = ANY(ARRAY[$1, $2])
          ORDER BY sent_at DESC`,
          [userId, userIdWith]
        )
        return dm
      } else {
        if (userIdWith === 0) {
          throw new Error(i18n.__('userNotFound'))
        }
        const { rows: dm } = await fastify.pg.query(
          `WITH dm AS (
            SELECT
              *,
              ROW_NUMBER() OVER (
                PARTITION BY d.username
                ORDER BY d.sent_at DESC
              ) rank
            FROM (
              SELECT
                *,
                (
                  CASE
                    WHEN user_id_from = $1 THEN user_id_to
                    ELSE user_id_from
                  END
                ) user_id,
                (
                  CASE
                    WHEN user_id_from = $1 THEN username_to
                    ELSE username_from
                  END
                ) username
              FROM direct_messages
              WHERE user_id_to = $1 OR user_id_from = $1
            ) d
          )
          SELECT
            user_id,
            username,
            sent_at,
            user_id_from,
            username_from,
            message
          FROM dm
          WHERE rank = 1
          ORDER BY sent_at DESC`,
          [userId]
        )
        return dm
      }
    },
    getClans: async (_, __, { userId }) => {
      const { rows } = await fastify.pg.query(
        `SELECT
          *,
          (
            case
              when id = (
                select clan_id from profiles where user_id = $1
              ) then true
              when ${userId} = any (membership_requests) then true
              else false
            end
          ) is_member_or_in_requests,
          (
            SELECT count(clan_id) FROM profiles WHERE clan_id = c.id
          ) members_qty
        FROM clans c
        order by id`,
        [userId]
      )
      return rows
    },
    getMyClan: async (_, __, { userId }) => {
      const { rows: [{ clan_id }] } = await fastify.pg.query(
        `SELECT clan_id FROM profiles WHERE user_id = $1`,
        [userId]
      )
      if (!clan_id) {
        throw new Error(i18n.__('notClanMember'))
      }
      const { rows: [clan] } = await fastify.pg.query(
        `SELECT
          *,
          (
            SELECT count(clan_id) FROM profiles WHERE clan_id = $1
          ) members_qty
        FROM clans
        WHERE id = $1`,
        [clan_id]
      )
      return clan
    },
    searchClans: async (_, { query }, { userId }) => {
      const { rows: users } = await fastify.pg.query(
        `SELECT
          *,
          (
            id = (
              SELECT clan_id
              FROM profiles
              WHERE user_id = $1
            ) OR ${userId} = ANY (membership_requests)
          ) is_member_or_requested_membership,
          (
            SELECT count(clan_id) FROM profiles WHERE clan_id = $1
          ) members_qty
        FROM clans
        WHERE title ~* $2`,
        [userId, query]
      )
      return users
    },
    getClanMembers: async (_, __, { userId }) => {
      const { rows: [{ clan_id }] } = await fastify.pg.query(
        `SELECT clan_id FROM profiles WHERE user_id = $1`,
        [userId]
      )
      if (!clan_id) {
        throw new Error(i18n.__('notInAnyGroup'))
      }
      const { rows } = await fastify.pg.query(
        `SELECT *
        FROM profiles
        WHERE clan_id = $1 and user_id <> $2`,
        [clan_id, userId]
      )
      return rows
    },
    getClanMembershipRequests: async (_, __, { userId }) => {
      const { rows: leaders } = await fastify.pg.query(`SELECT leader_id FROM clans`)
      if (leaders.map(i => i.leader_id).indexOf(+userId) < 0) {
        throw new Error(i18n.__('insufficientRights'))
      }
      const { rows: [{ id: clanId }] } = await fastify.pg.query(
        `SELECT id FROM clans WHERE leader_id = $1`,
        [userId]
      )
      const { rows: [{ membership_requests }] } = await fastify.pg.query(
        `SELECT membership_requests FROM clans WHERE id = $1`,
        [clanId]
      )
      const { rows } = await fastify.pg.query(
        `SELECT * FROM profiles WHERE user_id = ANY ($1)`,
        [membership_requests]
      )
      return rows
    },
    getClanMessages: async (_, __, { userId }) => {
      const { rows } = await fastify.pg.query(
        `SELECT *
        FROM clan_chat
        WHERE clan_id = (
          SELECT clan_id FROM profiles WHERE user_id = $1
        )
        ORDER BY sent_at DESC, id DESC
        LIMIT 100`,
        [userId]
      )
      return rows
    },
    getCars: async (_, __, { userId }) => await sql`
      select * from cars_view where user_id = ${userId}
    `,
    getHousing: async (_, __, { userId }) => await sql`
      select * from housing_view where user_id = ${userId}
    `,
    getGirlItems: async (_, __, { userId }) => {
      const { rows: girlTypes } = await fastify.pg.query(
        `SELECT type FROM girls GROUP BY type ORDER BY type`
      )
      const girls = await sql`
        select * from girls_view where user_id = ${userId}
      `
      let girlItems = []
      for (const t of girlTypes) {
        girlItems.push({ type: t.type, items: [] })
      }
      for (const i of girls) {
        girlItems[girlItems.findIndex(t => t.type === i.type)].items.push(i)
      }
      return girlItems
    },
    getChatLastMessage: async () => {
      const { rows: [lastMessage] } = await fastify.pg.query(
        `SELECT * FROM messages ORDER BY sent_at DESC, id DESC LIMIT 1`
      )
      return lastMessage
    }
  },
  Mutation: {
    updateHealth: async (_, { id }, { userId }) => {
      const { rows: [{ price_rub, user_level, health, alcohol, mood }] } = await fastify.pg.query(
        `SELECT * FROM health WHERE id = $1`,
        [id]
      )
      const { rows: [{level, money_rub, moves}] } = await fastify.pg.query(
        `SELECT * FROM profiles WHERE user_id = $1`,
        [userId]
      )
      if (user_level > level) {
        throw new Error(i18n.__('insufficientLevel'))
      }
      if (money_rub - price_rub < 0) {
        throw new Error(i18n.__('insufficientFunds'))
      }
      if (moves === 0) {
        throw new Error(i18n.__('noMoves'))
      }
      const { rows: [{max: nextLevel}] } = await fastify.pg.query(
        `SELECT max(level)
          FROM experience
          WHERE experience_points <= (
            SELECT experience_points FROM profiles WHERE user_id = $1
          ) + 1`,
        [userId]
      )
      await fastify.pg.query(
        `UPDATE profiles
          SET
            moves = case
              when moves - 1 < 0 then 0
              else moves - 1
            end,
            experience_points = CASE
              WHEN ${nextLevel} > level THEN 0
              ELSE experience_points + 1
            END,
            level = CASE
              WHEN ${nextLevel} > level
                THEN ${nextLevel}
              ELSE level
            END,
            money_rub = money_rub - $2,
            health_points = CASE
              WHEN health_points + $3 > 100 THEN 100
              WHEN health_points + $3 < 0 THEN 0
              ELSE health_points + $3
            END,
            alco_balance = CASE
              WHEN alco_balance + $4 > 100 THEN 100
              WHEN alco_balance + $4 < 0 THEN 0
              ELSE alco_balance + $4
            END,
            alco_liters_use = CASE
              WHEN ${alcohol} > 0 THEN alco_liters_use + $4
              ELSE alco_liters_use
            END,
            mood = CASE
              WHEN mood + $5 > 100 THEN 100
              WHEN mood + $5 < 0 THEN 0
              ELSE mood + $5
            END
          WHERE user_id = $1`,
        [userId, price_rub, health, alcohol, mood]
      )
      return true
    },
    updateHardware: async (_, { typeHardware }, { userId }) => {
      const { rows: [{ level, money_rub, moves, hardware_level: userHardwareLevel }] } = await fastify.pg.query(
        `SELECT * FROM profiles WHERE user_id = $1`,
        [userId]
      )
      const { rows: [{ level: hardwareLevel, user_level, price_rub }] } = await fastify.pg.query(
        `SELECT level, user_level, price_rub
          FROM hardware
          WHERE type = $2 AND level = (
            SELECT ${typeHardware} FROM profiles WHERE user_id = $1
          ) + 1`,
        [userId, typeHardware]
      )
      if (user_level > level) {
        throw new Error(i18n.__('insufficientLevel'))
      }
      if (money_rub < price_rub) {
        throw new Error(i18n.__('insufficientFunds'))
      }
      if (hardwareLevel - userHardwareLevel > 1) {
        throw new Error(i18n.__('consecutiveLevelUpOnly'))
      }
      if (moves === 0) {
        throw new Error(i18n.__('noMoves'))
      }
      const { rows: [{max: nextLevel}] } = await fastify.pg.query(
        `SELECT max(level)
          FROM experience
          WHERE experience_points <= (
            SELECT experience_points FROM profiles WHERE user_id = $1
          ) + 1`,
        [userId]
      )
      await fastify.pg.query(
        `UPDATE profiles
          SET
            level = CASE
              WHEN ${nextLevel} > level
                THEN ${nextLevel}
              ELSE level
            END,
            experience_points = CASE
              WHEN ${nextLevel} > level THEN 0
              ELSE experience_points + 1
            END,
            ${typeHardware} = $3,
            money_rub = CASE
              WHEN ${hardwareLevel} > (SELECT ${typeHardware} FROM profiles WHERE user_id = $1)
                THEN money_rub - $2
              ELSE money_rub
            END,
            moves = case
              when moves - 1 < 0 then 0
              else moves - 1
            end,
            health_points = CASE
              WHEN health_points - 1 < 0 THEN 0
              ELSE health_points - 1
            END,
            alco_balance = CASE
              WHEN alco_balance - 1 < -100 THEN -100
              ELSE alco_balance - 1
            END,
            mood = CASE
              WHEN mood - 1 < 0 THEN 0
              ELSE mood - 1
            END
          WHERE user_id = $1`,
        [userId, price_rub, hardwareLevel]
      )
      return true
    },
    updateSoftware: async (_, { id: softwareId }, { userId }) => {
      const { rows: [{ level, money_rub, moves, hardware_level: userHardwareLevel, software }] } = await fastify.pg.query(
        `SELECT
          *,
          (
            ${softwareId} = any (installed_software)
          ) software
        FROM profiles WHERE user_id = $1`,
        [userId]
      )
      const { rows: [{ price_rub, user_level, hardware_level }] } = await fastify.pg.query(
        `SELECT price_rub, user_level, hardware_level FROM software WHERE id = $1`,
        [softwareId]
      )
      if (software) {
        throw new Error(i18n.__('hasThisSoftware'))
      }
      if (level < user_level) {
        throw new Error(i18n.__('insufficientLevel'))
      }
      if (money_rub < price_rub) {
        throw new Error(i18n.__('insufficientFunds'))
      }
      if (userHardwareLevel < hardware_level) {
        throw new Error(i18n.__('insufficientHardware'))
      }
      if (moves === 0) {
        throw new Error(i18n.__('noMoves'))
      }
      const { rows: [{max: nextLevel}] } = await fastify.pg.query(
        `SELECT max(level)
          FROM experience
          WHERE experience_points <= (
            SELECT experience_points FROM profiles WHERE user_id = $1
          ) + 1`,
        [userId]
      )
      await fastify.pg.query(
        `UPDATE profiles
          SET
            level = CASE
              WHEN ${nextLevel} > level
                THEN ${nextLevel}
              ELSE level
            END,
            experience_points = CASE
              WHEN ${nextLevel} > level THEN 0
              ELSE experience_points + 1
            END,
            money_rub = money_rub - $3,
            installed_software = array_append(installed_software, $2),
            moves = case
              when moves - 1 < 0 then 0
              else moves - 1
            end,
            health_points = CASE
              WHEN health_points - 1 < 0 THEN 0
              ELSE health_points - 1
            END,
            alco_balance = CASE
              WHEN alco_balance - 1 < -100 THEN -100
              ELSE alco_balance - 1
            END,
            mood = CASE
              WHEN mood - 1 < 0 THEN 0
              ELSE mood - 1
            END
          WHERE user_id = $1`,
        [userId, softwareId, price_rub]
      )
      return true
    },
    doJob: async (_, { id: jobId }, { userId }) => {
      const { rows: [{ level, installed_software, moves }] } = await fastify.pg.query(
        `SELECT * FROM profiles WHERE user_id = $1`,
        [userId]
      )
      const { rows: [{ price_rub, price_btc, user_level, required_software, work_hack, xp }] } = await fastify.pg.query(
        `SELECT * FROM job WHERE id = $1`,
        [jobId]
      )
      if (level < user_level) {
        throw new Error(i18n.__('insufficientLevel'))
      }
      const requiredSoftwareIsInstalled = required_software
        .every(i => installed_software.indexOf(i) >= 0) || required_software.length === 0
      if (!requiredSoftwareIsInstalled) {
        throw new Error(i18n.__('insufficientSoftware'))
      }
      if (moves === 0) {
        throw new Error(i18n.__('noMoves'))
      }
      const { rows: [{max: nextLevel}] } = await fastify.pg.query(
        `SELECT max(level)
          FROM experience
          WHERE experience_points <= (
            SELECT experience_points FROM profiles WHERE user_id = $1
          ) + $2`,
        [userId, xp]
      )
      await fastify.pg.query(
        `UPDATE profiles
          SET
            level = CASE
              WHEN ${nextLevel} > level
                THEN ${nextLevel}
              ELSE level
            END,
            experience_points = CASE
              WHEN ${nextLevel} > level THEN 0
              ELSE experience_points + $5
            END,
            money_rub = CASE
              WHEN ${price_rub > 0} AND (${jobId} = 102 OR ${jobId} = 202) AND ARRAY[3, 4, 5] <@ installed_software
                THEN money_rub + 70
              WHEN ${price_rub > 0} AND (${jobId} = 102 OR ${jobId} = 202) AND ARRAY[3, 4] <@ installed_software
                THEN money_rub + 65
              WHEN ${price_rub > 0} AND (${jobId} = 102 OR ${jobId} = 202) AND ARRAY[3] <@ installed_software
                THEN money_rub + 60
              WHEN ${price_rub > 0} AND (${jobId} != 102 OR ${jobId} != 202)
                THEN money_rub + $2
              ELSE money_rub
            END,
            money_btc = CASE
              WHEN ${price_btc > 0} THEN money_btc + $3
              ELSE money_btc
            END,
            work_hack_balance = CASE
              WHEN work_hack_balance + $4 < -100 THEN -100
              WHEN work_hack_balance + $4 > 100 THEN 100
              ELSE work_hack_balance + $4
            END,
            moves = case
              when moves - 1 < 0 then 0
              else moves - 1
            end,
            health_points = CASE
              WHEN health_points - 5 < 0 THEN 0
              ELSE health_points - 5
            END,
            alco_balance = CASE
              WHEN alco_balance - 5 < -100 THEN -100
              ELSE alco_balance - 5
            END,
            mood = CASE
              WHEN mood - 5 < 0 THEN 0
              ELSE mood - 5
            END
          WHERE user_id = $1`,
        [userId, price_rub, price_btc, work_hack, xp]
      )
      return true
    },
    doLongtermJob: async (_, { id: jobId }, { userId }) => {
      const { rows: [{ level, job_end, moves }] } = await fastify.pg.query(
        `SELECT * FROM profiles WHERE user_id = $1`,
        [userId]
      )
      const { rows: [{ price_rub, price_btc, user_level, work_hack, xp, time }] } = await fastify.pg.query(
        `SELECT * FROM longterm_job WHERE id = $1`,
        [jobId]
      )
      if (job_end > new Date()) {
        throw new Error(i18n.__('incompleteWork'))
      }
      if (level < user_level) {
        throw new Error(i18n.__('insufficientLevel'))
      }
      if (moves === 0) {
        throw new Error(i18n.__('noMoves'))
      }
      const { rows: [{max: nextLevel}] } = await fastify.pg.query(
        `SELECT max(level)
          FROM experience
          WHERE experience_points <= (
            SELECT experience_points FROM profiles WHERE user_id = $1
          ) + $2`,
        [userId, xp]
      )
      await fastify.pg.query(
        `UPDATE profiles
          SET
            level = CASE
              WHEN ${nextLevel} > level
                THEN ${nextLevel}
              ELSE level
            END,
            experience_points = CASE
              WHEN ${nextLevel} > level THEN 0
              ELSE experience_points + $5
            END,
            money_rub = CASE
              WHEN ${price_rub > 0} THEN money_rub + $2
              ELSE money_rub
            END,
            money_btc = CASE
              WHEN ${price_btc > 0} THEN money_btc + $3
              ELSE money_btc
            END,
            work_hack_balance = CASE
              WHEN work_hack_balance + $4 > 100 THEN 100
              ELSE work_hack_balance + $4
            END,
            moves = case
              when moves - 1 < 0 then 0
              else moves - 1
            end,
            health_points = CASE
              WHEN health_points - 5 < 0 THEN 0
              ELSE health_points - 5
            END,
            alco_balance = CASE
              WHEN alco_balance - 5 < -100 THEN -100
              ELSE alco_balance - 5
            END,
            mood = CASE
              WHEN mood - 5 < 0 THEN 0
              ELSE mood - 5
            END,
            job_end = now() AT TIME ZONE 'utc' + interval '${time} minutes'
          WHERE user_id = $1`,
        [userId, price_rub, price_btc, work_hack, xp]
      )
      return true
    },
    exchange: async (_, { symbol, amount }, { userId }) => {
      if (amount <= 0) {
        throw new Error(i18n.__('nonPositiveNumber'))
      }
      const { rows: [{money_rub, money_btc}] } = await fastify.pg.query(
        'SELECT level, money_rub, money_btc FROM profiles WHERE user_id = $1',
        [userId]
      )
      if (symbol === 'BTCRUB') {
        if (money_btc < amount) {
          throw new Error(i18n.__('insufficientFunds'))
        }
        const { data: price } = await axios.get(BTCRUB)
        await fastify.pg.query(
          `UPDATE profiles
          SET
            money_rub = ROUND(money_rub + $1::numeric * $2::numeric),
            money_btc = ROUND(money_btc - $2::numeric, 4)
          WHERE user_id = $3`,
          [price, amount, userId]
        )
      } else if (symbol === 'RUBBTC') {
        if (!Number.isInteger(amount)) {
          throw new Error(i18n.__('integer'))
        }
        if (money_rub < amount) {
          throw new Error(i18n.__('insufficientFunds'))
        }
        const { data: price } = await axios.get(BTCRUB)
        await fastify.pg.query(
          `UPDATE profiles
          SET
            money_rub = ROUND(money_rub - $1),
            money_btc = ROUND(money_btc + $1 / $2::numeric, 4)
          WHERE user_id = $3`,
          [amount, price, userId]
        )
      }
      return true
    },
    applyGift: async (_, { id: giftId }, { userId }) => {
      const { rows: [gift] } = await fastify.pg.query(
        `SELECT * FROM gifts WHERE id = $1`,
        [giftId]
      )
      if (!gift) {
        throw new Error(i18n.__('invalidId'))
      }
      const { rows: [{ gift_applied }] } = await fastify.pg.query(
        `SELECT (gift_availability > now() AT TIME ZONE 'utc') gift_applied
        FROM profiles
        WHERE user_id = $1`,
        [userId]
      )
      if (gift_applied) {
        throw new Error(i18n.__('giftOnceADayOnly'))
      }
      const { rows: [{title, amount}] } = await fastify.pg.query(
        `SELECT title, amount FROM gifts WHERE id = $1`,
        [giftId]
      )
      if (title === 'experience_points') {
        const { rows: [{max: nextLevel}] } = await fastify.pg.query(
          `SELECT max(level)
            FROM experience
            WHERE experience_points <= (
              SELECT experience_points FROM profiles WHERE user_id = $1
            ) + $2`,
          [userId, amount]
        )
        await fastify.pg.query(
          `UPDATE profiles
          SET
            level = CASE
              WHEN ${nextLevel} > level
                THEN ${nextLevel}
              ELSE level
            END,
            experience_points = CASE
              WHEN ${nextLevel} > level THEN 0
              ELSE experience_points + $2
            END,
            gift_availability = now() AT TIME ZONE 'utc' + interval '24 hours'
          WHERE user_id = $1`,
          [userId, amount]
        )
      } else {
        await fastify.pg.query(
          `UPDATE profiles
            SET
              ${title} = ${title} + $2,
              gift_availability = now() AT TIME ZONE 'utc' + interval '24 hours'
            WHERE user_id = $1`,
          [userId, amount]
        )
      }
      return true
    },
    markNewsAsRead: async (_, { id: newsId }, { userId }) => {
      const { rows: [{ read_news }] } = await fastify.pg.query(
        `SELECT read_news FROM profiles WHERE user_id = $1`,
        [userId]
      )
      if (read_news.indexOf(+newsId) >= 0) {
        throw new Error(i18n.__('readNews'))
      }
      await fastify.pg.query(
        `UPDATE profiles
          SET read_news = array_append(read_news, $2)
          WHERE user_id = $1`,
        [userId, newsId]
      )
      return true
    },
    addMessage: async (_, { message }, { pubsub, reply }) => {
      const { userId } = reply.request.user
      const { rows: [{ username, clan_id, clan }] } = await fastify.pg.query(
        `SELECT username, clan_id, clan FROM profiles WHERE user_id = $1`,
        [userId]
      )
      const { rows: [newMessage] } = await fastify.pg.query(
        `INSERT INTO messages(sent_at, user_id, username, clan_id, clan, message)
        VALUES (now() AT TIME ZONE 'utc', $1, $2, $3, $4, $5)
        RETURNING *`,
        [userId, username, clan_id, clan, message]
      )
      const { rows: messages } = await fastify.pg.query(
        `SELECT * FROM messages ORDER BY sent_at DESC, id DESC LIMIT 50`
      )
      await pubsub.publish({
        topic: 'MESSAGE_ADDED',
        payload: {
          messageAdded: messages
        }
      })
      return newMessage
    },
    requestFriendship: async (_, { id: friendId }, { userId }) => {
      if (friendId === userId) {
        throw new Error(i18n.__('noFriendshipRequestToYourself'))
      }
      const { rows: [user] } = await fastify.pg.query(`
        select id from users where id = ${friendId}
      `)
      if (!user) {
        throw new Error(i18n.__('invalidId'))
      }
      const { rows: [{ is_friend }] } = await fastify.pg.query(`
        select (
          ${userId} = any (friends)
        ) is_friend
        from profiles
        where user_id = ${friendId}
      `)
      if (is_friend) {
        throw new Error(i18n.__('friendAlready'))
      }
      await fastify.pg.query(`
        UPDATE profiles
        SET friendship_requests = case
          when ${userId} = any (friendship_requests) then array_remove(friendship_requests, ${userId})
          else array_append(friendship_requests, ${userId})
        end
        WHERE user_id = ${friendId}
      `)
      return true
    },
    approveFriendshipRequest: async (_, { id: friendId, approve }, { userId }) => {
      const { rows: [{ friends, friendship_requests }] } = await fastify.pg.query(
        `SELECT friends, friendship_requests FROM profiles WHERE user_id = $1`,
        [userId]
      )
      if (friendship_requests.indexOf(+friendId) < 0) {
        throw new Error(i18n.__('noFriendshipRequest'))
      }
      if (friends.indexOf(+friendId) >= 0) {
        throw new Error(i18n.__('friendAlready'))
      }
      await fastify.pg.query(
        `UPDATE profiles
          SET
            friends = CASE
              WHEN ${approve} = TRUE THEN array_append(friends, $2)
              ELSE friends
            END,
            friendship_requests = array_remove(friendship_requests, $2)
          WHERE user_id = $1`,
        [userId, friendId]
      )
      await fastify.pg.query(
        `UPDATE profiles
          SET
            friends = CASE
              WHEN ${approve} = TRUE THEN array_append(friends, $2)
              ELSE friends
            END
          WHERE user_id = $1`,
        [friendId, userId]
      )
      return true
    },
    removeFromFriends: async (_, { friendId }, { userId }) => {
      const { rows: [user] } = await fastify.pg.query(
        `SELECT user_id FROM profiles WHERE user_id = $1`,
        [friendId]
      )
      if (!user) {
        throw new Error(i18n.__('invalidId'))
      }
      const { rows: [{ friend }] } = await fastify.pg.query(
        `SELECT (
          ${friendId} = ANY (friends)
        ) friend
        FROM profiles
        WHERE user_id = $1`,
        [userId]
      )
      if (!friend) {
        throw new Error(i18n.__('isNotFriend'))
      }
      await fastify.pg.query(
        `UPDATE profiles SET friends = array_remove(friends, $1) WHERE user_id = $2`,
        [friendId, userId]
      )
      await fastify.pg.query(
        `UPDATE profiles SET friends = array_remove(friends, $2) WHERE user_id = $1`,
        [friendId, userId]
      )
      return true
    },
    sendDM: async (_, { id: userIdTo, message }, { pubsub, reply }) => {
      const { rows: [user] } = await fastify.pg.query(
        `SELECT id FROM users WHERE id = $1`,
        [userIdTo]
      )
      if (!user) {
        throw new Error(i18n.__('userNotFound'))
      }
      const { userId: userIdFrom } = reply.request.user
      if (userIdFrom === userIdTo) {
        throw new Error(i18n.__('noMessageToYourself'))
      }
      const { rows: [{ username: usernameFrom }] } = await fastify.pg.query(
        `SELECT username FROM users WHERE id = $1`,
        [userIdFrom]
      )
      const { rows: [{ username: usernameTo }] } = await fastify.pg.query(
        `SELECT username FROM users WHERE id = $1`,
        [userIdTo]
      )
      await fastify.pg.query(
        `INSERT INTO direct_messages(sent_at, user_id_from, username_from, user_id_to, username_to, message)
        VALUES (now() AT TIME ZONE 'utc', $1, $2, $3, $4, $5)
        RETURNING *`,
        [userIdFrom, usernameFrom, userIdTo, usernameTo, message]
      )
      await pubsub.publish({
        topic: `dm${userIdFrom}`,
        payload: {
          dmAdded: dm(userIdFrom, userIdTo)
        }
      })
      await pubsub.publish({
        topic: `dm${userIdTo}`,
        payload: {
          dmAdded: dm(userIdTo, userIdFrom)
        }
      })
      return dm(userIdFrom, userIdTo)
    },
    createClan: async (_, { title }, { userId }) => {
      const { rows: clans } = await fastify.pg.query(`SELECT title, leader_id FROM clans`)
      if (clans.map(i => i.leader_id).indexOf(+userId) >= 0) {
        throw new Error(i18n.__('createdClanBefore'))
      }
      if (clans.map(i => i.title).indexOf(title) >= 0) {
        throw new Error(__(`clanExists`))
      }
      if (title.length < 4 || title.length > 16 || !/^[a-z][a-z\d]+/i.test(title)) {
        throw new Error(i18n.__('invalidUsername'))
      }
      const { rows: [{ username, level }] } = await fastify.pg.query(
        `SELECT username, clan_id, level FROM profiles WHERE user_id = $1`,
        [userId]
      )
      if (level < 20) {
        throw new Error(i18n.__('insufficientLevel'))
      }
      const { rows: [clan] } = await fastify.pg.query(
        `INSERT INTO clans(title, leader_id, leader)
        VALUES ($1, $2, $3)
        RETURNING *`,
        [title, userId, username]
      )
      await fastify.pg.query(
        `UPDATE profiles SET clan_id = $2, clan = $3 WHERE user_id = $1`,
        [userId, clan.id, clan.title]
      )
      return clan
    },
    requestClanMembership: async (_, { id: clanId }, { userId }) => {
      const { rows: [clan] } = await fastify.pg.query(`
        SELECT id FROM clans where id = ${clanId}
      `)
      if (!clan) {
        throw new Error(i18n.__(`clanNotExists`))
      }
      const { rows: [{ clan_id }] } = await fastify.pg.query(`
        SELECT clan_id FROM profiles WHERE user_id = ${userId}
      `)
      if (clan_id) {
        throw new Error(i18n.__('clanMemberAlready'))
      }
      await fastify.pg.query(`
        UPDATE clans
        SET membership_requests = case
          when ${userId} = any (membership_requests) then array_remove(membership_requests, ${userId})
          else array_append(membership_requests, ${userId})
        end
        WHERE id = ${clanId}
      `)
      return true
    },
    approveClanMembershipRequest: async (_, { id: userIdToApprove, approve }, { userId }) => {
      const { rows: leaders } = await fastify.pg.query(`SELECT leader_id FROM clans`)
      if (leaders.map(i => i.leader_id).indexOf(+userId) < 0) {
        throw new Error(i18n.__('insufficientRights'))
      }
      const { rows: [{ id, title, membership_requests }] } = await fastify.pg.query(
        `SELECT id, title, membership_requests
        FROM clans
        WHERE leader_id = $1`,
        [userId]
      )
      if (membership_requests.indexOf(+userIdToApprove) < 0) {
        throw new Error(i18n.__('noClanMembershipRequest'))
      }
      const { rows: users } = await fastify.pg.query(`SELECT id FROM users`)
      if (users.map(i => i.id).indexOf(+userIdToApprove) < 0) {
        throw new Error(i18n.__('userNotExists'))
      }
      await fastify.pg.query(
        `UPDATE profiles
        SET
          clan_id = CASE
            WHEN ${approve} = TRUE THEN $2
            ELSE clan_id
          END,
          clan = CASE
            WHEN ${approve} = TRUE THEN $3
            ELSE clan
          END
        WHERE user_id = $1`,
        [userIdToApprove, id, title]
      )
      await fastify.pg.query(
        `UPDATE clans SET membership_requests = array_remove(membership_requests, $1)`,
        [userIdToApprove]
      )
      const result = approve === true
        ? 'Запрос на вступление в клан одобрен'
        : 'Запрос на вступление в клан отклонен'
      return { result }
    },
    addClanMessage: async (_, { message }, { pubsub, reply }) => {
      const { userId } = reply.request.user
      const { rows: [{ clan_id, clan, username }] } = await fastify.pg.query(
        `SELECT clan_id, clan, username FROM profiles WHERE user_id = $1`,
        [userId]
      )
      if (!clan_id) {
        throw new Error(i18n.__('notInAnyGroup'))
      }
      const { rows: [newMessage] } = await fastify.pg.query(
        `INSERT INTO clan_chat(sent_at, clan_id, clan, user_id, username, message)
          VALUES (now() AT TIME ZONE 'utc', $1, $2, $3, $4, $5)
          RETURNING *`,
        [clan_id, clan, userId, username, message]
      )
      const { rows: clanChat } = await fastify.pg.query(
        `SELECT * FROM clan_chat WHERE clan_id = $1 ORDER BY sent_at DESC, id DESC LIMIT 100`,
        [clan_id]
      )
      await pubsub.publish({
        topic: 'CLAN_MESSAGE_ADDED',
        payload: {
          clanMessageAdded: clanChat
        }
      })
      return newMessage
    },
    exitFromClan: async (_, __, { userId }) => {
      const { rows: [{ clan_id }] } = await fastify.pg.query(
        `SELECT clan_id FROM profiles WHERE user_id = $1`,
        [userId]
      )
      if (!clan_id) {
        throw new Error(i18n.__('notClanMember'))
      }
      const { rows: [{ is_leader }] } = await fastify.pg.query(
        `SELECT (leader_id = $1) is_leader FROM clans WHERE id = $2`,
        [userId, clan_id]
      )
      if (is_leader) {
        throw new Error(i18n.__('insufficientRights'))
      }
      await fastify.pg.query(
        `UPDATE profiles SET clan_id = NULL, clan = NULL WHERE user_id = $1`,
        [userId]
      )
      return true
    },
    buyCar: async (_, { id: carId }, { userId }) => {
      const { rows: [car] } = await fastify.pg.query(
        `SELECT id FROM cars WHERE id = $1`,
        [carId]
      )
      if (!car) {
        throw new Error(i18n.__('invalidId'))
      }
      const { rows: [{ level: carLevel, price_rub, user_level }] } = await fastify.pg.query(
        `SELECT * FROM cars WHERE id = $1`,
        [carId]
      )
      const { rows: [{ car: userCarLevel, level, money_rub, moves }] } = await fastify.pg.query(
        `SELECT * FROM profiles WHERE user_id = $1`,
        [userId]
      )
      if (user_level > level) {
        throw new Error(i18n.__('insufficientLevel'))
      }
      if (money_rub < price_rub) {
        throw new Error(i18n.__('insufficientFunds'))
      }
      if (carLevel === userCarLevel) {
        throw new Error(i18n.__('hasThisCar'))
      }
      if (carLevel < userCarLevel) {
        throw new Error(i18n.__('hasBetterCar'))
      }
      if (moves === 0) {
        throw new Error(i18n.__('noMoves'))
      }
      const { rows: [{max: nextLevel}] } = await fastify.pg.query(
        `SELECT max(level)
          FROM experience
          WHERE experience_points <= (
            SELECT experience_points FROM profiles WHERE user_id = $1
          ) + 1`,
        [userId]
      )
      await fastify.pg.query(
        `UPDATE profiles
        SET
          level = CASE
            WHEN ${nextLevel} > level
              THEN ${nextLevel}
            ELSE level
          END,
          experience_points = CASE
            WHEN ${nextLevel} > level THEN 0
            ELSE experience_points + 1
          END,
          money_rub = CASE
            WHEN car >= $3 THEN money_rub
            ELSE money_rub - $2
          END,
          car =  CASE
            WHEN car >= $3 THEN car
            ELSE $3
          END,
          moves = case
            when moves - 1 < 0 then 0
            else moves - 1
          end,
          health_points = CASE
            WHEN health_points - 1 < 0 THEN 0
            ELSE health_points - 1
          END,
          alco_balance = CASE
            WHEN alco_balance - 1 < -100 THEN -100
            ELSE alco_balance - 1
          END,
          mood = CASE
            WHEN mood - 1 < 0 THEN 0
            ELSE mood - 1
          END
        WHERE user_id = $1`,
        [userId, price_rub, carLevel]
      )
      return true
    },
    buyHouse: async (_, { id: houseId }, { userId }) => {
      const { rows: [housing] } = await fastify.pg.query(
        `SELECT id FROM housing WHERE id = $1`,
        [houseId]
      )
      if (!housing) {
        throw new Error(i18n.__('invalidId'))
      }
      const { rows: [{ level: housingLevel, price_rub, user_level }] } = await fastify.pg.query(
        `SELECT * FROM housing WHERE id = $1`,
        [houseId]
      )
      const { rows: [{ level, money_rub, moves, house: userHousingLevel }] } = await fastify.pg.query(
        `SELECT * FROM profiles WHERE user_id = $1`,
        [userId]
      )
      if (user_level > level) {
        throw new Error(i18n.__('insufficientLevel'))
      }
      if (money_rub < price_rub) {
        throw new Error(i18n.__('insufficientFunds'))
      }
      if (housingLevel === userHousingLevel) {
        throw new Error(i18n.__('hasThisHousing'))
      }
      if (housingLevel < userHousingLevel) {
        throw new Error(i18n.__('hasBetterHousing'))
      }
      if (moves === 0) {
        throw new Error(i18n.__('noMoves'))
      }
      const { rows: [{max: nextLevel}] } = await fastify.pg.query(
        `SELECT max(level)
          FROM experience
          WHERE experience_points <= (
            SELECT experience_points FROM profiles WHERE user_id = $1
          ) + 1`,
        [userId]
      )
      await fastify.pg.query(
        `UPDATE profiles
        SET
          level = CASE
            WHEN ${nextLevel} > level
              THEN ${nextLevel}
            ELSE level
          END,
          experience_points = CASE
            WHEN ${nextLevel} > level THEN 0
            ELSE experience_points + 1
          END,
          money_rub = CASE
            WHEN house >= $3 THEN money_rub
            ELSE money_rub - $2
          END,
          house =  CASE
            WHEN house >= $3 THEN house
            ELSE $3
          END,
          moves = case
            when moves - 1 < 0 then 0
            else moves - 1
          end,
          health_points = CASE
            WHEN health_points - 1 < 0 THEN 0
            ELSE health_points - 1
          END,
          alco_balance = CASE
            WHEN alco_balance - 1 < -100 THEN -100
            ELSE alco_balance - 1
          END,
          mood = CASE
            WHEN mood - 1 < 0 THEN 0
            ELSE mood - 1
          END
        WHERE user_id = $1`,
        [userId, price_rub, housingLevel]
      )
      return true
    },
    cheatProfile: async (_, { fields }, { userId }) => {
      const [cheatedProfile] = await sql`
        update profiles
        set ${sql(fields)}
        where user_id = ${userId}
      `
      return true
    },
    buyGirlItem: async (_, { id: girlItemId }, { userId }) => {
      const { rows } = await fastify.pg.query(`SELECT id FROM girls`)
      if (rows.map(i => i.id).indexOf(+girlItemId) < 0) {
        throw new Error(i18n.__('invalidId'))
      }
      const { rows: [{ level: girlLevel, type, user_level, price_rub, daily_money, rating }] } = await fastify.pg.query(
        `SELECT * FROM girls WHERE id = $1`,
        [girlItemId]
      )
      const { rows: [profileBefore] } = await fastify.pg.query(
        `SELECT * FROM profiles WHERE user_id = $1`,
        [userId]
      )
      const { level, money_rub, moves, girl_level } = profileBefore
      if (user_level > level) {
        throw new Error(i18n.__('insufficientLevel'))
      }
      if (money_rub < price_rub) {
        throw new Error(i18n.__('insufficientFunds'))
      }
      if (girlLevel <= profileBefore[type]) {
        throw new Error(i18n.__('levelUpOnly'))
      }
      if (girlLevel - girl_level > 1) {
        throw new Error(i18n.__('consecutiveLevelUpOnly'))
      }
      if (moves === 0) {
        throw new Error(i18n.__('noMoves'))
      }
      const { rows: [{max: nextLevel}] } = await fastify.pg.query(
        `SELECT max(level)
          FROM experience
          WHERE experience_points <= (
            SELECT experience_points FROM profiles WHERE user_id = $1
          ) + 1`,
        [userId]
      )
      await fastify.pg.query(
        `UPDATE profiles
          SET
            level = CASE
              WHEN ${nextLevel} > level
                THEN ${nextLevel}
              ELSE level
            END,
            experience_points = CASE
              WHEN ${nextLevel} > level THEN 0
              ELSE experience_points + 1
            END,
            money_rub = money_rub - $2,
            ${type} =  $3,
            rating = rating + $4,
            moves = case
              when moves - 1 < 0 then 0
              else moves - 1
            end,
            health_points = CASE
              WHEN health_points - 1 < 0 THEN 0
              ELSE health_points - 1
            END,
            alco_balance = CASE
              WHEN alco_balance - 1 < -100 THEN -100
              ELSE alco_balance - 1
            END,
            mood = CASE
              WHEN mood - 1 < 0 THEN 0
              ELSE mood - 1
            END
          WHERE user_id = $1`,
        [userId, price_rub, girlLevel, rating]
      )
      const { rows: [job] } = await fastify.pg.query(
        `SELECT * FROM daily_payments WHERE user_id = $1 AND type = $2`,
        [userId, type]
      )
      if (job) {
        await fastify.pg.query(
          `UPDATE daily_payments
            SET
              rating = $2,
              daily_money = $3,
              paid_at = now() AT TIME ZONE 'utc'
            WHERE id = $1`,
          [job.id, rating, daily_money]
        )
        try {
          fastify.scheduler.startById(`${job.id}`)
        } catch (err) {
          const task = new Task(
            'Charge Daily Money',
            async () => {
              const { rows: [{ money_rub: moneyRUB }] } = await fastify.pg.query(
                `SELECT money_rub FROM profiles WHERE user_id = $1`,
                [user_id]
              )
              await fastify.pg.query(
                `UPDATE profiles
                  SET
                    money_rub = CASE
                      WHEN money_rub - $2 < 0 THEN money_rub
                      ELSE money_rub - $2
                    END,
                    rating = CASE
                      WHEN money_rub - $2 > 0 THEN rating
                      WHEN money_rub - $2 <= 0 AND rating - $3 / 5 > 0 THEN rating - $3 / 5
                      ELSE rating
                    END
                  WHERE user_id = $1`,
                [userId, daily_money, rating]
              )
              if (moneyRUB - daily_money >= 0) {
                fastify.pg.query(
                  `UPDATE daily_payments
                    SET
                      rating = $2,
                      daily_money = $3,
                      paid_at = now() AT TIME ZONE 'utc'
                    WHERE id = $1`,
                  [job.id, rating, daily_money]
                )
              }
            }
          )
          fastify.scheduler.addSimpleIntervalJob(
            new SimpleIntervalJob(
              JOB_INTERVAL,
              task,
              `${job.id}`
            )
          )
        }
      } else {
        const { rows: [{ id: newJobId }] } = await fastify.pg.query(
          `INSERT INTO daily_payments (user_id, type, rating, daily_money, paid_at)
            VALUES ($1, $2, $3, $4, now() AT TIME ZONE 'utc')
            RETURNING id`,
          [userId, type, rating, daily_money]
        )
        const task = new Task(
          'Charge Daily Money',
          async () => {
            const { rows: [{ money_rub: moneyRUB }] } = await fastify.pg.query(
              `SELECT money_rub FROM profiles WHERE user_id = $1`,
              [userId]
            )
            await fastify.pg.query(
              `UPDATE profiles
                SET
                  money_rub = CASE
                    WHEN money_rub - $2 < 0 THEN money_rub
                    ELSE money_rub - $2
                  END,
                  rating = CASE
                    WHEN money_rub - $2 > 0 THEN rating
                    WHEN money_rub - $2 <= 0 AND rating - $3 / 5 > 0 THEN rating - $3 / 5
                    ELSE rating
                  END
                WHERE user_id = $1`,
              [userId, daily_money, rating]
            )
            if (moneyRUB - daily_money >= 0) {
              fastify.pg.query(
                `UPDATE daily_payments SET paid_at = now() AT TIME ZONE 'utc' WHERE id = $1`,
                [newJobId]
              )
            }
          }
        )
        fastify.scheduler.addSimpleIntervalJob(
          new SimpleIntervalJob(
            JOB_INTERVAL,
            task,
            `${newJobId}`
          )
        )
      }
      return true
    }
  },
  Subscription: {
    cars: {
      subscribe: async (_, __, { pubsub, userId }) => await pubsub.subscribe(`cars_${userId}`)
    },
    clanMessageAdded: {
      subscribe: async (_, __, { pubsub }) => await pubsub.subscribe('CLAN_MESSAGE_ADDED')
    },
    dmAdded: {
      subscribe: async (_, __, { pubsub, userId }) => await pubsub.subscribe(`dm${userId}`)
    },
    girls: {
      subscribe: async (_, __, { pubsub, userId }) => await pubsub.subscribe(`girls_${userId}`)
    },
    hardware: {
      subscribe: async (_, __, { pubsub, userId }) => await pubsub.subscribe(`hardware_${userId}`)
    },
    health: {
      subscribe: async (_, __, { pubsub, userId }) => await pubsub.subscribe(`health_${userId}`)
    },
    housing: {
      subscribe: async (_, __, { pubsub, userId }) => await pubsub.subscribe(`housing_${userId}`)
    },
    job: {
      subscribe: async (_, __, { pubsub, userId }) => await pubsub.subscribe(`job_${userId}`)
    },
    longtermJob: {
      subscribe: async (_, __, { pubsub, userId }) => await pubsub.subscribe(`longterm_job_${userId}`)
    },
    messageAdded: {
      subscribe: async (_, __, { pubsub }) => await pubsub.subscribe('MESSAGE_ADDED')
    },
    news: {
      subscribe: async (_, __, { pubsub, userId }) => await pubsub.subscribe(`news_${userId}`)
    },
    profile: {
      subscribe: async (_, __, { pubsub, userId }) => await pubsub.subscribe(`profile_${userId}`)
    },
    software: {
      subscribe: async (_, __, { pubsub, userId }) => await pubsub.subscribe(`software_${userId}`)
    }
  }
}

fastify.register(fastifyJwt, { secret: process.env.SECRET })
fastify.register(fastifyPostgres, { connectionString: process.env.DB_URL })
fastify.register(mercurius, {
  schema,
  resolvers,
  subscription: {
    context: (_, { headers: { authorization } }) => {
      const token = authorization.split(' ')[1]
      const { userId } = fastify.jwt.decode(token)
      return { userId }
    },
    verifyClient: ({ req: { headers: { authorization } } }, next) => {
      try {
        const token = authorization.split(' ')[1]
        fastify.jwt.verify(token)
        next(true)
      } catch (err) {
        next(false)
      }
    }
  },
  graphiql: true,
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
fastify.register(fastifySchedulePlugin)
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'img'),
  prefix: '/img/',
  wildcard: false
})

fastify.addHook('onReady', async () => {
  db.connect()
  const { rows: dailyPayments } = await fastify.pg.query(
    `SELECT * FROM daily_payments`
  )
  if (dailyPayments) {
    for (const job of dailyPayments) {
      const { id, user_id, rating, daily_money, paid_at } = job
      const task = new Task(
        'Charge Daily Money',
        async () => {
          const { rows: [{ money_rub }] } = await fastify.pg.query(
            `SELECT money_rub FROM profiles WHERE user_id = $1`,
            [user_id]
          )
          await fastify.pg.query(
            `UPDATE profiles
              SET
                money_rub = CASE
                  WHEN money_rub - $2 < 0 THEN money_rub
                  ELSE money_rub - $2
                END,
                rating = CASE
                  WHEN money_rub - $2 > 0 THEN rating
                  WHEN money_rub - $2 <= 0 AND rating - $3 / 5 > 0 THEN rating - $3 / 5
                  ELSE rating
                END
              WHERE user_id = $1`,
            [user_id, daily_money, rating]
          )
          if (money_rub - daily_money >= 0) {
            fastify.pg.query(
              `UPDATE daily_payments SET paid_at = now() AT TIME ZONE 'utc' WHERE id = $1`,
              [id]
            )
          }
        }
      )
      const startJob = () => fastify.scheduler.addSimpleIntervalJob(
        new SimpleIntervalJob(
          { days: JOB_INTERVAL.days, runImmediately: true },
          task,
          `${id}`
        )
      )
      const diff = paid_at.getTime() + JOB_INTERVAL.days * 24 * 60 * 60 * 1000 - Date.UTC()
      const delay = diff > 0 ? diff : 1
      setTimeout(startJob, delay)
    }
  }
  setInterval(
    () => {
      fastify.pg.query(`
        update profiles
        set moves = moves + 1
        where moves < 500
      `)
    },
    14400
  )
})

async function dm(from, to) {
  const { rows: dm } = await fastify.pg.query(
    `SELECT
      (
        CASE
          WHEN user_id_from = $1 THEN user_id_to
          ELSE user_id_from
        END
      ) user_id,
      (
        CASE
          WHEN user_id_from = $1 THEN username_to
          ELSE username_from
        END
      ) username,
      sent_at,
      user_id_from,
      username_from,
      message
    FROM direct_messages
    WHERE user_id_to = ANY(ARRAY[$1, $2]) AND user_id_from = ANY(ARRAY[$1, $2])
    ORDER BY sent_at DESC`,
    [from, to]
  )
  return dm
}

fastify.get('/:type/:filename', (req, reply) => {
  const { type, filename } = req.params
  glob(`img/${type}(*.png|*.jpg|*.jpeg|*.svg)`, (err, files) => {
    const regex = new RegExp(filename)
    const img = files.find(el => regex.test(el))
    reply
      .header('Cache-Control', 'max-age=604800')
      .sendFile(`./${img}`)
  })
})

fastify.get('/createavatar/:nickname', (req, res) => {
  avatar.create(req.params.nickname).then(buffer => {
    res.type('image/png').send(buffer)
  })
})

fastify.listen(process.env.HACKER, '0.0.0.0')