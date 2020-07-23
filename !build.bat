@echo off
set ex_filename="Link Home Page.zip"

:main
cd /D %~dp0
del %ex_filename%
"C:\Program Files\7-Zip\7z.exe" a %ex_filename% .\src\* -r -tzip

:menu
echo == Actions ==
echo [Y,R] Rebuild
echo [E,X] Exit
choice /C YREX /N
if %ERRORLEVEL%==1 goto main
if %ERRORLEVEL%==2 goto main
if %ERRORLEVEL%==3 goto exit
if %ERRORLEVEL%==4 goto exit

:exit