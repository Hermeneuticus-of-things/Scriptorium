; Pneuma Sofer — installer wizard (Inno Setup 6).
; Ales Inno Setup 6 (Jordan Russell) — standardul de piață pentru instalatoare desktop Windows:
; detectare aplicație activă (AppMutex/[Code]), închidere grațioasă + restart, jurnal complet (/LOG),
; limbă multiplă, per-user fără admin. Alternativa NSIS nu are PascalScript și nici jurnalul atât de detaliat.
; Input: release\win-unpacked from `npm run dist:win`. Built by installer\build-setup.cjs:
;   ISCC /DAppVersion=<version> installer\pneuma.iss
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
; In-app update runs Setup /SILENT /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS: close the running program, start it again.
CloseApplications=yes
RestartApplications=yes
; The optional PATH entry: running terminals are told about the change (install and uninstall).
ChangesEnvironment=yes
; Jurnal complet al instalării (diagnostice): rulare cu /LOG="cale\setup.log" — spune tot ce face.
SetupLogging=yes

[Languages]
Name: "ro"; MessagesFile: "Romanian.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
ro.AddToPath=Comanda „pneuma” în terminal (adaugă folderul programului în PATH)
ro.AppRunningQuestion=Pneuma Sofer rulează acum. Închizi programul ca să continue instalarea? (datele nesalvate sunt protejate de aplicație la închidere)
ro.AppRunningAbort=Instalarea a fost oprită. Închide Pneuma Sofer și rulează din nou instalatorul.
ro.DowngradeWarning=Versiunea instalată (%s) este mai NOUĂ decât cea pe care vrei să o instalezi. Instalezi totuși versiunea mai veche?
ro.InstallingApp=Se închide Pneuma Sofer…
ro.CommandLine=Linia de comandă:
en.AddToPath=The "pneuma" command in a terminal (adds the program folder to PATH)
en.AppRunningQuestion=Pneuma Sofer is running. Close the program so the installation can continue? (unsaved data is protected by the app on close)
en.AppRunningAbort=Setup was stopped. Close Pneuma Sofer and run the installer again.
en.DowngradeWarning=The installed version (%s) is NEWER than the one you are about to install. Install the older version anyway?
en.InstallingApp=Closing Pneuma Sofer…
en.CommandLine=Command line:

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "addtopath"; Description: "{cm:AddToPath}"; GroupDescription: "{cm:CommandLine}"; Flags: unchecked

[Files]
Source: "..\release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Command line: "pneuma" from any terminal once {app} is on PATH (Ajutor → Ce faci tu → Linia de comandă).
Source: "pneuma.cmd"; DestDir: "{app}"; Flags: ignoreversion
; MCP for any AI client, without naming a project: cmd /c "%LOCALAPPDATA%\Programs\Pneuma Sofer\pneuma-mcp.cmd".
Source: "pneuma-mcp.cmd"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\resources\app\build\icon.ico"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\resources\app\build\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent
; Projects and settings stay on uninstall: they live in the user's folders and %APPDATA%\Pneuma Sofer.

[Code]
// Instalator inteligent (directivă 14 nov): detectează instanța Pneuma Sofer care rulează,
// ÎNTREABĂ utilizatorul dacă să o închidă, închide grațios (WM_CLOSE — aplicația își salvează
// starea prin fluxul propriu de închidere), cu forțare doar după 15 s de așteptare. În modul
// silențios (/SILENT|/VERYSILENT cu /SUPPRESSMSGBOXES, folosit de actualizarea din aplicație)
// răspunsul implicit este „Da" — aplicația și-a salvat deja datele înainte de update.
// Jurnal complet: SetupLogging=yes + flag-ul /LOG.

const
  AppProcess = 'Pneuma Sofer.exe';

// Compară versiuni „X.Y.Z": >0 când A e mai nouă decât B.
function CompareSemverStr(A, B: string): Integer;
var
  PA, PB: array of string;
  IA, IB: Integer;
  NA, NB, I: Integer;
begin
  Result := 0;
  IA := 1; NB := 0;
  while Pos('.', A) > 0 do begin
    SetArrayLength(PA, IA); PA[IA-1] := Copy(A, 1, Pos('.', A)-1); Delete(A, 1, Pos('.', A)); IA := IA + 1;
  end;
  SetArrayLength(PA, IA); PA[IA-1] := A;
  IB := 1;
  while Pos('.', B) > 0 do begin
    SetArrayLength(PB, IB); PB[IB-1] := Copy(B, 1, Pos('.', B)-1); Delete(B, 1, Pos('.', B)); IB := IB + 1;
  end;
  SetArrayLength(PB, IB); PB[IB-1] := B;
  for I := 1 to (IA + IB) do begin
    if I <= IA then NA := StrToIntDef(PA[I-1], 0) else NA := 0;
    if I <= IB then NB := StrToIntDef(PB[I-1], 0) else NB := 0;
    if NA <> NB then begin
      if NA > NB then Result := 1 else Result := -1;
      exit;
    end;
  end;
end;

function IsAppRunning: Boolean;
var
  TmpFile: string;
  ResultCode: Integer;
  Content: AnsiString;
begin
  Result := False;
  TmpFile := ExpandConstant('{tmp}\pneuma-running.txt');
  Exec(ExpandConstant('{cmd}'), '/C tasklist /FI "IMAGENAME eq ' + AppProcess + '" /FO CSV /NH > "' + TmpFile + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if LoadStringFromFile(TmpFile, Content) then
    Result := Pos(AppProcess, Content) > 0;
  DeleteFile(TmpFile);
end;

procedure GracefulCloseApp;
var
  ResultCode: Integer;
begin
  Exec(ExpandConstant('{cmd}'), '/C taskkill /IM "' + AppProcess + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure ForceCloseApp;
var
  ResultCode: Integer;
begin
  Exec(ExpandConstant('{cmd}'), '/C taskkill /F /IM "' + AppProcess + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure WaitForAppExit(MaxSeconds: Integer);
var
  I: Integer;
begin
  for I := 1 to MaxSeconds do
  begin
    if not IsAppRunning then
      exit;
    Sleep(1000);
  end;
end;

function InstalledVersion: string;
var
  Uninst: string;
begin
  Result := '';
  if RegQueryStringValue(HKEY_CURRENT_USER, 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting("AppId")}_is1', 'DisplayVersion', Uninst) then
    Result := Uninst;
end;

function InitializeSetup: Boolean;
var
  Running: Boolean;
  Answer: Integer;
  Prev: string;
begin
  Result := True;
  Prev := InstalledVersion;
  // Avertizează la instalarea unei versiuni MAI VECHI peste una mai nouă (downgrade).
  if (Prev <> '') and (CompareSemverStr(Prev, '{#AppVersion}') > 0) then
  begin
    if MsgBox(FmtMessage(CustomMessage('DowngradeWarning'), [Prev]), mbWarning, MB_YESNO, 0) = IDNO then
    begin
      Result := False;
      exit;
    end;
  end;
  Running := IsAppRunning;
  if Running then
  begin
    if WizardSilent then
      Answer := IDYES
    else
      Answer := MsgBox(ExpandConstant('{cm:AppRunningQuestion}'), mbConfirmation, MB_YESNO, 0);
    if Answer = IDYES then
    begin
      GracefulCloseApp;
      WaitForAppExit(15);
      if IsAppRunning then
        ForceCloseApp;
      WaitForAppExit(5);
    end
    else
    begin
      MsgBox(ExpandConstant('{cm:AppRunningAbort}'), mbInformation, MB_OK, 0);
      Result := False;
    end;
  end;
end;

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
