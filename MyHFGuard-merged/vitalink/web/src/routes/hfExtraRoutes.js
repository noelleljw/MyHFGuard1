const express = require("express");
const router = express.Router();

const baselineStore = [];
const waterSaltStore = [];

router.post("/baseline", async (req, res) => {
  const {
    patientId,
    baselineWeightKg,
    baselineSys,
    baselineDia,
    waterTargetMl,
    saltTargetLevel,
  } = req.body;

  if (!patientId || !baselineWeightKg) {
    return res.status(400).json({ error: "patientId and baselineWeightKg are required" });
  }

  baselineStore.push({
    patientId,
    baselineWeightKg,
    baselineSys,
    baselineDia,
    waterTargetMl,
    saltTargetLevel,
    createdAt: new Date().toISOString(),
  });

  res.json({ ok: true });
});

router.post("/water-salt-log", async (req, res) => {
  const { patientId, waterMl, saltLevel } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: "patientId is required" });
  }

  waterSaltStore.push({
    patientId,
    waterMl,
    saltLevel,
    createdAt: new Date().toISOString(),
  });

  res.json({ ok: true });
});

router.get("/water-salt-log/:patientId", async (req, res) => {
  const rows = waterSaltStore.filter(x => x.patientId === req.params.patientId);
  res.json(rows);
});

router.get("/baseline/:patientId", async (req, res) => {
  const row = baselineStore.findLast?.(x => x.patientId === req.params.patientId)
    || [...baselineStore].reverse().find(x => x.patientId === req.params.patientId);

  if (!row) return res.status(404).json({ error: "No baseline found" });
  res.json(row);
});

module.exports = router;