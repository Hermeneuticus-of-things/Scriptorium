; Pneuma Sofer — installer wizard (Inno Setup 6).
; Input: release\win-unpacked from `npm run dist:win`. Built by installer\build-setup.cjs:
;   ISCC /DAppVersion=<version> installer\pneuma.iss
;
; What the wizard adds on top of a plain copy:
;   1. three pages read before installing — ce face programul, ce are nevoie
;      calculatorul, ce am găsit pe calculatorul acesta;
;   2. preflight (PrepareToInstall): închide programul dacă e deschis, dezinstalează
;      silențios versiunea veche și o eventuală instalare cu numele vechi „Scribner”,
;      apoi curăță folderul rămas gol — ca instalarea nouă să pornească curat;
;   3. cărțile, proiectele și setările nu sunt atinse niciodată.
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
; Optional: build stamp shown on the first wizard page (passed by build-setup.cjs).
#ifndef BuildStamp
  #define BuildStamp ""
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

[Languages]
Name: "ro"; MessagesFile: "Romanian.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
ro.AddToPath=Comanda „pneuma” în terminal (adaugă folderul programului în PATH)
ro.CommandLine=Linia de comandă:
en.AddToPath=The "pneuma" command in a terminal (adds the program folder to PATH)
en.CommandLine=Command line:

ro.PageFeaturesCaption=Ce face Pneuma Sofer
ro.PageFeaturesDesc=Pe scurt: ce primești, ce rămâne al tău și ce nu ai nevoie.
ro.PageNeedsCaption=Ce are nevoie calculatorul
ro.PageNeedsDesc=Ca să știi dinainte dacă merge bine sau de ce ar merge încet.
ro.PageFoundCaption=Pe calculatorul tău
ro.PageFoundDesc=Ce am găsit aici și ce se curăță înainte de instalare.

en.PageFeaturesCaption=What Pneuma Sofer does
en.PageFeaturesDesc=In short: what you get, what stays yours, what you do not need.
en.PageNeedsCaption=What the computer needs
en.PageNeedsDesc=So you know up front whether it will be quick, or why it may be slow.
en.PageFoundCaption=On your computer
en.PageFoundDesc=What I found here and what gets cleaned up before installing.

