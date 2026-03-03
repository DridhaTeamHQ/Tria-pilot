function Get-Tree($Path, $Exclude, $Indent) {
    Get-ChildItem -Path $Path | Where-Object { $Exclude -notcontains $_.Name } | ForEach-Object {
        $last = ($_.FullName -eq (Get-ChildItem -Path $Path | Where-Object { $Exclude -notcontains $_.Name } | Select-Object -Last 1).FullName)
        $p = if ($last) { "+--- " } else { "|--- " }
        Write-Output "$Indent$p$($_.Name)"
        if ($_.PSIsContainer) {
            $ni = if ($last) { "$Indent    " } else { "$Indent|   " }
            Get-Tree -Path $_.FullName -Exclude $Exclude -Indent $ni
        }
    }
}
$ex = @('node_modules', '.next', '.git', '.cursor')
Get-Tree -Path '.' -Exclude $ex -Indent ''
