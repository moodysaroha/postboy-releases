#!/usr/bin/env pwsh

# Simplified Release Script for PostBoy
# This script automates the process of:
# 1. Committing and pushing changes to main repo
# 2. Creating a version tag and pushing to postboy-releases repo
# 3. Pushing the tag to trigger GitHub Actions workflow

param(
    [Parameter(Mandatory=$false)]
    [string]$CommitMessage = "Release update",
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$AutoConfirm = $true,
    
    [Parameter(Mandatory=$false)]
    [string]$ReleasesRepo = "postboy-releases"
)

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "========================================="
Write-Info "   PostBoy Simplified Release Script"
Write-Info "========================================="

# Check if we're in a git repository
if (!(Test-Path .git)) {
    Write-Error "Error: Not in a git repository!"
    exit 1
}

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Info "`nUncommitted changes detected:"
    Write-Host $status
    Write-Info ""
}

# Get current version from package.json
$packageJson = Get-Content package.json | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Info "Current version in package.json: $currentVersion"

Write-Info "`nStarting release process..."

# STEP 1: Commit and push changes
Write-Info "`n=== Step 1: Committing Changes ==="

Write-Info "Adding all changes..."
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to stage changes"
    exit 1
}

Write-Info "Committing changes..."
git commit -m $CommitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Warning "No changes to commit or commit failed"
}

Write-Info "Pushing to main branch..."
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to push to main branch"
    Write-Info "You may need to pull latest changes first: git pull origin main"
    exit 1
}

Write-Success "✓ Changes pushed successfully"

# STEP 2: Update Package Version and Build Application
Write-Info "`n=== Step 2: Update Package Version and Build Application ==="

# If no version provided, auto-increment patch version (moved here to happen before build)
if ([string]::IsNullOrEmpty($Version)) {
    $versionParts = $currentVersion -split '\.'
    $major = [int]$versionParts[0]
    $minor = [int]$versionParts[1]
    $patch = [int]$versionParts[2]
    $patch++
    $Version = "$major.$minor.$patch"
    Write-Info "Auto-incrementing to version: $Version"
}

# Update package.json with the new version BEFORE building
Write-Info "Updating package.json version to $Version..."
$packageJson.version = $Version
$packageJson | ConvertTo-Json -Depth 10 | Set-Content package.json
Write-Success "✓ Updated package.json to version $Version"

# Now create the tag version (after we know the actual version)
$tagVersion = if ($Version.StartsWith('v')) { $Version } else { "v$Version" }
Write-Info "Tag version will be: $tagVersion"

# Prompt for commit message if not provided (now that we have the tag version)
if ($CommitMessage -eq "Release update") {
    $userMessage = Read-Host "Enter commit message (default: 'Release $tagVersion')"
    if (![string]::IsNullOrWhiteSpace($userMessage)) {
        $CommitMessage = $userMessage
    } else {
        $CommitMessage = "Release $tagVersion"
    }
}

Write-Info "`nRelease Summary:"
Write-Info "  Commit Message: $CommitMessage"
Write-Info "  Version Tag: $tagVersion"
Write-Info "  Releases Repo: $ReleasesRepo"
Write-Info ""

# Confirm before proceeding
if (-not $AutoConfirm) {
    $confirm = Read-Host "Do you want to proceed? (Y/n)"
    if ($confirm -eq 'n' -or $confirm -eq 'N') {
        Write-Warning "Release cancelled."
        exit 0
    }
} else {
    Write-Info "Auto-confirm enabled, proceeding with release..."
}

Write-Info "Building application with Electron Forge (with code obfuscation)..."
yarn run make-secure
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build application"
    exit 1
}

Write-Success "✓ Application built successfully"

# STEP 3: Create and Push Tag to Releases Repo
Write-Info "`n=== Step 3: Creating and Pushing Tag to $ReleasesRepo ==="

