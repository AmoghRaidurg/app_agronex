const JimpLib = require('jimp');
const Jimp = JimpLib.Jimp || JimpLib.default || JimpLib;
const fs = require('fs');
const path = require('path');

async function fix() {
  try {
    const adaptivePath = path.resolve('./assets/images/adaptive-icon.png');
    const adaptive = await Jimp.read(adaptivePath);
    adaptive.resize({ w: 1024, h: 1024 }); // new syntax for v1 is .resize({w, h}), old is .resize(w, h)
    await adaptive.write(adaptivePath); // new syntax uses write, old uses writeAsync? 
  } catch (e) {
    try {
      const adaptivePath = path.resolve('./assets/images/adaptive-icon.png');
      const adaptive = await Jimp.read(adaptivePath);
      adaptive.resize(1024, 1024);
      await adaptive.writeAsync(adaptivePath);
    } catch(e2) {
      console.log('Error on adaptive-icon:', e2);
    }
  }
  console.log("Fixed adaptive-icon.png");

  try {
    const iconPath = path.resolve('./assets/images/icon.png');
    const icon = await Jimp.read(iconPath);
    try {
      icon.resize({ w: 1024, h: 1024 });
      await icon.write(iconPath); 
    } catch(e) {
      icon.resize(1024, 1024);
      await icon.writeAsync(iconPath);
    }
  } catch (e) {
    console.log('Error on icon:', e);
  }
  console.log("Fixed icon.png");
}

fix();
