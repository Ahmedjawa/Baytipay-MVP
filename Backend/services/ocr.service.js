const Tesseract = require('tesseract.js');
const { extractTraiteData } = require('./data-extractors');

exports.processImage = async (imagePath) => {
  const { data } = await Tesseract.recognize(
    imagePath,
    'fra',
    { logger: m => console.log(m) }
  );

  return {
    rawText: data.text,
    structured: extractTraiteData(data.text) // Votre logique métier
  };
};