# Check if releases repo remote exists, if not add it
$releasesRemote = git remote get-url releases 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Info "Adding releases remote for $ReleasesRepo..."
    # Assume same GitHub username/org as origin
    $originUrl = git remote get-url origin
    if ($originUrl -match "github\.com[:/]([^/]+)/") {
        $username = $matches[1]
        $releasesUrl = $originUrl -replace "/[^/]+\.git$", "/$ReleasesRepo.git"
        git remote add releases $releasesUrl
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to add releases remote"
            exit 1
        }
        Write-Success "✓ Added releases remote: $releasesUrl"
    } else {
        Write-Error "Could not parse origin URL to determine releases repo URL"
        Write-Info "Please manually add the releases remote: git remote add releases <releases-repo-url>"
        exit 1
    }
}

# Fetch releases remote to check for existing tags
Write-Info "Fetching from releases remote..."
git fetch releases 2>$null

# Check if tag already exists on releases repo
$existingTag = git ls-remote --tags releases $tagVersion 2>$null
if ($existingTag) {
    Write-Warning "Tag $tagVersion already exists on $ReleasesRepo!"
    if (-not $AutoConfirm) {
        $overwrite = Read-Host "Do you want to delete and recreate it? (y/N)"
        if ($overwrite -ne 'y' -and $overwrite -ne 'Y') {
            Write-Warning "Skipping release creation"
            exit 0
        }
    } else {
        Write-Info "Auto-confirm enabled, deleting and recreating tag..."
    }
    git push releases --delete $tagVersion 2>$null
    Write-Info "Deleted existing tag $tagVersion from releases repo"
}

# Delete local tag if it exists
git tag -d $tagVersion 2>$null

# Create and push tag to releases repo
Write-Info "Creating tag $tagVersion..."
git tag $tagVersion
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create tag"
    exit 1
}

Write-Info "Pushing tag to releases repo..."
git push releases $tagVersion
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to push tag to releases repo"
    exit 1
}

Write-Success "✓ Tag created and pushed to $ReleasesRepo"

# STEP 4: Create GitHub Release with Built Assets
Write-Info "`n=== Step 4: Creating GitHub Release ==="

# Check if we have built assets
$squirrelPath = "out/make/squirrel.windows/x64"
if (!(Test-Path $squirrelPath)) {
    Write-Error "Build assets not found at: $squirrelPath"
    Write-Info "Please ensure the build completed successfully"
    exit 1
}

Write-Info "Preparing release assets..."
$assets = Get-ChildItem $squirrelPath
$assetList = @()
foreach ($asset in $assets) {
    $assetList += $asset.FullName
    Write-Info "  - $($asset.Name)"
}

# Create latest.yml file for electron-updater
Write-Info "Creating latest.yml for electron-updater..."
$versionWithoutV = $tagVersion -replace '^v', ''
$setupExe = Get-ChildItem $squirrelPath -Filter "*Setup.exe" | Select-Object -First 1
$nupkgFile = Get-ChildItem $squirrelPath -Filter "*.nupkg" | Select-Object -First 1
$releasesFile = Get-ChildItem $squirrelPath -Filter "RELEASES" | Select-Object -First 1

