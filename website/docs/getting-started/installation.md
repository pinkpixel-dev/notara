---
title: Installation & Downloads
description: Installation instructions for Notara desktop packages, web builds, and development from source.
---

## Release downloads

Notara `2.5.0` is available in the following desktop packages:

| Package | Download |
| --- | --- |
| Linux `.deb` | [Notara_2.5.0_amd64.deb](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara_2.5.0_amd64.deb) |
| Linux `.rpm` | [Notara-2.5.0-1.x86_64.rpm](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara-2.5.0-1.x86_64.rpm) |
| Linux `AppImage` | [Notara_2.5.0_amd64.AppImage](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara_2.5.0_amd64.AppImage) |
| Windows installer | [Notara_2.5.0_x64-setup.exe](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara_2.5.0_x64-setup.exe) |

## Package installation

### Linux `.deb`

```bash
sudo apt install ./Notara_2.5.0_amd64.deb
```

### Linux `.rpm`

```bash
sudo dnf install ./Notara-2.5.0-1.x86_64.rpm
```

### Linux `AppImage`

```bash
chmod +x Notara_2.5.0_amd64.AppImage
./Notara_2.5.0_amd64.AppImage
```

### Windows

Download and run `Notara_2.5.0_x64-setup.exe`, then follow the setup instructions on screen.

## Build from source

### Prerequisites

- Node.js `20+`
- `npm`
- Git
- Rust toolchain (`cargo`, `rustc`)
- On Debian/Ubuntu for native desktop builds:

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

### Web development

1. Clone the repository:

   ```bash
   git clone https://github.com/pinkpixel-dev/notara.git
   cd notara
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the local development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3489` in your browser.

### Desktop development

Run the Tauri development shell with hot reloading:

```bash
npm run tauri:dev
```

### Production desktop builds

To build the Linux desktop packages:

```bash
npm run tauri:build:linux
```

Output packages are placed in:

- `src-tauri/target/release/bundle/deb/`
- `src-tauri/target/release/bundle/rpm/`
- `src-tauri/target/release/bundle/appimage/`

## Setting up OpenAI

Notara works offline without any accounts or API keys for notes, tasks, calendar, and vision boards.
To enable the AI assistant:

1. Open **Settings** in Notara.
2. Enter your OpenAI API key in the AI configuration card.
3. Select your preferred text and image models.
4. Changes save locally in your desktop application state.

## Deploying the documentation website

The documentation site in `website/` is built with Docusaurus:

```bash
cd website
npm install
npm run build
```

To deploy to Cloudflare Pages:

```bash
npm run deploy
```
