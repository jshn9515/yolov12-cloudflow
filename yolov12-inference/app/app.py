import base64
import io
import json
import os.path as osp
import time
import traceback
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import boto3
import PIL.Image as Image
import python_multipart.multipart as mp
import uuid6
from inference import get_classname, run_inference

s3 = boto3.client('s3')
db = boto3.resource('dynamodb')
BucketName = 'yolov12-images'


def float2decimal(number: Any, ndigits: int = 4):
    try:
        number = float(number)
        return Decimal(str(round(number, ndigits)))
    except Exception:
        return Decimal('0.0')


def parse_multipart(event: dict[str, Any]):
    if event.get('isBase64Encoded'):
        body_bytes = base64.b64decode(event['body'])
    else:
        body_bytes = event['body'].encode('utf-8')

    headers = event.get('headers') or {}
    headers = {k.lower(): v for k, v in headers.items()}
    content_type = headers.get('content-type')
    content_length = headers.get('content-length')
    mp_headers = {'Content-Type': content_type, 'Content-Length': content_length}

    fields, files = {}, {}

    def on_field(field: mp.Field):
        if field.field_name:
            fields[field.field_name] = field.value

    def on_file(file: mp.File):
        if file.field_name:
            file.file_object.seek(0)
            files[file.field_name] = {
                b'file_name': file.file_name,
                b'body': file.file_object.read(),
            }

    stream = io.BytesIO(body_bytes)
    mp.parse_form(mp_headers, stream, on_field, on_file)  # type: ignore

    return fields, files


def lambda_handler(event: dict[str, Any], context: object):
    """Sample pure Lambda function

    Parameters
    ----------
    event: dict, required
        API Gateway Lambda Proxy Input Format

        Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

    context: object, required
        Lambda Context runtime methods and attributes

        Context doc: https://docs.aws.amazon.com/lambda/latest/dg/python-context-object.html

    Returns
    ------
    API Gateway Lambda Proxy Output Format: dict

        Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
    """
    try:
        fields, files = parse_multipart(event)
        user_name = fields[b'user']
        model_name = fields[b'model']
        img = files[b'image'][b'body']
    except Exception:
        err = traceback.format_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Error parsing multipart/form-data:\n{err}'}),
        }

    user_name = str(user_name.decode('utf-8'))
    model_name = str(model_name.decode('utf-8'))
    img = Image.open(io.BytesIO(img)).convert('RGB')
    file_name = files[b'image'][b'file_name'].decode('utf-8')
    file_name = osp.splitext(osp.basename(file_name))[0]

    try:
        t1 = time.time()
        final_detections = run_inference(model_name, img)
        t2 = time.time()
    except Exception:
        err = traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Error during inference:\n{err}'}),
        }

    if isinstance(final_detections, int):
        if final_detections == -1:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid model name provided.'}),
            }

        if final_detections == 0:
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'No detections found in the image.'}),
            }

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)

    s3.put_object(
        Bucket=BucketName,
        Key=f'upload/{file_name}.png',
        Body=buffer.getvalue(),
        ContentType='image/png',
    )

    table1 = db.Table('yolov12-detections')
    detection_list = []
    file_id = str(uuid6.uuid7())

    for i, detection in enumerate(final_detections, start=1):
        x1, y1, x2, y2, conf, class_id = detection
        if conf > 0:
            item = {
                'file_id': file_id,  # primary key
                'bbox_id': i,  # sort key
                'label': get_classname(int(class_id)),
                'confidence': float2decimal(conf),
                'bbox': {
                    'x': int(x1),
                    'y': int(y1),
                    'width': int(x2 - x1),
                    'height': int(y2 - y1),
                },
                'status': 'complete',
            }
            table1.put_item(Item=item)
            item.update(
                {
                    'source': file_name,
                    'model': model_name,
                    'confidence': float(conf),
                    'color': 'border-green-500',
                }
            )
            detection_list.append(item)

    timestamp = datetime.now(timezone.utc)
    runtime = int((t2 - t1) * 1000)  # in milliseconds

    table2 = db.Table('yolov12-records')
    table2.put_item(
        Item={
            'user': user_name,  # primary key
            'file_id': file_id,  # sort key
            'source': file_name,
            'model': model_name,
            'status': 'complete' if runtime <= 20000 else 'timeout',
            'url': f'https://{BucketName}.s3.amazonaws.com/upload/{file_name}.png',
            'runtime': runtime,
            'timestamp': timestamp.strftime('%Y-%m-%dT%H:%M:%SZ'),
        }
    )

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': 'https://dv0l1l3woumqj.cloudfront.net',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        },
        'body': json.dumps({'detections': detection_list}),
    }
