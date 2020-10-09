import * as express from 'express'
import * as multer from 'multer'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as path from 'path'
import * as shortid from 'shortid'
import * as fs from 'fs-extra'
import {promises as fsPromises} from 'fs'
import * as gltfPipeline from 'gltf-pipeline'

const UPLOAD_DIR = path.join(__dirname, 'uploads')
const upload = multer()
const app = express()

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(cors({origin: 'http://localhost:4200', credentials: true}))

app.post('/upload', upload.array('files'), async (req, res) => {
  const modelId = shortid()
  const files = req.files as Express.Multer.File[]
  const filenames = files.map(f => f.originalname)

  const sourceDir = path.join(UPLOAD_DIR, modelId, 'source')
  const convertedDir = path.join(UPLOAD_DIR, modelId, 'converted')

  await fs.ensureDir(sourceDir)
  await Promise.all(
    files.map(f => fsPromises.writeFile(path.join(sourceDir, f.originalname), f.buffer)),
  )

  const glbFilename = filenames.find(name => name.endsWith('.glb'))
  if (glbFilename) {
    const glb = await fsPromises.readFile(path.join(UPLOAD_DIR, modelId, 'source', glbFilename))
    const results1 = await gltfPipeline.glbToGltf(glb)

    await fs.ensureDir(convertedDir)

    const filename = path.parse(glbFilename).name
    const results2 = await gltfPipeline.processGltf(results1.gltf, {separate: true})
    await fsPromises.writeFile(
      path.join(convertedDir, `${filename}.gltf`),
      JSON.stringify(results2.gltf),
    )

    const separateResources = results2.separateResources
    for (const relativePath in separateResources) {
      if (separateResources.hasOwnProperty(relativePath)) {
        await fsPromises.writeFile(
          path.join(convertedDir, relativePath),
          separateResources[relativePath],
        )
      }
    }
  }

  res.json({modelId})
})

app.get('/models/:id/load', async (req, res) => {
  const dir = path.join(UPLOAD_DIR, req.params.id, 'converted')
  const files = await fs.readdir(dir)
  const gltf = files.find(name => name.endsWith('.gltf'))
  const filepath = path.join(dir, gltf)
  const stat = fs.statSync(filepath)

  res.writeHead(200, {
    'Content-Type': 'file/gltf',
    'Content-Length': stat.size,
  })

  const readStream = fs.createReadStream(filepath)
  readStream.pipe(res)
})

app.get('/models/:id/:file', async (req, res) => {
  const filepath = path.join(UPLOAD_DIR, req.params.id, 'converted', req.params.file)
  const stat = fs.statSync(filepath)

  res.writeHead(200, {
    'Content-Type': 'file/gltf',
    'Content-Length': stat.size,
  })

  const readStream = fs.createReadStream(filepath)
  readStream.pipe(res)
})

app.get('/models', async (req, res) => {
  const modelIds = await fs.readdir(UPLOAD_DIR)
  res.json({modelIds})
})

app.listen(3000, () => console.log('server started on http://localhost:3000'))
