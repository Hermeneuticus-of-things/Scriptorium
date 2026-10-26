@echo off
rem Pneuma Sofer MCP server for any AI client (Claude, Cursor, Windsurf, VS Code, LM Studio…).
rem Installed next to Pneuma Sofer.exe. Without --project the agent sees the projects in Pneuma Sofer's
rem recent list, so the same line works on every computer and names no book:
rem   cmd /c "%LOCALAPPDATA%\Programs\Pneuma Sofer\pneuma-mcp.cmd"
rem Extra options pass through: --project <folder.scribner> (repeatable), --read-only.
setlocal
set "SCRIBNER_DIR=%~dp0"
if not exist "%SCRIBNER_DIR%Pneuma Sofer.exe" goto missing
set "ELECTRON_RUN_AS_NODE=1"
"%SCRIBNER_DIR%Pneuma Sofer.exe" "%SCRIBNER_DIR%resources\app\mcp\server.mjs" %*
exit /b %ERRORLEVEL%
:missing
echo Nu gasesc Pneuma Sofer.exe langa %~nx0 / Pneuma Sofer.exe not found next to %~nx0 1>&2
exit /b 1