ro.FeaturesBody=Un roman, o traducere sau o lucrare lungă nu se țin bine într-un singur fișier de 300 de pagini. Aici textul stă pe bucăți mici — o fișă pentru fiecare scenă sau capitol — iar la final le aduni într-o singură carte.
ro.FeaturesBody=%n%n%s
ro.FeaturesBody=Ce face Pneuma Sofer (versiunea {#AppVersion})%n%nUn roman, o traducere sau o lucrare lungă nu se țin bine într-un singur fișier de 300 de pagini. Aici textul stă pe bucăți mici — o fișă pentru fiecare scenă sau capitol — iar la final le aduni într-o singură carte.%n%n· Scrii pe fișe%n  Scene și capitole, fiecare cu titlu, rezumat și stare. Le muți, le împarți, le unești; ordinea din listă e ordinea din carte. Țintă zilnică de cuvinte.%n%n· Traduci%n  Originalul într-o parte, traducerea în cealaltă. DeepL și Google Translate pe cuvânt, frază sau paragraf; dicționare (dexonline, Wiktionary, Cambridge, Merriam-Webster, Linguee, IATE).%n%n· Dictezi (F9)%n  Vorbești și textul apare la cursor sau înlocuiește selecția. Recunoașterea vorbirii merge pe calculatorul tău, fără internet; un fișier audio se poate transcrie în Cercetare.%n%n· Corectezi%n  Revizie fără AI: ghilimele, spații, punctuație, repetiții apropiate. Corecturile făcute de mână se țin minte. Asistentul AI e opțional.%n%n· Cercetezi%n  Întrebi sursele tale (manuscris, note, PDF-uri, pagini web) și primești răspuns cu trimiteri [1], [2]; răspunsul se salvează ca notă sau se inserează în text.%n%n· Agenți AI (opțional)%n  Claude sau Codex pot lucra direct în carte prin MCP: citesc capitole, fac rezumate, caută, fac revizia. Înainte de fiecare modificare se face o copie.%n%n· Compilezi%n  Cartea întreagă în Word, PDF, EPUB, ODT, RTF, HTML, Markdown, LaTeX. Formate gata făcute: manuscris pentru editură, carte tipărită 6 x 9 in, e-book.%n%n· Lucrați împreună%n  Același proiect pe mai multe calculatoare (OneDrive, Dropbox, Google Drive, NAS), cu jurnal „cine ce a schimbat și când” și îmbinare fără pierderi.%n%nFără cont și fără internet obligatoriu: proiectul e un folder de fișiere text pe calculatorul tău.
ro.BuildStamp=Instalator construit la: %1
en.BuildStamp=Installer built on: %1

en.FeaturesBody=What Pneuma Sofer does (version {#AppVersion})%n%nA novel, a translation or a long paper does not fit well in one 300-page file. Here the text lives in small pieces — one card per scene or chapter — and at the end you gather them into a single book.%n%n· You write on cards%n  Scenes and chapters, each with a title, a summary and a status. Move, split and merge them; the order in the list is the order in the book. Daily word target.%n%n· You translate%n  Original on one side, translation on the other. DeepL and Google Translate per word, phrase or paragraph; dictionaries (dexonline, Wiktionary, Cambridge, Merriam-Webster, Linguee, IATE).%n%n· You dictate (F9)%n  You speak and the text appears at the cursor or replaces the selection. Speech recognition runs on your computer, without internet; an audio file can be transcribed into Research.%n%n· You correct%n  Review without AI: quotes, spaces, punctuation, nearby repetitions. Corrections made by hand are remembered. The AI assistant is optional.%n%n· You research%n  Ask your own sources (manuscript, notes, PDFs, web pages) and get an answer with references [1], [2]; the answer can be saved as a note or inserted into the text.%n%n· AI agents (optional)%n  Claude or Codex can work directly in the book over MCP: read chapters, write summaries, search, run the review. A copy is made before every change.%n%n· You compile%n  The whole book into Word, PDF, EPUB, ODT, RTF, HTML, Markdown, LaTeX. Ready-made presets: manuscript for a publisher, 6 x 9 in printed book, e-book.%n%n· You work together%n  The same project on several computers (OneDrive, Dropbox, Google Drive, NAS), with a log of who changed what and when, and lossless merging.%n%nNo account and no internet required: the project is a folder of plain text files on your computer.

ro.NeedsBody=MINIM — pornește și se descurcă%n· Windows 10 sau 11, pe 64 de biți%n· 4 GB memorie RAM%n· 2 GB liberi pe disc (programul ocupă în jur de 500 MB)%n· procesor cu 2 nuclee%n%nRECOMANDAT — lucrul de zi cu zi e fluent%n· 8 GB RAM sau mai mult%n· disc SSD%n· procesor cu 4 nuclee%n· placă video NVIDIA (dictarea transcrie de câteva ori mai repede)%n%nOPȚIONAL%n· 600 MB pentru motorul de dictare — se descarcă o singură dată, din Setări → Voce și traducere; fără el programul merge la fel, doar că nu dictezi%n· internet doar pentru traducere automată, dicționare online, AI și actualizări%n%nAI ȘI HARDWARE — important%n· AI prin cloud (Anthropic, OpenAI, Gemini, DeepSeek, OpenRouter) merge la fel pe orice calculator: are nevoie doar de internet și de cheia ta. Hardware-ul nu contează.%n· AI local (Ollama, LM Studio) cere calculator puternic: memorie multă și, ideal, placă video.%n· Fără niciun AI, programul e complet: scris, revizie, Compile, dicționare, dictare cu motorul local.%n%nDE CE AR MERGE ÎNCET — ca să știi la ce să te aștepți%n· Memorie puțină: cărțile mari și multe fișe deschise încarcă memoria; programul răspunde mai greu.%n· Disc clasic (HDD): salvare, copii de siguranță și Compile durează mai mult.%n· Proiect foarte mare (mii de fișe): căutarea în toată cartea și Compile iau mai mult.%n· Fără placă video potrivită: dictarea merge pe procesor — corect, dar mai încet.%n· OneDrive sau Dropbox care sincronizează în fundal: salvarea poate întârzia câteva secunde.%n· Fără internet: totul merge, mai puțin traducerea automată, dicționarele online și AI-ul din cloud.
en.NeedsBody=MINIMUM — it starts and copes%n· Windows 10 or 11, 64-bit%n· 4 GB RAM%n· 2 GB free disk space (the program takes about 500 MB)%n· 2-core processor%n%nRECOMMENDED — everyday work is smooth%n· 8 GB RAM or more%n· SSD%n· 4-core processor%n· NVIDIA graphics card (dictation transcribes several times faster)%n%nOPTIONAL%n· 600 MB for the dictation engine — downloaded once, from Settings → Voice and translation; without it the program works the same, you just do not dictate%n· internet only for automatic translation, online dictionaries, AI and updates%n%nAI AND HARDWARE — important%n· Cloud AI (Anthropic, OpenAI, Gemini, DeepSeek, OpenRouter) works the same on any computer: it needs internet and your key. Hardware does not matter.%n· Local AI (Ollama, LM Studio) needs a strong computer: plenty of memory and, ideally, a graphics card.%n· Without any AI the program is complete: writing, review, Compile, dictionaries, dictation with the local engine.%n%nWHY IT MAY BE SLOW — so you know what to expect%n· Little memory: big books and many open cards load the memory; the program answers slower.%n· Classic disk (HDD): saving, backups and Compile take longer.%n· Very large project (thousands of cards): searching the whole book and Compile take longer.%n· No suitable graphics card: dictation runs on the processor — accurate, but slower.%n· OneDrive or Dropbox syncing in the background: saving may lag a few seconds.%n· No internet: everything works except automatic translation, online dictionaries and cloud AI.

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
const
  EnvKey = 'Environment';
  UninstallKey = 'Software\Microsoft\Windows\CurrentVersion\Uninstall';
  AppExeName = '{#AppExe}';
  AppVersionText = '{#AppVersion}';
  BuildStampText = '{#BuildStamp}';

var
  PageFeatures, PageNeeds, PageFound: TWizardPage;
  MemoFeatures, MemoNeeds, MemoFound: TNewMemo;
  ChkDictation, ChkSkipDictation: TNewCheckBox;
  // Ce s-a găsit pe calculator (umplut de DetectInstalls / ReadHardware).
  PrevVersion, PrevDir, PrevUninstall: String;
  LegacyName, LegacyUninstall: String;
  HwCpu, HwGpu, HwDiskKind: String;
  HwRamMb, HwVramMb: Int64;
  HwCores: Integer;
  HwGpuNvidia: Boolean;
  HwDiskFreeMb, HwDiskTotalMb: Cardinal;

function Txt(const Ro, En: String): String;
begin
  if ActiveLanguage = 'en' then
    Result := En
  else
    Result := Ro;
end;

function NL: String;
begin
  Result := #13#10;
end;

// ───────────────────────── versiuni ─────────────────────────

function VerAt(const V: String; Index: Integer): Integer;
var
  Cur: String;
  I, N: Integer;
begin
  Result := 0;
  Cur := '';
  N := 0;
  for I := 1 to Length(V) do
  begin
    if (V[I] >= '0') and (V[I] <= '9') then
      Cur := Cur + V[I]
    else if Cur <> '' then
    begin
      if N = Index then
      begin
        Result := StrToIntDef(Cur, 0);
        exit;
      end;
      Inc(N);
      Cur := '';
    end;
  end;
  if Cur <> '' then
    if N = Index then
      Result := StrToIntDef(Cur, 0);
end;

function CompareVer(const A, B: String): Integer;
var
  I, PA, PB: Integer;
begin
  Result := 0;
  for I := 0 to 3 do
  begin
    PA := VerAt(A, I);
    PB := VerAt(B, I);
    if PA < PB then
    begin
      Result := -1;
      exit;
    end;
    if PA > PB then
    begin
      Result := 1;
      exit;
    end;
  end;
end;

// ─────────────────── ce e instalat deja (registru) ───────────────────

function UninstallExeOf(const S: String): String;
var
  T: String;
  P: Integer;
begin
  Result := '';
  T := Trim(S);
  if T = '' then
    exit;
  if T[1] = '"' then
  begin
    P := Pos('"', Copy(T, 2, Length(T)));
    if P > 0 then
      Result := Copy(T, 2, P - 1);
  end
  else
  begin
    P := Pos(' ', T);
    if P > 0 then
      Result := Copy(T, 1, P - 1)
    else
      Result := T;
  end;
  Result := Trim(Result);
end;

procedure TakeEntry(const Disp, Ver, Loc, Uninst: String);
begin
  if Pos('PNEUMA SOFER', Uppercase(Disp)) = 1 then
  begin
    if PrevUninstall = '' then
    begin
      PrevVersion := Ver;
      PrevDir := Loc;
      PrevUninstall := Uninst;
    end;
  end
  else if Pos('SCRIBNER', Uppercase(Disp)) = 1 then
  begin
    if LegacyUninstall = '' then
    begin
      LegacyName := Disp;
      LegacyUninstall := Uninst;
    end;
  end;
end;

procedure ScanUninstallRoot(Root: Integer; const Sub: String);
var
  Names: TArrayOfString;
  I: Integer;
  Key, Disp, Ver, Loc, Uninst: String;
begin
  if not RegGetSubkeyNames(Root, Sub, Names) then
    exit;
  for I := 0 to GetArrayLength(Names) - 1 do
  begin
    Key := Sub + '\' + Names[I];
    Disp := '';
    if not RegQueryStringValue(Root, Key, 'DisplayName', Disp) then
      Continue;
    Ver := '';
    Loc := '';
    Uninst := '';
    RegQueryStringValue(Root, Key, 'DisplayVersion', Ver);
    RegQueryStringValue(Root, Key, 'InstallLocation', Loc);
    RegQueryStringValue(Root, Key, 'UninstallString', Uninst);
    TakeEntry(Disp, Ver, Loc, Uninst);
  end;
end;

procedure DetectInstalls;
begin
  PrevVersion := '';
  PrevDir := '';
  PrevUninstall := '';
  LegacyName := '';
  LegacyUninstall := '';
  ScanUninstallRoot(HKCU, UninstallKey);
  ScanUninstallRoot(HKLM32, UninstallKey);
  ScanUninstallRoot(HKLM64, UninstallKey);
end;

// ─────────────────── procese ───────────────────

function ProcessRunning(const ExeName: String): Boolean;
var
  RC: Integer;
begin
  Result := False;
  if Exec(ExpandConstant('{cmd}'),
    '/c tasklist /FI "IMAGENAME eq ' + ExeName + '" /NH | find /I "' + ExeName + '" >nul',
    '', SW_HIDE, ewWaitUntilTerminated, RC) then
    Result := (RC = 0);
end;

// Închide politicos (WM_CLOSE); dacă nu se închide în două secunde, forțează.
procedure CloseApp(const ExeName: String);
var
  RC, I: Integer;
begin
  Exec(ExpandConstant('{cmd}'), '/c taskkill /IM "' + ExeName + '"', '', SW_HIDE, ewWaitUntilTerminated, RC);
  for I := 1 to 8 do
  begin
    Sleep(250);
    if not ProcessRunning(ExeName) then
      exit;
  end;
  Exec(ExpandConstant('{cmd}'), '/c taskkill /F /IM "' + ExeName + '"', '', SW_HIDE, ewWaitUntilTerminated, RC);
  Sleep(700);
end;

// ─────────────────── hardware ───────────────────

function WmiQuery(const Namespace, Wql: String): Variant;
var
  Locator, Service: Variant;
begin
  Result := Null;
  try
    Locator := CreateOleObject('WbemScripting.SWbemLocator');
    Service := Locator.ConnectServer('.', Namespace);
    Result := Service.ExecQuery(Wql);
  except
    Result := Null;
  end;
end;

function ReadCpu: String;
var
  Objs, Obj: Variant;
  S: String;
begin
  Result := '';
  Objs := WmiQuery('root\CIMV2', 'SELECT Name FROM Win32_Processor');
  try
    if not VarIsNull(Objs) then
      if Objs.Count > 0 then
      begin
        Obj := Objs.ItemIndex(0);
        S := Obj.Name;
        Result := Trim(S);
      end;
  except
    Result := '';
  end;
end;

function ReadGpu: String;
var
  Objs, Obj: Variant;
  I: Integer;
  N: String;
begin
  Result := '';
  Objs := WmiQuery('root\CIMV2', 'SELECT Name FROM Win32_VideoController');
  try
    if not VarIsNull(Objs) then
      for I := 0 to Objs.Count - 1 do
      begin
        Obj := Objs.ItemIndex(I);
        N := Obj.Name;
        N := Trim(N);
        if N <> '' then
        begin
          if Result = '' then
            Result := N;
          if (Pos('NVIDIA', Uppercase(N)) > 0) or (Pos('RADEON', Uppercase(N)) > 0) then
          begin
            Result := N;
            Break;
          end;
        end;
      end;
  except
    Result := '';
  end;
end;

function ReadRamMb: Int64;
var
  Objs, Obj: Variant;
  S: String;
begin
  Result := 0;
  Objs := WmiQuery('root\CIMV2', 'SELECT TotalPhysicalMemory FROM Win32_ComputerSystem');
  try
    if not VarIsNull(Objs) then
      if Objs.Count > 0 then
      begin
        Obj := Objs.ItemIndex(0);
        S := Obj.TotalPhysicalMemory;
        S := Trim(S);
        Result := StrToInt64Def(S, 0) div 1048576;
      end;
  except
    Result := 0;
  end;
end;

// Memoria plăcii video, cât raportează driverul (peste 4 GB multe drivere raportează 4 GB).
function ReadVramMb: Int64;
var
  Objs, Obj: Variant;
  S: String;
begin
  Result := 0;
  Objs := WmiQuery('root\CIMV2', 'SELECT AdapterRAM FROM Win32_VideoController');
  try
    if not VarIsNull(Objs) then
      if Objs.Count > 0 then
      begin
        Obj := Objs.ItemIndex(0);
        S := Obj.AdapterRAM;
        S := Trim(S);
        Result := StrToInt64Def(S, 0) div 1048576;
        if Result < 0 then
          Result := 0;
      end;
  except
    Result := 0;
  end;
end;

// SSD sau disc clasic — hotărăște cât de repede se salvează și se compilează.
function ReadDiskKind: String;
var
  Objs, Obj: Variant;
  S: String;
  I, MediaType, Ssd, Hdd: Integer;
begin
  Ssd := 0;
  Hdd := 0;
  Objs := WmiQuery('root\Microsoft\Windows\Storage', 'SELECT MediaType FROM MSFT_PhysicalDisk');
  try
    if not VarIsNull(Objs) then
      for I := 0 to Objs.Count - 1 do
      begin
        Obj := Objs.ItemIndex(I);
        S := Obj.MediaType;
        MediaType := StrToIntDef(Trim(S), 0);
        if MediaType = 4 then
          Inc(Ssd)
        else if MediaType = 3 then
          Inc(Hdd);
      end;
  except
    Ssd := 0;
    Hdd := 0;
  end;
  if Ssd > 0 then
    Result := 'ssd'
  else if Hdd > 0 then
    Result := 'hdd'
  else
    Result := '';
end;


function DiskPath: String;
begin
  Result := WizardForm.DirEdit.Text;
  if (Result = '') or (not DirExists(Result)) then
    Result := ExpandConstant('{autopf}');
end;

procedure ReadHardware;
begin
  HwCpu := ReadCpu;
  HwGpu := ReadGpu;
  HwRamMb := ReadRamMb;
  HwVramMb := ReadVramMb;
  HwDiskKind := ReadDiskKind;
  HwGpuNvidia := (Pos('NVIDIA', Uppercase(HwGpu)) > 0) and (HwVramMb >= 3000);
  HwCores := StrToIntDef(GetEnv('NUMBER_OF_PROCESSORS'), 0);
  HwDiskFreeMb := 0;
  HwDiskTotalMb := 0;
  GetSpaceOnDisk(DiskPath, False, HwDiskFreeMb, HwDiskTotalMb);
end;

// ─────────────────── cât de potrivit e calculatorul ───────────────────

function TierName: String;
begin
  if (HwRamMb > 0) and (HwRamMb < 3500) then
    Result := 'limita'
  else if (HwRamMb >= 15000) and (HwDiskKind = 'ssd') then
    Result := 'puternic'
  else if HwRamMb >= 7600 then
    Result := 'bun'
  else if HwRamMb >= 3500 then
    Result := 'modest'
  else
    Result := 'necunoscut';
end;

function TierText: String;
var
  T: String;
begin
  T := TierName;
  if T = 'puternic' then
    Result := Txt(
      'Merge bine. Poți ține deschise mai multe proiecte și cărți mari; salvarea și Compile sunt rapide.' + NL +
      'Dictarea poate rula pe placa video, dacă bifezi mai jos.',
      'It will run well. You can keep several projects and big books open; saving and Compile are fast.' + NL +
      'Dictation can run on the graphics card, if you tick the box below.')
  else if T = 'bun' then
    Result := Txt(
      'Merge bine pentru o carte deodată. Cu două proiecte mari deschise și browserul în fundal, poate obosi.',
      'It runs well for one book at a time. With two large projects open and a browser in the background, it may struggle.')
  else if T = 'modest' then
    Result := Txt(
      'Se instalează complet și se poate lucra: ține un singur proiect deschis și închide filele multe din browser.' + NL +
      'Ce nu încape aici e AI-ul local (Ollama, LM Studio). AI-ul prin cloud merge la fel ca pe orice calculator.',
      'It installs complete and you can work: keep one project open and close the many browser tabs.' + NL +
      'What does not fit here is local AI (Ollama, LM Studio). Cloud AI works the same as on any computer.')
  else if T = 'limita' then
    Result := Txt(
      'Se instalează complet, dar va merge greu cu cărți mari — nu din cauza programului, ci a memoriei.' + NL +
      'Recomand să sari peste motorul local de dictare (bifează mai jos): are 600 MB și încarcă procesorul.' + NL +
      'AI-ul prin cloud cu cheia ta merge normal. AI-ul local nu are ce căuta pe acest calculator.',
      'It installs complete, but it will feel slow with big books — because of the memory, not the program.' + NL +
      'I recommend skipping the local dictation engine (tick below): it is 600 MB and loads the processor.' + NL +
      'Cloud AI with your key works normally. Local AI has no place on this computer.')
  else
    Result := Txt(
      'Nu am putut citi memoria calculatorului. Programul se instalează complet; dacă se mișcă greu, închide alte programe mari cât lucrezi.',
      'I could not read the computer memory. The program installs complete; if it feels slow, close other large programs while working.');
end;

function DictationVariantText: String;
begin
  if HwGpuNvidia then
    Result := Txt(
      'Placa video NVIDIA e bună pentru dictare: transcrierea poate rula pe ea, de câteva ori mai repede decât pe procesor.',
      'The NVIDIA card is good for dictation: transcription can run on it, several times faster than on the processor.')
  else if HwGpu <> '' then
    Result := Txt(
      'Fără placă video NVIDIA, dictarea merge pe procesor: corect, dar mai încet. Restul programului nu e afectat.',
      'Without an NVIDIA card, dictation runs on the processor: accurate, but slower. The rest of the program is not affected.')
  else
    Result := Txt(
      'N-am putut citi placa video. Dacă ai NVIDIA, bifează mai jos varianta rapidă; altfel dictarea merge pe procesor.',
      'I could not read the graphics card. If you have NVIDIA, tick the fast variant below; otherwise dictation runs on the processor.');
end;

// Profilul scris pentru program: prima pornire știe ce calculator are în față.
function JsonStr(const S: String): String;
var
  I: Integer;
  C: Char;
begin
  Result := '';
  for I := 1 to Length(S) do
  begin
    C := S[I];
    if C = '\' then
      Result := Result + '\\'
    else if C = '"' then
      Result := Result + '\"'
    else if C = #13 then
      Result := Result + '\r'
    else if C = #10 then
      Result := Result + '\n'
    else
      Result := Result + C;
  end;
end;

function ProfileJson: String;
var
  Var_, LocalAi_: String;
begin
  if ChkSkipDictation.Checked then
    Var_ := 'off'
  else if ChkDictation.Checked then
    Var_ := 'gpu'
  else
    Var_ := 'cpu';
  LocalAi_ := 'false';
  if TierName = 'puternic' then
    LocalAi_ := 'true';
  Result :=
    '{' + NL +
    '  "writtenBy": "installer",' + NL +
    '  "version": "' + JsonStr(AppVersionText) + '",' + NL +
    '  "installer": "' + JsonStr(BuildStampText) + '",' + NL +
    '  "tier": "' + TierName + '",' + NL +
    '  "ramMb": ' + IntToStr(HwRamMb) + ',' + NL +
    '  "cores": ' + IntToStr(HwCores) + ',' + NL +
    '  "cpu": "' + JsonStr(HwCpu) + '",' + NL +
    '  "gpu": "' + JsonStr(HwGpu) + '",' + NL +
    '  "vramMb": ' + IntToStr(HwVramMb) + ',' + NL +
    '  "disk": "' + HwDiskKind + '",' + NL +
    '  "diskFreeMb": ' + IntToStr(HwDiskFreeMb) + ',' + NL +
    '  "dictation": "' + Var_ + '",' + NL +
    '  "localAi": ' + LocalAi_ + NL +
    '}' + NL;
end;

procedure WriteProfile;
var
  Dir, File_: String;
begin
  Dir := ExpandConstant('{userappdata}\Scribner');
  ForceDirectories(Dir);
  File_ := Dir + '\install-profile.json';
  // Nu suprascriu o alegere făcută deja de om în program.
  if not FileExists(File_) then
    SaveStringToFile(File_, ProfileJson, False);
end;


// ─────────────────── textele paginii „Pe calculatorul tău” ───────────────────

function GbText(const Mb: Int64): String;
begin
  Result := Format('%.1f GB', [Mb / 1024]);
end;

function TierLabel: String;
begin
  if TierName = 'puternic' then
    Result := Txt('calculator puternic', 'strong computer')
  else if TierName = 'bun' then
    Result := Txt('calculator bun', 'good computer')
  else if TierName = 'modest' then
    Result := Txt('calculator modest', 'modest computer')
  else if TierName = 'limita' then
    Result := Txt('sub minimul recomandat', 'below the recommended minimum')
  else
    Result := Txt('calculator necunoscut', 'unknown computer');
end;

function ExtrasText: String;
begin
  Result := '';
  if HwDiskKind = 'hdd' then
    Result := Result + '· ' + Txt('discul e clasic (HDD): salvare, copii de siguranță și Compile merg mai încet decât pe SSD.',
      'the disk is a classic HDD: saving, backups and Compile are slower than on an SSD.') + NL
  else if HwDiskKind = 'ssd' then
    Result := Result + '· ' + Txt('discul e SSD: salvare și Compile rapide.', 'the disk is an SSD: fast saving and Compile.') + NL;
  if HwDiskFreeMb < 3000 then
    Result := Result + '· ' + Txt('puțin spațiu liber pe disc — eliberează măcar 3 GB.',
      'little free disk space — free up at least 3 GB.') + NL;
  if HwVramMb >= 3000 then
    Result := Result + '· ' + Txt('placă video cu ', 'graphics card with ') + GbText(HwVramMb) +
      Txt(' memorie video.', ' of video memory.') + NL;
  Result := Result + '· ' + DictationVariantText + NL;
end;


function FoundText: String;
var
  L: String;
begin
  L := '';
  L := L + Txt('Ce am găsit', 'What I found') + NL + NL;

  L := L + Txt('Windows: ', 'Windows: ') + GetWindowsVersionString;
  if IsWin64 then
    L := L + Txt(' (64 de biți)', ' (64-bit)')
  else
    L := L + Txt(' (32 de biți — programul cere 64 de biți)', ' (32-bit — the program needs 64-bit)');
  L := L + NL;

  if HwCpu <> '' then
  begin
    L := L + Txt('Procesor: ', 'Processor: ') + HwCpu;
    if HwCores > 0 then
      L := L + ' (' + IntToStr(HwCores) + Txt(' fire de execuție', ' threads') + ')';
    L := L + NL;
  end;
  if HwGpu <> '' then
    L := L + Txt('Placă video: ', 'Graphics: ') + HwGpu + NL;
  if HwRamMb > 0 then
    L := L + Txt('Memorie: ', 'Memory: ') + GbText(HwRamMb) + NL;
  if HwDiskKind = 'ssd' then
    L := L + Txt('Disc: SSD', 'Disk: SSD') + NL
  else if HwDiskKind = 'hdd' then
    L := L + Txt('Disc: clasic (HDD)', 'Disk: classic (HDD)') + NL;
  if HwDiskTotalMb > 0 then
    L := L + Txt('Spațiu liber: ', 'Free space: ') + GbText(HwDiskFreeMb) + Txt(' din ', ' of ') + GbText(HwDiskTotalMb) + NL;

  L := L + NL + Txt('Instalări găsite', 'Installations found') + NL + NL;

  if PrevUninstall <> '' then
  begin
    L := L + Txt('Pneuma Sofer', 'Pneuma Sofer');
    if PrevVersion <> '' then
      L := L + ' ' + PrevVersion;
    L := L + Txt(' este deja instalat', ' is already installed');
    if PrevDir <> '' then
      L := L + Txt(' în ', ' in ') + PrevDir;
    L := L + '.' + NL;
    if (PrevVersion <> '') and (CompareVer(PrevVersion, AppVersionText) > 0) then
      L := L + '   ' + Txt('Atenție: e mai nou decât această versiune. Instalarea îl înlocuiește cu una mai veche.',
        'Careful: it is newer than this version. Installing replaces it with an older one.') + NL;
    L := L + '   ' + Txt('Îl dezinstalez automat înainte de instalare, ca să nu rămână fișiere amestecate.',
      'I uninstall it automatically before installing, so no mixed files are left behind.') + NL;
  end
  else if FileExists(ExpandConstant('{app}\{#AppExe}')) then
  begin
    L := L + Txt('Un folder vechi în ', 'An old folder in ') + ExpandConstant('{app}') + Txt(' conține deja programul, dar nu e înregistrat nicăieri.',
      ' already contains the program, but it is registered nowhere.') + NL +
      '   ' + Txt('Îl folosesc și îl suprascriu; cărțile nu stau acolo.', 'I reuse and overwrite it; books are not stored there.') + NL;
  end
  else
    L := L + Txt('Nicio versiune veche Pneuma Sofer. Instalare curată.',
      'No older Pneuma Sofer version. Clean install.') + NL;

  if LegacyUninstall <> '' then
    L := L + Txt('Instalare veche „', 'Old installation "') + LegacyName + Txt('” — o înlătur automat (e numele vechi al programului).',
      '" — I remove it automatically (it is the old name of the program).') + NL;

  if ProcessRunning(AppExeName) then
    L := L + Txt('Pneuma Sofer este deschis acum: îl închid înainte de instalare. Textul se salvează automat.',
      'Pneuma Sofer is running: I close it before installing. The text is saved automatically.') + NL;

  L := L + NL + Txt('Ce să te aștepți', 'What to expect') + NL;
  L := L + Txt('Încadrare: ', 'Verdict: ') + TierLabel + NL + NL;
  L := L + TierText + NL + NL;
  L := L + ExtrasText;

  L := L + NL + Txt('Ce variantă instalez', 'Which variant I install') + NL;
  L := L + '· ' + Txt('programul e același pe orice calculator și se instalează complet: scris, revizie, Compile, dicționare, cercetare;',
    'the program is the same on any computer and installs complete: writing, review, Compile, dictionaries, research;') + NL;
  L := L + '· ' + Txt('ce se potrivește după calculator e doar dictarea — pe placa video (rapid) sau pe procesor (merge oriunde);',
    'what matches the computer is only dictation — on the graphics card (fast) or on the processor (works anywhere);') + NL;
  L := L + '· ' + Txt('motorul local de dictare se poate sări acum (600 MB); îl poți lua oricând din Setări;',
    'the local dictation engine can be skipped now (600 MB); you can get it any time from Settings;') + NL;
  L := L + '· ' + Txt('alegerea de mai jos se scrie într-un profil, iar programul o folosește la prima pornire.',
    'the choice below is written to a profile, and the program uses it on first start.') + NL;

  L := L + NL + Txt('AI și hardware', 'AI and hardware') + NL;
  L := L + '· ' + Txt('AI prin cloud (Anthropic, OpenAI, Gemini, DeepSeek, OpenRouter) merge la fel aici ca pe un calculator scump: îi trebuie doar internet și cheia ta.',
    'cloud AI (Anthropic, OpenAI, Gemini, DeepSeek, OpenRouter) works here just as on an expensive computer: it only needs internet and your key.') + NL;
  if TierName = 'puternic' then
    L := L + '· ' + Txt('AI local (Ollama, LM Studio) ar avea loc pe calculatorul acesta.',
      'local AI (Ollama, LM Studio) would fit on this computer.') + NL
  else
    L := L + '· ' + Txt('AI local (Ollama, LM Studio) nu are loc pe calculatorul acesta — rămâi la AI prin cloud, dacă vrei AI.',
      'local AI (Ollama, LM Studio) does not fit on this computer — stay with cloud AI if you want AI.') + NL;
  L := L + '· ' + Txt('Fără niciun AI, programul e complet: nu e o versiune „redusă”.',
    'Without any AI the program is complete: it is not a reduced version.') + NL;

  L := L + NL + Txt('Când apeși Instalează', 'When you press Install') + NL;
  L := L + '· ' + Txt('închid programul dacă e deschis și dezinstalez versiunea veche;', 'I close the program if running and uninstall the old version;') + NL;
  L := L + '· ' + Txt('instalez versiunea ', 'I install version ') + AppVersionText + Txt(' în folderul ales;', ' into the chosen folder;') + NL;
  L := L + '· ' + Txt('cărțile, proiectele și setările rămân neatinse.', 'books, projects and settings are left untouched.') + NL;

  if BuildStampText <> '' then
    L := L + NL + Format(Txt('Instalator construit la: %1', 'Installer built on: %1'), [BuildStampText]) + NL;

  Result := L;
end;

// ─────────────────── paginile ───────────────────

function NewBodyMemo(Page: TWizardPage; const Body: String): TNewMemo;
begin
  Result := TNewMemo.Create(Page);
  Result.Parent := Page.Surface;
  Result.Align := alClient;
  Result.ReadOnly := True;
  Result.WordWrap := True;
  Result.ScrollBars := ssVertical;
  Result.Font.Size := 9;
  Result.Text := Body;
end;

procedure InitializeWizard;
begin
  DetectInstalls;
  ReadHardware;

  PageFeatures := CreateCustomPage(wpWelcome,
    ExpandConstant('{cm:PageFeaturesCaption}'),
    ExpandConstant('{cm:PageFeaturesDesc}'));
  MemoFeatures := NewBodyMemo(PageFeatures, ExpandConstant('{cm:FeaturesBody}'));

  PageNeeds := CreateCustomPage(PageFeatures.ID,
    ExpandConstant('{cm:PageNeedsCaption}'),
    ExpandConstant('{cm:PageNeedsDesc}'));
  MemoNeeds := NewBodyMemo(PageNeeds, ExpandConstant('{cm:NeedsBody}'));

  // După pagina de sarcini: aproape de butonul „Instalează”, cu date proaspete.
  PageFound := CreateCustomPage(wpSelectTasks,
    ExpandConstant('{cm:PageFoundCaption}'),
    ExpandConstant('{cm:PageFoundDesc}'));
  MemoFound := NewBodyMemo(PageFound, FoundText);
  // Textul lasă loc jos pentru bife (varianta de dictare potrivită calculatorului).
  MemoFound.Align := alNone;
  MemoFound.SetBounds(0, 0, PageFound.SurfaceWidth - ScaleX(4), PageFound.SurfaceHeight - ScaleY(50));

  ChkDictation := TNewCheckBox.Create(PageFound);
  ChkDictation.Parent := PageFound.Surface;
  ChkDictation.Left := 0;
  ChkDictation.Top := PageFound.SurfaceHeight - ScaleY(46);
  ChkDictation.Width := PageFound.SurfaceWidth;
  ChkDictation.Caption := Txt('Dictarea pe placa video NVIDIA (recomandat aici)',
    'Dictation on the NVIDIA card (recommended here)');
  ChkDictation.Checked := HwGpuNvidia;
  ChkDictation.Enabled := HwGpuNvidia;

  ChkSkipDictation := TNewCheckBox.Create(PageFound);
  ChkSkipDictation.Parent := PageFound.Surface;
  ChkSkipDictation.Left := 0;
  ChkSkipDictation.Top := PageFound.SurfaceHeight - ScaleY(24);
  ChkSkipDictation.Width := PageFound.SurfaceWidth;
  ChkSkipDictation.Caption := Txt('Nu descărca acum motorul local de dictare (600 MB) — îl iau din Setări când vreau',
    'Do not download the local dictation engine now (600 MB) — I will get it from Settings when I want');
  ChkSkipDictation.Checked := (HwDiskFreeMb > 0) and (HwDiskFreeMb < 2500);
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = PageFound.ID then
  begin
    ReadHardware;
    ChkDictation.Enabled := HwGpuNvidia;
    ChkDictation.Checked := HwGpuNvidia;
    ChkSkipDictation.Checked := (HwDiskFreeMb > 0) and (HwDiskFreeMb < 2500);
    MemoFound.Text := FoundText;
  end;
end;

// ─────────────────── preflight: curăță înainte să instaleze ───────────────────

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Uninst, Args: String;
  RC: Integer;
begin
  Result := '';
  NeedsRestart := False;
  DetectInstalls;
  ReadHardware;

  // 0. Spațiu pe disc: singurul lucru care chiar poate opri o instalare întreagă.
  //    Memoria nu oprește nimic — programul se instalează complet și pe un calculator slab;
  //    ce nu încape acolo e AI-ul local, nu programul.
  if (not WizardSilent) and (HwDiskTotalMb > 0) and (HwDiskFreeMb < 1200) then
    if MsgBox(Txt('Ai mai puțin de 1,2 GB liberi pe disc.' + NL + NL +
                  'Programul are nevoie de spațiu, iar motorul de dictare mai cere 600 MB. Continui?',
                  'You have less than 1.2 GB free on disk.' + NL + NL +
                  'The program needs space, and the dictation engine asks for another 600 MB. Continue?'),
              mbError, MB_YESNO) = IDNO then
    begin
      Result := Txt('Instalarea a fost oprită. Eliberează spațiu pe disc și rulează din nou instalarea.',
                    'Installation stopped. Free some disk space and run the installer again.');
      exit;
    end;

  // 1. Programul deschis — altfel dezinstalarea veche eșuează pe fișiere blocate.
  if ProcessRunning(AppExeName) then
  begin
    if (not WizardSilent) and
       (MsgBox(Txt('Pneuma Sofer este deschis. Îl închid acum ca să pot instala curat? Textul se salvează automat.',
                   'Pneuma Sofer is running. Close it now so I can install cleanly? The text is saved automatically.'),
               mbConfirmation, MB_YESNO) = IDNO) then
    begin
      Result := Txt('Închide Pneuma Sofer, apoi rulează din nou instalarea.',
                    'Close Pneuma Sofer, then run the installer again.');
      exit;
    end;
    CloseApp(AppExeName);
  end;

  // 2. Versiunea veche a aceluiași program.
  if PrevUninstall <> '' then
  begin
    if (PrevVersion <> '') and (CompareVer(PrevVersion, AppVersionText) > 0) and (not WizardSilent) then
      if MsgBox(Txt('Ai instalată versiunea ' + PrevVersion + ', mai nouă decât ' + AppVersionText + '.' + NL + NL +
                    'Continui și o înlocuiesc cu cea din instalator?',
                    'Version ' + PrevVersion + ' is installed, newer than ' + AppVersionText + '.' + NL + NL +
                    'Continue and replace it with the one in this installer?'),
                mbError, MB_YESNO) = IDNO then
    begin
      Result := Txt('Instalarea a fost oprită. Versiunea instalată rămâne.',
                    'Installation stopped. The installed version stays.');
      exit;
    end;

    Uninst := UninstallExeOf(PrevUninstall);
    if (Uninst <> '') and FileExists(Uninst) then
    begin
      Args := '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART';
      Exec(Uninst, Args, '', SW_HIDE, ewWaitUntilTerminated, RC);
      Sleep(800);
    end;
    if (PrevDir <> '') and DirExists(PrevDir) then
      RemoveDir(PrevDir);
  end;

  // 3. Instalare veche cu numele vechi (alt AppId, ar rămâne două programe).
  if LegacyUninstall <> '' then
  begin
    Uninst := UninstallExeOf(LegacyUninstall);
    if (Uninst <> '') and FileExists(Uninst) then
    begin
      Args := '/S';
      if Pos('UNINS', Uppercase(Uninst)) > 0 then
        Args := '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART';
      Exec(Uninst, Args, '', SW_HIDE, ewWaitUntilTerminated, RC);
      Sleep(800);
    end;
  end;

  // 4. Profilul de hardware pentru prima pornire (dictare + ce încape pe calculator).
  WriteProfile;
end;

// ─────────────────── intrare opțională în PATH ───────────────────

// Optional PATH entry (HKCU\Environment\Path), written here rather than in [Registry] so that:
// an entry already there (also with a trailing backslash, other case or quotes) is not added
// twice, an empty or ";"-ending PATH gets no empty entries, and uninstall removes it again.

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
