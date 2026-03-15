import { z } from "zod";

const RequirementsSchema = z.object({
  minimum: z.string().optional(),
  recommended: z.string().optional(),
});

const PriceOverviewSchema = z.object({
  currency: z.string(),
  initial: z.number(),
  final: z.number(),
  discount_percent: z.number(),
  initial_formatted: z.string(),
  final_formatted: z.string(),
});

const SubPackageSchema = z.object({
  packageid: z.number(),
  percent_savings_text: z.string(),
  percent_savings: z.number(),
  option_text: z.string(),
  option_description: z.string(),
  can_get_free_license: z.string(),
  is_free_license: z.boolean(),
  price_in_cents_with_discount: z.number(),
});

const PackageGroupSchema = z.object({
  name: z.string(),
  title: z.string(),
  description: z.string(),
  selection_text: z.string(),
  save_text: z.string(),
  display_type: z.number(),
  is_recurring_subscription: z.string(),
  subs: z.array(SubPackageSchema),
});

const PlatformsSchema = z.object({
  windows: z.boolean(),
  mac: z.boolean(),
  linux: z.boolean(),
});

const CategorySchema = z.object({
  id: z.number(),
  description: z.string(),
});

const GenreSchema = z.object({
  id: z.string(),
  description: z.string(),
});

const ScreenshotSchema = z.object({
  id: z.number(),
  path_thumbnail: z.string().url(),
  path_full: z.string().url(),
});

const MovieSchema = z.object({
  id: z.number(),
  name: z.string(),
  thumbnail: z.string().url(),
  dash_av1: z.string().url().optional(),
  dash_h264: z.string().url().optional(),
  hls_h264: z.string().url().optional(),
  highlight: z.boolean(),
});

const RatingSchema = z.object({
  rating: z.string(),
  descriptors: z.string().optional(),
  interactive_elements: z.string().optional(),
});

const SteamAppDetailsDataSchema = z.object({
  type: z.string(),
  name: z.string(),
  steam_appid: z.number(),
  required_age: z.union([z.number(), z.string()]),
  is_free: z.boolean(),
  controller_support: z.string().optional(),
  dlc: z.array(z.number()).optional(),
  detailed_description: z.string(),
  about_the_game: z.string(),
  short_description: z.string(),
  supported_languages: z.string(),
  header_image: z.string().url(),
  capsule_image: z.string().url(),
  capsule_imagev5: z.string().url(),
  website: z.string().nullable().optional(),
  pc_requirements: RequirementsSchema.or(z.array(z.any())),
  mac_requirements: RequirementsSchema.or(z.array(z.any())),
  linux_requirements: RequirementsSchema.or(z.array(z.any())),
  legal_notice: z.string().optional(),
  developers: z.array(z.string()).optional(),
  publishers: z.array(z.string()).optional(),
  price_overview: PriceOverviewSchema.optional(),
  packages: z.array(z.number()).optional(),
  package_groups: z.array(PackageGroupSchema).optional(),
  platforms: PlatformsSchema,
  metacritic: z.object({ score: z.number(), url: z.string().url() }).optional(),
  categories: z.array(CategorySchema).optional(),
  genres: z.array(GenreSchema).optional(),
  screenshots: z.array(ScreenshotSchema).optional(),
  movies: z.array(MovieSchema).optional(),
  recommendations: z.object({ total: z.number() }).optional(),
  achievements: z
    .object({
      total: z.number(),
      highlighted: z.array(
        z.object({ name: z.string(), path: z.string().url() }),
      ),
    })
    .optional(),
  release_date: z.object({ coming_soon: z.boolean(), date: z.string() }),
  support_info: z.object({ url: z.string(), email: z.string() }),
  background: z.string().url(),
  background_raw: z.string().url(),
  content_descriptors: z.object({
    ids: z.array(z.number()),
    notes: z.string().nullable(),
  }),
  ratings: z.record(z.string(), RatingSchema).optional(),
});

export const SteamAppDetailsResponseSchema = z.record(
  z.string(),
  z.object({
    success: z.boolean(),
    data: SteamAppDetailsDataSchema.optional(),
  }),
);

export type SteamAppDetailsResponse = z.infer<
  typeof SteamAppDetailsResponseSchema
>;
export type SteamAppDetailsData = z.infer<typeof SteamAppDetailsDataSchema>;

export const FriendRequestSchema = z.object({
  from: z.string(),
  to: z.string(),
  status: z.enum(["pending", "accepted", "declined", "cancelled"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const FriendSchema = z.object({
  user1: z.string(),
  user2: z.string(),
  since: z.date(),
  nickname1: z.string().optional(),
  nickname2: z.string().optional(),
  blockedBy: z.string().optional(),
  ignoreUntil1: z.date().optional(),
  ignoreUntil2: z.date().optional(),
});
