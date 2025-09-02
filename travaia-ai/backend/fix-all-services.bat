@echo off
REM TRAVAIA Service Dependencies Fix Script
REM Fixes missing dependencies across all services

setlocal enabledelayedexpansion

echo ========================================
echo TRAVAIA Service Dependencies Fix
echo ========================================
echo Fixing missing dependencies in all services...
echo.

REM Fix AI Engine Service
echo [1/8] Fixing AI Engine Service dependencies...
cd ..\ai-engine-service
echo google-cloud-vertexai==1.38.0 >> requirements.txt
echo python-jose[cryptography]==3.3.0 >> requirements.txt
cd ..\deploy-individual

REM Fix Analytics Growth Service
echo [2/8] Fixing Analytics Growth Service dependencies...
cd ..\analytics-growth-service
echo requests==2.31.0 >> requirements.txt
echo google-cloud-vertexai==1.38.0 >> requirements.txt
echo python-jose[cryptography]==3.3.0 >> requirements.txt
cd ..\deploy-individual

REM Fix Application Job Service
echo [3/8] Fixing Application Job Service dependencies...
cd ..\application-job-service
echo requests==2.31.0 >> requirements.txt
echo google-cloud-vertexai==1.38.0 >> requirements.txt
echo python-jose[cryptography]==3.3.0 >> requirements.txt
cd ..\deploy-individual

REM Fix CareerGPT Coach Service
echo [4/8] Fixing CareerGPT Coach Service dependencies...
cd ..\careergpt-coach-service
echo requests==2.31.0 >> requirements.txt
echo google-cloud-vertexai==1.38.0 >> requirements.txt
echo python-jose[cryptography]==3.3.0 >> requirements.txt
cd ..\deploy-individual

REM Fix Document Report Service
echo [5/8] Fixing Document Report Service dependencies...
cd ..\document-report-service
echo requests==2.31.0 >> requirements.txt
echo google-cloud-vertexai==1.38.0 >> requirements.txt
echo python-jose[cryptography]==3.3.0 >> requirements.txt
cd ..\deploy-individual

REM Fix Interview Session Service
echo [6/8] Fixing Interview Session Service dependencies...
cd ..\interview-session-service
echo requests==2.31.0 >> requirements.txt
echo google-cloud-vertexai==1.38.0 >> requirements.txt
echo python-jose[cryptography]==3.3.0 >> requirements.txt
cd ..\deploy-individual

REM Fix Voice Processing Service
echo [7/8] Fixing Voice Processing Service dependencies...
cd ..\voice-processing-service
echo requests==2.31.0 >> requirements.txt
echo google-cloud-vertexai==1.38.0 >> requirements.txt
echo python-jose[cryptography]==3.3.0 >> requirements.txt
cd ..\deploy-individual

REM Fix API Gateway
echo [8/8] Fixing API Gateway dependencies...
cd ..\api-gateway
echo requests==2.31.0 >> requirements.txt
echo google-cloud-vertexai==1.38.0 >> requirements.txt
echo python-jose[cryptography]==3.3.0 >> requirements.txt
cd ..\deploy-individual

echo.
echo ✅ All service dependencies fixed!
echo.
echo Now deploying all services with fixes...
echo.

REM Deploy all services with fixes
call deploy-all-sequential.bat

echo.
echo ========================================
echo Service Fix and Deployment Complete
echo ========================================
