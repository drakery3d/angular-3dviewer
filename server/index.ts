import * as express from 'express'
import * as multer from 'multer'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as path from 'path'

const UPLOAD_DIR = path.join(__dirname, 'uploads')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, file.originalname),
})
const upload = multer({storage})

const app = express()

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(cors({origin: 'http://localhost:4200', credentials: true}))

app.post('/upload', upload.single('file'), (req, res) => {
  console.log('uploaded file', req.file)
  res.send()
})

app.listen(3000, () => console.log('server started on http://localhost:3000'))
