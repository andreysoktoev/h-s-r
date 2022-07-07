import fastifyPostgres from '@fastify/postgres'
import 'dotenv/config'
import Fastify from 'fastify'
import { readFileSync, writeFileSync } from 'fs'
import mercurius from 'mercurius'

const fastify = Fastify()
const SUCCESS = { success: true }

const schema = `
  enum Lang {
    ru
    en
  }

  enum TextType {
    static
    dynamic
  }

  type Status {
    status: String
  }

  type Success {
    success: Boolean
  }

  type Text {
    alias: String
    text: String
    type: TextType
    ref: String
  }

  type Translation {
    alias: String
    lang: Lang
    translation: String
  }

  type TextTranslation {
    alias: String
    text: String
    lang: Lang
    translation: String
  }

  type Query {
    checkStatus: Status
    getNotActualTranslations: [TextTranslation]
    getTexts(type: TextType, ref: String): [Text]
    getTranslations(alias: String!): [Translation]
    writeStaticTranslationsToJson(lang: Lang!): Success
  }

  type Mutation {
    addDynamicText(alias: String!, text: String!): Success
    addTranslation(alias: String!, lang: Lang!, translation: String!): Success
    deleteDynamicText(alias: String!): Success
    editDynamicText(alias: String!, text: String!): Success
    editTranslation(alias: String!, translation: String!): Success
    updateStaticText(ref: String!): Success
  }
`

const resolvers = {
  Query: {
    checkStatus: () => {
      return { status: 'OK' }
    },
    getTexts: async (_, { type, ref }) => {
      if (type && ref) {
        const { rows: texts } = await fastify.pg.query(
          `SELECT * FROM texts WHERE type = $1 AND ref = $2 ORDER BY alias`,
          [type, ref]
        )
        return texts
      } else if (type && !ref) {
        const { rows: texts } = await fastify.pg.query(
          `SELECT * FROM texts WHERE type = $1 ORDER BY alias`,
          [type]
        )
        return texts
      } else if (!type && ref) {
        const { rows: texts } = await fastify.pg.query(
          `SELECT * FROM texts WHERE ref = $1 ORDER BY alias`,
          [ref]
        )
        return texts
      } else {
        const { rows: texts } = await fastify.pg.query(`TABLE texts`)
        return texts
      }
    },
    getTranslations: async (_, { alias }) => {
      await checkText(alias, 1)
      const { rows: translations } = await fastify.pg.query(
        `SELECT * FROM locales WHERE alias = $1 ORDER BY alias`,
        [alias]
      )
      return translations
    },
    getNotActualTranslations: async () => {
      const { rows: translations } = await fastify.pg.query(
        `SELECT * FROM texts LEFT JOIN locales USING (alias) WHERE texts.hash <> locales.text_hash ORDER BY alias`
      )
      return translations
    },
    writeStaticTranslationsToJson: async (_, { lang }) => {
      const { rows } = await fastify.pg.query(
        `SELECT *
        FROM (
          SELECT
            t.alias,
            l.translation
          FROM texts t
          JOIN locales l ON l.lang = $1 AND t.alias = l.alias
          WHERE t.type = 'static'
        ) _
        ORDER BY alias`,
        [lang]
      )
      if (rows.length === 0) {
        throw new Error('Переводы не найдены')
      }
      const data = Object.fromEntries(
        Object.values(rows).map(obj => [obj.alias, obj.translation])
      )
      writeFileSync(`locales/${lang}.json`, JSON.stringify(data))
      return SUCCESS
    }
  },
  Mutation: {
    addDynamicText: async (_, { alias, text }) => {
      const { rows: [textExists] } = await fastify.pg.query(
        `SELECT alias FROM texts WHERE alias = $1`,
        [alias]
      )
      if (textExists) {
        throw new Error('Текст уже есть')
      }
      await fastify.pg.query(
        `INSERT INTO texts (alias, text, type) VALUES ($1, $2, $3)`,
        [alias, text, 'dynamic']
      )
      return SUCCESS
    },
    editDynamicText: async (_, { alias, text }) => {
      await checkText(alias)
      await fastify.pg.query(
        `UPDATE texts SET text = $1 WHERE alias = $2`,
        [text, alias]
      )
      return SUCCESS
    },
    deleteDynamicText: async (_, { alias }) => {
      await checkText(alias)
      await fastify.pg.query(
        `DELETE FROM texts WHERE alias = $1`,
        [alias]
      )
      return SUCCESS
    },
    addTranslation: async (_, { alias, lang, translation }) => {
      await checkText(alias)
      const { rows: [translationExists] } = await fastify.pg.query(
        `SELECT alias FROM locales WHERE alias = $1 AND lang = $2`,
        [alias, lang]
      )
      if (translationExists) {
        throw new Error('Перевод уже есть')
      }
      const { rows: [{ hash }] } = await fastify.pg.query(
        `SELECT hash FROM texts WHERE alias = $1`,
        [alias]
      )
      await fastify.pg.query(
        `INSERT INTO locales (alias, lang, translation, text_hash) VALUES
          ($1, $2, $3, $4)`,
        [alias, lang, translation, hash]
      )
      return SUCCESS
    },
    editTranslation: async (_, { alias, translation }) => {
      await checkText(alias)
      await checkTranslation(alias)
      await fastify.pg.query(
        `UPDATE locales SET translation = $2 WHERE alias = $1`,
        [alias, translation]
      )
      return SUCCESS
    },
    updateStaticText: async (_, { ref }) => {
      const json = JSON.parse(readFileSync('locales/ru.json'))
      await fastify.pg.query(`DELETE FROM texts WHERE type = 'static'`)
      for (const el of Object.entries(json)) {
        await fastify.pg.query(
          `INSERT INTO texts (alias, text, type, ref) VALUES ($1, $2, $3, $4)`,
          [el[0], el[1], 'static', ref]
        )
      }
      return SUCCESS
    }
  }
}

async function checkText(alias, readOnly) {
  const { rows: [text] } = await fastify.pg.query(
    `SELECT alias, type FROM texts WHERE alias = $1`,
    [alias]
  )
  if (!text) {
    throw new Error('Текст не найден')
  }
  if (!readOnly && text.type === 'static') {
    throw new Error('Редактирование запрещено')
  }
}

async function checkTranslation(alias) {
  const { rows: [translation] } = await fastify.pg.query(
    `SELECT alias FROM locales WHERE alias = $1`,
    [alias]
  )
  if (!translation) {
    throw new Error('Перевод не найден')
  }
}

fastify.register(fastifyPostgres, {
  connectionString: process.env.DB_URL
})
fastify.register(mercurius, {
  schema,
  resolvers
})

fastify.listen(process.env.I18N, '0.0.0.0')