import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { reverseGeocode, sendSms } from "../../ai/notifyService.js";

const router = Router();
router.use(requireAuth);

const MAX_CONTACTS = 3;

const contactSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^0\d{10}$/, "Phone number must be exactly 11 digits (e.g. 03001234567)"),
  relation: z.string().optional(),
});

router.get(
  "/contacts",
  asyncHandler(async (req, res) => {
    const contacts = await prisma.emergencyContact.findMany({ where: { userId: req.user.id } });
    res.json({ contacts });
  })
);

router.post(
  "/contacts",
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const count = await prisma.emergencyContact.count({ where: { userId: req.user.id } });
    if (count >= MAX_CONTACTS) throw new HttpError(400, `You can add at most ${MAX_CONTACTS} emergency contacts`);
    const contact = await prisma.emergencyContact.create({ data: { ...req.body, userId: req.user.id } });
    res.status(201).json({ contact });
  })
);

router.delete(
  "/contacts/:id",
  asyncHandler(async (req, res) => {
    const contact = await prisma.emergencyContact.findUnique({ where: { id: req.params.id } });
    if (!contact || contact.userId !== req.user.id) throw new HttpError(404, "Contact not found");
    await prisma.emergencyContact.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

const sosSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
});

router.post(
  "/",
  validate(sosSchema),
  asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    const contacts = await prisma.emergencyContact.findMany({ where: { userId: req.user.id } });
    const address = await reverseGeocode(lat, lng);

    const status = contacts.length === 0 ? "no_contact" : "sent";
    const alert = await prisma.sosAlert.create({
      data: {
        userId: req.user.id,
        lat,
        lng,
        address,
        status,
        contactNotified: contacts.length > 0,
      },
    });

    const notified = [];
    for (const c of contacts) {
      const r = await sendSms(
        c.phoneNumber,
        `SOS from ${req.user.name}. Location: ${address}. Please respond.`
      );
      notified.push({ name: c.name, relation: c.relation, phoneNumber: c.phoneNumber, sent: r.sent });
    }

    res.status(201).json({ alert, address, notified, contactCount: contacts.length });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const alerts = await prisma.sosAlert.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ alerts });
  })
);

export default router;
