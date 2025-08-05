# Script para iniciar o servidor Go
$env:GOCACHE = "$env:TEMP\go-build"
go run . --server 