module.exports = {
  packagerConfig: {
    name: 'Mosaic',
    productName: 'Mosaic',
    executableName: 'Mosaic',
    icon: './src/images/icon' // no file extension required
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
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

};
