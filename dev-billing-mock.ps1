param(
  [Parameter(Mandatory = $true)]
  [string]$UserId,

  [ValidateSet("grant", "trial", "past_due", "revoke")]
  [string]$Action = "grant",

  [string]$ApiBase = "https://api.litopc.com",

  [string]$AdminToken = $env:LITOPC_ADMIN_TOKEN,

  [int]$PeriodDays = 30,

  [string]$Source = "billing_webhook_mock"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $AdminToken) {
  throw "Admin token is required. Pass -AdminToken or set LITOPC_ADMIN_TOKEN."
}

$normalizedUserId = if ($UserId -match "^[a-z]+:") { $UserId } else { "hdr:$UserId" }

$body = switch ($Action) {
  "grant" {
    @{
      user_id = $normalizedUserId
      event_type = "invoice.paid"
      status = "active"
      period_days = $PeriodDays
      source = $Source
    }
  }
  "trial" {
    @{
      user_id = $normalizedUserId
      event_type = "customer.subscription.updated"
      status = "trialing"
      period_days = $PeriodDays
      source = $Source
    }
  }
  "past_due" {
    @{
      user_id = $normalizedUserId
      event_type = "customer.subscription.updated"
      status = "past_due"
      period_days = $PeriodDays
      source = $Source
    }
  }
  "revoke" {
    @{
      user_id = $normalizedUserId
      event_type = "customer.subscription.deleted"
      source = $Source
    }
  }
}

$response = Invoke-RestMethod `
  -Method Post `
  -Uri "$ApiBase/billing/webhook/mock" `
  -Headers @{ "x-litopc-admin-token" = $AdminToken } `
  -ContentType "application/json" `
  -Body ($body | ConvertTo-Json)

$response | ConvertTo-Json -Depth 8
