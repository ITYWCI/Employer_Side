@echo off

REM Create a build directory
mkdir build

REM Copy server.js and vite.config.js to the build directory
copy server.js build\
copy vite.config.js build\

REM Copy all files from Employer_Side to the build directory
xcopy /E /I Employer_Side\* build\

echo Build completed successfully!