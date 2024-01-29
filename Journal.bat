@ECHO OFF
:: cmd /c powershell -Nop -NonI -Nologo -WindowStyle Hidden "Write-Host"
start "" "http://127.0.0.1:8000/"
cmd /k "cd /d %~dp0/venv/Scripts & activate & cd /d %~dp0 & python manage.py runserver"
