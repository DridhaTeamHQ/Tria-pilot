export interface AIInfluencer {
    id: string
    name: string
    category: 'editorial' | 'casual' | 'luxury' | 'streetwear' | 'athletic' | 'creative'
    gender: 'male' | 'female' | 'unisex' | 'other'
    style: string
    thumbnail: string // emoji for UI
    visual_description?: string // Prompt description for generation
    imageUrl?: string // Optional real reference image
}

export const AI_INFLUENCERS: AIInfluencer[] = [
    // Standards
    {
        id: 'editorial_female_01',
        name: 'Aria',
        category: 'editorial',
        gender: 'female',
        style: 'High Fashion',
        thumbnail: '👩‍🦰',
        visual_description: 'A sophisticated female high-fashion model with striking features, poised elegance, sharp shadows.'
    },
    { id: 'editorial_female_02', name: 'Nova', category: 'editorial', gender: 'female', style: 'Minimalist', thumbnail: '👩', visual_description: 'A minimalist female model, clean lines, neutral expression, modern aesthetic.' },
    { id: 'casual_female_01', name: 'Maya', category: 'casual', gender: 'female', style: 'Everyday', thumbnail: '👧', visual_description: 'A friendly girl-next-door type, approachable, warm lighting, casual styling.' },
    { id: 'luxury_female_01', name: 'Serena', category: 'luxury', gender: 'female', style: 'Elegant', thumbnail: '👸', visual_description: 'A wealthy luxury lifestyle model, refined posture, expensive jewelry/clothing presence.' },
    { id: 'streetwear_female_01', name: 'Kai', category: 'streetwear', gender: 'female', style: 'Urban', thumbnail: '🧑‍🎤', visual_description: 'A cool urban streetwear model, edgy vibe, graffiti or city background context.' },
    { id: 'athletic_female_01', name: 'Jordan', category: 'athletic', gender: 'female', style: 'Sporty', thumbnail: '🏃‍♀️', visual_description: 'A fit athletic female model, energetic pose, gym or track context.' },
    { id: 'editorial_male_01', name: 'Marcus', category: 'editorial', gender: 'male', style: 'Classic', thumbnail: '👨', visual_description: 'A classic male editorial model, strong jawline, tailored suit or high-end fashion.' },
    { id: 'casual_male_01', name: 'Leo', category: 'casual', gender: 'male', style: 'Relaxed', thumbnail: '🧑', visual_description: 'A relaxed male model, weekend vibes, comfortable clothing.' },
    { id: 'streetwear_male_01', name: 'Dex', category: 'streetwear', gender: 'male', style: 'Hypebeast', thumbnail: '🧑‍🎤', visual_description: 'A trendy male streetwear model, hypebeast style, bold accessories.' },

    // New Creative / Hybrid Types
    {
        id: 'hybrid_ant_01',
        name: 'Ant Man',
        category: 'creative',
        gender: 'other',
        style: 'Insectoid',
        thumbnail: '🐜',
        visual_description: 'A creative conceptual human-ant hybrid, exoskeleton textures integrated into fashion, compound eye motifs, strong micro-world aesthetic.'
    },
    { id: 'hybrid_bee_01', name: 'Bee Keeper', category: 'creative', gender: 'other', style: 'Hive Mind', thumbnail: '🐝', visual_description: 'A human-bee hybrid fashion concept, hexagonal patterns in clothing, golden honey hues, fuzzy textures.' },
    {
        id: 'hybrid_octopus_01',
        name: 'Octo',
        category: 'creative',
        gender: 'other',
        style: 'Cephalopod',
        thumbnail: '🐙',
        visual_description: 'A surreal human-octopus hybrid model, elegant tentacles flowing as part of the outfit or hair, iridescent wet skin texture, deep sea color palette.'
    },
    { id: 'hybrid_crocodile_01', name: 'Croc', category: 'creative', gender: 'other', style: 'Reptilian', thumbnail: '🐊', visual_description: 'A rough-textured human-crocodile hybrid, green scales mixed with leather fashion, sharp gaze.' },
    { id: 'hybrid_iguana_01', name: 'Iggy', category: 'creative', gender: 'other', style: 'Scaled', thumbnail: '🦎', visual_description: 'A vibrant human-iguana hybrid, colorful scales, spiky silhouette, exotic tropical vibe.' },
    { id: 'hybrid_alien_01', name: 'Xenon', category: 'creative', gender: 'other', style: 'Extraterrestrial', thumbnail: '👽', visual_description: 'A high-fashion extraterrestrial humanoid, pale or metallic skin, large eyes, futuristic avant-garde styling.' },
    { id: 'hybrid_beetle_01', name: 'Carapace', category: 'creative', gender: 'other', style: 'Armored', thumbnail: '🪲', visual_description: 'A glossy armored beetle-human hybrid, iridescent carapace fashion, sleek and robotic aesthetic.' },
    { id: 'hybrid_elf_01', name: 'Elara', category: 'creative', gender: 'female', style: 'Fantasy', thumbnail: '🧝‍♀️', visual_description: 'A high-fantasy elf model, pointed ears, ethereal lighting, forest magic aesthetic.' },
    { id: 'hybrid_amphibian_01', name: 'Froggy', category: 'creative', gender: 'other', style: 'Amphibious', thumbnail: '🐸', visual_description: 'A sleek amphibious human-frog hybrid, smooth skin, vibrant toxic colors, futuristic streetwear.' },
]
