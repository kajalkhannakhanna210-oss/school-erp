# Create Supabase storage bucket 'id-card-designs' using SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL
# Usage: Set environment variables SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL, then run this script in PowerShell:
#    ./scripts/create-id-card-bucket.ps1

param()

$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY
$supabaseUrl = $env:SUPABASE_URL

if (-not $serviceKey -or -not $supabaseUrl) {
  Write-Error "Environment variables SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL must be set."
  exit 2
}

$bucketName = 'id-card-designs'
$endpoint = "$supabaseUrl/storage/v1/buckets"
$body = @{ name = $bucketName; public = $false } | ConvertTo-Json

try {
  $headers = @{
    Authorization = "Bearer $serviceKey"
    apikey = $serviceKey
    "Content-Type" = "application/json"
  }

  Write-Output "Creating bucket '$bucketName' at $endpoint ..."
  $response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $body -TimeoutSec 60 -ErrorAction Stop
  Write-Output "Bucket created:"
  $response | ConvertTo-Json -Depth 5 | Write-Output
  exit 0
} catch {
  $err = $_.Exception.Response
  if ($err -ne $null) {
    try {
      $text = $err.GetResponseStream() | %{ new-object System.IO.StreamReader($_) } | %{ $_.ReadToEnd() }
      Write-Error "Request failed: $text"
    } catch {
      Write-Error "Request failed: $($_.Exception.Message)"
    }
  } else {
    Write-Error "Request failed: $($_.Exception.Message)"
  }
  exit 1
}
