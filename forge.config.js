module.exports = {
  packagerConfig: {
    name: 'MOSAIC',
    productName: 'MOSAIC',
    executableName: 'MOSAIC',
    icon: './src/public/img/icon', // no file extension required
    ignore: /(^\/(samples|grains|preprocessing|out))/,
    extraResource: [
      './cpp/slic_win.exe',
      './cpp/slic_unix', // mac and linux
    ],
    // Add this
    asar: {
      unpack: "**/*.node"
    },
    // " when you package app, also copy these important TensorFlow files!"
    afterCopy: [(buildPath, electronVersion, platform, arch, callback) => {
      const fs = require('fs');
      console.log('Build path:', buildPath);
      console.log('Resource path contents:', fs.readdirSync(path.join(buildPath, 'resources')));
      callback();
    }],
    extraResources: [
      {
        from: './node_modules/@tensorflow/tfjs-node/deps/lib',
        to: 'deps/lib'
      },
      {
        from: './node_modules/@tensorflow/tfjs-node/lib/napi-v8',
        to: 'napi-v8'
      },
      {
        from: './models',
        to: 'models',
        filter: ['**/*']  // Include all files in /models directory
      },
    ]
  },
  rebuildConfig: {},
  makers: [
    // Windows
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'MOSAIC'
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
  // Add this section for rebuilding native modules
  hooks: {
    packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {
      // After copying everything, make sure files are set up correctly: puzzle pieces fit together
      const rebuild = require('electron-rebuild');
      await rebuild.rebuild({
        buildPath,
        electronVersion,
        arch,
        force: true
      });
    },
  }
};
