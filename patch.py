# -*- coding: utf-8 -*-
import pathlib
path=pathlib.Path('src/lib/tryon/production-tryon-pipeline.ts')
text=path.read_text(encoding='utf-8')
old="        if (identitySafe) {"
start=text.find(old)
if start == -1:
    raise SystemExit('marker not found')
end=text.find('\n        } else {', start)
if end == -1:
    raise SystemExit('end marker not found')
replacement="        if (pixelCorrectionEnabled) {\n            // DO NOT TOUCH \u2013 IDENTITY INVARIANT\n            // Eyes are read-only biometric pixels copied from Image 1.\n            const eyeAuthorityRule = 'Eyes are read-only biometric pixels copied from Image 1.'\n            console.log(`EYE AUTHORITY LOCK: ${eyeAuthorityRule}`)\n            eyePixelData = await extractEyeRegionPixels(originalImageBuffer)\n            if (!eyePixelData) {\n                stages.push({\n                    stage: 1,\n                    name: 'Face Pixel Extraction',\n                    status: 'FAIL',\n                    timeMs: Date.now() - stage1Start,\n                    data: { error: 'Eye-region extraction failed' }\n                })\n\n                return {\n                    success: false,\n                    image: '',\n                    status: 'FAIL',\n                    warnings: ['Eye-region lock failed. Please use an image with clear visible eyes.'],\n                    debug: { stages, totalTimeMs: Date.now() - startTime, faceOverwritten: false }\n                }\n            }\n\n            stages.push({\n                stage: 1,\n                name: 'Face Pixel Extraction',\n                status: 'PASS',\n                timeMs: Date.now() - stage1Start,\n                data: { eyeBox: eyePixelData.box, mode: 'identitySafe-eye-lock' }\n            })\n        } else if (identitySafe) {\n            stages.push({\n                stage: 1,\n                name: 'Face Pixel Extraction',\n                status: 'SKIP',\n                timeMs: Date.now() - stage1Start,\n                data: { reason: 'pixel correction disabled for nano-banana-pro' }\n            })\n        }\n"
text=text[:start]+replacement+text[end+1:]
path.write_text(text, encoding='utf-8')
