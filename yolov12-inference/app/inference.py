import numpy as np
import onnxruntime
import PIL.Image as Image

__all__ = ['get_classname', 'run_inference']

ClassNames = [
    'person',
    'bicycle',
    'car',
    'motorcycle',
    'airplane',
    'bus',
    'train',
    'truck',
    'boat',
    'traffic light',
    'fire hydrant',
    'stop sign',
    'parking meter',
    'bench',
    'bird',
    'cat',
    'dog',
    'horse',
    'sheep',
    'cow',
    'elephant',
    'bear',
    'zebra',
    'giraffe',
    'backpack',
    'umbrella',
    'handbag',
    'tie',
    'suitcase',
    'frisbee',
    'skis',
    'snowboard',
    'sports ball',
    'kite',
    'baseball bat',
    'baseball glove',
    'skateboard',
    'surfboard',
    'tennis racket',
    'bottle',
    'wine glass',
    'cup',
    'fork',
    'knife',
    'spoon',
    'bowl',
    'banana',
    'apple',
    'sandwich',
    'orange',
    'broccoli',
    'carrot',
    'hot dog',
    'pizza',
    'donut',
    'cake',
    'chair',
    'couch',
    'potted plant',
    'bed',
    'dining table',
    'toilet',
    'tv',
    'laptop',
    'mouse',
    'remote',
    'keyboard',
    'cell phone',
    'microwave',
    'oven',
    'toaster',
    'sink',
    'refrigerator',
    'book',
    'clock',
    'vase',
    'scissors',
    'teddy bear',
    'hair drier',
    'toothbrush',
]

YOLOv12sPath = 'model/yolo12s.onnx'
YOLOv12mPath = 'model/yolo12m.onnx'
YOLOv12lPath = 'model/yolo12l.onnx'


def get_classname(class_id: int):
    return ClassNames[class_id]


def preprocess(pil_img: Image.Image):
    width, height = pil_img.size

    # Resize to nearest multiple of 32
    if width % 32 != 0 or height % 32 != 0:
        new_w = (width // 32) * 32
        new_h = (height // 32) * 32
        pil_img = pil_img.resize((new_w, new_h), resample=Image.Resampling.LANCZOS)

    img = np.asarray(pil_img)
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))

    # Add batch dimension
    input_img = np.expand_dims(img, axis=0)  # size: (1, 3, H, W)
    input_shape = input_img.shape[2], input_img.shape[3]

    result = dict(
        input_img=input_img,
        input_shape=input_shape,
        original_shape=(height, width),
    )
    return result


def run_inference(model_name: str, img: Image.Image):
    # 1. Initialize ONNX Runtime session
    match model_name:
        case 'yolov12-small':
            model = onnxruntime.InferenceSession(YOLOv12sPath)
        case 'yolov12-medium':
            model = onnxruntime.InferenceSession(YOLOv12mPath)
        case 'yolov12-large':
            model = onnxruntime.InferenceSession(YOLOv12lPath)
        case _:
            return -1

    # 2. Preprocess the image
    result = preprocess(img)
    h_original, w_original = result['original_shape']
    h_input, w_input = result['input_shape']
    input_img = result['input_img']

    # 3. Run inference
    input_name = model.get_inputs()[0].name
    output_name = model.get_outputs()[0].name
    output_data = model.run([output_name], {input_name: input_img})[0]

    # 4. Post-process the output
    output_data = np.asarray(output_data)
    final_detections = np.squeeze(output_data)

    # check if there are no detections
    if final_detections.ndim == 1:
        if final_detections.size == 0:
            return 0
        else:
            final_detections = np.expand_dims(final_detections, axis=0)

    # 5. Draw detections on the original image
    for i in range(final_detections.shape[0]):
        # [x1, y1, x2, y2, confidence, class_id]
        x1, y1, x2, y2 = final_detections[i, :4]
        # Map coordinates back to original image size
        x1 = int(x1 * w_original / w_input)
        y1 = int(y1 * h_original / h_input)
        x2 = int(x2 * w_original / w_input)
        y2 = int(y2 * h_original / h_input)
        final_detections[i, :4] = np.array([x1, y1, x2, y2])

    return final_detections
