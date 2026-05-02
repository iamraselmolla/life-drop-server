import Joi from "joi";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ── Registration ─────────────────────────────────────────────────────────────
export const registerSchema = Joi.object({
  // ── Account
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(150)
    .required()
    .messages({ "string.email": "Enter a valid email address." }),
  phone: Joi.string()
    .pattern(/^(\+8801|01)\d{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Enter a valid Bangladeshi phone number (+8801XXXXXXXXX).",
    }),
  password: Joi.string()
    .min(8)
    .max(72)
    .required()
    .messages({ "string.min": "Password must be at least 8 characters." }),

  // ── Personal
  name: Joi.string().trim().min(2).max(100).required(),
  age: Joi.number().integer().min(18).max(65).required().messages({
    "number.min": "Minimum age to donate is 18.",
    "number.max": "Maximum age is 65.",
  }),
  district: Joi.string().max(100).required(),
  division: Joi.string().max(100).allow("", null).optional(),

  // ── Medical
  blood_group: Joi.string()
    .valid(...BLOOD_GROUPS)
    .required()
    .messages({ "any.only": "Select a valid blood group." }),
  weight_kg: Joi.number()
    .min(45)
    .max(300)
    .required()
    .messages({ "number.min": "Minimum donor weight is 45 kg." }),
  last_donated_at: Joi.date().iso().max("now").allow(null, "").optional(),

  // ── Medical flags (all optional, default false)
  is_smoker: Joi.boolean().default(false),
  has_hepatitis_b: Joi.boolean().default(false),
  has_hepatitis_c: Joi.boolean().default(false),
  has_hiv: Joi.boolean().default(false),
  has_diabetes: Joi.boolean().default(false),
  has_heart_disease: Joi.boolean().default(false),
  has_malaria_recent: Joi.boolean().default(false),
});

// ── Login ────────────────────────────────────────────────────────────────────
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