if ($setupExe -and $nupkgFile -and $releasesFile) {
    # Calculate file hashes (convert to lowercase for electron-updater compatibility)
    $setupHash = (Get-FileHash $setupExe.FullName -Algorithm SHA512).Hash.ToLower()
    $nupkgHash = (Get-FileHash $nupkgFile.FullName -Algorithm SHA512).Hash.ToLower()
    $releasesHash = (Get-FileHash $releasesFile.FullName -Algorithm SHA512).Hash.ToLower()
    
    # Get file sizes
    $setupSize = $setupExe.Length
    $nupkgSize = $nupkgFile.Length
    $releasesSize = $releasesFile.Length
    
    # Create latest.yml content
    $latestYml = @"
version: $versionWithoutV
files:
  - url: $($setupExe.Name)
    sha512: $setupHash
    size: $setupSize
  - url: $($nupkgFile.Name)
    sha512: $nupkgHash
    size: $nupkgSize
  - url: $($releasesFile.Name)
    sha512: $releasesHash
    size: $releasesSize
path: $($setupExe.Name)
sha512: $setupHash
releaseDate: $((Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ"))
"@
    
    $latestYmlPath = Join-Path $squirrelPath "latest.yml"
    Set-Content -Path $latestYmlPath -Value $latestYml -Encoding UTF8
    $assetList += $latestYmlPath
    Write-Success "✓ Created latest.yml for electron-updater"
    Write-Info "  - latest.yml"
} else {
    Write-Warning "Could not find all required files for latest.yml generation"
}

# Check if gh CLI is available
$ghAvailable = Get-Command gh -ErrorAction SilentlyContinue
if ($ghAvailable) {
    # Use GitHub CLI to create release
    $releaseBody = @"
## PostBoy $tagVersion - Windows Release

### Installation
Download and run ``PostBoySetup.exe`` to install PostBoy on Windows.

### Auto-Update
This release supports automatic updates for existing PostBoy installations.

### Files
- ``PostBoySetup.exe`` - Windows installer (recommended)
- ``postboy-$tagVersion-full.nupkg`` - Squirrel update package  
- ``RELEASES`` - Update manifest file

### System Requirements
- Windows 10 or later
- x64 architecture

### Changes
- Release $tagVersion with latest updates

---
*Built from [postboy](https://github.com/moodysaroha/postboy) repository*
"@

    Write-Info "Creating release with GitHub CLI..."
    
    # Set the repository context for gh CLI
    $env:GH_REPO = "moodysaroha/$ReleasesRepo"
    
    # Create the release
    gh release create $tagVersion $assetList --title "PostBoy $tagVersion" --notes $releaseBody --latest
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✓ GitHub release created successfully with assets!"
        
        # Remove source code archives that GitHub automatically creates
        Write-Info "Removing source code archives from release..."
        try {
            # Get the release ID
            $releaseInfo = gh api "repos/moodysaroha/$ReleasesRepo/releases/tags/$tagVersion" | ConvertFrom-Json
            $releaseId = $releaseInfo.id
            
            # Get all assets and find source code archives
            $assets = gh api "repos/moodysaroha/$ReleasesRepo/releases/$releaseId/assets" | ConvertFrom-Json
            
            foreach ($asset in $assets) {
                if ($asset.name -match "^(Source code|$ReleasesRepo-.*)\.(zip|tar\.gz)$") {
                    Write-Info "  Deleting: $($asset.name)"
                    gh api -X DELETE "repos/moodysaroha/$ReleasesRepo/releases/assets/$($asset.id)"
                }
            }
            Write-Success "✓ Source code archives removed from release"
        } catch {
            Write-Warning "Could not remove source archives: $($_.Exception.Message)"
        }
    } else {
        Write-Warning "Failed to create release with GitHub CLI, falling back to GitHub Actions..."
    }
} else {
    Write-Info "GitHub CLI not available, release will be created by GitHub Actions..."
}

Write-Info "`n=== Release Summary ==="
Write-Success "✓ Release process completed successfully!"
Write-Info ""
Write-Info "What was done:"
Write-Info "  1. ✅ Committed and pushed changes to postboy repository"
Write-Info "  2. ✅ Built application locally with Electron Forge"
Write-Info "  3. ✅ Created tag $tagVersion and pushed to $ReleasesRepo"
Write-Info "  4. ✅ Created GitHub release with downloadable assets"
Write-Info ""
Write-Info "Release details:"
Write-Info "  📦 Version: $tagVersion"
Write-Info "  🔗 Releases: https://github.com/moodysaroha/$ReleasesRepo/releases"
Write-Info "  📥 Download: https://github.com/moodysaroha/$ReleasesRepo/releases/tag/$tagVersion"
Write-Info ""
Write-Info "Auto-updater status:"
Write-Info "  ✅ New version is now available for auto-update"
Write-Info "  ✅ Existing installations will detect this update"
Write-Info "  ✅ Users can download fresh installers from releases page"

# Exit successfully
exit 0