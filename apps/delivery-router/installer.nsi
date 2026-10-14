; NSIS 安装脚本 —— 配送定位与路径优化（离线编译，不依赖 electron-builder 联网）
Unicode true

!define APPNAME   "配送定位与路径优化"
!define EXENAME   "配送定位与路径优化.exe"
!define PUBLISHER "delivery-router"
!define VERSION   "1.0.0"
!define SRCDIR    "release\win-unpacked"
!define ICON      "build\icon.ico"

Name        "${APPNAME} ${VERSION}"
OutFile     "release\${APPNAME}-Setup-${VERSION}.exe"
InstallDir  "$LOCALAPPDATA\Programs\${APPNAME}"
RequestExecutionLevel user
SetCompressor /SOLID lzma
ShowInstDetails   show
ShowUninstDetails show

; ---------- 界面（使用 MUI2，简体中文）----------
!include "MUI2.nsh"
!define MUI_ICON   "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXENAME}"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"

; ---------- 安装 ----------
Section "主程序" SEC_MAIN
  SetOutPath "$INSTDIR"
  File /r "${SRCDIR}\*.*"

  ; 开始菜单与桌面快捷方式
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" \
    "$INSTDIR\${EXENAME}" "" "$INSTDIR\resources\app\icon.ico" 0
  CreateShortCut "$DESKTOP\${APPNAME}.lnk" \
    "$INSTDIR\${EXENAME}" "" "$INSTDIR\resources\app\icon.ico" 0

  ; 卸载程序与「添加/删除程序」条目（当前用户级，无需管理员）
  WriteUninstaller "$INSTDIR\卸载.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
    "DisplayName"     "${APPNAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
    "UninstallString" "$INSTDIR\卸载.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
    "DisplayIcon"     "$INSTDIR\resources\app\icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
    "Publisher"       "${PUBLISHER}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
    "DisplayVersion"  "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" \
    "InstallLocation" "$INSTDIR"
SectionEnd

; ---------- 卸载 ----------
Section "Uninstall"
  RMDir /r "$INSTDIR"
  Delete "$DESKTOP\${APPNAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APPNAME}"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
SectionEnd
