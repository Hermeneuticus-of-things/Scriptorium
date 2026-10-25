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
; In-app update runs Setup /SILENT /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS: close the running program, start it again.
CloseApplications=yes
RestartApplications=yes
; The optional PATH entry: running terminals are told about the change (install and uninstall).
ChangesEnvironment=yes

[Languages]
Name: "ro"; MessagesFile: "Romanian.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
ro.AddToPath=Comanda „scribner” în terminal (adaugă folderul programului în PATH)
ro.CommandLine=Linia de comandă:
en.AddToPath=The "scribner" command in a terminal (adds the program folder to PATH)
en.CommandLine=Command line:

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "addtopath"; Description: "{cm:AddToPath}"; GroupDescription: "{cm:CommandLine}"; Flags: unchecked

[Files]
Source: "..\release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Command line: "scribner" from any terminal once {app} is on PATH (Ajutor → Ce faci tu → Linia de comandă).
Source: "scribner.cmd"; DestDir: "{app}"; Flags: ignoreversion
; MCP for any AI client, without naming a project: cmd /c "%LOCALAPPDATA%\Programs\Scribner\scribner-mcp.cmd".
Source: "scribner-mcp.cmd"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\resources\app\build\icon.ico"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\resources\app\build\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent
; Projects and settings stay on uninstall: they live in the user's folders and %APPDATA%\Scribner.

[Code]
// Optional PATH entry (HKCU\Environment\Path), written here rather than in [Registry] so that:
// an entry already there (also with a trailing backslash, other case or quotes) is not added
// twice, an empty or ";"-ending PATH gets no empty entries, and uninstall removes it again.
const
  EnvKey = 'Environment';

function NormPath(P: string): string;
begin
  Result := Uppercase(Trim(RemoveQuotes(Trim(P))));
  while (Length(Result) > 3) and (Result[Length(Result)] = '\') do
    Delete(Result, Length(Result), 1);
end;

function SamePathEntry(A, B: string): Boolean;
begin
  Result := (NormPath(A) <> '') and (NormPath(A) = NormPath(B));
end;

// PATH without the entries equal to Dir (Found tells whether there was one); empty entries go too.
function PathWithout(OrigPath, Dir: string; var Found: Boolean): string;
var
  Rest, Entry: string;
  P: Integer;
begin
  Result := '';
  Found := False;
  Rest := OrigPath;
  while Rest <> '' do
  begin
    P := Pos(';', Rest);
    if P = 0 then
    begin
      Entry := Rest;
      Rest := '';
    end
    else
    begin
      Entry := Copy(Rest, 1, P - 1);
      Rest := Copy(Rest, P + 1, Length(Rest));
    end;
    if SamePathEntry(Entry, Dir) then
      Found := True
    else if Trim(Entry) <> '' then
    begin
      if Result <> '' then
        Result := Result + ';';
      Result := Result + Entry;
    end;
  end;
end;

procedure AddToPath(Dir: string);
var
  OrigPath: string;
  Found: Boolean;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, EnvKey, 'Path', OrigPath) then
    OrigPath := '';
  PathWithout(OrigPath, Dir, Found);
  if Found then
    exit;
  if (OrigPath <> '') and (OrigPath[Length(OrigPath)] <> ';') then
    OrigPath := OrigPath + ';';
  RegWriteExpandStringValue(HKEY_CURRENT_USER, EnvKey, 'Path', OrigPath + Dir);
end;

procedure RemoveFromPath(Dir: string);
var
  OrigPath, NewPath: string;
  Found: Boolean;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, EnvKey, 'Path', OrigPath) then
    exit;
  NewPath := PathWithout(OrigPath, Dir, Found);
  if Found then
    RegWriteExpandStringValue(HKEY_CURRENT_USER, EnvKey, 'Path', NewPath);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssPostInstall) and WizardIsTaskSelected('addtopath') then
    AddToPath(ExpandConstant('{app}'));
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    RemoveFromPath(ExpandConstant('{app}'));
end;
