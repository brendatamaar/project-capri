# Read-only adaptation of mochiiwuff's window-frame watcher (see THIRD_PARTY_NOTICES.md).
# No titles, screen contents, keyboard input, or window mutation. Metadata only.
param([long]$Self = 0, [int]$ParentPid = 0)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class CompanionFrames {
  delegate bool EnumProc(IntPtr hwnd, IntPtr unused);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct INFO { public int Size; public RECT Monitor, Work; public int Flags; }
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback, IntPtr unused);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr hwnd);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr hwnd, StringBuilder name, int max);
  [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr hwnd, int flags);
  [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr monitor, ref INFO info);
  [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string cls,string name);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern bool QueryFullProcessImageName(IntPtr process,int flags,StringBuilder name,ref int length);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd, int attr, out RECT value, int size);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd, int attr, out int value, int size);
  static bool Desktop(IntPtr h) { var c = new StringBuilder(64); GetClassName(h,c,64); return c.ToString()=="Progman" || c.ToString()=="WorkerW" || c.ToString().Contains("TrayWnd"); }
  public static void Init() { try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch {} }
  public static IntPtr IconView() {
    IntPtr found=IntPtr.Zero;
    EnumWindows((h,unused)=>{var view=FindWindowEx(h,IntPtr.Zero,"SHELLDLL_DefView",null);if(view!=IntPtr.Zero)found=FindWindowEx(view,IntPtr.Zero,"SysListView32",null);return found==IntPtr.Zero;},IntPtr.Zero);
    return found;
  }
  static bool Game(IntPtr hwnd) {
    uint pid;GetWindowThreadProcessId(hwnd,out pid);var process=OpenProcess(0x1000,false,pid);if(process==IntPtr.Zero)return false;
    try{var file=new StringBuilder(2048);int length=file.Capacity;if(!QueryFullProcessImageName(process,0,file,ref length))return false;
      string name=file.ToString();return name.IndexOf("\\steamapps\\common\\",StringComparison.OrdinalIgnoreCase)>=0||name.IndexOf("\\Epic Games\\",StringComparison.OrdinalIgnoreCase)>=0;
    }finally{CloseHandle(process);}
  }
  public static string Snapshot(long self) {
    var fg=GetForegroundWindow(); RECT front; var info=new INFO(); info.Size=Marshal.SizeOf(info);
    bool full=fg.ToInt64()!=self && !Desktop(fg) && DwmGetWindowAttribute(fg,9,out front,16)==0 && GetMonitorInfo(MonitorFromWindow(fg,2),ref info)
      && front.Left<=info.Monitor.Left && front.Top<=info.Monitor.Top && front.Right>=info.Monitor.Right && front.Bottom>=info.Monitor.Bottom;
    var json=new StringBuilder("{\"fg\":"+fg.ToInt64()+",\"game\":"+(Game(fg)?"true":"false")+",\"fullscreen\":"+(full?"true":"false")+",\"wins\":["); int count=0;
    EnumWindows((h,unused)=>{
      if(count>=256 || h.ToInt64()==self || !IsWindowVisible(h) || IsIconic(h) || Desktop(h)) return true;
      int cloaked; if(DwmGetWindowAttribute(h,14,out cloaked,4)==0 && cloaked!=0) return true;
      RECT r; if(DwmGetWindowAttribute(h,9,out r,16)!=0 || r.Right-r.Left<200 || r.Bottom-r.Top<120) return true;
      if(count++>0) json.Append(',');
      json.Append("{\"id\":").Append(h.ToInt64()).Append(",\"x\":").Append(r.Left).Append(",\"y\":").Append(r.Top)
        .Append(",\"w\":").Append(r.Right-r.Left).Append(",\"h\":").Append(r.Bottom-r.Top).Append(",\"max\":").Append(IsZoomed(h)?"true":"false").Append('}');
      return true;
    },IntPtr.Zero); return json.Append("]}").ToString();
  }
}
"@
[CompanionFrames]::Init()
try { Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes } catch {}
$previous = ''
$icons = @()
$metadataTick = 0
$deviceCount = 0
$deviceRevision = 0
try { Register-WmiEvent -Class Win32_DeviceChangeEvent -SourceIdentifier CapriDeviceChange | Out-Null } catch {}
while (-not $ParentPid -or (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) {
  foreach ($change in @(Get-Event -SourceIdentifier CapriDeviceChange -ErrorAction SilentlyContinue)) {
    if ($change.SourceEventArgs.NewEvent.EventType -eq 2 -or $change.SourceEventArgs.NewEvent.EventType -eq 3) { $deviceRevision++ }
    Remove-Event -EventIdentifier $change.EventIdentifier
  }
  if ($metadataTick % 14 -eq 0) {
    $icons = @()
    try {
      $view = [CompanionFrames]::IconView()
      if ($view -ne [IntPtr]::Zero) {
        $element = [System.Windows.Automation.AutomationElement]::FromHandle($view)
        $items = $element.FindAll([System.Windows.Automation.TreeScope]::Children,[System.Windows.Automation.Condition]::TrueCondition)
        $index = 0
        foreach ($item in $items) {
          $rect = $item.Current.BoundingRectangle
          if ($rect.Width -gt 0 -and $rect.Height -gt 0 -and $index -lt 128) {
            $icons += @{ id = -100000 - $index; x = $rect.Left; y = $rect.Top; w = $rect.Width; h = $rect.Height; max = $false; kind = 'icon' }
            $index++
          }
        }
      }
    } catch { $icons = @() }
    try { $deviceCount = @([System.IO.DriveInfo]::GetDrives() | Where-Object { $_.DriveType -eq 'Removable' -and $_.IsReady }).Count } catch { $deviceCount = 0 }
  }
  $metadataTick++
  $data = [CompanionFrames]::Snapshot($Self) | ConvertFrom-Json
  $data.wins = @(@($data.wins) + $icons | Select-Object -First 256)
  $data | Add-Member -NotePropertyName removableDevices -NotePropertyValue $deviceCount
  $data | Add-Member -NotePropertyName deviceRevision -NotePropertyValue $deviceRevision
  $snapshot = $data | ConvertTo-Json -Depth 5 -Compress
  if ($snapshot -ne $previous) { [Console]::Out.WriteLine($snapshot); [Console]::Out.Flush(); $previous = $snapshot }
  Start-Sleep -Milliseconds 150
}
Unregister-Event -SourceIdentifier CapriDeviceChange -ErrorAction SilentlyContinue
