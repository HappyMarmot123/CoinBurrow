import { buildApp } from './app.js'
import { config } from './config.js'

const app = buildApp()

app
  .listen({ port: config.port, host: '0.0.0.0' })
  .then((address) => {
    console.log(`Server listening at ${address}`)
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
