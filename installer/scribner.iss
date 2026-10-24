; Scribner — installer wizard (Inno Setup 6).
; Input: release\win-unpacked from `npm run dist:win`. Built by installer\build-setup.cjs:
;   ISCC /DAppVersion=<version> installer\scribner.iss
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#define AppName "Scribner"
#define AppExe "Scribner.exe"

[Setup]
AppId={{6A0E3C52-8F7B-4C1D-9B8E-5C2F1D3A7E41}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=Scribner
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
UninstallDisplayIcon={app}\{#AppExe}
LicenseFile=..\build\license.txt
OutputDir=..\release
OutputBaseFilename=Scribner-Setup-{#AppVersion}
SetupIconFile=..\build\icon.ico
WizardStyle=modern
Compression=lzma2/max
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Per-user install by default (no admin); the wizard offers "for all users" when elevated.
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ShowLanguageDialog=auto
CloseApplications=yes

[Languages]
Name: "ro"; MessagesFile: "Romanian.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "addtopath"; Description: "Comanda „scribner” în terminal (adaugă folderul programului în PATH)"; GroupDescription: "Linia de comandă:"; Flags: unchecked

[Files]
Source: "..\release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Command line: "scribner" from any terminal once {app} is on PATH (Ajutor → Ce faci tu → Linia de comandă).
Source: "scribner.cmd"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent
; Projects and settings stay on uninstall: they live in the user's folders and %APPDATA%\Scribner.

[Registry]
; Optional: the install folder on the user's PATH, so "scribner" works in any terminal.
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; ValueData: "{olddata};{app}"; Tasks: addtopath; Check: NeedsAddPath(ExpandConstant('{app}'))

[Code]
function NeedsAddPath(Dir: string): Boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', OrigPath) then
  begin
    Result := True;
    exit;
  end;
  Result := Pos(';' + Uppercase(Dir) + ';', ';' + Uppercase(OrigPath) + ';') = 0;
end;
