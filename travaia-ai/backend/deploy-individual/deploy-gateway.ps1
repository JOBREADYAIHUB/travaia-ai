$PROJECT_ID = "travaia-e1310"
$REGION = "us-central1"
$GATEWAY_ID = "travaia-managed-gateway"
$API_ID = "travaia-api"

Write-Host "Starting API Gateway deployment..." -ForegroundColor Green
Write-Host "Project ID: $PROJECT_ID"
Write-Host "Region: $REGION"
Write-Host "Gateway ID: $GATEWAY_ID"
Write-Host "API ID: $API_ID"
Write-Host ""

try {
    Write-Host "Step 1: Enabling API Gateway service..." -ForegroundColor Yellow
    $result = gcloud services enable apigateway.googleapis.com --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to enable apigateway.googleapis.com" -ForegroundColor Red
        Write-Host $result
        exit $LASTEXITCODE
    }
    Write-Host "✓ API Gateway service enabled" -ForegroundColor Green

    Write-Host "Step 2: Enabling Service Management service..." -ForegroundColor Yellow
    $result = gcloud services enable servicemanagement.googleapis.com --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to enable servicemanagement.googleapis.com" -ForegroundColor Red
        Write-Host $result
        exit $LASTEXITCODE
    }
    Write-Host "✓ Service Management service enabled" -ForegroundColor Green

    Write-Host "Step 3: Enabling Service Control service..." -ForegroundColor Yellow
    $result = gcloud services enable servicecontrol.googleapis.com --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to enable servicecontrol.googleapis.com" -ForegroundColor Red
        Write-Host $result
        exit $LASTEXITCODE
    }
    Write-Host "✓ Service Control service enabled" -ForegroundColor Green

    Write-Host "Step 4: Checking if API exists..." -ForegroundColor Yellow
    $result = gcloud api-gateway apis describe $API_ID --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "API not found. Creating API..." -ForegroundColor Yellow
        $result = gcloud api-gateway apis create $API_ID --project=$PROJECT_ID 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to create API" -ForegroundColor Red
            Write-Host $result
            exit $LASTEXITCODE
        }
        Write-Host "✓ API created successfully" -ForegroundColor Green
    } else {
        Write-Host "✓ API already exists" -ForegroundColor Green
    }

    Write-Host "Step 5: Creating API config..." -ForegroundColor Yellow
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $API_CONFIG_ID = "travaia-api-config-$timestamp"
    Write-Host "Config ID: $API_CONFIG_ID"

    $result = gcloud api-gateway api-configs create $API_CONFIG_ID --api=$API_ID --project=$PROJECT_ID --openapi-spec="..\api-gateway\openapi.yaml" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create API config" -ForegroundColor Red
        Write-Host $result
        exit $LASTEXITCODE
    }
    Write-Host "✓ API config created successfully" -ForegroundColor Green

    Write-Host "Step 6: Checking for existing gateway..." -ForegroundColor Yellow
    $result = gcloud api-gateway gateways describe $GATEWAY_ID --location=$REGION --project=$PROJECT_ID 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Gateway exists. Updating..." -ForegroundColor Yellow
        $result = gcloud api-gateway gateways update $GATEWAY_ID --api=$API_ID --api-config=$API_CONFIG_ID --location=$REGION --project=$PROJECT_ID 2>&1
    } else {
        Write-Host "Gateway not found. Creating..." -ForegroundColor Yellow
        $result = gcloud api-gateway gateways create $GATEWAY_ID --api=$API_ID --api-config=$API_CONFIG_ID --location=$REGION --project=$PROJECT_ID 2>&1
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create/update gateway" -ForegroundColor Red
        Write-Host $result
        exit $LASTEXITCODE
    }
    Write-Host "✓ Gateway created/updated successfully" -ForegroundColor Green

    Write-Host "Step 7: Fetching gateway URL..." -ForegroundColor Yellow
    $GATEWAY_URL = gcloud api-gateway gateways describe $GATEWAY_ID --location=$REGION --project=$PROJECT_ID --format="value(defaultHostname)" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to get gateway URL" -ForegroundColor Red
        Write-Host $GATEWAY_URL
        exit $LASTEXITCODE
    }

    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host "API Gateway Deployment Complete!" -ForegroundColor Green
    Write-Host "Gateway URL: https://$GATEWAY_URL" -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Green

} catch {
    Write-Host "ERROR: An unexpected error occurred" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
