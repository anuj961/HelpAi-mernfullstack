import fs from "fs"
import path from "path"
import multer from "multer"
const uploadDir = path.resolve("./temp")

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir)
    }
    ,
    filename(req, file, cb) {
        cb(null, `${Date.now()}-${path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_")}`)
    },
})

const fileFilter = (req, file, cb) => {
     if(file.mimetype=="application/pdf" ||
        file.mimetype.startsWith("image/") ||
        ["text/plain", "text/csv", "application/json", "text/markdown"].includes(file.mimetype)
      ){
          
        cb(null,true)

      }else{
        cb(new Error("Upload a PDF, image, TXT, CSV, JSON, or Markdown file."))
      }
}


export default  multer({
    storage, fileFilter, limits: {
        fileSize: 20 * 1024 * 1024
    }
})