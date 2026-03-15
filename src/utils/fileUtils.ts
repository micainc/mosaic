// Utility functions for file handling in the browser.

export function getFilename(path: string): string {
  // Extract the filename from a path, handling both Windows and Unix paths
  const filename = path.split(/[/\\]/).pop() || '';
  return filename.replace(/\.(jpg|JPG|png|PNG|jpeg|JPEG|tiff|TIFF|TIF|tif|gif|GIF)$/, '');
}

export function getCommonSubstring(strings: string[]): string {
  if (!strings.length) {
    return '';
  }

  // Helper function to find common prefix between two strings
  function commonPrefix(str1: string, str2: string): string {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return str1.substring(0, i);
  }

  // Start with the first string as a candidate for the common substring
  // and compare it with all other strings, shortening it as necessary
  let commonSub = strings[0];
  for (let i = 1; i < strings.length && commonSub !== ''; i++) {
    commonSub = commonPrefix(commonSub, strings[i]);
    if (commonSub === '') break; // If empty, no common substring exists
  }

  // If commonSub still has length, it means it's present in all strings so far,
  // but it might not be the longest. Check for longer common substrings.
  if (commonSub.length > 0) {
    for (let i = commonSub.length; i > 0; i--) {
      let subCandidate = commonSub.substring(0, i);
      let isCommon = strings.every((str) => str.includes(subCandidate));
      if (isCommon) {
        return subCandidate; // Returns the longest common substring found
      }
    }
  }

  return commonSub; // Return the common substring (which may be empty)
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Browser-based download function (replaces Electron IPC save)
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
