import gdown
import os
import cv2
import numpy as np
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS

# Google Drive file IDs
MODEL_URLS = {
    "model2.sav": "1bw45vogt3UC1mFfLs57bpNLIRUqFj3Q-"
}

# Ensure model files are present
for model_name, file_id in MODEL_URLS.items():
    if not os.path.exists(model_name):
        print(f"Downloading {model_name} from Google Drive...")
        gdown.download(f"https://drive.google.com/uc?id={file_id}", model_name, quiet=False)

print("Models are ready!")


# Load face detector and model
haar = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
model = joblib.load('model2.sav')

app = Flask(__name__)
CORS(app)

def detect_face_mask(img):
    y_pred = model.predict(img.reshape(1, 224, 224, 3))
    return "No Mask" if y_pred[0][0] > 0.5 else "Mask"

def detect_face(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = haar.detectMultiScale(gray)
    return faces

@app.route('/detect', methods=['POST'])
def detect():
    try:
        # Receive frame from frontend
        file = request.files['image']
        img_array = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        faces = detect_face(img)
        if len(faces) > 0:
            x, y, w, h = faces[0]  # Get coordinates of the first detected face
            img = img[y:y+h, x:x+w]  # Crop the face from the image

        img_resized = cv2.resize(img, (224, 224))
        mask_status = detect_face_mask(img_resized)

        faces_list = [{"x": int(x), "y": int(y), "w": int(w), "h": int(h)} for (x, y, w, h) in faces]
        print(f"Detected faces: {faces_list}")
        print(f"Mask status: {mask_status}")
        return jsonify({"faces": faces_list, "mask_status": mask_status})
    
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
