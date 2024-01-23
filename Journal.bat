@ECHO OFF
:: cmd /c powershell -Nop -NonI -Nologo -WindowStyle Hidden "Write-Host"
start "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" "http://127.0.0.1:8000/"
cmd /k "cd /d %~dp0/Journal/venv/Scripts & activate & cd /d %~dp0 & python Journal/manage.py runserver"
