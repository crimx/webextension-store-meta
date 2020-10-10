const fs = require('fs-extra')
const path = require('path')

const fixturesDir = path.join(__dirname, `../../.fixtures/chrome-web-store`)
const extIds = fs.readdirSync(fixturesDir)
const mockFixtures = new Map()

jest.mock('../../lib/fetch-text', () =>
  jest.fn(async (url) => {
    const idMatch = /\/([\d\w]+)(?:\?|$)/.exec(url)
    if (idMatch && mockFixtures.has(idMatch[1])) {
      return mockFixtures.get(idMatch[1])
    }
    throw new Error(`404 ${url}`)
  })
)

describe('Chrome Web Store', () => {
  beforeAll(async () => {
    await Promise.all(
      extIds.map(async (name) => {
        mockFixtures.set(name, await fs.readFile(path.join(fixturesDir, name)))
      })
    )
  })

  const matchAnyInfo = {
    browser: 'chrome',
    name: expect.any(String),
    description: expect.any(String),
    rating: expect.any(Number),
    users: expect.any(Number),
    price: expect.any(String),
    priceCurrency: expect.any(String),
    version: expect.any(String),
    url: expect.any(String),
    image: expect.any(String),
  }

  describe.each([extIds[0]])(
    '%s',
    (extId) => {
      it('should return ext info', async () => {
        const ChromeWebStore = require('./index')
        const chromeWebStore = new ChromeWebStore({ id: extId })
        await chromeWebStore.load()
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo)
      })

      it('should also return ext info with static `load` shortcut', async () => {
        const ChromeWebStore = require('./index')
        const chromeWebStore = await ChromeWebStore.load({ id: extId })
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo)
      })

      it('should concat querystring', async () => {
        const ChromeWebStore = require('./index')
        const chromeWebStore = await ChromeWebStore.load({
          id: extId,
          qs: { hl: 'zh', lr: 'lang_zh-CN' },
        })
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo)
        expect(require('../../lib/fetch-text')).toHaveBeenLastCalledWith(
          expect.stringContaining('?hl=zh&lr=lang_zh-CN'),
          undefined
        )
      })

      it('should throw error if document is not loaded', () => {
        const ChromeWebStore = require('./index')
        const chromeWebStore = new ChromeWebStore({ id: extId })
        expect(() => chromeWebStore.meta()).toThrow()
      })
    },
    20000
  )
})