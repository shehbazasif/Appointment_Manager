# Kill any zombie nuxt/npm dev processes, then start one clean dev server
$procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'nuxi\.mjs dev|@nuxt\\cli\\dist\\dev|npm-cli\.js.*run dev' }

foreach ($p in $procs) {
  Write-Output ("killing " + $p.ProcessId)
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

$log = "C:\my\dev\Appointment_Manager\.freebuff\preview-9687c9ff-433d-474a-9866-bef02c85a480.log"
$err = "$log.err"

$p = Start-Process -FilePath "npm.cmd" `
  -ArgumentList "run", "dev", "--", "--port", "3000" `
  -WorkingDirectory "C:\my\dev\Appointment_Manager" `
  -RedirectStandardOutput $log `
  -RedirectStandardError $err `
  -WindowStyle Hidden `
  -PassThru

Write-Output ("started pid " + $p.Id)
