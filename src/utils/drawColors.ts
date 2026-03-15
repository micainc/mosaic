// 726 unique hex color strings used for mapping labels to colors.
// Permutations of values ['00', '1F', '3F', '5F', '7F', '9F', 'BF', 'DF', 'FF'] for R, G, B,
// excluding '#FFFFFF', '#000000', and '#7F7F7F'.
//
// generate colour permutations in python:
// values = [ 0     31    63    95   127   159    191   223  255 ]
// values = ['00', '1F', '3F', '5F', '7F', '9F', 'BF', 'DF', 'FF']
//
// color_permutations = []
// for r in values:
//     for g in values:
//         for b in values:
//             color = f'#{r}{g}{b}'
//             if color not in excluded_colors:
//                 color_permutations.append(color)

export const drawColors: string[] = ['#00001F', '#00003F', '#00005F', '#00007F', '#00009F', '#0000BF', '#0000DF', '#0000FF', '#001F00', '#001F1F', '#001F3F', '#001F5F', '#001F7F', '#001F9F', '#001FBF', '#001FDF', '#001FFF', '#003F00', '#003F1F', '#003F3F', '#003F5F', '#003F7F', '#003F9F', '#003FBF', '#003FDF', '#003FFF', '#005F00', '#005F1F', '#005F3F', '#005F5F', '#005F7F', '#005F9F', '#005FBF', '#005FDF', '#005FFF', '#007F00', '#007F1F', '#007F3F', '#007F5F', '#007F7F', '#007F9F', '#007FBF', '#007FDF', '#007FFF', '#009F00', '#009F1F', '#009F3F', '#009F5F', '#009F7F', '#009F9F', '#009FBF', '#009FDF', '#009FFF', '#00BF00', '#00BF1F', '#00BF3F', '#00BF5F', '#00BF7F', '#00BF9F', '#00BFBF', '#00BFDF', '#00BFFF', '#00DF00', '#00DF1F', '#00DF3F', '#00DF5F', '#00DF7F', '#00DF9F', '#00DFBF', '#00DFDF', '#00DFFF', '#00FF00', '#00FF1F', '#00FF3F', '#00FF5F', '#00FF7F', '#00FF9F', '#00FFBF', '#00FFDF', '#00FFFF', '#1F0000', '#1F001F', '#1F003F', '#1F005F', '#1F007F', '#1F009F', '#1F00BF', '#1F00DF', '#1F00FF', '#1F1F00', '#1F1F1F', '#1F1F3F', '#1F1F5F', '#1F1F7F', '#1F1F9F', '#1F1FBF', '#1F1FDF', '#1F1FFF', '#1F3F00', '#1F3F1F', '#1F3F3F', '#1F3F5F', '#1F3F7F', '#1F3F9F', '#1F3FBF', '#1F3FDF', '#1F3FFF', '#1F5F00', '#1F5F1F', '#1F5F3F', '#1F5F5F', '#1F5F7F', '#1F5F9F', '#1F5FBF', '#1F5FDF', '#1F5FFF', '#1F7F00', '#1F7F1F', '#1F7F3F', '#1F7F5F', '#1F7F7F', '#1F7F9F', '#1F7FBF', '#1F7FDF', '#1F7FFF', '#1F9F00', '#1F9F1F', '#1F9F3F', '#1F9F5F', '#1F9F7F', '#1F9F9F', '#1F9FBF', '#1F9FDF', '#1F9FFF', '#1FBF00', '#1FBF1F', '#1FBF3F', '#1FBF5F', '#1FBF7F', '#1FBF9F', '#1FBFBF', '#1FBFDF', '#1FBFFF', '#1FDF00', '#1FDF1F', '#1FDF3F', '#1FDF5F', '#1FDF7F', '#1FDF9F', '#1FDFBF', '#1FDFDF', '#1FDFFF', '#1FFF00', '#1FFF1F', '#1FFF3F', '#1FFF5F', '#1FFF7F', '#1FFF9F', '#1FFFBF', '#1FFFDF', '#1FFFFF', '#3F0000', '#3F001F', '#3F003F', '#3F005F', '#3F007F', '#3F009F', '#3F00BF', '#3F00DF', '#3F00FF', '#3F1F00', '#3F1F1F', '#3F1F3F', '#3F1F5F', '#3F1F7F', '#3F1F9F', '#3F1FBF', '#3F1FDF', '#3F1FFF', '#3F3F00', '#3F3F1F', '#3F3F3F', '#3F3F5F', '#3F3F7F', '#3F3F9F', '#3F3FBF', '#3F3FDF', '#3F3FFF', '#3F5F00', '#3F5F1F', '#3F5F3F', '#3F5F5F', '#3F5F7F', '#3F5F9F', '#3F5FBF', '#3F5FDF', '#3F5FFF', '#3F7F00', '#3F7F1F', '#3F7F3F', '#3F7F5F', '#3F7F7F', '#3F7F9F', '#3F7FBF', '#3F7FDF', '#3F7FFF', '#3F9F00', '#3F9F1F', '#3F9F3F', '#3F9F5F', '#3F9F7F', '#3F9F9F', '#3F9FBF', '#3F9FDF', '#3F9FFF', '#3FBF00', '#3FBF1F', '#3FBF3F', '#3FBF5F', '#3FBF7F', '#3FBF9F', '#3FBFBF', '#3FBFDF', '#3FBFFF', '#3FDF00', '#3FDF1F', '#3FDF3F', '#3FDF5F', '#3FDF7F', '#3FDF9F', '#3FDFBF', '#3FDFDF', '#3FDFFF', '#3FFF00', '#3FFF1F', '#3FFF3F', '#3FFF5F', '#3FFF7F', '#3FFF9F', '#3FFFBF', '#3FFFDF', '#3FFFFF', '#5F0000', '#5F001F', '#5F003F', '#5F005F', '#5F007F', '#5F009F', '#5F00BF', '#5F00DF', '#5F00FF', '#5F1F00', '#5F1F1F', '#5F1F3F', '#5F1F5F', '#5F1F7F', '#5F1F9F', '#5F1FBF', '#5F1FDF', '#5F1FFF', '#5F3F00', '#5F3F1F', '#5F3F3F', '#5F3F5F', '#5F3F7F', '#5F3F9F', '#5F3FBF', '#5F3FDF', '#5F3FFF', '#5F5F00', '#5F5F1F', '#5F5F3F', '#5F5F5F', '#5F5F7F', '#5F5F9F', '#5F5FBF', '#5F5FDF', '#5F5FFF', '#5F7F00', '#5F7F1F', '#5F7F3F', '#5F7F5F', '#5F7F7F', '#5F7F9F', '#5F7FBF', '#5F7FDF', '#5F7FFF', '#5F9F00', '#5F9F1F', '#5F9F3F', '#5F9F5F', '#5F9F7F', '#5F9F9F', '#5F9FBF', '#5F9FDF', '#5F9FFF', '#5FBF00', '#5FBF1F', '#5FBF3F', '#5FBF5F', '#5FBF7F', '#5FBF9F', '#5FBFBF', '#5FBFDF', '#5FBFFF', '#5FDF00', '#5FDF1F', '#5FDF3F', '#5FDF5F', '#5FDF7F', '#5FDF9F', '#5FDFBF', '#5FDFDF', '#5FDFFF', '#5FFF00', '#5FFF1F', '#5FFF3F', '#5FFF5F', '#5FFF7F', '#5FFF9F', '#5FFFBF', '#5FFFDF', '#5FFFFF', '#7F0000', '#7F001F', '#7F003F', '#7F005F', '#7F007F', '#7F009F', '#7F00BF', '#7F00DF', '#7F00FF', '#7F1F00', '#7F1F1F', '#7F1F3F', '#7F1F5F', '#7F1F7F', '#7F1F9F', '#7F1FBF', '#7F1FDF', '#7F1FFF', '#7F3F00', '#7F3F1F', '#7F3F3F', '#7F3F5F', '#7F3F7F', '#7F3F9F', '#7F3FBF', '#7F3FDF', '#7F3FFF', '#7F5F00', '#7F5F1F', '#7F5F3F', '#7F5F5F', '#7F5F7F', '#7F5F9F', '#7F5FBF', '#7F5FDF', '#7F5FFF', '#7F7F00', '#7F7F1F', '#7F7F3F', '#7F7F5F', '#7F7F9F', '#7F7FBF', '#7F7FDF', '#7F7FFF', '#7F9F00', '#7F9F1F', '#7F9F3F', '#7F9F5F', '#7F9F7F', '#7F9F9F', '#7F9FBF', '#7F9FDF', '#7F9FFF', '#7FBF00', '#7FBF1F', '#7FBF3F', '#7FBF5F', '#7FBF7F', '#7FBF9F', '#7FBFBF', '#7FBFDF', '#7FBFFF', '#7FDF00', '#7FDF1F', '#7FDF3F', '#7FDF5F', '#7FDF7F', '#7FDF9F', '#7FDFBF', '#7FDFDF', '#7FDFFF', '#7FFF00', '#7FFF1F', '#7FFF3F', '#7FFF5F', '#7FFF7F', '#7FFF9F', '#7FFFBF', '#7FFFDF', '#7FFFFF', '#9F0000', '#9F001F', '#9F003F', '#9F005F', '#9F007F', '#9F009F', '#9F00BF', '#9F00DF', '#9F00FF', '#9F1F00', '#9F1F1F', '#9F1F3F', '#9F1F5F', '#9F1F7F', '#9F1F9F', '#9F1FBF', '#9F1FDF', '#9F1FFF', '#9F3F00', '#9F3F1F', '#9F3F3F', '#9F3F5F', '#9F3F7F', '#9F3F9F', '#9F3FBF', '#9F3FDF', '#9F3FFF', '#9F5F00', '#9F5F1F', '#9F5F3F', '#9F5F5F', '#9F5F7F', '#9F5F9F', '#9F5FBF', '#9F5FDF', '#9F5FFF', '#9F7F00', '#9F7F1F', '#9F7F3F', '#9F7F5F', '#9F7F7F', '#9F7F9F', '#9F7FBF', '#9F7FDF', '#9F7FFF', '#9F9F00', '#9F9F1F', '#9F9F3F', '#9F9F5F', '#9F9F7F', '#9F9F9F', '#9F9FBF', '#9F9FDF', '#9F9FFF', '#9FBF00', '#9FBF1F', '#9FBF3F', '#9FBF5F', '#9FBF7F', '#9FBF9F', '#9FBFBF', '#9FBFDF', '#9FBFFF', '#9FDF00', '#9FDF1F', '#9FDF3F', '#9FDF5F', '#9FDF7F', '#9FDF9F', '#9FDFBF', '#9FDFDF', '#9FDFFF', '#9FFF00', '#9FFF1F', '#9FFF3F', '#9FFF5F', '#9FFF7F', '#9FFF9F', '#9FFFBF', '#9FFFDF', '#9FFFFF', '#BF0000', '#BF001F', '#BF003F', '#BF005F', '#BF007F', '#BF009F', '#BF00BF', '#BF00DF', '#BF00FF', '#BF1F00', '#BF1F1F', '#BF1F3F', '#BF1F5F', '#BF1F7F', '#BF1F9F', '#BF1FBF', '#BF1FDF', '#BF1FFF', '#BF3F00', '#BF3F1F', '#BF3F3F', '#BF3F5F', '#BF3F7F', '#BF3F9F', '#BF3FBF', '#BF3FDF', '#BF3FFF', '#BF5F00', '#BF5F1F', '#BF5F3F', '#BF5F5F', '#BF5F7F', '#BF5F9F', '#BF5FBF', '#BF5FDF', '#BF5FFF', '#BF7F00', '#BF7F1F', '#BF7F3F', '#BF7F5F', '#BF7F7F', '#BF7F9F', '#BF7FBF', '#BF7FDF', '#BF7FFF', '#BF9F00', '#BF9F1F', '#BF9F3F', '#BF9F5F', '#BF9F7F', '#BF9F9F', '#BF9FBF', '#BF9FDF', '#BF9FFF', '#BFBF00', '#BFBF1F', '#BFBF3F', '#BFBF5F', '#BFBF7F', '#BFBF9F', '#BFBFBF', '#BFBFDF', '#BFBFFF', '#BFDF00', '#BFDF1F', '#BFDF3F', '#BFDF5F', '#BFDF7F', '#BFDF9F', '#BFDFBF', '#BFDFDF', '#BFDFFF', '#BFFF00', '#BFFF1F', '#BFFF3F', '#BFFF5F', '#BFFF7F', '#BFFF9F', '#BFFFBF', '#BFFFDF', '#BFFFFF', '#DF0000', '#DF001F', '#DF003F', '#DF005F', '#DF007F', '#DF009F', '#DF00BF', '#DF00DF', '#DF00FF', '#DF1F00', '#DF1F1F', '#DF1F3F', '#DF1F5F', '#DF1F7F', '#DF1F9F', '#DF1FBF', '#DF1FDF', '#DF1FFF', '#DF3F00', '#DF3F1F', '#DF3F3F', '#DF3F5F', '#DF3F7F', '#DF3F9F', '#DF3FBF', '#DF3FDF', '#DF3FFF', '#DF5F00', '#DF5F1F', '#DF5F3F', '#DF5F5F', '#DF5F7F', '#DF5F9F', '#DF5FBF', '#DF5FDF', '#DF5FFF', '#DF7F00', '#DF7F1F', '#DF7F3F', '#DF7F5F', '#DF7F7F', '#DF7F9F', '#DF7FBF', '#DF7FDF', '#DF7FFF', '#DF9F00', '#DF9F1F', '#DF9F3F', '#DF9F5F', '#DF9F7F', '#DF9F9F', '#DF9FBF', '#DF9FDF', '#DF9FFF', '#DFBF00', '#DFBF1F', '#DFBF3F', '#DFBF5F', '#DFBF7F', '#DFBF9F', '#DFBFBF', '#DFBFDF', '#DFBFFF', '#DFDF00', '#DFDF1F', '#DFDF3F', '#DFDF5F', '#DFDF7F', '#DFDF9F', '#DFDFBF', '#DFDFDF', '#DFDFFF', '#DFFF00', '#DFFF1F', '#DFFF3F', '#DFFF5F', '#DFFF7F', '#DFFF9F', '#DFFFBF', '#DFFFDF', '#DFFFFF', '#FF0000', '#FF001F', '#FF003F', '#FF005F', '#FF007F', '#FF009F', '#FF00BF', '#FF00DF', '#FF00FF', '#FF1F00', '#FF1F1F', '#FF1F3F', '#FF1F5F', '#FF1F7F', '#FF1F9F', '#FF1FBF', '#FF1FDF', '#FF1FFF', '#FF3F00', '#FF3F1F', '#FF3F3F', '#FF3F5F', '#FF3F7F', '#FF3F9F', '#FF3FBF', '#FF3FDF', '#FF3FFF', '#FF5F00', '#FF5F1F', '#FF5F3F', '#FF5F5F', '#FF5F7F', '#FF5F9F', '#FF5FBF', '#FF5FDF', '#FF5FFF', '#FF7F00', '#FF7F1F', '#FF7F3F', '#FF7F5F', '#FF7F7F', '#FF7F9F', '#FF7FBF', '#FF7FDF', '#FF7FFF', '#FF9F00', '#FF9F1F', '#FF9F3F', '#FF9F5F', '#FF9F7F', '#FF9F9F', '#FF9FBF', '#FF9FDF', '#FF9FFF', '#FFBF00', '#FFBF1F', '#FFBF3F', '#FFBF5F', '#FFBF7F', '#FFBF9F', '#FFBFBF', '#FFBFDF', '#FFBFFF', '#FFDF00', '#FFDF1F', '#FFDF3F', '#FFDF5F', '#FFDF7F', '#FFDF9F', '#FFDFBF', '#FFDFDF', '#FFDFFF', '#FFFF00', '#FFFF1F', '#FFFF3F', '#FFFF5F', '#FFFF7F', '#FFFF9F', '#FFFFBF', '#FFFFDF'];
// 726 possible colours (classes)
// excluded_colors = ['#FFFFFF', '#000000', '#7F7F7F']

// Hash function to generate an index for each label name
export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function mapLabelsToColors(labelNames: string[], colors: string[]): Record<string, string> {
  const colourLabelMap: Record<string, string> = {};

  const sortedLabelNames = [...labelNames].sort(); // Create a sorted copy of labelNames

  for (const labelName of sortedLabelNames) {
    let index = hashCode(labelName) % colors.length;

    // Handle collisions using linear probing
    while (colourLabelMap[colors[index]]) {
      index = (index + 1) % colors.length;
    }

    const color = colors[index];
    colourLabelMap[color] = labelName;
    colourLabelMap[labelName] = color;
  }

  colourLabelMap['undefined'] = '#000000';
  colourLabelMap['#000000'] = 'undefined';
  return colourLabelMap;
}
