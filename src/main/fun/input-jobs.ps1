# Original fixed input helper. No commands, paths, text typing, modifiers or arbitrary keys.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$r = [Console]::In.ReadToEnd() | ConvertFrom-Json
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public static class CapriInput {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int l,t,r,b; }
 [StructLayout(LayoutKind.Sequential)] public struct Point { public int x,y; }
 [StructLayout(LayoutKind.Sequential)] public struct Mouse { public int x,y; public uint data,flags,time; public UIntPtr extra; }
 [StructLayout(LayoutKind.Sequential)] public struct Key { public ushort code,scan; public uint flags,time; public UIntPtr extra; }
 [StructLayout(LayoutKind.Explicit)] public struct Payload { [FieldOffset(0)] public Mouse mouse; [FieldOffset(0)] public Key key; }
 [StructLayout(LayoutKind.Sequential)] public struct Input { public uint type; public Payload data; }
 [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
 [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h,out Rect rect);
 [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h,ref Point p);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Point p);
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
 [DllImport("user32.dll")] static extern uint SendInput(uint n,Input[] inputs,int size);
 [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h,uint flags);
 public static void Pair(ushort code,bool mouse) {
  var a=new Input(); var b=new Input();
  if(mouse){a.type=0;b.type=0;a.data.mouse.flags=2;b.data.mouse.flags=4;}
  else {a.type=1;b.type=1;a.data.key.code=code;b.data.key.code=code;b.data.key.flags=2;}
  if(SendInput(2,new[]{a,b},Marshal.SizeOf(typeof(Input)))!=2){SendInput(1,new[]{b},Marshal.SizeOf(typeof(Input)));throw new Exception("Input refused");}
 }
 public static bool Held(int key){return (GetAsyncKeyState(key)&0x8000)!=0;}
}
"@
$null=[CapriInput]::SetProcessDpiAwarenessContext([IntPtr](-4))
function Geometry($hwnd) {
 $rect = New-Object CapriInput+Rect
 $point = New-Object CapriInput+Point
 if (-not [CapriInput]::GetClientRect($hwnd,[ref]$rect) -or -not [CapriInput]::ClientToScreen($hwnd,[ref]$point)) { throw 'No geometry' }
 return @{x=$point.x;y=$point.y;w=$rect.r-$rect.l;h=$rect.b-$rect.t}
}
function Safe($p) {
 if (-not $p -or $p.ProcessName.ToLowerInvariant() -notin @('notepad','calculator','calculatorapp') -or $p.MainWindowHandle -eq 0) { return $false }
 $file = $p.MainModule.FileName
 $system = [Environment]::SystemDirectory
 return $file -ieq (Join-Path $system 'notepad.exe') -or $file -ieq (Join-Path $system 'calc.exe') -or $file -imatch '^C:\\Program Files\\WindowsApps\\Microsoft\.(WindowsNotepad|WindowsCalculator)_[^\\]+\\(Notepad\\Notepad|CalculatorApp)\.exe$'
}
if ($r.op -eq 'list') {
 $rows = @(Get-Process | ForEach-Object { try { if (Safe $_) { $g=Geometry $_.MainWindowHandle; if($g.w -gt 0 -and $g.h -gt 0){@{pid=$_.Id;name=$_.ProcessName.ToLowerInvariant();stamp=[string]$_.StartTime.ToUniversalTime().Ticks;hwnd=[string]$_.MainWindowHandle;x=$g.x;y=$g.y;w=$g.w;h=$g.h}} } } catch {} } | Select-Object -First 32)
 ConvertTo-Json -InputObject $rows -Compress
 exit
}
if ($r.op -ne 'job' -or @($r.steps).Count -lt 1 -or @($r.steps).Count -gt 20) { throw 'Invalid job' }
$t = $r.target
$h = [IntPtr]([long]$t.hwnd)
function Check {
 $p=Get-Process -Id ([int]$t.pid)
 if (-not (Safe $p) -or [string]$p.StartTime.ToUniversalTime().Ticks -ne [string]$t.stamp -or [string]$p.MainWindowHandle -ne [string]$t.hwnd -or [CapriInput]::GetForegroundWindow() -ne $h) { throw 'Target changed' }
 $g=Geometry $h
 if($g.x -ne $t.x -or $g.y -ne $t.y -or $g.w -ne $t.w -or $g.h -ne $t.h) {throw 'Geometry changed'}
 foreach($key in @(16,17,18,91,92,27,1,2,4)) {if([CapriInput]::Held($key)){throw 'Stop or physical modifier/button'}}
}
# Refuse stale identity before attempting focus. Never attach to another process.
$p=Get-Process -Id ([int]$t.pid)
if (-not (Safe $p) -or [string]$p.StartTime.ToUniversalTime().Ticks -ne [string]$t.stamp -or [string]$p.MainWindowHandle -ne [string]$t.hwnd) {throw 'Stale target'}
if (-not [CapriInput]::SetForegroundWindow($h)) {throw 'Focus refused'}
foreach($s in $r.steps) {
 Check
 if($s.tag -eq 'Key') {
  $vk=switch($s.key){'Left'{37} 'Right'{39} 'Up'{38} 'Down'{40} 'Tab'{9} 'Escape'{27} 'Home'{36} 'End'{35} default{throw 'Unknown key'}}
  Check
  [CapriInput]::Pair([ushort]$vk,$false)
  Start-Sleep -Milliseconds 100
  continue
 }
 switch($s.tag) { 'Move' { $click=$false } 'Click' { $click=$true } default {throw 'Unknown step'} }
 if($null -eq $s.x -or $null -eq $s.y -or [double]$s.x -lt 0 -or [double]$s.x -gt 1 -or [double]$s.y -lt 0 -or [double]$s.y -gt 1){throw 'Invalid point'}
 $pt=New-Object CapriInput+Point
 $pt.x=[int]$t.x+[int][Math]::Round([double]$s.x*([int]$t.w-1))
 $pt.y=[int]$t.y+[int][Math]::Round([double]$s.y*([int]$t.h-1))
 [uint32]$owner=0
 $null=[CapriInput]::GetWindowThreadProcessId([CapriInput]::WindowFromPoint($pt),[ref]$owner)
 if($owner -ne [uint32]$t.pid){throw 'Point covered'}
 Check
 if(-not [CapriInput]::SetCursorPos($pt.x,$pt.y)){throw 'Move refused'}
 if($click){Check;[CapriInput]::Pair(0,$true)}
 Start-Sleep -Milliseconds 100
}
'{"ok":true}'
