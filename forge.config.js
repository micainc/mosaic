module.exports = {
  packagerConfig: {
    name: 'Mosaic',
    productName: 'Mosaic',
    executableName: 'Mosaic',
    icon: './src/public/img/icon', // no file extension required
    ignore: /(^\/(samples|grains|preprocessing|out))/,
    extraResource: [
      './cpp/slic_win.exe',
      './cpp/slic_unix', // mac and linux
    ]
  },
  rebuildConfig: {},
  makers: [
    // Windows
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Mosaic'
      },
      platforms: ['win32']
    },
    // macOS
    {
      name: '@electron-forge/maker-dmg',  // You'll need to install this
      config: {},
      platforms: ['darwin']
    },
    // Optional: ZIP for macOS
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    // Linux
    {
      name: '@electron-forge/maker-deb',
      config: {},
      platforms: ['linux']
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
      platforms: ['linux']
    }
  ],
};
