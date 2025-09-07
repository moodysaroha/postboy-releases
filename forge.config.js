const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
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
    ]
  },
  rebuildConfig: {},
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'moodysaroha',
          name: 'postboy'
        },
        prerelease: false,
        draft: false
      }
    }
  ],
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
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
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
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
