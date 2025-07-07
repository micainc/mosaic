# infer_window.py
import sys
import json
import numpy as np
import tensorflow as tf
import os

# Load the model
script_dir = os.path.dirname(os.path.abspath(__file__))

# model_path = os.path.join(script_dir, '../models/unet3pv2_908_tr_815_va.keras')
model_path = os.path.join(script_dir, '../models/deeplabv4_pouya_CZI.keras')

model_path = os.path.normpath(model_path)
model = tf.keras.models.load_model(model_path)

def main():
    try:
        raw_input = sys.stdin.read()
        window = json.loads(raw_input)

        # Expect shape: [256, 256, 5]
        input_tensor = np.array(window, dtype=np.float32).reshape((1, 256, 256, 5))
        predictions = model.predict(input_tensor)  # Shape: [1, 256, 256, 86]

        # Reduce to list
        predictions = predictions[0].tolist()
        print(json.dumps({ "success": True, "predictions": predictions }))
        
    except Exception as e:
        print(json.dumps({ "success": False, "error": str(e) }))

if __name__ == "__main__":
    main()
