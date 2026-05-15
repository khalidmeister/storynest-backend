const { z } = require("zod");

const bookBaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  author: z.string().min(1, "Author is required").max(200),
  category: z.string().min(1, "Category is required").max(100),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().nonnegative("Price must be >= 0"),
  age_min: z.coerce.number().int().min(0).max(18),
  age_max: z.coerce.number().int().min(0).max(18),
  is_published: z.coerce.boolean().optional().default(false),
});

// Refine dipasang SETELAH partial() biar bisa dipake dulu
const bookSchema = bookBaseSchema.refine(
  (data) => data.age_min <= data.age_max,
  { message: "age_min cannot be greater than age_max", path: ["age_min"] }
);

const bookUpdateSchema = bookBaseSchema.partial().refine(
  (data) => {
    if (data.age_min !== undefined && data.age_max !== undefined) {
      return data.age_min <= data.age_max;
    }
    return true;
  },
  { message: "age_min cannot be greater than age_max", path: ["age_min"] }
);

module.exports = { bookSchema, bookUpdateSchema };