import * as express from 'express'
import * as multer from 'multer'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as path from 'path'
import * as shortid from 'shortid'
import * as fs from 'fs-extra'
import {promises as fsPromises} from 'fs'
import * as gltfPipeline from 'gltf-pipeline'
import * as obj2gltf from 'obj2gltf'
import * as fbx2gltf from 'fbx2gltf'
import {defaultState, EditorState} from '../shared/editor'

const UPLOAD_DIR = path.join(__dirname, 'uploads')
const SETTINGS_JSON = 'settings.json'
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
  await fsPromises.writeFile(
    path.join(path.join(UPLOAD_DIR, modelId), SETTINGS_JSON),
    JSON.stringify(defaultState),
  )

  const glbFilename = filenames.find(name => name.endsWith('.glb'))
  if (glbFilename) {
    const glb = await fsPromises.readFile(path.join(UPLOAD_DIR, modelId, 'source', glbFilename))
    const results1 = await gltfPipeline.glbToGltf(glb)

    await fs.ensureDir(convertedDir)

    const filename = path.parse(glbFilename).name
    await seperateGltf(results1.gltf, convertedDir, filename)

    return res.json({modelId})
  }

  const objFilename = filenames.find(name => name.endsWith('.obj'))
  if (objFilename) {
    const gltf = await obj2gltf(path.join(sourceDir, objFilename))

    const filename = path.parse(objFilename).name
    await fs.ensureDir(convertedDir)
    await seperateGltf(gltf, convertedDir, filename)

    return res.json({modelId})
  }

  const fbxFilename = filenames.find(name => name.endsWith('.fbx'))
  if (fbxFilename) {
    const filename = path.parse(fbxFilename).name
    await fs.ensureDir(convertedDir)
    await fbx2gltf(path.join(sourceDir, fbxFilename), path.join(convertedDir, `${filename}.gltf`))
    const generatedFiles = await fsPromises.readdir(path.join(convertedDir, `${filename}_out`))
    await Promise.all(
      generatedFiles.map(f =>
        fs.rename(path.join(convertedDir, `${filename}_out`, f), path.join(convertedDir, f)),
      ),
    )

    return res.json({modelId})
  }

  res.json({success: false, reason: 'no supported formats found'})
})

async function seperateGltf(gltf: any, dir: string, filename: string) {
  const results2 = await gltfPipeline.processGltf(gltf, {separate: true})
  await fsPromises.writeFile(path.join(dir, `${filename}.gltf`), JSON.stringify(results2.gltf))

  const separateResources = results2.separateResources
  for (const relativePath in separateResources) {
    if (separateResources.hasOwnProperty(relativePath)) {
      await fsPromises.writeFile(path.join(dir, relativePath), separateResources[relativePath])
    }
  }
}

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

app.post('/editor/:id', async (req, res) => {
  const {id} = req.params
  const state: EditorState = req.body
  const sourceDir = path.join(UPLOAD_DIR, id)
  await fsPromises.writeFile(path.join(sourceDir, SETTINGS_JSON), JSON.stringify(state))
  res.send()
})

app.get('/editor/:id', async (req, res) => {
  const {id} = req.params
  const sourceDir = path.join(UPLOAD_DIR, id)
  const file = await fsPromises.readFile(path.join(sourceDir, SETTINGS_JSON))
  res.json(JSON.parse(file.toString()))
})

app.listen(3000, () => console.log('server started on http://localhost:3000'))
