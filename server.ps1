param(
    [int]$Port = 8080,
    [string]$ListenHost = 'localhost'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$typeName = 'RetroArcade.ArcadeServer'

if (-not ($typeName -as [type])) {
    $addTypeParams = @{
        Path = (Join-Path $root 'server.cs')
        ReferencedAssemblies = @(
            'System.dll',
            'System.Core.dll',
            'System.Net.Http.dll',
            'System.Web.dll',
            'System.Web.Extensions.dll'
        )
    }

    Add-Type @addTypeParams
}

$server = New-Object RetroArcade.ArcadeServer($root, $ListenHost, $Port)

try {
    $server.RunAsync().GetAwaiter().GetResult()
}
finally {
    $server.Dispose()
}

