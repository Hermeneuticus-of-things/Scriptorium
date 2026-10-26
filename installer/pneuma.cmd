@echo off
rem Pneuma Sofer command line wrapper. Put this file next to Pneuma Sofer.exe (the install folder,
rem usually %LOCALAPPDATA%\Programs\Pneuma Sofer) and add that folder to PATH. Then:
rem   pneuma info "D:\Carti\Drumul spre munte.scribner"
rem   pneuma export-sources "D:\Carti\Drumul spre munte.scribner" -o "D:\NotebookLM"
rem No Node.js is needed: Pneuma Sofer.exe runs the CLI as plain Node (ELECTRON_RUN_AS_NODE=1).
rem No ( ) blocks around the calls: %* may hold parentheses, and %ERRORLEVEL% inside a block
rem would be read before the command runs (the exit code would be lost).
setlocal
set "SCRIBNER_DIR=%~dp0"
if exist "%SCRIBNER_DIR%Pneuma Sofer.exe" goto app
rem Source checkout (installer\pneuma.cmd next to cli\): use Node.js from PATH.
if exist "%SCRIBNER_DIR%..\cli\pneuma.cjs" goto source
echo Nu gasesc Pneuma Sofer.exe langa %~nx0 / Pneuma Sofer.exe not found next to %~nx0 1>&2
exit /b 1

:app
set "ELECTRON_RUN_AS_NODE=1"
"%SCRIBNER_DIR%Pneuma Sofer.exe" "%SCRIBNER_DIR%resources\app\cli\pneuma.cjs" %*
exit /b %ERRORLEVEL%

:source
node "%SCRIBNER_DIR%..\cli\pneuma.cjs" %*
exit /b %ERRORLEVEL%
