@echo off
rem Scribner command line wrapper. Put this file next to Scribner.exe (the install folder,
rem usually %LOCALAPPDATA%\Programs\Scribner) and add that folder to PATH. Then:
rem   scribner info "D:\Carti\Karma.scribner"
rem   scribner export-sources "D:\Carti\Karma.scribner" -o "D:\NotebookLM"
rem No Node.js is needed: Scribner.exe runs the CLI as plain Node (ELECTRON_RUN_AS_NODE=1).
setlocal
set "SCRIBNER_DIR=%~dp0"
if exist "%SCRIBNER_DIR%Scribner.exe" (
  set "ELECTRON_RUN_AS_NODE=1"
  "%SCRIBNER_DIR%Scribner.exe" "%SCRIBNER_DIR%resources\app\cli\scribner.cjs" %*
  exit /b %ERRORLEVEL%
)
rem Source checkout (installer\scribner.cmd next to cli\): use Node.js from PATH.
if exist "%SCRIBNER_DIR%..\cli\scribner.cjs" (
  node "%SCRIBNER_DIR%..\cli\scribner.cjs" %*
  exit /b %ERRORLEVEL%
)
echo Nu gasesc Scribner.exe langa %~nx0 / Scribner.exe not found next to %~nx0 1>&2
exit /b 1
