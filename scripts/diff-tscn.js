#!/usr/bin/env node
/*
 Quick diff for Godot .tscn TileMap tile_data triplets between two files.
 - Compares per-layer, per-cell position with source, altId, flip flags.
 - Exit code 0 if equal, 1 if differences found or parse error.
 Usage:
   npm run diff-tscn -- <good.tscn> <test.tscn>
   (If no args, auto-detect the two provided baseline files in repo root.)
*/

const fs = require('fs');
const path = require('path');

const BIT_FLIP_H = 1 << 28;
const BIT_FLIP_V = 1 << 29;
const BIT_TRANSPOSE = 1 << 30;
const ALT_MASK = 0x0000ffff;

function findDefaultFiles(repoRoot) {
  const entries = fs.readdirSync(repoRoot);
  const good = entries.find(f => f.includes('ConvertedRoom_') && f.includes('God Placement Isolated') && f.endsWith('.tscn'));
  const bad = entries.find(f => f.includes('ConvertedRoom_') && f.includes('Wrong Placement Isolated') && f.endsWith('.tscn'));
  return {
    good: good ? path.join(repoRoot, good) : null,
    bad: bad ? path.join(repoRoot, bad) : null,
  };
}

function parseTscn(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const layers = {}; // name -> { cells: Map(positionInt -> {src, alt, altId, flags}) }
  let currentLayer = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nodeMatch = line.match(/^\[node\s+name="([^"]+)"\s+type="TileMap"/);
    if (nodeMatch) {
      currentLayer = nodeMatch[1];
      if (!layers[currentLayer]) layers[currentLayer] = { cells: new Map() };
      continue;
    }
    if (!currentLayer) continue;
    if (line.startsWith('layer_0/tile_data')) {
      const arrMatch = line.match(/PackedInt32Array\(([^)]*)\)/);
      if (!arrMatch) continue;
      const parts = arrMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => parseInt(s, 10));
      for (let j = 0; j + 2 < parts.length; j += 3) {
        const position = parts[j];
        const source = parts[j + 1];
        const alt = parts[j + 2];
        const altId = alt & ALT_MASK;
        const flags = {
          h: (alt & BIT_FLIP_H) !== 0,
          v: (alt & BIT_FLIP_V) !== 0,
          t: (alt & BIT_TRANSPOSE) !== 0,
        };
        layers[currentLayer].cells.set(position, { source, alt, altId, flags });
      }
    }
  }
  return layers;
}

function compareLayers(lhs, rhs) {
  const layerNames = new Set([...Object.keys(lhs), ...Object.keys(rhs)]);
  const diffs = [];

  for (const name of layerNames) {
    const l = lhs[name] ? lhs[name].cells : new Map();
    const r = rhs[name] ? rhs[name].cells : new Map();
    const positions = new Set([...l.keys(), ...r.keys()]);
    for (const pos of positions) {
      const lc = l.get(pos);
      const rc = r.get(pos);
      if (!lc || !rc) {
        diffs.push({ layer: name, position: pos, type: 'presence', left: lc, right: rc });
        continue;
      }
      const srcEq = lc.source === rc.source;
      const altIdEq = lc.altId === rc.altId;
      const hEq = lc.flags.h === rc.flags.h;
      const vEq = lc.flags.v === rc.flags.v;
      const tEq = lc.flags.t === rc.flags.t;
      if (!(srcEq && altIdEq && hEq && vEq && tEq)) {
        diffs.push({ layer: name, position: pos, type: 'mismatch', left: lc, right: rc });
      }
    }
  }
  return diffs;
}

function fmtFlags(f) {
  return `${f.h ? 'H' : '-'}${f.v ? 'V' : '-'}${f.t ? 'T' : '-'}`;
}

function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const [argA, argB] = process.argv.slice(2);
  let fileA = argA;
  let fileB = argB;

  if (!fileA || !fileB) {
    const found = findDefaultFiles(repoRoot);
    fileA = fileA || found.good;
    fileB = fileB || found.bad;
  }

  if (!fileA || !fileB) {
    console.error('Error: Provide two .tscn files or place the baseline files in repo root:');
    console.error(' - "ConvertedRoom_* God Placement Isolated.tscn"');
    console.error(' - "ConvertedRoom_* Wrong Placement Isolated.tscn"');
    process.exit(1);
  }

  const aPath = path.isAbsolute(fileA) ? fileA : path.resolve(process.cwd(), fileA);
  const bPath = path.isAbsolute(fileB) ? fileB : path.resolve(process.cwd(), fileB);

  if (!fs.existsSync(aPath) || !fs.existsSync(bPath)) {
    console.error('Error: One or both files do not exist:');
    console.error(' A:', aPath);
    console.error(' B:', bPath);
    process.exit(1);
  }

  console.log('Comparing:');
  console.log(' Left (baseline):', aPath);
  console.log(' Right (test)   :', bPath);

  try {
    const left = parseTscn(aPath);
    const right = parseTscn(bPath);
    const diffs = compareLayers(left, right);

    const byLayer = new Map();
    for (const d of diffs) {
      if (!byLayer.has(d.layer)) byLayer.set(d.layer, []);
      byLayer.get(d.layer).push(d);
    }

    if (diffs.length === 0) {
      console.log('OK: No differences found.');
      process.exit(0);
    }

    console.log(`Found ${diffs.length} differences across ${byLayer.size} TileMap layer(s).`);
    for (const [layer, list] of byLayer) {
      console.log(`\nLayer: ${layer}  (diffs: ${list.length})`);
      const maxShow = 20;
      for (let i = 0; i < Math.min(maxShow, list.length); i++) {
        const d = list[i];
        if (d.type === 'presence') {
          console.log(`  pos=${d.position}: ${d.left ? 'only in LEFT' : ''}${!d.left && !d.right ? '' : ''}${d.right ? (d.left ? '' : 'only in RIGHT') : ''}`);
          continue;
        }
        const l = d.left; const r = d.right;
        const parts = [];
        if (l.source !== r.source) parts.push(`src ${l.source} vs ${r.source}`);
        if (l.altId !== r.altId) parts.push(`altId ${l.altId} vs ${r.altId}`);
        if (l.flags.h !== r.flags.h) parts.push(`H ${l.flags.h} vs ${r.flags.h}`);
        if (l.flags.v !== r.flags.v) parts.push(`V ${l.flags.v} vs ${r.flags.v}`);
        if (l.flags.t !== r.flags.t) parts.push(`T ${l.flags.t} vs ${r.flags.t}`);
        console.log(`  pos=${d.position}: {${parts.join(', ')}}  [L alt=0x${l.alt.toString(16)} ${fmtFlags(l.flags)}] [R alt=0x${r.alt.toString(16)} ${fmtFlags(r.flags)}]`);
      }
      if (list.length > maxShow) {
        console.log(`  ...and ${list.length - maxShow} more in this layer.`);
      }
    }

    process.exit(1);
  } catch (err) {
    console.error('Failed to diff files:', err.message);
    process.exit(1);
  }
}

main();

