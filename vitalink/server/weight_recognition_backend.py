import sys
import cv2
import pytesseract
import json
import re
import numpy as np

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def output(data, code=0):
    print(json.dumps(data))
    sys.exit(code)


def normalize_text(text):
    if not text:
        return ""
    return (
        text.strip()
        .replace("O", "0")
        .replace("o", "0")
        .replace("B", "8")
        .replace("b", "8")
        .replace("S", "5")
        .replace("s", "5")
        .replace(",", ".")
    )


def extract_candidates(text):
    text = normalize_text(text)
    matches = re.findall(r"\d{2,3}(?:\.\d{1,2})?", text)
    values = []

    for m in matches:
        try:
            v = float(m)
            if 20 <= v <= 300:
                values.append(v)
        except:
            pass

    return values


def preprocess_variants(img):
    variants = []

    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    gray = cv2.resize(gray, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)

    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    eq = cv2.equalizeHist(blur)

    _, otsu = cv2.threshold(eq, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    _, inv_otsu = cv2.threshold(eq, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    adaptive = cv2.adaptiveThreshold(
        eq, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    adaptive_inv = cv2.adaptiveThreshold(
        eq, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
    )

    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpen = cv2.filter2D(eq, -1, kernel)

    variants.append(("gray", gray))
    variants.append(("eq", eq))
    variants.append(("otsu", otsu))
    variants.append(("inv_otsu", inv_otsu))
    variants.append(("adaptive", adaptive))
    variants.append(("adaptive_inv", adaptive_inv))
    variants.append(("sharpen", sharpen))

    return variants


def run_ocr(img):
    configs = [
        r'--oem 3 --psm 7 -c tessedit_char_whitelist=0123456789.',
        r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789.',
        r'--oem 3 --psm 8 -c tessedit_char_whitelist=0123456789.',
        r'--oem 3 --psm 13 -c tessedit_char_whitelist=0123456789.',
    ]

    outputs = []
    for cfg in configs:
        try:
            txt = pytesseract.image_to_string(img, config=cfg).strip()
            txt = normalize_text(txt)
            if txt:
                outputs.append((cfg, txt))
        except:
            pass
    return outputs


def score_candidate(value, text, region_name):
    score = 0

    # realistic body weight preference
    if 30 <= value <= 200:
        score += 50

    # decimal format preferred
    if "." in text:
        score += 20

    # prefer main-left display region
    if region_name == "main_digits":
        score += 40
    elif region_name == "display":
        score += 20

    # avoid tiny side readings like temperature
    if value < 25:
        score -= 30

    return score


def get_regions(img):
    h, w = img.shape[:2]

    # Main display area roughly lower-middle
    display = img[int(h * 0.45):int(h * 0.90), int(w * 0.10):int(w * 0.95)]

    dh, dw = display.shape[:2]

    # Main big digits on left side only
    main_digits = display[int(dh * 0.15):int(dh * 0.95), int(dw * 0.00):int(dw * 0.72)]

    # Full image fallback
    return [
        ("main_digits", main_digits),
        ("display", display),
        ("full", img),
    ]


if len(sys.argv) < 2:
    output({"error": "No image path provided"}, 1)

image_path = sys.argv[1]
img = cv2.imread(image_path)

if img is None:
    output({"error": "Image not found"}, 1)

all_attempts = []
best = None
best_region_image = None

try:
    regions = get_regions(img)

    for region_name, region_img in regions:
        variants = preprocess_variants(region_img)

        for variant_name, variant_img in variants:
            ocr_results = run_ocr(variant_img)

            for cfg, txt in ocr_results:
                candidates = extract_candidates(txt)

                all_attempts.append({
                    "region": region_name,
                    "variant": variant_name,
                    "config": cfg,
                    "text": txt,
                    "candidates": candidates,
                })

                for value in candidates:
                    s = score_candidate(value, txt, region_name)

                    if (best is None) or (s > best["score"]):
                        best = {
                            "weight": value,
                            "score": s,
                            "rawText": txt,
                            "region": region_name,
                            "variant": variant_name,
                            "config": cfg,
                        }
                        best_region_image = region_img.copy()

except Exception as e:
    output({"error": f"Processing failed: {str(e)}"}, 1)

annotated_b64 = None
if best_region_image is not None:
    try:
        success, buffer = cv2.imencode(".jpg", best_region_image)
        if success:
            import base64
            annotated_b64 = base64.b64encode(buffer).decode("utf-8")
    except:
        annotated_b64 = None

if best:
    output({
        "weight": f"{best['weight']:.1f}",
        "detectedWeight": f"{best['weight']:.1f}",
        "rawText": best["rawText"],
        "region": best["region"],
        "variant": best["variant"],
        "annotatedImage": annotated_b64,
        "allAttempts": all_attempts
    }, 0)
else:
    output({
        "error": "Weight not detected",
        "rawText": "",
        "allAttempts": all_attempts
    }, 1)