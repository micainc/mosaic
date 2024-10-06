module.exports = {
  packagerConfig: {
    name: 'Mosaic',
    productName: 'Mosaic',
    executableName: 'Mosaic',
    icon: './src/public/img/icon', // no file extension required
    ignore: /(^\/(samples|grains|preprocessing|out))/

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
