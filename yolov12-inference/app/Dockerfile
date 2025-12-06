# Pull the base image with python 3.13 as a runtime for your Lambda
FROM public.ecr.aws/lambda/python:3.13

# Copy the earlier created app.py and requirements.txt files to the container
COPY app.py inference.py requirements.txt ./
COPY model ./model

# Install the python requirements from requirements.txt
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Set the CMD to your handler
CMD ["app.lambda_handler"]
