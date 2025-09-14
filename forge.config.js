const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: {
      unpack: "*.{node,dll}",
      // Note: Asar encryption requires electron-forge 7+ and doesn't prevent all extraction
      // but makes it significantly harder
    },
    icon: './src/assets/icons/win/icon.ico', // Use explicit .ico extension for Windows
    executableName: 'postboy',
    win32metadata: {
      CompanyName: 'Gaurav Saroha',
      ProductName: 'PostBoy',
      FileDescription: 'PostBoy',
      OriginalFilename: 'postboy.exe',
      InternalName: 'PostBoy',
      AppUserModelID: 'com.moodysaroha.postboy',
    },
    extraResources: [
      './app-update.yml'
    ],
    ignore: [
      // Exclude development dependencies and files
      /^\/\.vscode/,
      /^\/\.git/,
      /^\/\.github/,
      /^\/node_modules\/.*\/test/,
      /^\/node_modules\/.*\/tests/,
      /^\/node_modules\/.*\/\.nyc_output/,
      /^\/node_modules\/.*\/coverage/,
      /^\/node_modules\/.*\/docs/,
      /^\/node_modules\/.*\/example/,
      /^\/node_modules\/.*\/examples/,
      /^\/node_modules\/.*\/benchmark/,
      /^\/node_modules\/.*\/benchmarks/,
      /^\/node_modules\/.*\/\.git/,
      /^\/node_modules\/.*\/\.github/,
      /^\/node_modules\/.*\/\.vscode/,
      /^\/node_modules\/.*\/\.idea/,
      /^\/node_modules\/.*\/\.DS_Store/,
      /^\/node_modules\/.*\/Thumbs\.db/,
      /^\/node_modules\/.*\/\.eslintrc/,
      /^\/node_modules\/.*\/\.prettierrc/,
      /^\/node_modules\/.*\/\.editorconfig/,
      /^\/node_modules\/.*\/\.gitignore/,
      /^\/node_modules\/.*\/\.npmignore/,
      /^\/node_modules\/.*\/\.travis\.yml/,
      /^\/node_modules\/.*\/\.appveyor\.yml/,
      /^\/node_modules\/.*\/\.circleci/,
      /^\/node_modules\/.*\/\.github/,
      // Exclude debug and development files
      /\.pdb$/,
      /\.iobj$/,
      /\.ipdb$/,
      /\.lib$/,
      /\.exp$/,
      /\.map$/,
      /\.ts$/,
      /\.coffee$/,
      /\.scss$/,
      /\.sass$/,
      /\.less$/,
      // Exclude source files that shouldn't be in production
      /sqlite3\.c$/,
      /\.c$/,
      /\.cpp$/,
      /\.cc$/,
      /\.h$/,
      /\.hpp$/,
      // Exclude specific large files
      /electron\.exe$/,
      // Exclude development tools
      /^\/out/,
      /^\/temp_extracted/,
      /^\/tests/,
      /^\/test/,
      /^\/\.nyc_output/,
      /^\/coverage/,
      /^\/docs/,
      /^\/roadmap/,
      /^\/Docs/,
      /^\/ROADMAP\.md/,
      /^\/README\.md/,
      /^\/\.gitignore/,
      /^\/\.npmignore/,
      /^\/yarn\.lock/,
      /^\/package-lock\.json/,
      /^\/release\.ps1/,
      /^\/releasetoteam\.ps1/,
      /^\/roadmap-editor\.html/,
      /^\/test-apis-collection\.json/,
      /^\/scripts/,
      /^\/src-backup/,
      // Note: app-update.yml is NOT excluded so it gets included in asar as backup
    ]
  },
  rebuildConfig: {},
  // Publishers removed - releases are handled by GitHub Actions in postboy-releases repo
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'postboy',
        title: 'PostBoy',
        authors: 'Gaurav Saroha',
        description: 'PostBoy',
        setupExe: 'PostBoySetup.exe',
        noMsi: true,
        setupIcon: require('path').resolve(__dirname, 'src/assets/icons/win/icon.ico'), // Windows installer icon
        // Supplying iconUrl helps Squirrel set correct Start Menu/Taskbar icons
        iconUrl: 'https://raw.githubusercontent.com/moodysaroha/postboy/main/src/assets/icons/win/icon.ico',
        loadingGif: undefined,  // Optional: './src/assets/loading.gif' - shows during Windows installation
        // Skip checking for remote releases during build to avoid private repo access issues
        // The auto-updater in the app will handle updates with proper authentication
        remoteReleases: false
      },
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
