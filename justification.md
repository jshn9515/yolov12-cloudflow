# Written Justification

## Amazon CloudFront

We selected Amazon CloudFront to serve our React single-page application because it provides globally distributed caching that greatly reduces latency across different regions. Compared with hosting the frontend on EC2, CloudFront eliminates server management, scales automatically, and integrates seamlessly with HTTPS and WAF, making it a more cost-effective and performant choice for static asset delivery.

## Amazon S3

S3 is used for hosting the static website and storing uploaded inference images because it offers durable, infinitely scalable, pay-as-you-go object storage without requiring any infrastructure management. Using separate buckets for frontend assets and image storage further enhances data organization and security while keeping operations simple.

## Amazon WAF

We placed WAF in front of CloudFront to protect the application from common web attacks such as SQL injection and XSS. Compared with manually configuring firewall rules or operating IDS/IPS systems on EC2, WAF provides managed, automatically updated protection with far less operational overhead, making it the most efficient way to secure our public-facing endpoints.

## Amazon Cognito

Amazon Cognito handles user authentication because it offers secure, fully managed sign-up, sign-in, and token issuance without requiring us to build a custom authentication backend. Cognito reduces security risks, issues JWT tokens natively, integrates directly with API Gateway, and removes the need for maintaining authentication servers, which significantly simplifies user management in a serverless architecture.

## Amazon API Gateway

API Gateway exposes our `/inference` and `/query` endpoints and was chosen over running an API on EC2 or ECS because it provides built-in authentication support, TLS termination, request throttling, and native logging and monitoring. For an event-driven system, these managed capabilities eliminate the need for provisioning and maintaining backend servers while simplifying API operations.

## AWS Lambda

All backend compute, including inference and querying, runs on AWS Lambda because our workload is event-driven with unpredictable traffic patterns. Lambda scales automatically, charges only for execution time, and removes the burden of managing servers or autoscaling policies, making it more cost-efficient and operationally lightweight than EC2 for this use case.

## Amazon DynamoDB

DynamoDB stores inference metadata and results because our access patterns are simple, key-value-based, and do not require relational queries. Compared with RDS, DynamoDB offers low-latency reads, automatic scaling, and zero maintenance while integrating naturally with serverless workflows, which aligns well with the system’s high-scalability and low-overhead requirements.

## Amazon CloudWatch

CloudWatch is used for logging and monitoring because it provides native integration with Lambda and API Gateway, enabling us to track performance metrics, detect errors, and debug execution without deploying a separate monitoring stack. This avoids the complexity of maintaining an ELK or Prometheus/Grafana system while still giving full visibility into system behavior.

## Amazon ECR

We selected Amazon ECR for storing the YOLOv12 inference container image because it integrates directly with Lambda and IAM, simplifies permission management, and avoids authentication or rate-limit issues associated with external registries like Docker Hub or GitHub Packages. This ensures secure, seamless, and consistent deployments across environments.

## AWS SAM & CloudFormation

AWS SAM and CloudFormation are used to define and deploy our infrastructure as code because they ensure consistent, reproducible environments and reduce errors associated with manual configuration. Their tight integration with CI/CD pipelines such as GitHub Actions allows automated deployments and version-controlled infrastructure, greatly improving maintainability and development efficiency.
