# PowerShell script to find and terminate a process using a specific port

param (
    [int]$Port = 6543
)

Write-Host "Checking for processes on port $Port..."

# Get process information using netstat
# We need to handle cases where Select-String might return multiple matches or no match
$processLines = netstat -ano | Select-String -Pattern ":$Port" -ErrorAction SilentlyContinue

if ($processLines) {
    # Iterate over potentially multiple lines, though typically one LISTENING process per port
    # Take the first one that seems to be a listening TCP port
    $targetLine = $null
    foreach ($lineObj in $processLines) {
        $line = $lineObj.Line
        if ($line -match "LISTENING") { # Prioritize LISTENING state
            $targetLine = $line
            break
        }
    }
    
    if (-not $targetLine -and $processLines.Count -gt 0) {
        # If no LISTENING found, but there are lines, take the first one.
        $targetLine = $processLines[0].Line
    }

    if ($targetLine) {
        # Extract PID - it's usually the last number on the line
        $parts = $targetLine.Trim() -split '\s+'
        $pidString = $parts[-1]

        if ($pidString -match "^\d+$") {
            $targetPid = [int]$pidString
            Write-Host "Process with PID $targetPid found using port $Port on line: $targetLine"
            Write-Host "Attempting to terminate PID $targetPid..."
            try {
                Stop-Process -Id $targetPid -Force -ErrorAction Stop
                Write-Host "Process PID $targetPid terminated successfully."
            } catch {
                Write-Error "Failed to terminate process PID $targetPid. Error: $($_.Exception.Message)"
                Write-Host "You might need to run this script with administrator privileges."
            }
        } else {
            Write-Warning "Could not extract a valid PID from the relevant netstat output line: $targetLine"
            Write-Warning "Extracted PID string was: $pidString"
        }
    } else {
         Write-Host "No process found actively using port $Port in a clear way (e.g. LISTENING)."
    }
} else {
    Write-Host "No process found using port $Port."
}
