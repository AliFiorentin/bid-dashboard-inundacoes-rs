import fs from 'fs';
import path from 'path';

const MUNICIPIOS = [
  { name: 'Eldorado do Sul', slug: 'eldorado_do_sul', cenario: 'eldorado_do_sul___cenario_ada' },
  { name: 'Lajeado', slug: 'lajeado', cenario: 'lajeado___cenario_27m' },
  { name: 'Porto Alegre', slug: 'porto_alegre', cenario: 'porto_alegre___cenario_ada' },
  { name: 'Rio Grande', slug: 'rio_grande', cenario: 'rio_grande___cenario_maio_2024' }
];

const basePath = path.join(process.cwd(), 'public', 'dados_convertidos');
const outPath = path.join(basePath, 'visao_geral_rs');

if (!fs.existsSync(outPath)) {
  fs.mkdirSync(outPath, { recursive: true });
}

function mergeGeoJSONFiles(inFiles, outFile) {
  const features = [];
  let globalId = 1;
  for (const file of inFiles) {
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data && data.features) {
        for (const feature of data.features) {
          feature.id = globalId++;
          if (feature.properties) {
             feature.properties.id = feature.id;
          }
          features.push(feature);
        }
      }
    }
  }
  const merged = { type: 'FeatureCollection', features };
  fs.writeFileSync(outFile, JSON.stringify(merged));
  console.log(`Saved ${outFile} with ${features.length} features.`);
}

function mergeStats(inFiles, outFile) {
  const stats = {};
  for (let i = 0; i < inFiles.length; i++) {
    const file = inFiles[i];
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      stats[MUNICIPIOS[i].name] = data;
    }
  }
  fs.writeFileSync(outFile, JSON.stringify(stats));
  console.log(`Saved ${outFile}.`);
}

// Merge Base Layers
mergeGeoJSONFiles(MUNICIPIOS.map(m => path.join(basePath, m.slug, 'empresas_BASE.geojson')), path.join(outPath, 'empresas_BASE.geojson'));
mergeGeoJSONFiles(MUNICIPIOS.map(m => path.join(basePath, m.slug, 'educacao_BASE.geojson')), path.join(outPath, 'educacao_BASE.geojson'));
mergeGeoJSONFiles(MUNICIPIOS.map(m => path.join(basePath, m.slug, 'saude_BASE.geojson')), path.join(outPath, 'saude_BASE.geojson'));

// Merge Atingidos Layers
mergeGeoJSONFiles(MUNICIPIOS.map(m => path.join(basePath, m.slug, 'cenarios', `empresas_ATINGIDOS_${m.cenario}.geojson`)), path.join(outPath, 'empresas_ATINGIDOS.geojson'));
mergeGeoJSONFiles(MUNICIPIOS.map(m => path.join(basePath, m.slug, 'cenarios', `educacao_ATINGIDOS_${m.cenario}.geojson`)), path.join(outPath, 'educacao_ATINGIDOS.geojson'));
mergeGeoJSONFiles(MUNICIPIOS.map(m => path.join(basePath, m.slug, 'cenarios', `saude_ATINGIDOS_${m.cenario}.geojson`)), path.join(outPath, 'saude_ATINGIDOS.geojson'));

// Merge Stats
mergeStats(MUNICIPIOS.map(m => path.join(basePath, m.slug, 'agricultura_stats_BASE.json')), path.join(outPath, 'agricultura_stats_BASE.json'));
mergeStats(MUNICIPIOS.map(m => path.join(basePath, m.slug, 'cenarios', `agricultura_stats_${m.cenario}.json`)), path.join(outPath, 'agricultura_stats_ATINGIDOS.json'));

console.log("Done!");
