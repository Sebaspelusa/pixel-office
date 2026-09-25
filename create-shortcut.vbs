Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

path = fso.GetParentFolderName(WScript.ScriptFullName)
target = path & "\start.bat"
shortcutPath = ws.SpecialFolders("Desktop") & "\Pixel HQ.lnk"

Set link = ws.CreateShortcut(shortcutPath)
link.TargetPath = target
link.WorkingDirectory = path
link.WindowStyle = 7
link.Description = "OpenCode Agent Visualizer"
link.Save

WScript.Echo "Created: " & shortcutPath
