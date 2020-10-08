import * as express from 'express'
import * as multer from 'multer'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as path from 'path'
import * as shortid from 'shortid'
import * as fs from 'fs-extra'

const UPLOAD_DIR = path.join(__dirname, 'uploads')

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    const modelId = shortid()
    req.res.locals.modelId = modelId
    const dir = path.join(UPLOAD_DIR, modelId)
    await fs.ensureDir(dir)
    cb(null, dir)
  },
  filename: (_req, file, cb) => cb(null, file.originalname),
})
const upload = multer({storage})

const app = express()

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(cors({origin: 'http://localhost:4200', credentials: true}))

app.post('/upload', upload.single('file'), (req, res) => {
  console.log('uploaded file', req.file)
  res.json({modelId: res.locals.modelId})
})

app.get('/models/:id', async (req, res) => {
  const dir = path.join(UPLOAD_DIR, req.params.id)
  const files = await fs.readdir(dir)
  const filename = files[0]

  const filepath = path.join(dir, filename)
  const stat = fs.statSync(filepath)

  res.writeHead(200, {
    'Content-Type': 'file/glb',
    'Content-Length': stat.size,
  })

  const readStream = fs.createReadStream(filepath)
  readStream.pipe(res)
})

app.get('/models', async (req, res) => {
  const modelIds = await fs.readdir(UPLOAD_DIR)
  modelIds.shift()
  res.json({modelIds})
})

app.listen(3000, () => console.log('server started on http://localhost:3000'))
