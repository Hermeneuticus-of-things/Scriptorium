; Pneuma Sofer — installer wizard (Inno Setup 6).
; Input: release\win-unpacked from `npm run dist:win`. Built by installer\build-setup.cjs:
;   ISCC /DAppVersion=<version> installer\scribner.iss
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#define AppName "Pneuma Sofer"
#define AppExe "Pneuma Sofer.exe"

[Setup]
AppId={{6A0E3C52-8F7B-4C1D-9B8E-5C2F1D3A7E41}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=Pneuma Sofer
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
UninstallDisplayIcon={app}\{#AppExe}
LicenseFile=..\build\license.txt
OutputDir=..\release
OutputBaseFilename=PneumaSofer-Setup-{#AppVersion}
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

[Files]
Source: "..\release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent
; Projects and settings stay on uninstall: they live in the user's folders and %APPDATA%\Pneuma Sofer
; (installs from before the rename keep %APPDATA%\Scribner; the app reads it until the new folder exists).
