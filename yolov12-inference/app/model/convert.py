from ultralytics.models import YOLO

yolo12s = YOLO('yolo12s.pt')
yolo12m = YOLO('yolo12m.pt')
yolo12l = YOLO('yolo12l.pt')

yolo12s.export(format='onnx', batch=4, dynamic=True, nms=True, device='cpu')
yolo12m.export(format='onnx', batch=4, dynamic=True, nms=True, device='cpu')
yolo12l.export(format='onnx', batch=4, dynamic=True, nms=True, device='cpu')
