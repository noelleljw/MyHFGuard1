const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")

function findExistingFile(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  return null
}

module.exports = (supabase, uploadMiddleware) => async (req, res) => {
  console.log("[processWeightImage] Route called")

  uploadMiddleware(req, res, async (err) => {
    try {
      console.log("[processWeightImage] Upload middleware executed")
      console.log("[processWeightImage] __dirname =", __dirname)
      console.log("[processWeightImage] process.cwd() =", process.cwd())

      if (err) {
        return res.status(400).json({
          error: "File upload failed.",
          details: err.message,
        })
      }

      if (!req.file) {
        return res.status(400).json({
          error: "No image file provided.",
        })
      }

      const patientId = req.body.patientId
      if (!patientId) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
        return res.status(400).json({
          error: "Patient ID is required.",
        })
      }

      const imagePath = req.file.path

      // Try several possible locations automatically
      const candidatePaths = [
        path.resolve(__dirname, "../scripts/weight_recognition_backend.py"),
        path.resolve(__dirname, "../../scripts/weight_recognition_backend.py"),
        path.resolve(__dirname, "../weight_recognition_backend.py"),
        path.resolve(__dirname, "../../weight_recognition_backend.py"),
        path.resolve(process.cwd(), "scripts/weight_recognition_backend.py"),
        path.resolve(process.cwd(), "weight_recognition_backend.py"),
      ]

      console.log("[processWeightImage] Candidate script paths:")
      candidatePaths.forEach((p) => console.log(" -", p))

      const scriptPath = findExistingFile(candidatePaths)

      if (!scriptPath) {
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
        return res.status(500).json({
          error: "Weight OCR script not found on server.",
          checkedPaths: candidatePaths,
        })
      }

      console.log("[processWeightImage] Using scriptPath:", scriptPath)
      console.log("[processWeightImage] Using imagePath:", imagePath)

      const pythonCommand = process.platform === "win32" ? "python" : "python3"
      const pythonProcess = spawn(pythonCommand, [scriptPath, imagePath])

      let rawOutput = ""
      let errorOutput = ""

      pythonProcess.stdout.on("data", (data) => {
        rawOutput += data.toString()
      })

      pythonProcess.stderr.on("data", (data) => {
        errorOutput += data.toString()
      })

      pythonProcess.on("error", (err) => {
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
        return res.status(500).json({
          error: "Failed to start OCR process.",
          details: err.message,
          scriptPath,
        })
      })

      pythonProcess.on("close", (code) => {
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)

        console.log("[processWeightImage] Python exit code:", code)
        console.log("[processWeightImage] rawOutput:", rawOutput)
        console.log("[processWeightImage] errorOutput:", errorOutput)

        try {
          if (!rawOutput || rawOutput.trim() === "") {
            return res.status(500).json({
              error: "No output from weight OCR script.",
              details: errorOutput || "Python script returned empty output.",
              scriptPath,
            })
          }

          const jsonStartIndex = rawOutput.indexOf("{")
          if (jsonStartIndex === -1) {
            return res.status(500).json({
              error: "No JSON found in Python output.",
              details: rawOutput,
              stderr: errorOutput,
              scriptPath,
            })
          }

          const jsonString = rawOutput.substring(jsonStartIndex).trim()
          const jsonResult = JSON.parse(jsonString)

          if (jsonResult.error) {
            return res.status(400).json({
              error: jsonResult.error,
              rawText: jsonResult.rawText || "",
              allAttempts: jsonResult.allAttempts || [],
              scriptPath,
            })
          }

          const detectedValue =
            jsonResult.weight ||
            jsonResult.detectedWeight ||
            jsonResult.weightKg ||
            null

          if (!detectedValue) {
            return res.status(400).json({
              error: "Weight not detected.",
              rawText: jsonResult.rawText || "",
              allAttempts: jsonResult.allAttempts || [],
              scriptPath,
            })
          }

          const weight = parseFloat(detectedValue)

          if (isNaN(weight)) {
            return res.status(400).json({
              error: "Invalid weight value received from OCR.",
              rawText: jsonResult.rawText || "",
              allAttempts: jsonResult.allAttempts || [],
              scriptPath,
            })
          }

          return res.json({
            weight: weight.toFixed(1),
            detectedWeight: weight.toFixed(1),
            annotatedImage: jsonResult.annotatedImage || null,
            rawText: jsonResult.rawText || "",
            allAttempts: jsonResult.allAttempts || [],
          })
        } catch (e) {
          return res.status(500).json({
            error: "Failed to parse result from weight OCR script.",
            details: e.message,
            rawOutput,
            stderr: errorOutput,
            scriptPath,
          })
        }
      })
    } catch (e) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }

      return res.status(500).json({
        error: "Unexpected server error.",
        details: e.message,
      })
    }
  })
}