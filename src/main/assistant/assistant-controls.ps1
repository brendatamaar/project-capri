# Fixed allow-listed native controls. No shell commands or executable paths from models.
# Core Audio declarations adapted from mochiiwuff system.js; notices in THIRD_PARTY_NOTICES.md.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$keep = @('explorer','applicationframehost','textinputhost','shellexperiencehost','startmenuexperiencehost','searchhost','searchapp','lockapp','dwm','capri','electron','claude','codex','ollama','powershell','pwsh','t3','t3code','t3 code','capri companion')
function SafeProcess($p) { return $p -and $p.Id -ne [int]$request.parentId -and $p.Id -ne $PID -and $p.MainWindowHandle -ne 0 -and $keep -notcontains $p.ProcessName.ToLowerInvariant() }
switch ($request.op) {
 'list' {
  $rows = @(Get-Process | Where-Object { SafeProcess $_ } | Select-Object -First 128 | ForEach-Object {
   try { @{pid=$_.Id;name=$_.ProcessName;stamp=[string]$_.StartTime.ToUniversalTime().Ticks} } catch {}
  })
  ConvertTo-Json -InputObject $rows -Compress
 }
 'close' {
  $p = Get-Process -Id ([int]$request.pid) -ErrorAction Stop
  if (-not (SafeProcess $p) -or [string]$p.StartTime.ToUniversalTime().Ticks -ne [string]$request.stamp) { throw 'Stale or protected app' }
  if (-not $p.CloseMainWindow()) { throw 'Close request refused' }
  '{"ok":true}'
 }
 'launch' {
  $name = switch ($request.app) { 'calculator' {'calc.exe'} 'notepad' {'notepad.exe'} default {throw 'Unknown app'} }
  Start-Process -FilePath (Join-Path ([Environment]::SystemDirectory) $name)
  '{"ok":true}'
 }
 'music' {
  if ($request.operation -eq 'volume') {
   if ($null -eq $request.value -or [int]$request.value -lt 0 -or [int]$request.value -gt 100) { throw 'Invalid volume' }
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float level, Guid context);
  int j();
  int GetMasterVolumeLevelScalar(out float level);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, Guid context);
  int GetMute(out bool mute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref Guid id, int ctx, int p, out IAudioEndpointVolume volume); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class DeviceEnumerator { }
public static class CapriAudio {
  static IAudioEndpointVolume Volume() {
    IMMDevice device;
    Marshal.ThrowExceptionForHR(((IMMDeviceEnumerator)new DeviceEnumerator()).GetDefaultAudioEndpoint(0, 1, out device));
    IAudioEndpointVolume volume;
    var id = typeof(IAudioEndpointVolume).GUID;
    Marshal.ThrowExceptionForHR(device.Activate(ref id, 23, 0, out volume));
    return volume;
  }
  public static int Level { get { float v; Marshal.ThrowExceptionForHR(Volume().GetMasterVolumeLevelScalar(out v)); return (int)Math.Round(v * 100); } }
  public static void Set(int level) { Marshal.ThrowExceptionForHR(Volume().SetMasterVolumeLevelScalar(level / 100f, Guid.Empty)); }
  public static void Mute(bool mute) { Marshal.ThrowExceptionForHR(Volume().SetMute(mute, Guid.Empty)); }
}
"@
   [CapriAudio]::Set([int]$request.value)
   '{"ok":true}'
  } else {
   Add-Type -AssemblyName System.Runtime.WindowsRuntime
   $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
   function Await($operation, $type) {
    $method = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
    $task = $method.MakeGenericMethod($type).Invoke($null,@($operation))
    return $task.GetAwaiter().GetResult()
   }
   $manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
   $session = $manager.GetCurrentSession()
   if (-not $session) { throw 'No active media session' }
   if ($request.operation -eq 'status') {
    $props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    @{title=[string]$props.Title;artist=[string]$props.Artist;playing=($session.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing')} | ConvertTo-Json -Compress
    break
   }
   $operation = switch ($request.operation) {
    'playPause' { $session.TryTogglePlayPauseAsync() }
    'next' { $session.TrySkipNextAsync() }
    'previous' { $session.TrySkipPreviousAsync() }
    default { throw 'Unknown music operation' }
   }
   if (-not (Await $operation ([bool]))) { throw 'Media control refused' }
   '{"ok":true}'
  }
 }
 default { throw 'Unknown native operation' }
}
