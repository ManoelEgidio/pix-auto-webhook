@echo off
set GOCACHE=%TEMP%\go-build
set GOPATH=%USERPROFILE%\go
set GOROOT=C:\Program Files\Go
set GODEBUG=x509negativeserial=1
go run . --server