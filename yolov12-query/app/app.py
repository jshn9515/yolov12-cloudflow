import json
import traceback
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

db = boto3.resource('dynamodb')
table = db.Table('yolov12-records')


def decimal_serializer(obj: object) -> Any:
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    raise TypeError(f'Object of type {obj.__class__.__name__} is not JSON serializable')


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
        body = json.loads(event['body'])
        user_name = body['user']
    except Exception:
        err = traceback.format_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Error parsing input:\n{err}'}),
        }

    response = table.query(
        KeyConditionExpression=Key('user').eq(user_name),
        ScanIndexForward=False,  # newest first
        Limit=5,
    )
    items = response.get('Items', [])

    # remove user field from each item
    for item in items:
        del item['user']

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': 'https://dv0l1l3woumqj.cloudfront.net',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        },
        'body': json.dumps({'recent_runs': items}, default=decimal_serializer),
    }
