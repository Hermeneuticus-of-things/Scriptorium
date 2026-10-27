// Data for the About dialog (Help → About Pneuma Sofer).
// Licences were checked on 2026-10-26 against the installed tree (node_modules package.json "license"
// fields, LICENSE files) and the upstream project / model cards. Where no licence file ships with the
// component, `inTree: false` and the dialog says so ("licence not found in tree"); the upstream licence
// is shown only where it was read from the upstream repository / model card.
// `flag` marks anything that is not plain MIT-style permissive: nc = non-commercial, copyleft, proprietary,
// attribution (CC-BY), research = research-only data.
export const REPO_URL = 'https://github.com/Hermeneuticus-of-things/Scriptorium';
export const DTED_URL = 'https://github.com/Hermeneuticus-of-things/dted';

export const ABOUT_LICENSES = [
  // Pneuma Sofer itself
  { group: 'app', name: 'Pneuma Sofer', version: '0.11.0', license: 'Proprietary — personal, non-commercial use (LICENSE)', flag: 'nc' },
  // Shell / runtime
  { group: 'runtime', name: 'Electron', version: '45', license: 'MIT', flag: '' },
  { group: 'runtime', name: 'Chromium (in Electron)', version: '', license: 'Multiple (LICENSES.chromium.html)', flag: 'mixed' },
  // npm packages shipped in resources/app/node_modules (203 packages)
  { group: 'npm', name: 'React, React DOM', version: '18.3.1', license: 'MIT', flag: '' },
  { group: 'npm', name: 'TipTap (@tiptap/*), ProseMirror', version: '3.32.0', license: 'MIT', flag: '' },
  { group: 'npm', name: '@modelcontextprotocol/sdk', version: '1.32.2', license: 'MIT', flag: '' },
  { group: 'npm', name: 'docx, fast-xml-parser, zod', version: '', license: 'MIT', flag: '' },
  { group: 'npm', name: '@anthropic-ai/sdk', version: '1.2.0', license: 'Apache-2.0', flag: 'attribution' },
  { group: 'npm', name: 'mammoth', version: '1.13.0', license: 'BSD-2-Clause', flag: '' },
  { group: 'npm', name: 'diff', version: '9.0.0', license: 'BSD-3-Clause', flag: '' },
  { group: 'npm', name: 'jszip', version: '3.10.2', license: 'MIT OR GPL-3.0-or-later (used under MIT)', flag: '' },
  { group: 'npm', name: 'pako', version: '1.0.11', license: 'MIT AND Zlib', flag: '' },
  { group: 'npm', name: 'fast-sha256', version: '1.3.0', license: 'Unlicense', flag: '' },
  { group: 'npm', name: 'All other npm packages (203 total)', version: '', license: '180 MIT · 8 ISC · 5 BSD-2 · 4 BSD-3 · 2 Apache-2.0 · 1 BSD', flag: '' },
  // Built-in speech engine (downloaded on first use)
  { group: 'whisper', name: 'whisper.cpp (whisper-server)', version: '1.7.6', license: 'MIT', flag: '' },
  { group: 'whisper', name: 'Whisper large-v3-turbo (ggml q5_0)', version: '', license: 'MIT (model card)', flag: '' },
  { group: 'whisper', name: 'OpenBLAS (libopenblas.dll, CPU build)', version: '', license: 'BSD-3-Clause (upstream)', inTree: false, flag: '' },
  { group: 'whisper', name: 'SDL2 (SDL2.dll)', version: '', license: 'Zlib (upstream)', inTree: false, flag: '' },
  { group: 'whisper', name: 'NVIDIA CUDA runtime (cublas, cudart, nvrtc; GPU build)', version: '12', license: 'NVIDIA CUDA EULA (proprietary, redistributable)', inTree: false, flag: 'proprietary' },
  // Read-aloud voice (downloaded on first use)
  { group: 'tts', name: 'Piper', version: '2023.11.14-2', license: 'MIT', flag: '' },
  { group: 'tts', name: 'piper-phonemize, ONNX Runtime', version: '', license: 'MIT (upstream)', inTree: false, flag: '' },
  { group: 'tts', name: 'eSpeak NG (espeak-ng.dll)', version: '', license: 'GPL-3.0 (upstream)', inTree: false, flag: 'copyleft' },
  { group: 'tts', name: 'Voice ro_RO-mihai-medium', version: '', license: 'Dataset CC0; fine-tuned from the lessac voice (Blizzard 2013 data: research use, no commercial use)', flag: 'research' },
  // D&TED — separate program, used as-is (docs/ARCHITECTURE.md)
  { group: 'dted', name: 'D&TED', version: '0.6.0', license: 'licence not found in tree', inTree: false, flag: 'unknown' },
  { group: 'dted', name: 'OpenLLM-Ro RoLlama3.1-8b-Instruct (summaries)', version: 'GGUF Q4', license: 'CC-BY-NC-4.0 (model card)', flag: 'nc' },
  { group: 'dted', name: 'NVIDIA Parakeet TDT 0.6b v3', version: '', license: 'CC-BY-4.0 (model card)', flag: 'attribution' },
  { group: 'dted', name: 'eek/parakeet-tdt-0.6b-ro-en', version: '', license: 'CC-BY-4.0 (model card; gated)', flag: 'attribution' },
  { group: 'dted', name: 'eek/whisper-turbo-ro-en', version: '', license: 'MIT (model card)', flag: '' },
  { group: 'dted', name: 'nemo-speech.cpp, sentencepiece', version: '', license: 'Apache-2.0', flag: 'attribution' },
  { group: 'dted', name: 'llama.cpp / ggml', version: '', license: 'MIT', flag: '' },
];
