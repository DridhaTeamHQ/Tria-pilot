/**
 * PREMIUM PRESETS - STRUCTURAL SCHEMA
 * 
 * Higgsfield/Nano-Banana Pro style presets with:
 * - Camera specifications (lens, angle, distance)
 * - Lighting specifications (type, direction, quality)
 * - Depth layers (foreground, midground, background)
 * - Validation rules (required/forbidden elements)
 * 
 * These are STRUCTURAL, not descriptive.
 * Used by PRO pipeline for scene construction.
 */

import 'server-only'

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM PRESET SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export interface PremiumPreset {
    id: string
    label: string
    category: 'studio' | 'lifestyle' | 'urban' | 'celebration'
    location: string
    props: string[]
    camera: {
        lens: string
        angle: string
        distance: string
    }
    lighting: {
        type: string
        direction: string
        quality: string
    }
    depth: {
        foreground: string
        midground: string
        background: string
    }
    validation: {
        required_elements: string[]
        forbidden_elements: string[]
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDIO / PHOTOSHOOT (15)
// ═══════════════════════════════════════════════════════════════════════════════

const STUDIO_PRESETS: PremiumPreset[] = [
    {
        id: "studio_softbox_neutral",
        label: "Studio Softbox – Neutral",
        category: "studio",
        location: "Minimal studio backdrop",
        props: ["neutral backdrop"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "softbox",
            direction: "45-degree key with fill",
            quality: "soft, even"
        },
        depth: {
            foreground: "subject",
            midground: "neutral floor",
            background: "plain backdrop"
        },
        validation: {
            required_elements: ["soft shadows", "even lighting"],
            forbidden_elements: ["dramatic lighting", "hard rim light"]
        }
    },
    {
        id: "studio_high_key_fashion",
        label: "High-Key Fashion Studio",
        category: "studio",
        location: "White fashion studio",
        props: ["white seamless background"],
        camera: { lens: "70mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "high-key",
            direction: "frontal",
            quality: "bright, shadowless"
        },
        depth: {
            foreground: "subject",
            midground: "white floor",
            background: "white backdrop"
        },
        validation: {
            required_elements: ["bright background"],
            forbidden_elements: ["dark shadows", "contrast-heavy lighting"]
        }
    },
    {
        id: "studio_low_key_editorial",
        label: "Low-Key Editorial",
        category: "studio",
        location: "Dark editorial studio",
        props: ["black backdrop"],
        camera: { lens: "85mm", angle: "eye-level", distance: "medium-close" },
        lighting: {
            type: "low-key",
            direction: "side key light only",
            quality: "dramatic, controlled"
        },
        depth: {
            foreground: "subject lit face",
            midground: "partial shadow",
            background: "deep black"
        },
        validation: {
            required_elements: ["single key light", "dark background"],
            forbidden_elements: ["flat lighting", "fill light"]
        }
    },
    {
        id: "studio_beauty_diffused",
        label: "Beauty – Diffused Daylight",
        category: "studio",
        location: "Natural light studio",
        props: ["large diffusion panel"],
        camera: { lens: "85mm", angle: "eye-level", distance: "close" },
        lighting: {
            type: "diffused daylight",
            direction: "frontal-side",
            quality: "very soft, wrap-around"
        },
        depth: {
            foreground: "subject face",
            midground: "shoulders",
            background: "soft neutral"
        },
        validation: {
            required_elements: ["soft wrap lighting"],
            forbidden_elements: ["harsh shadows", "face modification"]
        }
    },
    {
        id: "studio_commercial_catalog",
        label: "Commercial Catalog",
        category: "studio",
        location: "E-commerce studio",
        props: ["white background"],
        camera: { lens: "50mm", angle: "eye-level", distance: "full-body" },
        lighting: {
            type: "even commercial",
            direction: "multi-point",
            quality: "flat, product-focused"
        },
        depth: {
            foreground: "subject full body",
            midground: "white floor",
            background: "pure white"
        },
        validation: {
            required_elements: ["even lighting", "clear garment visibility"],
            forbidden_elements: ["artistic shadows", "bokeh"]
        }
    },
    {
        id: "studio_grey_cyc",
        label: "Grey Cyclorama",
        category: "studio",
        location: "Grey cyc studio",
        props: ["grey seamless"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "balanced",
            direction: "key with fill",
            quality: "neutral, even"
        },
        depth: {
            foreground: "subject",
            midground: "grey floor gradient",
            background: "grey infinity"
        },
        validation: {
            required_elements: ["grey backdrop", "neutral tone"],
            forbidden_elements: ["colored gels", "dramatic contrast"]
        }
    },
    {
        id: "studio_cream_warm",
        label: "Cream Backdrop – Warm",
        category: "studio",
        location: "Warm tone studio",
        props: ["cream paper backdrop"],
        camera: { lens: "70mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "warm daylight balanced",
            direction: "soft frontal",
            quality: "warm, inviting"
        },
        depth: {
            foreground: "subject",
            midground: "cream floor",
            background: "cream backdrop"
        },
        validation: {
            required_elements: ["warm tones"],
            forbidden_elements: ["cool tones", "harsh shadows"]
        }
    },
    {
        id: "studio_fashion_editorial",
        label: "Fashion Editorial Studio",
        category: "studio",
        location: "High-end fashion studio",
        props: ["minimal backdrop", "concrete floor"],
        camera: { lens: "100mm", angle: "slightly low", distance: "full-body" },
        lighting: {
            type: "mixed natural and strobe",
            direction: "window with fill",
            quality: "editorial, refined"
        },
        depth: {
            foreground: "subject",
            midground: "floor texture",
            background: "clean backdrop"
        },
        validation: {
            required_elements: ["fashion lighting"],
            forbidden_elements: ["cluttered props"]
        }
    },
    {
        id: "studio_textured_wall",
        label: "Textured Plaster Wall",
        category: "studio",
        location: "Studio with textured wall",
        props: ["plaster wall texture"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "side light",
            direction: "angled to show texture",
            quality: "directional, soft edge"
        },
        depth: {
            foreground: "subject",
            midground: "wall texture",
            background: "wall depth"
        },
        validation: {
            required_elements: ["visible wall texture"],
            forbidden_elements: ["flat lighting"]
        }
    },
    {
        id: "studio_hard_light",
        label: "Hard Light Editorial",
        category: "studio",
        location: "Minimalist hard light studio",
        props: ["clean backdrop"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "bare bulb hard light",
            direction: "single source angled",
            quality: "hard, defined shadows"
        },
        depth: {
            foreground: "subject with shadow",
            midground: "cast shadow on floor",
            background: "simple backdrop"
        },
        validation: {
            required_elements: ["hard shadows", "defined edges"],
            forbidden_elements: ["soft diffusion"]
        }
    },
    {
        id: "studio_pastel_mint",
        label: "Pastel Mint Backdrop",
        category: "studio",
        location: "Pastel studio",
        props: ["mint green backdrop"],
        camera: { lens: "85mm", angle: "eye-level", distance: "chest-up" },
        lighting: {
            type: "beauty lighting",
            direction: "clamshell",
            quality: "soft, flattering"
        },
        depth: {
            foreground: "subject",
            midground: "soft gradient",
            background: "pastel mint"
        },
        validation: {
            required_elements: ["pastel tone", "soft light"],
            forbidden_elements: ["saturated colors", "harsh shadows"]
        }
    },
    {
        id: "studio_terracotta",
        label: "Terracotta Earth Tone",
        category: "studio",
        location: "Earthy studio",
        props: ["terracotta backdrop"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "warm natural",
            direction: "side-front",
            quality: "warm, golden"
        },
        depth: {
            foreground: "subject",
            midground: "floor",
            background: "terracotta wall"
        },
        validation: {
            required_elements: ["warm earth tones"],
            forbidden_elements: ["cool lighting"]
        }
    },
    {
        id: "studio_rimlight_dramatic",
        label: "Dramatic Rim Light",
        category: "studio",
        location: "Dark studio with rim",
        props: ["dark backdrop"],
        camera: { lens: "85mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "rim light accent",
            direction: "back-side",
            quality: "separation, dramatic"
        },
        depth: {
            foreground: "rim-lit subject",
            midground: "shadow area",
            background: "dark"
        },
        validation: {
            required_elements: ["visible rim light"],
            forbidden_elements: ["flat frontal lighting"]
        }
    },
    {
        id: "studio_window_natural",
        label: "Natural Window Studio",
        category: "studio",
        location: "Studio with large window",
        props: ["window", "simple interior"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "natural window light",
            direction: "side from window",
            quality: "soft, directional"
        },
        depth: {
            foreground: "subject",
            midground: "window frame",
            background: "outside blur"
        },
        validation: {
            required_elements: ["window light visible"],
            forbidden_elements: ["artificial flash"]
        }
    },
    {
        id: "studio_gradient_blue",
        label: "Gradient Blue Backdrop",
        category: "studio",
        location: "Blue gradient studio",
        props: ["blue gradient backdrop"],
        camera: { lens: "70mm", angle: "eye-level", distance: "chest-up" },
        lighting: {
            type: "soft frontal",
            direction: "even frontal",
            quality: "clean, commercial"
        },
        depth: {
            foreground: "subject",
            midground: "gradient transition",
            background: "blue tone"
        },
        validation: {
            required_elements: ["blue gradient"],
            forbidden_elements: ["clashing colors"]
        }
    }
]

// ═══════════════════════════════════════════════════════════════════════════════
// LIFESTYLE / AESTHETIC (15)
// ═══════════════════════════════════════════════════════════════════════════════

const LIFESTYLE_PRESETS: PremiumPreset[] = [
    {
        id: "cafe_window_morning",
        label: "Cafe Window – Morning Light",
        category: "lifestyle",
        location: "Minimal cafe near large window",
        props: ["wooden table", "ceramic cup"],
        camera: { lens: "35mm", angle: "slightly off-center", distance: "close-medium" },
        lighting: {
            type: "natural daylight",
            direction: "side-lit from window",
            quality: "soft, diffused"
        },
        depth: {
            foreground: "table edge",
            midground: "subject",
            background: "window and wall"
        },
        validation: {
            required_elements: ["window light"],
            forbidden_elements: ["studio lighting", "flash"]
        }
    },
    {
        id: "balcony_golden_hour",
        label: "Balcony – Golden Hour",
        category: "lifestyle",
        location: "Apartment balcony",
        props: ["balcony railing"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "sunset daylight",
            direction: "side/back light",
            quality: "warm, soft"
        },
        depth: {
            foreground: "railing blur",
            midground: "subject",
            background: "city skyline"
        },
        validation: {
            required_elements: ["warm light"],
            forbidden_elements: ["harsh shadows"]
        }
    },
    {
        id: "living_room_minimal",
        label: "Minimal Living Room",
        category: "lifestyle",
        location: "Contemporary living room",
        props: ["neutral sofa", "clean interior"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "natural daylight",
            direction: "window from side",
            quality: "bright, airy"
        },
        depth: {
            foreground: "furniture edge",
            midground: "subject on sofa",
            background: "room interior"
        },
        validation: {
            required_elements: ["natural light", "clean interior"],
            forbidden_elements: ["clutter", "mess"]
        }
    },
    {
        id: "restaurant_evening_warm",
        label: "Restaurant Evening – Warm",
        category: "lifestyle",
        location: "Upscale restaurant interior",
        props: ["table setting", "candles"],
        camera: { lens: "50mm", angle: "seated perspective", distance: "medium" },
        lighting: {
            type: "warm ambient",
            direction: "practical lights overhead",
            quality: "warm, intimate"
        },
        depth: {
            foreground: "table items",
            midground: "subject seated",
            background: "restaurant interior"
        },
        validation: {
            required_elements: ["warm tones", "ambient glow"],
            forbidden_elements: ["harsh flash"]
        }
    },
    {
        id: "hotel_corridor",
        label: "Hotel Corridor",
        category: "lifestyle",
        location: "Upscale hotel hallway",
        props: ["corridor depth", "warm sconces"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium-full" },
        lighting: {
            type: "tungsten ambient",
            direction: "wall sconces",
            quality: "warm, directional"
        },
        depth: {
            foreground: "subject walking",
            midground: "corridor walls",
            background: "corridor depth"
        },
        validation: {
            required_elements: ["corridor depth"],
            forbidden_elements: ["institutional lighting"]
        }
    },
    {
        id: "bookstore_cozy",
        label: "Bookstore – Cozy",
        category: "lifestyle",
        location: "Warm bookstore interior",
        props: ["wooden shelves", "books"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "warm practical",
            direction: "overhead pendants",
            quality: "cozy, inviting"
        },
        depth: {
            foreground: "shelf edge",
            midground: "subject browsing",
            background: "book rows"
        },
        validation: {
            required_elements: ["warm lighting", "books visible"],
            forbidden_elements: ["harsh overhead"]
        }
    },
    {
        id: "art_gallery_minimal",
        label: "Art Gallery – Minimal",
        category: "lifestyle",
        location: "White-walled gallery",
        props: ["gallery space", "polished floor"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "gallery track lighting",
            direction: "overhead even",
            quality: "clean, neutral"
        },
        depth: {
            foreground: "subject",
            midground: "gallery space",
            background: "white walls"
        },
        validation: {
            required_elements: ["gallery space"],
            forbidden_elements: ["busy artwork"]
        }
    },
    {
        id: "lobby_modern",
        label: "Modern Lobby",
        category: "lifestyle",
        location: "Contemporary hotel/office lobby",
        props: ["marble floor", "clean architecture"],
        camera: { lens: "35mm", angle: "eye-level", distance: "full-body" },
        lighting: {
            type: "mixed natural and artificial",
            direction: "overhead and side",
            quality: "bright, clean"
        },
        depth: {
            foreground: "floor",
            midground: "subject standing",
            background: "lobby architecture"
        },
        validation: {
            required_elements: ["architectural context"],
            forbidden_elements: ["crowds"]
        }
    },
    {
        id: "window_daylight_portrait",
        label: "Window Daylight Portrait",
        category: "lifestyle",
        location: "Home near large window",
        props: ["sheer curtains"],
        camera: { lens: "50mm", angle: "eye-level", distance: "close-medium" },
        lighting: {
            type: "natural diffused",
            direction: "side from window",
            quality: "soft, wrapping"
        },
        depth: {
            foreground: "subject",
            midground: "curtain",
            background: "window light"
        },
        validation: {
            required_elements: ["window light wrap"],
            forbidden_elements: ["artificial light"]
        }
    },
    {
        id: "coworking_modern",
        label: "Coworking Space – Modern",
        category: "lifestyle",
        location: "Clean coworking office",
        props: ["desk", "laptop", "plant"],
        camera: { lens: "35mm", angle: "seated", distance: "medium" },
        lighting: {
            type: "mixed daylight and LED",
            direction: "overhead and window",
            quality: "bright, productive"
        },
        depth: {
            foreground: "desk surface",
            midground: "subject working",
            background: "office interior"
        },
        validation: {
            required_elements: ["work context"],
            forbidden_elements: ["clutter", "mess"]
        }
    },
    {
        id: "rooftop_day",
        label: "Rooftop Daytime",
        category: "lifestyle",
        location: "Clean rooftop terrace",
        props: ["modern furniture", "city view"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "bright daylight",
            direction: "open sky",
            quality: "even, bright"
        },
        depth: {
            foreground: "terrace edge",
            midground: "subject",
            background: "city skyline"
        },
        validation: {
            required_elements: ["city view", "bright light"],
            forbidden_elements: ["industrial mess"]
        }
    },
    {
        id: "kitchen_morning",
        label: "Kitchen – Morning Light",
        category: "lifestyle",
        location: "Modern kitchen",
        props: ["counter", "coffee setup"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "morning daylight",
            direction: "window side",
            quality: "fresh, bright"
        },
        depth: {
            foreground: "counter items",
            midground: "subject",
            background: "kitchen interior"
        },
        validation: {
            required_elements: ["morning light"],
            forbidden_elements: ["mess", "dirty dishes"]
        }
    },
    {
        id: "bedroom_soft_light",
        label: "Bedroom – Soft Light",
        category: "lifestyle",
        location: "Clean bedroom",
        props: ["bed", "neutral bedding"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "soft morning light",
            direction: "window curtain diffused",
            quality: "soft, peaceful"
        },
        depth: {
            foreground: "subject",
            midground: "bed",
            background: "room interior"
        },
        validation: {
            required_elements: ["soft light"],
            forbidden_elements: ["clutter", "mess"]
        }
    },
    {
        id: "lounge_evening",
        label: "Lounge – Evening",
        category: "lifestyle",
        location: "Upscale lounge",
        props: ["comfortable seating", "ambient lights"],
        camera: { lens: "50mm", angle: "seated", distance: "medium" },
        lighting: {
            type: "warm ambient",
            direction: "practical lamps",
            quality: "warm, relaxed"
        },
        depth: {
            foreground: "table",
            midground: "subject seated",
            background: "lounge interior"
        },
        validation: {
            required_elements: ["warm ambient"],
            forbidden_elements: ["harsh lighting"]
        }
    },
    {
        id: "spa_relaxation",
        label: "Spa – Relaxation",
        category: "lifestyle",
        location: "Clean spa environment",
        props: ["neutral tones", "plants"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "soft ambient",
            direction: "diffused overhead",
            quality: "calming, even"
        },
        depth: {
            foreground: "subject",
            midground: "spa elements",
            background: "neutral wall"
        },
        validation: {
            required_elements: ["calm atmosphere"],
            forbidden_elements: ["harsh light"]
        }
    }
]

// ═══════════════════════════════════════════════════════════════════════════════
// URBAN / CINEMATIC (10)
// ═══════════════════════════════════════════════════════════════════════════════

const URBAN_PRESETS: PremiumPreset[] = [
    {
        id: "heritage_stone_wall",
        label: "Heritage Stone Wall",
        category: "urban",
        location: "Textured sandstone wall",
        props: ["stone wall"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "natural daylight",
            direction: "angled side light",
            quality: "soft contrast"
        },
        depth: {
            foreground: "subject",
            midground: "stone texture",
            background: "wall depth"
        },
        validation: {
            required_elements: ["stone texture"],
            forbidden_elements: ["modern decor"]
        }
    },
    {
        id: "quiet_street_dusk",
        label: "Quiet Street – Dusk",
        category: "urban",
        location: "City street at dusk",
        props: ["street lights", "buildings"],
        camera: { lens: "35mm", angle: "street level", distance: "full-body" },
        lighting: {
            type: "blue hour ambient",
            direction: "mixed warm street lights",
            quality: "atmospheric, mixed temps"
        },
        depth: {
            foreground: "subject walking",
            midground: "street",
            background: "buildings, sky"
        },
        validation: {
            required_elements: ["blue hour sky"],
            forbidden_elements: ["harsh daylight"]
        }
    },
    {
        id: "concrete_brutalist",
        label: "Concrete Brutalist",
        category: "urban",
        location: "Brutalist architecture",
        props: ["raw concrete", "geometric shapes"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "overcast daylight",
            direction: "diffused overhead",
            quality: "dramatic, moody"
        },
        depth: {
            foreground: "subject",
            midground: "concrete forms",
            background: "architectural mass"
        },
        validation: {
            required_elements: ["concrete texture"],
            forbidden_elements: ["graffiti", "debris"]
        }
    },
    {
        id: "staircase_geometry",
        label: "Staircase Geometry",
        category: "urban",
        location: "Modern staircase",
        props: ["geometric railings", "steps"],
        camera: { lens: "28mm", angle: "emphasize geometry", distance: "medium" },
        lighting: {
            type: "ambient building light",
            direction: "overhead",
            quality: "clean, directional"
        },
        depth: {
            foreground: "subject on stairs",
            midground: "stair structure",
            background: "architecture"
        },
        validation: {
            required_elements: ["geometric lines"],
            forbidden_elements: ["clutter"]
        }
    },
    {
        id: "parking_structure",
        label: "Parking Structure",
        category: "urban",
        location: "Modern parking garage",
        props: ["concrete columns", "clean space"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "open shade",
            direction: "ambient from openings",
            quality: "even, soft"
        },
        depth: {
            foreground: "subject",
            midground: "columns",
            background: "parking depth"
        },
        validation: {
            required_elements: ["architectural repetition"],
            forbidden_elements: ["cars", "mess"]
        }
    },
    {
        id: "metro_platform",
        label: "Metro Platform – Clean",
        category: "urban",
        location: "Modern metro station",
        props: ["platform", "clean design"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "even overhead",
            direction: "ceiling fixtures",
            quality: "clean, neutral"
        },
        depth: {
            foreground: "subject waiting",
            midground: "platform",
            background: "station architecture"
        },
        validation: {
            required_elements: ["station context"],
            forbidden_elements: ["crowds", "dirt"]
        }
    },
    {
        id: "bridge_evening",
        label: "Bridge – Evening Light",
        category: "urban",
        location: "Pedestrian bridge",
        props: ["city lights", "evening sky"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "blue hour with city lights",
            direction: "background glow",
            quality: "atmospheric"
        },
        depth: {
            foreground: "subject on bridge",
            midground: "bridge structure",
            background: "city bokeh"
        },
        validation: {
            required_elements: ["city lights bokeh"],
            forbidden_elements: ["harsh lights"]
        }
    },
    {
        id: "alley_sunlight_shaft",
        label: "Alley – Sunlight Shaft",
        category: "urban",
        location: "Narrow clean alley",
        props: ["buildings", "light shaft"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "direct sunlight shaft",
            direction: "from gap above",
            quality: "dramatic contrast"
        },
        depth: {
            foreground: "subject in light",
            midground: "alley walls",
            background: "alley depth"
        },
        validation: {
            required_elements: ["light shaft"],
            forbidden_elements: ["trash", "graffiti"]
        }
    },
    {
        id: "glass_facade",
        label: "Glass Building Facade",
        category: "urban",
        location: "Modern glass building",
        props: ["reflective glass", "city reflection"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "overcast",
            direction: "diffused",
            quality: "soft reflections"
        },
        depth: {
            foreground: "subject",
            midground: "glass wall",
            background: "reflected city"
        },
        validation: {
            required_elements: ["glass reflections"],
            forbidden_elements: ["harsh glare"]
        }
    },
    {
        id: "courtyard_heritage",
        label: "Heritage Courtyard",
        category: "urban",
        location: "Historic courtyard",
        props: ["stone floor", "archways"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "dappled daylight",
            direction: "filtered from above",
            quality: "soft, warm"
        },
        depth: {
            foreground: "subject",
            midground: "courtyard floor",
            background: "archway"
        },
        validation: {
            required_elements: ["heritage architecture"],
            forbidden_elements: ["modern elements"]
        }
    }
]

// ═══════════════════════════════════════════════════════════════════════════════
// CELEBRATION / EVENT (10)
// ═══════════════════════════════════════════════════════════════════════════════

const CELEBRATION_PRESETS: PremiumPreset[] = [
    {
        id: "celebration_evening_bokeh",
        label: "Celebration – Evening Bokeh",
        category: "celebration",
        location: "Indoor celebration space",
        props: ["warm lights", "soft decor"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "practical lights",
            direction: "background bokeh",
            quality: "warm, festive"
        },
        depth: {
            foreground: "subject",
            midground: "soft decor",
            background: "light bokeh"
        },
        validation: {
            required_elements: ["bokeh lights"],
            forbidden_elements: ["studio flash"]
        }
    },
    {
        id: "wedding_guest_elegant",
        label: "Wedding Guest – Elegant",
        category: "celebration",
        location: "Wedding venue",
        props: ["floral decor", "warm lighting"],
        camera: { lens: "85mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "venue chandeliers",
            direction: "ambient overhead",
            quality: "warm, romantic"
        },
        depth: {
            foreground: "subject",
            midground: "decor elements",
            background: "venue blur"
        },
        validation: {
            required_elements: ["warm venue light"],
            forbidden_elements: ["harsh flash"]
        }
    },
    {
        id: "birthday_dinner",
        label: "Birthday Dinner",
        category: "celebration",
        location: "Restaurant private dining",
        props: ["candles", "table setting"],
        camera: { lens: "50mm", angle: "seated", distance: "medium" },
        lighting: {
            type: "candlelight ambient",
            direction: "table up-light",
            quality: "warm, intimate"
        },
        depth: {
            foreground: "table",
            midground: "subject",
            background: "restaurant"
        },
        validation: {
            required_elements: ["candle light"],
            forbidden_elements: ["childish decor"]
        }
    },
    {
        id: "rooftop_night_city",
        label: "Rooftop Night – City",
        category: "celebration",
        location: "Rooftop lounge",
        props: ["city skyline", "lounge seating"],
        camera: { lens: "35mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "city lights and ambient",
            direction: "background glow",
            quality: "atmospheric, cool"
        },
        depth: {
            foreground: "subject",
            midground: "lounge",
            background: "city skyline bokeh"
        },
        validation: {
            required_elements: ["city night lights"],
            forbidden_elements: ["harsh club lighting"]
        }
    },
    {
        id: "diwali_home",
        label: "Diwali – Home",
        category: "celebration",
        location: "Home with Diwali decor",
        props: ["diyas", "rangoli", "candles"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "diya light",
            direction: "multiple small sources",
            quality: "warm, golden"
        },
        depth: {
            foreground: "subject",
            midground: "decor",
            background: "home interior"
        },
        validation: {
            required_elements: ["diya light"],
            forbidden_elements: ["harsh flash"]
        }
    },
    {
        id: "cocktail_party",
        label: "Cocktail Party",
        category: "celebration",
        location: "Upscale bar/lounge",
        props: ["bar", "ambient lighting"],
        camera: { lens: "50mm", angle: "standing", distance: "medium" },
        lighting: {
            type: "bar ambient",
            direction: "practical lights",
            quality: "warm, sophisticated"
        },
        depth: {
            foreground: "subject",
            midground: "bar area",
            background: "lounge depth"
        },
        validation: {
            required_elements: ["ambient bar light"],
            forbidden_elements: ["harsh flash"]
        }
    },
    {
        id: "festive_string_lights",
        label: "Festive String Lights",
        category: "celebration",
        location: "Celebratory space",
        props: ["fairy lights", "elegant decor"],
        camera: { lens: "50mm", angle: "eye-level", distance: "chest-up" },
        lighting: {
            type: "fairy lights",
            direction: "background",
            quality: "soft, magical"
        },
        depth: {
            foreground: "subject",
            midground: "light blur",
            background: "fairy light bokeh"
        },
        validation: {
            required_elements: ["string light bokeh"],
            forbidden_elements: ["daylight"]
        }
    },
    {
        id: "new_year_elegant",
        label: "New Year – Elegant",
        category: "celebration",
        location: "Elegant venue",
        props: ["champagne setting", "sparkle"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "party ambient with accents",
            direction: "mixed warm",
            quality: "festive, sophisticated"
        },
        depth: {
            foreground: "subject",
            midground: "party setting",
            background: "venue with lights"
        },
        validation: {
            required_elements: ["festive atmosphere"],
            forbidden_elements: ["plastic decor"]
        }
    },
    {
        id: "sangeet_colorful",
        label: "Sangeet – Colorful",
        category: "celebration",
        location: "Sangeet venue",
        props: ["colorful drapes", "stage lights"],
        camera: { lens: "50mm", angle: "eye-level", distance: "medium" },
        lighting: {
            type: "colorful event lighting",
            direction: "stage and ambient",
            quality: "vibrant, warm-dominant"
        },
        depth: {
            foreground: "subject",
            midground: "dance floor",
            background: "stage/drapes"
        },
        validation: {
            required_elements: ["colorful lighting"],
            forbidden_elements: ["spotlight on face"]
        }
    },
    {
        id: "mehendi_afternoon",
        label: "Mehendi – Afternoon",
        category: "celebration",
        location: "Mehendi ceremony",
        props: ["cushions", "floral decor"],
        camera: { lens: "35mm", angle: "seated", distance: "medium" },
        lighting: {
            type: "filtered daylight",
            direction: "through shamiana",
            quality: "soft, warm"
        },
        depth: {
            foreground: "subject",
            midground: "mehendi setup",
            background: "tent/decor"
        },
        validation: {
            required_elements: ["soft filtered light"],
            forbidden_elements: ["harsh sun"]
        }
    }
]

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT ALL PREMIUM PRESETS (50 TOTAL)
// ═══════════════════════════════════════════════════════════════════════════════

export const PREMIUM_PRESETS: PremiumPreset[] = [
    ...STUDIO_PRESETS,
    ...LIFESTYLE_PRESETS,
    ...URBAN_PRESETS,
    ...CELEBRATION_PRESETS
]

/**
 * Get premium preset by ID
 */
export function getPremiumPreset(id: string): PremiumPreset | undefined {
    return PREMIUM_PRESETS.find(p => p.id === id)
}

/**
 * Get presets by category
 */
export function getPremiumPresetsByCategory(category: PremiumPreset['category']): PremiumPreset[] {
    return PREMIUM_PRESETS.filter(p => p.category === category)
}

/**
 * Build structural scene block from premium preset
 */
export function buildPremiumSceneBlock(preset: PremiumPreset): string {
    return `SCENE SPECIFICATION: ${preset.label}

LOCATION: ${preset.location}
PROPS: ${preset.props.join(', ')}

CAMERA:
- Lens: ${preset.camera.lens}
- Angle: ${preset.camera.angle}
- Distance: ${preset.camera.distance}

LIGHTING:
- Type: ${preset.lighting.type}
- Direction: ${preset.lighting.direction}
- Quality: ${preset.lighting.quality}

DEPTH LAYERS:
- Foreground: ${preset.depth.foreground}
- Midground: ${preset.depth.midground}
- Background: ${preset.depth.background}

VALIDATION:
- Required: ${preset.validation.required_elements.join(', ')}
- Forbidden: ${preset.validation.forbidden_elements.join(', ')}`
}

/**
 * Validate if preset elements are present (for retry logic)
 */
export function validatePresetElements(
    preset: PremiumPreset,
    outputDescription: string
): { valid: boolean; missing: string[]; forbidden_present: string[] } {
    const missing: string[] = []
    const forbidden_present: string[] = []
    const lower = outputDescription.toLowerCase()

    // Check required elements
    for (const element of preset.validation.required_elements) {
        if (!lower.includes(element.toLowerCase())) {
            missing.push(element)
        }
    }

    // Check forbidden elements
    for (const element of preset.validation.forbidden_elements) {
        if (lower.includes(element.toLowerCase())) {
            forbidden_present.push(element)
        }
    }

    return {
        valid: missing.length === 0 && forbidden_present.length === 0,
        missing,
        forbidden_present
    }
}

// Log count for verification
console.log(`🎬 Loaded ${PREMIUM_PRESETS.length} premium structural presets`)
