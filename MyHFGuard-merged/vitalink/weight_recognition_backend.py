import sys
import cv2
import pytesseract
import json
import re

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

image_path = sys.argv[1]

img = cv2.imread(image_path)

if img is None:
    print(json.dumps({"error": "Image not found"}))
    sys.exit(0)

# enlarge image
img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

# grayscale
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# reduce noise
gray = cv2.GaussianBlur(gray, (3, 3), 0)

# increase contrast
gray = cv2.equalizeHist(gray)

# threshold to make digits clearer
_, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

# OCR config: digits and decimal point only
config = r'--oem 3 --psm 7 -c tessedit_char_whitelist=0123456789.'

try:
    text = pytesseract.image_to_string(thresh, config=config)
except Exception as e:
    print(json.dumps({"error": f"Tesseract OCR failed: {str(e)}"}))
    sys.exit(0)

print("RAW OCR:", text)

# accept 2-3 digits with optional decimal
match = re.search(r'(\d{2,3}(?:\.\d)?)', text)

if match:
    weight = match.group(1)
    print(json.dumps({
        "weight": weight,
        "rawText": text
    }))
else:
    print(json.dumps({
        "error": "Weight not detected",
        "rawText": text
    }))